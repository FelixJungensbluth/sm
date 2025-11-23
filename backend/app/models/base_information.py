from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional

class BaseInformationStatus(Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    PENDING = "pending"

class BaseInformation(BaseModel):
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
    status: BaseInformationStatus = BaseInformationStatus.PENDING
    note: Optional[str] = None
    fulfillable: Optional[bool] = None

class ExtractedBaseInformation(BaseModel):
    name: Optional[BaseInformation] = None
    type: Optional[BaseInformation] = None
    submission_deadline: Optional[BaseInformation] = None
    questions_deadline: Optional[BaseInformation] = None
    binding_period: Optional[BaseInformation] = None
    implementation_period: Optional[BaseInformation] = None
    contract_duration: Optional[BaseInformation] = None
    client: Optional[BaseInformation] = None
    client_office_location: Optional[BaseInformation] = None
    russia_sanctions: Optional[BaseInformation] = None
    reliability_123_124: Optional[BaseInformation] = None
    certificates: Optional[BaseInformation] = None
    employee_certificates: Optional[BaseInformation] = None
    reference_projects: Optional[BaseInformation] = None
    min_revenue_last_3_years: Optional[BaseInformation] = None
    min_employees_last_3_years: Optional[BaseInformation] = None
    compact_description: Optional[BaseInformation] = None
    contract_volume: Optional[BaseInformation] = None
    liability_insurance: Optional[BaseInformation] = None