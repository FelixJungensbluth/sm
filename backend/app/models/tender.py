from datetime import datetime, timezone
from enum import Enum
from typing import Optional
import uuid
from pydantic import BaseModel

from app.models.base_information import BaseInformation


class TenderStatus(str, Enum):
    in_review = "In Prüfung"
    uninteresting = "Uninteressant"
    in_preparation = "In Ausarbeitung"
    send_off = "Abgeschickt"
    rejected = "Abgelehnt"


class Tender(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    base_information: list[BaseInformation]
    status: TenderStatus
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, name: str) -> "Tender":
        return cls(
            id=uuid.uuid4(),
            title=name,
            description="",
            base_information=[],
            status=TenderStatus.in_review,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    base_information: Optional[list[BaseInformation]] = None
    status: Optional[TenderStatus] = None