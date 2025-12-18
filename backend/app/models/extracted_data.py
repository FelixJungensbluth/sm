from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional

class ExtractedDataStatus(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"

class ExtractedData(BaseModel):
    value: Optional[str] = Field(
        None, description="The extracted value for the field"
    )
    source_file: Optional[str] = Field(
        None, description="The source file where the information was found"
    )
    source_file_id: Optional[str] = Field(
        None, description="The source file id where the information was found"
    )
    exact_text: Optional[str] = Field(
        None, description="The exact text passage from the document"
    )
    field_name: str = Field(description="The field which is extracted")
    status: ExtractedDataStatus = ExtractedDataStatus.PENDING
    note: Optional[str] = None
    fulfillable: Optional[bool] = None