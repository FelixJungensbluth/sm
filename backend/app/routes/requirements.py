from app.models.requirement import RequirementStatus
from app.models.requirement import Requirement
from typing import List
from fastapi.param_functions import Depends
from app.repos.shared import get_requirements_repo
from app.repos.requirements_repo import RequirementsRepo
import uuid
from fastapi.routing import APIRouter

router = APIRouter(
    prefix="/requirements",
    tags=["requirements"],
    responses={404: {"description": "Not found"}},
)


@router.get("/{tender_id}", status_code=200, operation_id="get_requirements_for_tender")
async def get_requirements_for_tender(
    tender_id: uuid.UUID,
    requirements_repo: RequirementsRepo = Depends(get_requirements_repo),
) -> List[Requirement]:
    return requirements_repo.get_requirements_by_tender_id(tender_id)


@router.put(
    "/{requirement_id}/status",
    status_code=200,
    operation_id="update_requirement_status",
)
async def update_requirement_status(
    requirement_id: uuid.UUID,
    requirement_status: RequirementStatus,
    requirements_repo: RequirementsRepo = Depends(get_requirements_repo),
):
    requirements_repo.update_requirement_status(requirement_id, requirement_status)
