from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid
from pydantic import BaseModel

from app.models.extracted_data import ExtractedData
from app.models.document import Document


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
    base_information: list[ExtractedData]
    exclusion_criteria: list[ExtractedData]
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
            exclusion_criteria=[],
            status=TenderReviewStatus.in_review,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    generated_title: Optional[str] = None
    description: Optional[str] = None
    base_information: Optional[list[ExtractedData]] = None
    exclusion_criteria: Optional[list[ExtractedData]] = None
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
    documents: list[Document]


class UpdateTenderBaseInformationStatusResponse(BaseModel):
    """Response model for updating tender base information status."""
    success: bool
    message: str