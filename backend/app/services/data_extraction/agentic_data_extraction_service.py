from app.config.settings import SettingsDep
from app.llm.provider.base_llm import BaseLLM
from app.services.rag.rag_service import RagService

class DataExtractionService:
    def __init__(
        self, settings: SettingsDep, llm_provider: BaseLLM, rag_service: RagService
    ):
        self.settings = settings
        self.llm_provider = llm_provider
        self.rag_service = rag_service

    async def extract_data(self):
      pass