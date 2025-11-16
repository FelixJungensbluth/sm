from functools import lru_cache
from typing import Annotated
from fastapi import Depends
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    MINIO_ENDPOINT: str = ""
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = ""
    MINIO_SECURE: str = ""

    OPENAI_API_KEY: str = ""

    QDRANT_URI: str = ""
    QDRANT_API_KEY: str = ""

    MONGO_HOST: str = ""
    MONGO_PORT: int = 27017
    MONGO_USERNAME: str = ""
    MONGO_PASSWORD: str = ""
    MONGO_AUTH_SOURCE: str = "admin"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings():
    return Settings()

SettingsDep = Annotated[Settings, Depends(get_settings)]