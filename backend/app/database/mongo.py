from typing import Annotated, Generator
from pymongo import MongoClient
from fastapi import Depends

from app.config.settings import get_settings

_mongo_client = None


def get_mongo_client() -> MongoClient:
    global _mongo_client
    if _mongo_client is None:
        settings = get_settings()
        _mongo_client = MongoClient(
            host=settings.MONGO_HOST,
            port=settings.MONGO_PORT,
            username=settings.MONGO_USERNAME,
            password=settings.MONGO_PASSWORD,
        )
    return _mongo_client


def get_mongo_session() -> Generator[MongoClient, None, None]:
    client = get_mongo_client()
    yield client


MongoClientDep = Annotated[MongoClient, Depends(get_mongo_session)]
