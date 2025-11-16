from dataclasses import dataclass
from enum import Enum
from typing import List
import uuid
from pydantic import BaseModel


class DocumentTag(str, Enum):
    EINZUREICHENDE_UNTERLAGEN = "Einzureichende Unterlagen"
    FACHLICHE_INFORMATIONEN = "Fachliche Informationen"
    ORGANISATORISCHE_INFORMATIONEN = "Organisatorische Informationen"
    BEWERTUNGSKRITERIEN = "Bewertungskriterien"


class File(BaseModel):
    id: uuid.UUID
    name: str
    tender_id: uuid.UUID
    relevant_to_tender_context: bool | None = None
    summary: str | None = None
    tags: List[DocumentTag] = []
    processed: bool = False


@dataclass
class ProcessedFile:
    name: str
    content: str
