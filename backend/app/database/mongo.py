"""MongoDB database connection management."""

from typing import Annotated, Generator
from pymongo import MongoClient
from fastapi import Depends

from app.config.settings import get_settings
from app.config.logger import logger

_mongo_client: MongoClient | None = None


def get_mongo_client() -> MongoClient:
    """Get or create MongoDB client instance (singleton pattern)."""
    global _mongo_client
    if _mongo_client is None:
        settings = get_settings()
        try:
            _mongo_client = MongoClient(
                host=settings.MONGO_HOST,
                port=settings.MONGO_PORT,
                username=settings.MONGO_USERNAME,
                password=settings.MONGO_PASSWORD,
            )
            # Test connection
            _mongo_client.admin.command("ping")
            logger.info("MongoDB connection established")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}")
            raise
    return _mongo_client


def close_mongo_client() -> None:
    """Close MongoDB client connection."""
    global _mongo_client
    if _mongo_client is not None:
        try:
            _mongo_client.close()
            logger.info("MongoDB connection closed")
        except Exception as e:
            logger.error(f"Error closing MongoDB connection: {e}")
        finally:
            _mongo_client = None


def get_mongo_session() -> Generator[MongoClient, None, None]:
    """Dependency for getting MongoDB client session."""
    client = get_mongo_client()
    try:
        yield client
    finally:
        # Don't close here - let lifespan handler manage it
        pass


MongoClientDep = Annotated[MongoClient, Depends(get_mongo_session)]
