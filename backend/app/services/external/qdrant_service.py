import uuid

from qdrant_client import QdrantClient
from qdrant_client.models import models


class QdrantService:
    def __init__(self, client: QdrantClient):
        self._client = client

    def collection_exists(self, collection_name) -> bool:
        return self._client.collection_exists(collection_name)

    def delete_collection(self, collection_name: str):
        self._client.delete_collection(collection_name)

    def delete_tender_file(self, tender_id: uuid.UUID, file_id: uuid.UUID):
        collection_name = str(tender_id)

        if not self.collection_exists(collection_name):
            raise ValueError(f"Collection {collection_name} does not exist")

        self._client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(
                    must=[
                        models.FieldCondition(
                            key="metadata.file_id",
                            match=models.MatchValue(value=str(file_id)),
                        ),
                    ],
                )
            ),
        )
