from datetime import timezone
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from pymongo import ReturnDocument

from app.database.mongo import get_mongo_client
from app.models.tender import TenderProcessingStatus
from app.models.job import TenderJob, StepStatus

client = get_mongo_client()
db = client["skillMatch"]
tender_jobs = db["tender_jobs"]

WORKER_LOCK_TIMEOUT = timedelta(minutes=10)


def ensure_indexes() -> None:
    tender_jobs.create_index(
        [("type", 1), ("status", 1), ("created_at", 1)],
        name="queue_lookup_idx",
    )
    tender_jobs.create_index(
        [("locked_by", 1), ("locked_at", 1)],
        name="lock_lookup_idx",
    )


def enqueue_tender_job(
    tender_id: str,
    document_ids: List[str],
) -> ObjectId:
    now = datetime.now(timezone.utc)
    
    job = TenderJob(
        type="tender_processing",
        tender_id=tender_id,
        document_ids=document_ids,
        pipeline=["index_documents", "extract_base_information_agentic", "extract_base_information", "extract_exclusion_criteria", "extract_requirements"],
        current_step_index=0,
        status=TenderProcessingStatus.queued,
        step_status=[
            StepStatus(name="index_documents", status="pending", last_error=None),
            StepStatus(name="extract_base_information_agentic", status="pending", last_error=None),
            StepStatus(name="extract_base_information", status="pending", last_error=None),
            StepStatus(name="extract_exclusion_criteria", status="pending", last_error=None),
            StepStatus(name="extract_requirements", status="pending", last_error=None),
        ],
        attempts=0,
        max_attempts=5,
        locked_by=None,
        locked_at=None,
        created_at=now,
        updated_at=now,
    )
    
    doc = job.model_dump(by_alias=True, exclude_none=True)
    result = tender_jobs.insert_one(doc)
    return result.inserted_id


def claim_next_job(worker_id: str) -> Optional[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    lock_timeout = now - WORKER_LOCK_TIMEOUT

    query = {
        "type": "tender_processing",
        "status": TenderProcessingStatus.queued.value,
        "$or": [
            {"locked_by": None},
            {"locked_at": {"$lte": lock_timeout}},
        ],
    }

    update = {
        "$set": {
            "status": TenderProcessingStatus.processing.value,
            "locked_by": worker_id,
            "locked_at": now,
            "updated_at": now,
        },
        "$inc": {"attempts": 1},
    }

    job = tender_jobs.find_one_and_update(
        query,
        update,
        sort=[("created_at", 1)],
        return_document=ReturnDocument.AFTER,
    )
    return job


def mark_step_success(job_id: ObjectId, step_index: int) -> None:
    now = datetime.now(timezone.utc)
    job = tender_jobs.find_one({"_id": job_id})
    if not job:
        return

    pipeline = job["pipeline"]
    step_status = job["step_status"]
    step_status[step_index]["status"] = "done"
    step_status[step_index]["last_error"] = None

    if step_index + 1 < len(pipeline):
        new_status = TenderProcessingStatus.queued.value
        new_step_index = step_index + 1
    else:
        new_status = TenderProcessingStatus.done.value
        new_step_index = step_index

    tender_jobs.update_one(
        {"_id": job_id},
        {
            "$set": {
                "step_status": step_status,
                "current_step_index": new_step_index,
                "status": new_status,
                "locked_by": None,
                "locked_at": None,
                "updated_at": now,
            }
        },
    )


def mark_step_error(job_id: ObjectId, step_index: int, error_msg: str) -> None:
    now = datetime.now(timezone.utc)
    job = tender_jobs.find_one({"_id": job_id})
    if not job:
        return

    step_status = job["step_status"]
    step_status[step_index]["status"] = "error"
    step_status[step_index]["last_error"] = error_msg

    new_status = TenderProcessingStatus.error.value
    if job["attempts"] < job.get("max_attempts", 5):
        new_status = TenderProcessingStatus.queued.value

    tender_jobs.update_one(
        {"_id": job_id},
        {
            "$set": {
                "step_status": step_status,
                "status": new_status,
                "locked_by": None,
                "locked_at": None,
                "updated_at": now,
            }
        },
    )


def cancel_job(job_id: ObjectId) -> None:
    now = datetime.now(timezone.utc)
    tender_jobs.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": TenderProcessingStatus.cancelled.value,
                "locked_by": None,
                "locked_at": None,
                "updated_at": now,
            }
        },
    )


def restart_job_from_step(job_id: ObjectId, step_index: int) -> None:
    now = datetime.now(timezone.utc)
    job = tender_jobs.find_one({"_id": job_id})
    if not job:
        return

    if not (0 <= step_index < len(job["step_status"])):
        raise ValueError("Invalid step_index")

    step_status = job["step_status"]
    for i in range(step_index, len(step_status)):
        step_status[i]["status"] = "pending"
        step_status[i]["last_error"] = None

    tender_jobs.update_one(
        {"_id": job_id},
        {
            "$set": {
                "status": TenderProcessingStatus.queued.value,
                "current_step_index": step_index,
                "step_status": step_status,
                "locked_by": None,
                "locked_at": None,
                "updated_at": now,
            }
        },
    )


def get_job_by_id(job_id: ObjectId) -> Optional[Dict[str, Any]]:
    return tender_jobs.find_one({"_id": job_id})


def get_jobs_not_done() -> List[Dict[str, Any]]:
    query = {
        "type": "tender_processing",
        "status": {"$ne": TenderProcessingStatus.done.value},
    }
    return list(tender_jobs.find(query).sort("created_at", -1))
