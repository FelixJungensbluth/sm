from pydantic import BaseModel
import yaml

from app.config.logger import logger
from app.models.tender import Tender
from app.services.document_processing.document_processing_service import process_documents
from app.services.external.minio_service import MinioService


class Pipeline(BaseModel):
    embedding: str
    llm: str


class TenderProcessingPipeline:
    def __init__(self, minio_service: MinioService):
        self.pipeline = self.init_pipeline()
        self.minio_service = minio_service

    def init_pipeline(self):
        # with open("config.yaml") as f:
        #     data = yaml.safe_load(f)

        return Pipeline(embedding="text-embedding-3-small", llm="gpt-4o-mini")

    async def analyze_tender(self, tender: Tender):
        logger.info(f"Analyzing tender {tender.id}")
        process_documents(tender.id, self.minio_service)

    pass
