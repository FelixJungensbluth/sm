"""
Agentic data extraction service.

This package provides an agent-based approach to extract information from tender documents
using tool calling with Ollama, Qdrant for vector search, and MongoDB for trace persistence.
"""

from app.services.data_extraction.agentic.agent import AgenticDataExtractionService
from app.services.data_extraction.agentic.types import ChunkMetadata, EmbeddedChunk, TraceStep

__all__ = [
    "AgenticDataExtractionService",
    "ChunkMetadata",
    "EmbeddedChunk",
    "TraceStep",
]
