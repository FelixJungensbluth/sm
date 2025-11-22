from app.models.tender import TenderUpdate
from app.config.app_config import get_llm_provider
from app.services.base_information_service import BaseInformationService

import asyncio
import os
import uuid
import traceback
from typing import List

from app.config.logger import logger
from app.config.settings import get_settings
from app.models.tender import Tender
from app.models.document import Document

from app.queue.tender_queue import (
    ensure_indexes,
    claim_next_job,
    mark_step_success,
    mark_step_error,
)
from app.repos.tender_repo import TenderRepo
from app.services.external.minio_service import MinioService
from app.database.mongo import get_mongo_client
from app.repos.document_repo import DocumentRepo
from app.services.document_processing.document_processing_service import process_documents
from app.services.rag.rag_service import RagService


class WorkerContext:
    def __init__(self):
        self.settings = get_settings()
        self.mongo_client = get_mongo_client()
        self.minio_service = MinioService(self.settings)
        self.tender_repo = TenderRepo(self.mongo_client)
        self.document_repo = DocumentRepo(self.mongo_client)
        self.rag_service = RagService(self.settings)
        self.llm_provider = get_llm_provider(self.settings)
        self.base_information_service = BaseInformationService(self.settings, self.llm_provider, self.rag_service)


ctx: WorkerContext | None = None


def get_ctx() -> WorkerContext:
    global ctx
    if ctx is None:
        ctx = WorkerContext()
    return ctx


async def run_index_documents(job: dict) -> None:
    context = get_ctx()
    tender_id = job["tender_id"]
    document_ids: List[str] = job["document_ids"]

    tender: Tender | None = context.tender_repo.get_tender_by_id(uuid.UUID(tender_id))
    documents: List[Document] = context.document_repo.get_documents_by_ids(
        document_ids
    )
    if tender and documents:
        logger.info(f"Indexing documents for tender {tender.id}")
        processed_documents = process_documents(tender.id, context.minio_service, documents)
        for document in processed_documents:
            context.minio_service.upload_processed_file(tender.id, str(document.document.id), document.content)

        await context.rag_service.index_tender_documents(tender.id, processed_documents)
    else:
        raise RuntimeError(f"Tender or documents not found for tender {tender_id}")


async def run_extract_base_information(job: dict) -> None:
    context = get_ctx()
    tender_id = job["tender_id"]
    tender: Tender | None = context.tender_repo.get_tender_by_id(uuid.UUID(tender_id))
    if tender:
        base_information = await context.base_information_service.extract_base_information(
            tender.id
        )

        if base_information:
            tender_update = TenderUpdate(base_information=base_information)
            context.tender_repo.update_tender(tender.id, tender_update)


async def run_step_for_job(job: dict) -> None:
    pipeline_steps = job["pipeline"]
    idx = job["current_step_index"]
    step_name = pipeline_steps[idx]

    try:
        if step_name == "index_documents":
            await run_index_documents(job)
        elif step_name == "extract_base_information":
            await run_extract_base_information(job)
        else:
            raise RuntimeError(f"Unknown step: {step_name}")

        mark_step_success(job["_id"], idx)
    except Exception as exc:
        logger.exception(f"Error running step {step_name} for job {job['_id']}: {exc}")
        tb = traceback.format_exc()
        mark_step_error(job["_id"], idx, f"{exc}\n{tb}")


async def worker_loop(concurrency: int = 4, poll_interval: float = 1.0) -> None:
    worker_id = f"tender-worker-{uuid.uuid4()}"
    logger.info(f"Starting worker {worker_id} with concurrency={concurrency}")

    ensure_indexes()

    sem = asyncio.Semaphore(concurrency)

    async def handle_job(job: dict):
        try:
            await run_step_for_job(job)
        finally:
            sem.release()

    while True:
        await sem.acquire()
        job = claim_next_job(worker_id)

        if not job:
            sem.release()
            await asyncio.sleep(poll_interval)
            continue

        asyncio.create_task(handle_job(job))


if __name__ == "__main__":
    concurrency = int(os.getenv("TENDER_WORKER_CONCURRENCY", "4"))
    asyncio.run(worker_loop(concurrency=concurrency))
