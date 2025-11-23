from enum import Enum
from typing import Optional
import uuid
from pydantic.main import BaseModel

class RequirementType(str, Enum):
    BUSINESS = "Business"
    ZU_ERARBEITEN = "Zu erarbeiten"
    REFERENZPROJEKT = "Referenzprojekt"
    NACHWEIS_ZERTIFIKAT = "Nachweis Zertifikat"
    NACHWEIS_PERSONAL = "Nachweis Personal"
    SONSTIGES = "Sonstiges"

class RequirementStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    DELETED = "deleted"
    DUPLICATE = "duplicate"

class Requirement(BaseModel):
    id: uuid.UUID
    name: str
    source: str
    category: str
    type: RequirementType
    file: str
    status: RequirementStatus = RequirementStatus.PENDING
    note: Optional[str] = None
    tender_id: uuid.UUID
