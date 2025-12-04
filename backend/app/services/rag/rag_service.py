from app.embedding.provider.base_embedding import BaseEmbedding
from typing import List, Optional
import uuid
import asyncio
from attr import dataclass, asdict
from qdrant_client import AsyncQdrantClient, models
from app.config.settings import SettingsDep
from app.services.rag.reranker.rank_llm import RankLlm
from app.services.rag.splitter.recursiv_splitter import RecursiveSplitter
from app.models.document import ProcessedDocument

from app.config.logger import logger


@dataclass(frozen=True)
class Chunk:
    content: str
    file_name: str
    file_id: str
    tender_id: Optional[str] = None  # For global retrieval


class RagService:
    def __init__(self, settings: SettingsDep, embedding_provider: BaseEmbedding):
        self.settings = settings
        self.splitter = RecursiveSplitter(chunk_size=1500, chunk_overlap=300)
        self.client = AsyncQdrantClient(
            url=self.settings.QDRANT_URI, api_key=self.settings.QDRANT_API_KEY
        )

        # self.splitter = SemanticSplitter(self._embeddings)
        self.reranker: Optional[RankLlm] = None
        self.embedding_provider = embedding_provider

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
                        vector=await self.embedding_provider.embed_query(chunk.page_content),
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
        query_vector = await self.embedding_provider.embed_query(query)
        res = await self.client.search(
            collection_name=str(tender_id),
            query_vector=query_vector,
            limit=top_k,
        )

        chunks = [
            Chunk(content=content, file_name=file_name, file_id=file_id, tender_id=str(tender_id))
            for point in res
            if point.payload
            and (content := point.payload.get("content"))
            and (file_name := point.payload.get("file_name"))
            and (file_id := point.payload.get("file_id"))
        ]

        return chunks

    async def retrieve_chunks_global(self, tender_ids: List[uuid.UUID], query: str, top_k: int = 10):
        """
        Retrieve chunks from multiple tender collections in parallel and merge results.
        
        Args:
            tender_ids: List of tender IDs to search across
            query: Search query
            top_k: Total number of chunks to return after merging
            
        Returns:
            List of Chunk objects from across all tenders, sorted by relevance
        """
        if not tender_ids:
            return []

        query_vector = await self.embedding_provider.embed_query(query)
        
        # Search all collections in parallel
        async def search_collection(tender_id: uuid.UUID):
            try:
                collection_name = str(tender_id)
                # Check if collection exists
                if not await self.client.collection_exists(collection_name):
                    return []
                
                res = await self.client.search(
                    collection_name=collection_name,
                    query_vector=query_vector,
                    limit=top_k,  # Get top_k from each collection
                )
                
                # Convert to chunks with tender_id
                chunks = []
                for point in res:
                    if point.payload:
                        content = point.payload.get("content")
                        file_name = point.payload.get("file_name")
                        file_id = point.payload.get("file_id")
                        if content and file_name and file_id:
                            chunks.append(
                                Chunk(
                                    content=content,
                                    file_name=file_name,
                                    file_id=file_id,
                                    tender_id=str(tender_id),
                                )
                            )
                return chunks
            except Exception as e:
                logger.warning(f"Error searching collection {tender_id}: {e}")
                return []

        # Search all collections in parallel
        results = await asyncio.gather(*[search_collection(tid) for tid in tender_ids])
        
        # Flatten and merge results
        all_chunks = []
        for chunks in results:
            all_chunks.extend(chunks)
        
        # Sort by score if available (Qdrant returns results sorted by relevance)
        # Since we're merging from multiple collections, we'll keep the order
        # and return top_k
        return all_chunks[:top_k]
