from app.models.base_information import BaseInformationStatus
from app.repos.shared import get_jobs_repo
from app.repos.jobs_repo import JobsRepo
from typing import Annotated, List, Optional
import uuid
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from app.models.tender import Tender, TenderUpdate
from app.repos.shared import get_document_repo, get_tender_repo
from app.repos.tender_repo import TenderRepo
from app.config.logger import logger
from app.services.external.minio_service import MinioService
from app.services.shared import get_minio_service
from app.repos.document_repo import DocumentRepo
from app.models.document import Document

from app.queue.tender_queue import enqueue_tender_job
from app.database.mongo import get_mongo_client

router = APIRouter(
    prefix="/tenders",
    tags=["tenders"],
    responses={404: {"description": "Not found"}},
)

@router.post("/", status_code=201, operation_id="create_tender")
async def create_tenders(
    files: Annotated[list[UploadFile], File()],
    name: Annotated[str, Form()],
    minio_service: MinioService = Depends(get_minio_service),
    tender_repo: TenderRepo = Depends(get_tender_repo),
    document_repo: DocumentRepo = Depends(get_document_repo),
):
    tender = Tender.create(name)
    tender_repo.create_tender(tender)

    documents: list[Document] = []
    try:
        for file in files:
            document_id = uuid.uuid4()
            minio_service.upload_tender_file(tender.id, file, document_id)
            documents.append(
                Document(id=document_id, tender_id=tender.id, name=file.filename or "")
            )

        if documents:
            document_repo.create_documents(documents)

    except Exception as e:
        logger.exception(f"Error uploading files for {tender.id}: {e}")
        tender_repo.delete_tender(tender.id)

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to upload files",
        )

    job_id = enqueue_tender_job(
        tender_id=str(tender.id),
        document_ids=[str(d.id) for d in documents],
    )

    return {
        "tender_id": str(tender.id),
        "job_id": str(job_id),
        "status": "queued",
    }


@router.get("/", status_code=200, operation_id="get_tenders")
async def get_tenders(
    tender_repo: TenderRepo = Depends(get_tender_repo),
    jobs_repo: JobsRepo = Depends(get_jobs_repo),
) -> List[Tender]:
    all_tenders = tender_repo.get_tenders()
    
    completed_jobs = jobs_repo.get_completed_jobs()
    completed_tender_ids = {job["tender_id"] for job in completed_jobs}
    
    completed_tenders = [
        tender for tender in all_tenders
        if str(tender.id) in completed_tender_ids
    ]
    
    return completed_tenders


@router.get("/{tender_id}", status_code=200, operation_id="get_tender_by_id")
async def get_tender_by_id(
    tender_id: uuid.UUID,
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> Optional[Tender]:
    return tender_repo.get_tender_by_id(tender_id)


@router.delete("/{tender_id}", status_code=200, operation_id="delete_tender")
async def delete_tender(
    tender_id: uuid.UUID,
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    return tender_repo.delete_tender(tender_id)


@router.put("/{tender_id}", status_code=200, operation_id="update_tender")
async def update_tender(
    tender_id: uuid.UUID,
    tender_update: TenderUpdate,
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    return tender_repo.update_tender(tender_id, tender_update)


@router.get(
    "/{tender_id}/documents", status_code=200, operation_id="get_tender_documents"
)
async def get_tender_documents(
    tender_id: uuid.UUID,
    document_repo: DocumentRepo = Depends(get_document_repo),
) -> List[Document]:
    return document_repo.get_documents_by_tender_id(tender_id)


@router.put("/{tender_id}/base_information_status", status_code=200, operation_id="update_tender_base_information_status")
async def update_tender_base_information_status(
    tender_id: uuid.UUID,
    field_name: str,
    base_information_status: BaseInformationStatus,
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    return tender_repo.update_tender_base_information_status(tender_id, field_name, base_information_status)