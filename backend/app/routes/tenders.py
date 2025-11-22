from concurrent.futures import ThreadPoolExecutor
from typing import Annotated, List, Optional
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
from app.models.tender import TenderProcessingStatus

router = APIRouter(
    prefix="/tenders",
    tags=["tenders"],
    responses={404: {"description": "Not found"}},
)
thread_pool = ThreadPoolExecutor(max_workers=4)

# Get MongoDB client for job queries
mongo_client = get_mongo_client()
tender_jobs_collection = mongo_client["skillMatch"]["tender_jobs"]


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
) -> List[Tender]:
    all_tenders = tender_repo.get_tenders()
    
    # Get all tender IDs that have completed jobs (status = "done")
    completed_jobs = tender_jobs_collection.find({
        "type": "tender_processing",
        "status": TenderProcessingStatus.done.value,
    })
    
    # Create a set of tender IDs with completed jobs
    completed_tender_ids = {job["tender_id"] for job in completed_jobs}
    
    # Filter tenders to only include those with completed jobs
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
