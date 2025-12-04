from app.config.settings import SettingsDep
from app.config.app_config import get_embedding_provider
from app.services.external.minio_service import MinioService
from app.services.rag.rag_service import RagService

def get_minio_service(settings: SettingsDep) -> MinioService:
    return MinioService(settings)

def get_rag_service(settings: SettingsDep) -> RagService:
    embedding_provider = get_embedding_provider(settings)
    return RagService(settings, embedding_provider)