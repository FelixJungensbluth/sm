from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
from bson import ObjectId

from app.models.tender import TenderProcessingStatus


class StepStatus(BaseModel):
    name: str
    status: str 
    last_error: Optional[str] = None


class TenderJob(BaseModel):
    """Tender processing job model."""
    model_config = ConfigDict(
        populate_by_name=True,
        json_encoders={ObjectId: str},
    )
    
    id: Optional[str] = Field(default=None, alias="_id", description="Job ID")
    type: str = Field(default="tender_processing", description="Job type")
    tender_id: str
    document_ids: List[str]
    pipeline: List[str]
    current_step_index: int
    status: TenderProcessingStatus
    step_status: List[StepStatus]
    attempts: int
    max_attempts: int
    locked_by: Optional[str] = None
    locked_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid(cls, v):
        """Convert ObjectId to string."""
        if v is None:
            return None
        if isinstance(v, ObjectId):
            return str(v)
        return v


class JobResponse(BaseModel):
    job_id: str
    message: str
    status: str

