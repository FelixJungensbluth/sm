from datetime import datetime, timezone
from typing import Optional
import uuid
from pydantic import BaseModel

from app.models.base_information import BaseInformation


class Tender(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    base_information: list[BaseInformation] 
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, name: str) -> "Tender":
        return cls(
            id=uuid.uuid4(),
            title=name,
            description="",
            base_information=[],
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )


class TenderUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    base_information: Optional[list[BaseInformation]] = None
