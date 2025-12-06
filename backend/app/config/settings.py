"""Application settings and configuration."""

from typing import Annotated
from fastapi import Depends
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    MINIO_ENDPOINT: str = Field(default="", description="MinIO endpoint URL")
    MINIO_ACCESS_KEY: str = Field(default="", description="MinIO access key")
    MINIO_SECRET_KEY: str = Field(default="", description="MinIO secret key")
    MINIO_BUCKET: str = Field(default="", description="MinIO bucket name")

    OPENAI_API_KEY: str = Field(default="", description="OpenAI API key")

    QDRANT_URI: str = Field(default="", description="Qdrant vector database URI")
    QDRANT_API_KEY: str = Field(default="", description="Qdrant API key")

    MONGO_HOST: str = Field(default="", description="MongoDB host")
    MONGO_PORT: int = Field(default=27017, description="MongoDB port")
    MONGO_USERNAME: str = Field(default="", description="MongoDB username")
    MONGO_PASSWORD: str = Field(default="", description="MongoDB password")

    CORS_ORIGINS: str = Field(
        default="http://localhost:5173",
        description="Comma-separated list of allowed CORS origins",
    )

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


_settings_instance: Settings | None = None


def get_settings() -> Settings:
    """Get application settings instance (singleton pattern)."""
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance


SettingsDep = Annotated[Settings, Depends(get_settings)]