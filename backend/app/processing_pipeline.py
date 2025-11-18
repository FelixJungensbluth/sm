from app.config.logger import logger
from app.models.tender import Tender, TenderUpdate
from app.services.document_processing.document_processing_service import (
    process_documents,
)
from app.services.external.minio_service import MinioService
from app.models.document import Document
from app.services.rag.rag_service import RagService
from app.services.base_information_service import BaseInformationService
from app.config.settings import SettingsDep
from app.config.app_config import get_llm_provider
from app.repos.tender_repo import TenderRepo


class TenderProcessingPipeline:
    def __init__(
        self,
        settings: SettingsDep,
        minio_service: MinioService,
        tender_repo: TenderRepo,
    ):
        self.settings = settings
        self.minio_service = minio_service
        self.llm_provider = get_llm_provider(settings=settings)
        self.rag_service = RagService(settings=settings)
        self.tender_repo = tender_repo

    async def index_documents(self, tender: Tender, documents: list[Document]):
        logger.info(f"Indexing documents for tender {tender.id}")
        processed_documents = process_documents(tender.id, self.minio_service, documents)
        for document in processed_documents:
            self.minio_service.upload_processed_file(
                tender.id, str(document.document.id), document.content
            )

        await self.rag_service.index_tender_documents(tender.id, processed_documents)

    async def extract_base_information(self, tender: Tender):
        self.base_information_service = BaseInformationService(settings=self.settings, llm_provider=self.llm_provider, rag_service=self.rag_service)
        
        base_information = await self.base_information_service.extract_base_information(tender.id)
        print(base_information)

        if base_information:
            tender_update = TenderUpdate(base_information=base_information)
            self.tender_repo.update_tender(tender.id, tender_update)
            
        return base_information

    async def run(self, tender: Tender, documents: list[Document]):
        await self.index_documents(tender, documents)
        await self.extract_base_information(tender)