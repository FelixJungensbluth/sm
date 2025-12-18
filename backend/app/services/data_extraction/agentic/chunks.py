"""
Chunk retrieval and formatting utilities for agentic data extraction.
"""

import asyncio
from typing import List, Optional
from qdrant_client import QdrantClient

from app.config.logger import logger
from app.embedding.provider.base_embedding import BaseEmbedding
from app.services.data_extraction.agentic.types import ChunkMetadata, EmbeddedChunk


class ChunkRetriever:
    """Handles chunk retrieval from Qdrant."""
    
    def __init__(
        self,
        qdrant_client: QdrantClient,
        embedding_provider: BaseEmbedding,
        collection_name: str,
    ):
        self.qdrant_client = qdrant_client
        self.embedding_provider = embedding_provider
        self.collection_name = collection_name
    
    async def search_chunks(self, query: str, top_k: int = 5) -> List[EmbeddedChunk]:
        """Search for chunks using semantic similarity in Qdrant."""
        try:
            # Create query embedding
            query_vector = await self.embedding_provider.embed_query(query)
            
            # Search in Qdrant (sync call in async context)
            results = await asyncio.to_thread(
                self.qdrant_client.search,
                collection_name=self.collection_name,
                query_vector=query_vector,
                limit=top_k,
            )
            
            chunks = []
            for point in results:
                if point.payload:
                    content = point.payload.get("content")
                    file_name = point.payload.get("file_name")
                    file_id = point.payload.get("file_id")
                    
                    if content and file_name and file_id:
                        chunk_id = f"chunk_{point.id}"
                        metadata = ChunkMetadata(
                            chunk_id=chunk_id,
                            content=content,
                            file_name=file_name,
                            file_id=file_id,
                        )
                        # Get embedding vector if available
                        embedding: List[float] = []
                        if hasattr(point, 'vector') and point.vector:
                            vec = point.vector
                            if isinstance(vec, list) and len(vec) > 0:
                                # Ensure all elements are numbers and convert to float
                                try:
                                    embedding = [float(x) for x in vec if isinstance(x, (int, float))]  # type: ignore
                                except (ValueError, TypeError):
                                    embedding = []
                        
                        chunk = EmbeddedChunk(
                            chunk_id=chunk_id,
                            content=content,
                            embedding=embedding,
                            metadata=metadata,
                        )
                        chunks.append(chunk)
            
            return chunks
        except Exception as e:
            logger.error(f"Error searching chunks: {e}")
            return []
    
    async def get_chunk_by_id(self, chunk_id: str) -> Optional[EmbeddedChunk]:
        """Get a chunk by its ID from Qdrant."""
        try:
            # Extract numeric ID from chunk_id (format: chunk_123)
            numeric_id = int(chunk_id.replace("chunk_", ""))
            
            # Retrieve point from Qdrant (sync call in async context)
            points = await asyncio.to_thread(
                self.qdrant_client.retrieve,
                collection_name=self.collection_name,
                ids=[numeric_id],
            )
            
            if points and len(points) > 0:
                point = points[0]
                if point.payload:
                    content = point.payload.get("content")
                    file_name = point.payload.get("file_name")
                    file_id = point.payload.get("file_id")
                    
                    if content and file_name and file_id:
                        metadata = ChunkMetadata(
                            chunk_id=chunk_id,
                            content=content,
                            file_name=file_name,
                            file_id=file_id,
                        )
                        # Get embedding vector if available
                        embedding: List[float] = []
                        if hasattr(point, 'vector') and point.vector:
                            vec = point.vector
                            if isinstance(vec, list) and len(vec) > 0:
                                try:
                                    embedding = [float(x) for x in vec if isinstance(x, (int, float))]  # type: ignore
                                except (ValueError, TypeError):
                                    embedding = []
                        
                        return EmbeddedChunk(
                            chunk_id=chunk_id,
                            content=content,
                            embedding=embedding,
                            metadata=metadata,
                        )
            
            return None
        except Exception as e:
            logger.error(f"Error getting chunk by ID {chunk_id}: {e}")
            return None


class ChunkFormatter:
    """Handles formatting of chunks for LLM context."""
    
    @staticmethod
    def format_chunks_for_context(chunks: List[EmbeddedChunk]) -> str:
        """Format chunks for LLM context."""
        if not chunks:
            return "No chunks found."
        
        formatted = []
        for chunk in chunks:
            formatted.append(ChunkFormatter.format_chunk_for_context(chunk))
        
        return "\n\n---\n\n".join(formatted)
    
    @staticmethod
    def format_chunk_for_context(chunk: EmbeddedChunk) -> str:
        """Format a single chunk for LLM context."""
        parts = [f"Chunk ID: {chunk.chunk_id}"]
        
        if chunk.metadata.headings:
            parts.append(f"Headings: {' > '.join(chunk.metadata.headings)}")
        
        parts.append(f"File: {chunk.metadata.file_name}")
        parts.append(f"Content: {chunk.content}")
        
        return "\n".join(parts)
