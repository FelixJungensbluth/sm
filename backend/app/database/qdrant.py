from typing import Annotated, Generator
from qdrant_client import QdrantClient
from fastapi import Depends

from app.config.settings import get_settings

_qdrant_client = None
def get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        settings = get_settings()
        _qdrant_client = QdrantClient(url=settings.QDRANT_URI, api_key=settings.QDRANT_API_KEY)
    return _qdrant_client


def get_qdrant_session() -> Generator[QdrantClient, None, None]:
    client = get_qdrant_client()
    yield client


QdrantClientDep = Annotated[QdrantClient, Depends(get_qdrant_session)]