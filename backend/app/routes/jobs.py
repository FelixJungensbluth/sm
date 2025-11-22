from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from bson import ObjectId
from bson.errors import InvalidId

from app.models.job import TenderJob, JobResponse
from app.queue.tender_queue import (
    get_jobs_not_done,
    get_job_by_id,
    cancel_job,
    restart_job_from_step,
)

router = APIRouter(
    prefix="/jobs",
    tags=["jobs"],
    responses={404: {"description": "Not found"}},
)


def parse_job_id(job_id: str) -> ObjectId:
    """Parse a job ID string into an ObjectId, raising HTTPException if invalid."""
    try:
        return ObjectId(job_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid job ID format: {job_id}",
        )


@router.get("/", status_code=200, operation_id="get_jobs_not_done")
async def get_jobs_not_done_endpoint() -> List[TenderJob]:
    """Get all tender jobs that are not done."""
    jobs = get_jobs_not_done()
    return [TenderJob.model_validate(job) for job in jobs]


@router.post("/{job_id}/restart", status_code=200, operation_id="restart_job")
async def restart_job_endpoint(
    job_id: str,
    step_index: int = Query(default=0, ge=0, description="Step index to restart from (0 = beginning)"),
) -> JobResponse:
    """Restart a job from a specific step (default: step 0, beginning)."""
    obj_id = parse_job_id(job_id)
    
    job = get_job_by_id(obj_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}",
        )
    
    try:
        restart_job_from_step(obj_id, step_index)
        return JobResponse(
            job_id=job_id,
            message=f"Job restarted from step {step_index}",
            status="queued",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/{job_id}/cancel", status_code=200, operation_id="cancel_job")
async def cancel_job_endpoint(job_id: str) -> JobResponse:
    """Cancel a job."""
    obj_id = parse_job_id(job_id)
    
    job = get_job_by_id(obj_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job not found: {job_id}",
        )
    
    cancel_job(obj_id)
    return JobResponse(
        job_id=job_id,
        message="Job cancelled",
        status="cancelled",
    )

