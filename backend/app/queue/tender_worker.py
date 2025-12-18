from app.config.app_config import get_embedding_provider
from app.repos.requirements_repo import RequirementsRepo
from app.services.requirements_extraction_service import RequirementExtractionService
from app.models.tender import TenderUpdate
from app.config.app_config import get_llm_provider
from app.services.data_extraction.data_extraction_service import DataExtractionService
from app.services.data_extraction.agentic import AgenticDataExtractionService
from app.services.data_extraction.queries import BASE_INFORMATION_QUERIES, EXCLUSION_CRITERIA_QUERIES
from app.services.data_extraction.extracted_data_parser import parse_extracted_data

import asyncio
import os
import uuid
import traceback
from typing import List

from app.config.logger import logger

# Constants
DEFAULT_WORKER_CONCURRENCY = 4
DEFAULT_POLL_INTERVAL = 1.0
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
from app.database.qdrant import get_qdrant_client
from app.repos.document_repo import DocumentRepo
from app.services.document_processing.document_processing_service import process_documents
from app.services.rag.rag_service import RagService


class WorkerContext:
    def __init__(self):
        self.settings = get_settings()
        self.mongo_client = get_mongo_client()
        self.qdrant_client = get_qdrant_client()
        self.minio_service = MinioService(self.settings)
        
        self.tender_repo = TenderRepo(self.mongo_client)
        self.document_repo = DocumentRepo(self.mongo_client)
        self.requirements_repo = RequirementsRepo(self.mongo_client)

        self.llm_provider = get_llm_provider(self.settings)
        self.embedding_provider = get_embedding_provider(self.settings)

        self.rag_service = RagService(self.settings, self.embedding_provider)
        self.data_extraction_service = DataExtractionService(self.settings, self.llm_provider, self.rag_service)
        self.requirement_service = RequirementExtractionService(self.settings, self.llm_provider)
       


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
        results, data_extraction_requests = await context.data_extraction_service.extract_base_information(
            tender.id,
            BASE_INFORMATION_QUERIES
        )
        parsed_results = parse_extracted_data(
            context.llm_provider,
            context.data_extraction_service.parser,
            BASE_INFORMATION_QUERIES,
            results,
            data_extraction_requests
        )

        description_data = parsed_results.pop("compact_description", None)
        name_data = parsed_results.pop("name", None)

        base_information = list(parsed_results.values())

        tender_update = TenderUpdate(
            base_information=base_information,
            description=description_data.value if description_data else None,
            generated_title=name_data.value if name_data else None,
        )
        context.tender_repo.update_tender(tender.id, tender_update)


async def run_extract_base_information_agentic(job: dict) -> None:
    """Extract base information using the agentic data extraction service."""
    context = get_ctx()
    tender_id = job["tender_id"]
    tender: Tender | None = context.tender_repo.get_tender_by_id(uuid.UUID(tender_id))
    
    if not tender:
        raise RuntimeError(f"Tender {tender_id} not found")
    
    # Get LLM model name from config
    from app.config.app_config import _load_config
    config = _load_config()
    llm_config = config.get("llm", {})
    llm_model = llm_config.get("default_model", "gpt-oss")
    
    # Create agentic service instance for this tender
    agentic_service = AgenticDataExtractionService(
        settings=context.settings,
        embedding_provider=context.embedding_provider,
        qdrant_client=context.qdrant_client,
        mongo_client=context.mongo_client,
        tender_id=tender.id,
        llm_model=llm_model,
        enable_tracing=True,
    )
    
    # Extract all fields using the agentic service
    results = {}
    for field_name, query in BASE_INFORMATION_QUERIES.items():
        logger.info(f"Extracting {field_name} using agentic service")
        try:
            result = await agentic_service.extract_information(field_name, query)
            results[field_name] = result
        except Exception as e:
            logger.error(f"Error extracting {field_name}: {e}")
            results[field_name] = {
                "value": None,
                "exact_text": "",
                "confidence": "low",
                "reasoning": f"Error: {str(e)}"
            }
    

async def run_extract_exclusion_criteria(job: dict) -> None:
    context = get_ctx()
    tender_id = job["tender_id"]
    tender: Tender | None = context.tender_repo.get_tender_by_id(uuid.UUID(tender_id))
    if tender:
        results, data_extraction_requests = await context.data_extraction_service.extract_base_information(
            tender.id,
            EXCLUSION_CRITERIA_QUERIES
        )
        parsed_results = parse_extracted_data(
            context.llm_provider, 
            context.data_extraction_service.parser,
            EXCLUSION_CRITERIA_QUERIES, 
            results, 
            data_extraction_requests
        )


        exclusion_criteria = list(parsed_results.values())
        tender_update = TenderUpdate(exclusion_criteria=exclusion_criteria)
        context.tender_repo.update_tender(tender.id, tender_update)


async def run_extract_requirements(job: dict) -> None:
    context = get_ctx()
    tender_id = job["tender_id"]
    tender: Tender | None = context.tender_repo.get_tender_by_id(uuid.UUID(tender_id))
    if tender:
        documents = context.document_repo.get_documents_by_tender_id(tender.id)
        processed_documents = context.minio_service.get_processed_files(documents)
        requirements = await context.requirement_service.extract_requirements(tender.id, processed_documents)
        logger.info(f"Requirements: {len(requirements)}")

        if requirements:
            context.requirements_repo.create_requirements(requirements)


async def run_step_for_job(job: dict) -> None:
    pipeline_steps = job["pipeline"]
    tender_id = job["tender_id"]
    idx = job["current_step_index"]
    step_name = pipeline_steps[idx]

    try:
        match step_name:
            case "index_documents":
                logger.info(f"Indexing documents for tender {tender_id}")
                await run_index_documents(job)
            case "extract_base_information":
                logger.info(f"Extracting base information for tender {tender_id}")
                await run_extract_base_information(job)
            case "extract_base_information_agentic":
                logger.info(f"Extracting base information (agentic) for tender {tender_id}")
                await run_extract_base_information_agentic(job)
            case "extract_exclusion_criteria":
                logger.info(f"Extracting exclusion criteria for tender {tender_id}")
                await run_extract_exclusion_criteria(job)
            case "extract_requirements":
                logger.info(f"Extracting requirements for tender {tender_id}")
                await run_extract_requirements(job)
            case _:
                raise RuntimeError(f"Unknown step: {step_name}")

        mark_step_success(job["_id"], idx)
    except Exception as exc:
        logger.exception(f"Error running step {step_name} for job {job['_id']}: {exc}")
        tb = traceback.format_exc()
        mark_step_error(job["_id"], idx, f"{exc}\n{tb}")


async def worker_loop(concurrency: int = DEFAULT_WORKER_CONCURRENCY, poll_interval: float = DEFAULT_POLL_INTERVAL) -> None:
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
    concurrency = int(os.getenv("TENDER_WORKER_CONCURRENCY", str(DEFAULT_WORKER_CONCURRENCY)))
    asyncio.run(worker_loop(concurrency=concurrency))
