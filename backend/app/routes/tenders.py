from app.models.extracted_data import ExtractedDataStatus
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
    Query,
    UploadFile,
    status,
)

from app.models.tender import (
    Tender,
    TenderUpdate,
    CreateTenderResponse,
    TenderResponse,
    TenderListResponse,
    TenderDocumentListResponse,
    UpdateTenderBaseInformationStatusResponse,
)
from app.repos.shared import get_document_repo, get_tender_repo
from app.repos.tender_repo import TenderRepo
from app.config.logger import logger
from app.services.external.minio_service import MinioService
from app.services.shared import get_minio_service
from app.repos.document_repo import DocumentRepo
from app.models.document import Document
from app.exceptions import create_not_found_exception

from app.queue.tender_queue import enqueue_tender_job
from app.database.mongo import get_mongo_client

router = APIRouter(
    prefix="/tenders",
    tags=["tenders"],
    responses={404: {"description": "Not found"}},
)

@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=CreateTenderResponse,
    operation_id="create_tender",
    summary="Create a new tender",
    description="Create a new tender with uploaded files. Files are uploaded to MinIO and a processing job is queued.",
)
async def create_tenders(
    files: Annotated[list[UploadFile], File(description="Files to upload for the tender")],
    name: Annotated[str, Form(description="Name/title of the tender")],
    minio_service: MinioService = Depends(get_minio_service),
    tender_repo: TenderRepo = Depends(get_tender_repo),
    document_repo: DocumentRepo = Depends(get_document_repo),
) -> CreateTenderResponse:
    """
    Create a new tender with uploaded files.
    
    Args:
        files: List of files to upload
        name: Name/title of the tender
        minio_service: MinIO service for file storage
        tender_repo: Repository for tender operations
        document_repo: Repository for document operations
        
    Returns:
        CreateTenderResponse with tender_id, job_id, and status
        
    Raises:
        HTTPException: If file upload fails
    """
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

    return CreateTenderResponse(
        tender_id=str(tender.id),
        job_id=str(job_id),
        status="queued",
    )


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=TenderListResponse,
    operation_id="get_tenders",
    summary="Get all completed tenders",
    description="Retrieve all tenders that have completed processing.",
)
async def get_tenders(
    tender_repo: TenderRepo = Depends(get_tender_repo),
    jobs_repo: JobsRepo = Depends(get_jobs_repo),
) -> TenderListResponse:
    """
    Get all completed tenders.
    
    Args:
        tender_repo: Repository for tender operations
        jobs_repo: Repository for job operations
        
    Returns:
        TenderListResponse containing list of completed tenders
    """
    completed_jobs = jobs_repo.get_completed_jobs()
    completed_tender_ids = {uuid.UUID(job["tender_id"]) for job in completed_jobs if job.get("tender_id")}
    
    if not completed_tender_ids:
        return TenderListResponse(tenders=[])
    
    # Use optimized method to fetch only completed tenders
    tenders = tender_repo.get_tenders_by_ids(list(completed_tender_ids))
    return TenderListResponse(tenders=tenders)


@router.get(
    "/{tender_id}",
    status_code=status.HTTP_200_OK,
    response_model=TenderResponse,
    operation_id="get_tender_by_id",
    summary="Get tender by ID",
    description="Retrieve a specific tender by its ID.",
)
async def get_tender_by_id(
    tender_id: uuid.UUID,
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> TenderResponse:
    """
    Get a tender by its ID.
    
    Args:
        tender_id: UUID of the tender to retrieve
        tender_repo: Repository for tender operations
        
    Returns:
        TenderResponse containing the tender
        
    Raises:
        HTTPException: 404 if tender not found
    """
    tender = tender_repo.get_tender_by_id(tender_id)
    if not tender:
        raise create_not_found_exception("Tender", str(tender_id))
    return TenderResponse(tender=tender)


@router.delete(
    "/{tender_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_tender",
    summary="Delete a tender",
    description="Delete a tender by its ID.",
)
async def delete_tender(
    tender_id: uuid.UUID,
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> None:
    """
    Delete a tender by its ID.
    
    Args:
        tender_id: UUID of the tender to delete
        tender_repo: Repository for tender operations
        
    Raises:
        HTTPException: 404 if tender not found
    """
    tender = tender_repo.get_tender_by_id(tender_id)
    if not tender:
        raise create_not_found_exception("Tender", str(tender_id))
    
    success = tender_repo.delete_tender(tender_id)
    if not success:
        raise create_not_found_exception("Tender", str(tender_id))


@router.put(
    "/{tender_id}",
    status_code=status.HTTP_200_OK,
    response_model=TenderResponse,
    operation_id="update_tender",
    summary="Update a tender",
    description="Update tender fields such as title, description, status, or base information.",
)
async def update_tender(
    tender_id: uuid.UUID,
    tender_update: TenderUpdate,
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> TenderResponse:
    """
    Update a tender by its ID.
    
    Args:
        tender_id: UUID of the tender to update
        tender_update: TenderUpdate model with fields to update
        tender_repo: Repository for tender operations
        
    Returns:
        TenderResponse containing the updated tender
        
    Raises:
        HTTPException: 404 if tender not found
    """
    # Check if tender exists
    existing_tender = tender_repo.get_tender_by_id(tender_id)
    if not existing_tender:
        raise create_not_found_exception("Tender", str(tender_id))
    
    updated_tender = tender_repo.update_tender(tender_id, tender_update)
    if not updated_tender:
        raise create_not_found_exception("Tender", str(tender_id))
    
    return TenderResponse(tender=updated_tender)


@router.get(
    "/{tender_id}/documents",
    status_code=status.HTTP_200_OK,
    response_model=TenderDocumentListResponse,
    operation_id="get_tender_documents",
    summary="Get tender documents",
    description="Retrieve all documents associated with a tender.",
)
async def get_tender_documents(
    tender_id: uuid.UUID,
    document_repo: DocumentRepo = Depends(get_document_repo),
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> TenderDocumentListResponse:
    """
    Get all documents for a tender.
    
    Args:
        tender_id: UUID of the tender
        document_repo: Repository for document operations
        tender_repo: Repository for tender operations
        
    Returns:
        TenderDocumentListResponse containing list of documents
        
    Raises:
        HTTPException: 404 if tender not found
    """
    # Verify tender exists
    tender = tender_repo.get_tender_by_id(tender_id)
    if not tender:
        raise create_not_found_exception("Tender", str(tender_id))
    
    documents = document_repo.get_documents_by_tender_id(tender_id)
    # Convert to dict format for response
    document_dicts = [
        {"id": str(doc.id), "name": doc.name, "tender_id": str(doc.tender_id)}
        for doc in documents
    ]
    return TenderDocumentListResponse(documents=documents)


@router.put(
    "/{tender_id}/base_information_status",
    status_code=status.HTTP_200_OK,
    response_model=UpdateTenderBaseInformationStatusResponse,
    operation_id="update_tender_base_information_status",
    summary="Update tender base information status",
    description="Update the status of a specific base information field for a tender.",
)
async def update_tender_base_information_status(
    tender_id: uuid.UUID,
    field_name: str = Query(..., description="Name of the base information field to update"),
    base_information_status: ExtractedDataStatus = Query(..., description="New status for the field"),
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> UpdateTenderBaseInformationStatusResponse:
    """
    Update the status of a base information field for a tender.
    
    Args:
        tender_id: UUID of the tender
        field_name: Name of the base information field
        base_information_status: New status value
        tender_repo: Repository for tender operations
        
    Returns:
        UpdateTenderBaseInformationStatusResponse with success status
        
    Raises:
        HTTPException: 404 if tender not found or field not found
    """
    # Verify tender exists
    tender = tender_repo.get_tender_by_id(tender_id)
    if not tender:
        raise create_not_found_exception("Tender", str(tender_id))
    
    success = tender_repo.update_tender_base_information_status(tender_id, field_name, base_information_status)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Base information field '{field_name}' not found for tender '{tender_id}'",
        )
    
    return UpdateTenderBaseInformationStatusResponse(
        success=True,
        message=f"Base information field '{field_name}' status updated successfully",
    )