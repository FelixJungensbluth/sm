from dataclasses import dataclass
import uuid
from pydantic import BaseModel


class Document(BaseModel):
    id: uuid.UUID
    name: str
    tender_id: uuid.UUID


@dataclass
class ProcessedDocument:
    document_id: uuid.UUID
    content: str
