from app.config.settings import SettingsDep
from app.services.external.minio_service import MinioService
from app.services.rag.rag_service import RagService

def get_minio_service(settings: SettingsDep) -> MinioService:
    return MinioService(settings)

def get_rag_service(settings: SettingsDep) -> RagService:
    return RagService(settings)