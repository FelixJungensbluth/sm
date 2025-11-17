from pydantic import BaseModel, ConfigDict

from app.config.logger import logger
from app.models.tender import Tender
from app.services.document_processing.document_processing_service import (
    process_documents,
)
from app.services.external.minio_service import MinioService
from app.models.document import Document
from app.llm.provider.base_llm import BaseLLM


class TenderProcessingPipeline:
    def __init__(self, minio_service: MinioService, llm_provider: BaseLLM):
        self.minio_service = minio_service
        self.llm_provider = llm_provider

    async def index_documents(self, tender: Tender, documents: list[Document]):
        logger.info(f"Indexing documents for tender {tender.id}")
        # processed_documents = process_documents(tender.id, self.minio_service)
        # for document in processed_documents:
        #     self.minio_service.upload_processed_file(tender.id, str(document.document_id), document.content)

        api_requests = [
            {
                "model": self.llm_provider._model_name,
                "messages": [
                    {"role": "system", "content": "What is 2+2?"},
                ],
                "stream": False,
            },
            {
                "model": self.llm_provider._model_name,
                "messages": [
                    {"role": "system", "content": "What is 10*10?"},
                ],
                "stream": False,
            },
        ]
        responses = await self.llm_provider.process_requests(api_requests)
        logger.info(f"Responses: {responses}")

    async def run(self, tender: Tender, documents: list[Document]):
        await self.index_documents(tender, documents)
