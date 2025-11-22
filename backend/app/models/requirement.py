from enum import Enum
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
    NOT_SET = "Nicht gesetzt"
    NOT_FULFILLED = "Nicht erfüllt"
    PARTIALLY_FULFILLED = "Teilweise erfüllt"
    FULFILLED = "Erfüllt"

class Requirement(BaseModel):
    id: uuid.UUID
    name: str
    source: str
    category: str
    type: RequirementType
    file: str
    status: RequirementStatus = RequirementStatus.NOT_SET
    note: str | None = None
    tender_id: uuid.UUID
    deleted: bool = False
    duplicate: bool | None = None
