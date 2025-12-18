"""
Type definitions for agentic data extraction.
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass


@dataclass
class ChunkMetadata:
    """Metadata for a chunk including hierarchical information."""
    chunk_id: str
    content: str
    file_name: str
    file_id: str
    headings: Optional[List[str]] = None
    parent_id: Optional[str] = None
    child_ids: Optional[List[str]] = None
    
    def __post_init__(self):
        if self.headings is None:
            self.headings = []
        if self.child_ids is None:
            self.child_ids = []


@dataclass
class EmbeddedChunk:
    """Chunk with its embedding and metadata."""
    chunk_id: str
    content: str
    embedding: List[float]
    metadata: ChunkMetadata


@dataclass
class TraceStep:
    """A single step in the agent execution trace."""
    type: str
    timestamp: float
    field_name: str
    iteration: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    
    def __post_init__(self):
        if self.data is None:
            self.data = {}
