from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status
from bson import ObjectId
from bson.errors import InvalidId

from app.models.job import TenderJob, JobResponse, JobListResponse
from app.queue.tender_queue import (
    get_jobs_not_done,
    get_job_by_id,
    cancel_job,
    restart_job_from_step,
)
from app.exceptions import create_not_found_exception, create_validation_exception

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


@router.get(
    "/",
    status_code=status.HTTP_200_OK,
    response_model=JobListResponse,
    operation_id="get_jobs_not_done",
    summary="Get all incomplete jobs",
    description="Retrieve all tender processing jobs that are not yet completed.",
)
async def get_jobs_not_done_endpoint() -> JobListResponse:
    """
    Get all tender jobs that are not done.
    
    Returns:
        JobListResponse containing list of incomplete jobs
    """
    jobs = get_jobs_not_done()
    tender_jobs = [TenderJob.model_validate(job) for job in jobs]
    return JobListResponse(jobs=tender_jobs)


@router.post(
    "/{job_id}/restart",
    status_code=status.HTTP_200_OK,
    response_model=JobResponse,
    operation_id="restart_job",
    summary="Restart a job",
    description="Restart a tender processing job from a specific step. Default is to restart from the beginning (step 0).",
)
async def restart_job_endpoint(
    job_id: str,
    step_index: int = Query(
        default=0,
        ge=0,
        description="Step index to restart from (0 = beginning)",
    ),
) -> JobResponse:
    """
    Restart a job from a specific step.
    
    Args:
        job_id: String ID of the job to restart
        step_index: Index of the step to restart from (0 = beginning)
        
    Returns:
        JobResponse with job_id, message, and status
        
    Raises:
        HTTPException: 400 if job_id is invalid or step_index is out of range
        HTTPException: 404 if job not found
    """
    obj_id = parse_job_id(job_id)
    
    job = get_job_by_id(obj_id)
    if not job:
        raise create_not_found_exception("Job", job_id)
    
    try:
        restart_job_from_step(obj_id, step_index)
        return JobResponse(
            job_id=job_id,
            message=f"Job restarted from step {step_index}",
            status="queued",
        )
    except ValueError as e:
        raise create_validation_exception(str(e))


@router.post(
    "/{job_id}/cancel",
    status_code=status.HTTP_200_OK,
    response_model=JobResponse,
    operation_id="cancel_job",
    summary="Cancel a job",
    description="Cancel a tender processing job.",
)
async def cancel_job_endpoint(job_id: str) -> JobResponse:
    """
    Cancel a job.
    
    Args:
        job_id: String ID of the job to cancel
        
    Returns:
        JobResponse with job_id, message, and status
        
    Raises:
        HTTPException: 400 if job_id is invalid
        HTTPException: 404 if job not found
    """
    obj_id = parse_job_id(job_id)
    
    job = get_job_by_id(obj_id)
    if not job:
        raise create_not_found_exception("Job", job_id)
    
    cancel_job(obj_id)
    return JobResponse(
        job_id=job_id,
        message="Job cancelled",
        status="cancelled",
    )

