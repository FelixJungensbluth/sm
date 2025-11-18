from typing import List, Optional
import uuid
from attr import dataclass, asdict
from qdrant_client import AsyncQdrantClient, models
from app.config.settings import SettingsDep
from app.services.rag.reranker.rank_llm import RankLlm
from app.services.rag.splitter.recursiv_splitter import RecursiveSplitter
from app.models.document import ProcessedDocument
from langchain_ollama import OllamaEmbeddings

from app.config.logger import logger


@dataclass(frozen=True)
class Chunk:
    content: str
    file_name: str
    file_id: str


class RagService:
    def __init__(self, settings: SettingsDep):
        self.settings = settings
        self.splitter = RecursiveSplitter(chunk_size=1500, chunk_overlap=300)
        self.client = AsyncQdrantClient(
            url=self.settings.QDRANT_URI, api_key=self.settings.QDRANT_API_KEY
        )

        # self.splitter = SemanticSplitter(self._embeddings)
        self.reranker: Optional[RankLlm] = None
        self.embeddings = OllamaEmbeddings(model="embeddinggemma")

    async def create_collection(self, collection_name: str):
        if not await self.client.collection_exists(collection_name):
            await self.client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(
                    size=768, distance=models.Distance.COSINE
                ),
            )
            logger.info(f"Successfully created collection {collection_name}")
        else:
            logger.info(f"Collection {collection_name} already exists")

    async def index_tender_documents(
        self, tender_id: uuid.UUID, processed_documents: List[ProcessedDocument]
    ):
        collection_name = str(tender_id)

        await self.create_collection(collection_name)

        chunks = self.splitter.split_documents(processed_documents)
        try:
            await self.client.upsert(
                collection_name=collection_name,
                points=[
                    models.PointStruct(
                        id=i,
                        vector=self.embeddings.embed_query(chunk.page_content),
                        payload=asdict(
                            Chunk(
                                content=chunk.page_content,
                                file_name=chunk.metadata.get("file_name") or "",
                                file_id=chunk.metadata.get("file_id") or "",
                            )
                        ),
                    )
                    for i, chunk in enumerate(chunks)
                ],
            )
            logger.info(f"Successfully upserted {len(chunks)} chunks")
        except Exception as e:
            await self.client.delete_collection(collection_name)

            logger.error(f"Error upserting chunks: {e}")
            raise e

    async def retrieve_chunks(self, tender_id: uuid.UUID, query: str, top_k: int = 10):
        query_vector = self.embeddings.embed_query(query)
        res = await self.client.search(
            collection_name=str(tender_id),
            query_vector=query_vector,
            limit=top_k,
        )

        chunks = [
            Chunk(content=content, file_name=file_name, file_id=file_id)
            for point in res
            if point.payload
            and (content := point.payload.get("content"))
            and (file_name := point.payload.get("file_name"))
            and (file_id := point.payload.get("file_id"))
        ]

        return chunks
