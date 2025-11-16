from app.config.settings import SettingsDep
from app.services.external.minio_service import MinioService

def get_minio_service(settings: SettingsDep) -> MinioService:
    return MinioService(settings)