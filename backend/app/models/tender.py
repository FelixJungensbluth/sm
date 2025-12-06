from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid
from pydantic import BaseModel

from app.models.base_information import BaseInformation


class TenderReviewStatus(str, Enum):
    in_review = "In Prüfung"
    uninteresting = "Uninteressant"
    in_preparation = "In Ausarbeitung"
    send_off = "Abgeschickt"
    rejected = "Abgelehnt"


class TenderProcessingStatus(str, Enum):
    queued = "queued"
    processing = "processing"
    done = "done"
    error = "error"
    cancelled = "cancelled"


class Tender(BaseModel):
    id: uuid.UUID
    title: str
    generated_title: str
    description: str
    base_information: list[BaseInformation]
    status: TenderReviewStatus
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, title: str) -> "Tender":
        return cls(
            id=uuid.uuid4(),
            title=title,
            generated_title="",
            description="",
            base_information=[],
            status=TenderReviewStatus.in_review,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    generated_title: Optional[str] = None
    description: Optional[str] = None
    base_information: Optional[list[BaseInformation]] = None
    status: Optional[TenderReviewStatus] = None


class CreateTenderResponse(BaseModel):
    """Response model for tender creation."""
    tender_id: str
    job_id: str
    status: str


class TenderResponse(BaseModel):
    """Response model for a single tender."""
    tender: Tender


class TenderListResponse(BaseModel):
    """Response model for a list of tenders."""
    tenders: list[Tender]


class TenderDocumentListResponse(BaseModel):
    """Response model for tender documents."""
    documents: list[dict]  # Using dict to avoid circular import with Document


class UpdateTenderBaseInformationStatusResponse(BaseModel):
    """Response model for updating tender base information status."""
    success: bool
    message: str