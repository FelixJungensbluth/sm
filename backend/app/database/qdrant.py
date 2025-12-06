"""Qdrant vector database connection management."""

from typing import Annotated, Generator
from qdrant_client import QdrantClient
from fastapi import Depends

from app.config.settings import get_settings
from app.config.logger import logger

_qdrant_client: QdrantClient | None = None


def get_qdrant_client() -> QdrantClient:
    """Get or create Qdrant client instance (singleton pattern)."""
    global _qdrant_client
    if _qdrant_client is None:
        settings = get_settings()
        try:
            _qdrant_client = QdrantClient(
                url=settings.QDRANT_URI,
                api_key=settings.QDRANT_API_KEY,
            )
            # Test connection
            _qdrant_client.get_collections()
            logger.info("Qdrant connection established")
        except Exception as e:
            logger.error(f"Failed to connect to Qdrant: {e}")
            raise
    return _qdrant_client


def close_qdrant_client() -> None:
    """Close Qdrant client connection."""
    global _qdrant_client
    if _qdrant_client is not None:
        try:
            _qdrant_client.close()
            logger.info("Qdrant connection closed")
        except Exception as e:
            logger.error(f"Error closing Qdrant connection: {e}")
        finally:
            _qdrant_client = None


def get_qdrant_session() -> Generator[QdrantClient, None, None]:
    """Dependency for getting Qdrant client session."""
    client = get_qdrant_client()
    try:
        yield client
    finally:
        # Don't close here - let lifespan handler manage it
        pass


QdrantClientDep = Annotated[QdrantClient, Depends(get_qdrant_session)]