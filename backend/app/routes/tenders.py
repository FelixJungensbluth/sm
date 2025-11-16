import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Annotated
import uuid
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from app.models.tender import Tender
from app.processing_pipeline import TenderProcessingPipeline
from app.repos.shared import get_tender_repo
from app.repos.tender_repo import TenderRepo
from app.config.logger import logger
from app.services.external.minio_service import MinioService
from app.services.shared import get_minio_service

router = APIRouter(
    prefix="/tenders",
    tags=["tenders"],
    responses={404: {"description": "Not found"}},
)
thread_pool = ThreadPoolExecutor(max_workers=4)


@router.post("/", status_code=201)
async def create_tenders(
    files: Annotated[list[UploadFile], File()],
    name: Annotated[str, Form()],
    background_tasks: BackgroundTasks,
    minio_service: MinioService = Depends(get_minio_service),
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    tender = Tender.create(name)
    tender_repo.create_tender(tender)

    try:
        for file in files:
            minio_service.upload_tender_file(tender.id, file)
    except Exception as e:
        logger.exception(f"Error uploading files for {tender.id}: {e}")
        tender_repo.delete_tender(tender.id)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to upload files",
        )

    pipeline = TenderProcessingPipeline(minio_service)
    loop = asyncio.get_event_loop()
    background_tasks.add_task(
        loop.run_in_executor,
        thread_pool,
        lambda: asyncio.run(pipeline.analyze_tender(tender)),
    )


@router.get("/", status_code=200)
async def get_tenders(
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    return tender_repo.get_tenders()


@router.get("/{tender_id}", status_code=200)
async def get_tender(
    tender_id: uuid.UUID,
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    return tender_repo.get_tender_by_id(tender_id)


@router.delete("/{tender_id}", status_code=200)
async def delete_tender(
    tender_id: uuid.UUID,
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    return tender_repo.delete_tender(tender_id)
