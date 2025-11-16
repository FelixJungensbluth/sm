from datetime import datetime, timezone
import uuid
from pydantic import BaseModel


class Tender(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, name: str) -> "Tender":
        return cls(
            id=uuid.uuid4(),
            title=name,
            description="",
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
