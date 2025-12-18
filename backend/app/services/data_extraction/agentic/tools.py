"""
Tool functions for agentic data extraction.

These tools are used by the LLM to retrieve and search chunks during extraction.
"""

import re
from typing import Dict, Callable

from app.config.logger import logger
from app.services.data_extraction.agentic.chunks import ChunkRetriever, ChunkFormatter
from app.services.data_extraction.agentic.types import EmbeddedChunk


class ToolRegistry:
    """Registry for agent tools."""
    
    def __init__(
        self,
        chunk_retriever: ChunkRetriever,
        chunk_formatter: ChunkFormatter,
    ):
        self.chunk_retriever = chunk_retriever
        self.chunk_formatter = chunk_formatter
    
    def create_tools(self) -> tuple[list[Callable], Dict[str, str]]:
        """
        Create tool function definitions for Ollama.
        
        Note: These are just function definitions for Ollama's tool schema.
        Actual execution happens in execute_tool_async().
        
        Returns:
            Tuple of (tools_list, available_functions_dict)
            - tools_list: List of tool functions for Ollama schema
            - available_functions_dict: Maps function names to function names (for routing)
        """
        def search_chunks(query: str, top_k: int = 5) -> str:
            """
            Search for chunks using semantic similarity.
            
            Args:
                query (str): The search query
                top_k (int): Number of results to return (default: 5)
            
            Returns:
                str: Formatted chunks matching the query
            """
            # This is just a placeholder - actual execution is async
            return ""
        
        def get_chunk_by_id(chunk_id: str) -> str:
            """
            Get a specific chunk by its ID.
            
            Args:
                chunk_id (str): The chunk ID to retrieve
            
            Returns:
                str: The formatted chunk content and metadata
            """
            # This is just a placeholder - actual execution is async
            return ""
        
        # Available functions for tool calling (used for routing)
        available_functions = {
            'search_chunks': 'search_chunks',
            'get_chunk_by_id': 'get_chunk_by_id',
        }
        
        # Define tools for ollama (can be functions or dicts)
        tools = [
            search_chunks,
            get_chunk_by_id,
        ]
        
        return tools, available_functions
    
    async def execute_tool_async(self, function_name: str, arguments: dict) -> str:
        """
        Execute a tool function asynchronously.
        
        Args:
            function_name: Name of the tool function
            arguments: Arguments for the tool function
        
        Returns:
            Formatted result string
        """
        if function_name == 'search_chunks':
            query = arguments.get('query', '')
            top_k = arguments.get('top_k', 5)
            chunks = await self.chunk_retriever.search_chunks(query, top_k=top_k)
            return self.chunk_formatter.format_chunks_for_context(chunks)
        
        elif function_name == 'get_chunk_by_id':
            chunk_id = arguments.get('chunk_id', '')
            chunk = await self.chunk_retriever.get_chunk_by_id(chunk_id)
            if chunk:
                return self.chunk_formatter.format_chunk_for_context(chunk)
            return f"Chunk {chunk_id} not found"
        
        else:
            return f"Unknown tool: {function_name}"
    
    @staticmethod
    def extract_chunk_ids_from_output(output: str) -> list[str]:
        """Extract chunk IDs from formatted tool output."""
        chunk_id_matches = re.findall(r'Chunk ID: (chunk_\d+)', output)
        return chunk_id_matches
    
    async def get_chunk_details(self, chunk_ids: list[str]) -> list[dict]:
        """Get detailed information for a list of chunk IDs."""
        chunk_details = []
        for chunk_id in chunk_ids:
            chunk = await self.chunk_retriever.get_chunk_by_id(chunk_id)
            if chunk:
                chunk_details.append({
                    "chunk_id": chunk_id,
                    "headings": chunk.metadata.headings,
                    "content_preview": chunk.content[:200],
                    "content_length": len(chunk.content),
                })
        return chunk_details
