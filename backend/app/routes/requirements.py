from app.models.requirement import (
    RequirementStatus,
    Requirement,
    RequirementListResponse,
    UpdateRequirementStatusResponse,
)
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.repos.shared import get_requirements_repo
from app.repos.requirements_repo import RequirementsRepo
from app.repos.tender_repo import TenderRepo
from app.repos.shared import get_tender_repo
from app.exceptions import create_not_found_exception
import uuid

router = APIRouter(
    prefix="/requirements",
    tags=["requirements"],
    responses={404: {"description": "Not found"}},
)


@router.get(
    "/{tender_id}",
    status_code=status.HTTP_200_OK,
    response_model=RequirementListResponse,
    operation_id="get_requirements_for_tender",
    summary="Get requirements for a tender",
    description="Retrieve all requirements associated with a specific tender.",
)
async def get_requirements_for_tender(
    tender_id: uuid.UUID,
    requirements_repo: RequirementsRepo = Depends(get_requirements_repo),
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> RequirementListResponse:
    """
    Get all requirements for a tender.
    
    Args:
        tender_id: UUID of the tender
        requirements_repo: Repository for requirements operations
        tender_repo: Repository for tender operations
        
    Returns:
        RequirementListResponse containing list of requirements
        
    Raises:
        HTTPException: 404 if tender not found
    """
    # Verify tender exists
    tender = tender_repo.get_tender_by_id(tender_id)
    if not tender:
        raise create_not_found_exception("Tender", str(tender_id))
    
    requirements = requirements_repo.get_requirements_by_tender_id(tender_id)
    return RequirementListResponse(requirements=requirements)


@router.put(
    "/{requirement_id}/status",
    status_code=status.HTTP_200_OK,
    response_model=UpdateRequirementStatusResponse,
    operation_id="update_requirement_status",
    summary="Update requirement status",
    description="Update the status of a specific requirement (e.g., approved, rejected, pending).",
)
async def update_requirement_status(
    requirement_id: uuid.UUID,
    requirement_status: RequirementStatus,
    requirements_repo: RequirementsRepo = Depends(get_requirements_repo),
) -> UpdateRequirementStatusResponse:
    """
    Update the status of a requirement.
    
    Args:
        requirement_id: UUID of the requirement to update
        requirement_status: New status value
        requirements_repo: Repository for requirements operations
        
    Returns:
        UpdateRequirementStatusResponse with success status
        
    Raises:
        HTTPException: 404 if requirement not found
    """
    success = requirements_repo.update_requirement_status(requirement_id, requirement_status)
    if not success:
        raise create_not_found_exception("Requirement", str(requirement_id))
    
    return UpdateRequirementStatusResponse(
        success=True,
        message=f"Requirement status updated to {requirement_status.value}",
    )
