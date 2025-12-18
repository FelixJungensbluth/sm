"""
Main agent service for agentic data extraction.

Orchestrates the extraction process using tools, LLM calls, and trace management.
"""

import json
import time
import asyncio
import traceback
from typing import List, Dict, Optional, Any, Callable
import uuid

import ollama
from qdrant_client import QdrantClient
from pymongo import MongoClient

from app.config.settings import SettingsDep
from app.config.logger import logger
from app.embedding.provider.base_embedding import BaseEmbedding
from app.services.data_extraction.queries import Query
from app.services.data_extraction.agentic.types import EmbeddedChunk
from app.services.data_extraction.agentic.chunks import ChunkRetriever, ChunkFormatter
from app.services.data_extraction.agentic.tools import ToolRegistry
from app.services.data_extraction.agentic.traces import TraceManager
from app.services.data_extraction.agentic.prompts import build_system_prompt, build_user_prompt


class AgenticDataExtractionService:
    """Agent for extracting information from chunks using tool calling."""
    
    def __init__(
        self,
        settings: SettingsDep,
        embedding_provider: BaseEmbedding,
        qdrant_client: QdrantClient,
        mongo_client: MongoClient,
        tender_id: uuid.UUID,
        llm_model: str = "gpt-oss",
        enable_tracing: bool = True,
        max_iterations: int = 10,
    ):
        self.settings = settings
        self.llm_model = llm_model
        self.tender_id = tender_id
        self.collection_name = str(tender_id)
        self.max_iterations = max_iterations
        
        # Initialize components
        self.chunk_retriever = ChunkRetriever(
            qdrant_client=qdrant_client,
            embedding_provider=embedding_provider,
            collection_name=self.collection_name,
        )
        self.chunk_formatter = ChunkFormatter()
        self.tool_registry = ToolRegistry(
            chunk_retriever=self.chunk_retriever,
            chunk_formatter=self.chunk_formatter,
        )
        self.trace_manager = TraceManager(
            mongo_client=mongo_client,
            tender_id=str(tender_id),
            enable_tracing=enable_tracing,
        )
    
    async def extract_information(
        self, field_name: str, query: Query
    ) -> Dict[str, Any]:
        """Extract information for a specific field using agent with tool functions."""
        # Initialize trace for this field
        self.trace_manager.initialize_trace(field_name)
        self.trace_manager.add_trace_step(field_name, {
            "type": "start",
            "field_name": field_name,
            "query": query.question,
            "terms": query.terms,
            "instructions": query.instructions,
        })
        
        # Build search query from terms
        search_query = " ".join(query.terms)
        
        # Initial search for relevant chunks
        initial_chunks = await self.chunk_retriever.search_chunks(search_query, top_k=10)
        
        self.trace_manager.add_trace_step(field_name, {
            "type": "initial_search",
            "search_query": search_query,
            "chunks_found": len(initial_chunks),
            "chunk_ids": [chunk.metadata.chunk_id for chunk in initial_chunks],
        })
        
        context = self.chunk_formatter.format_chunks_for_context(initial_chunks)
        
        # Create tools
        tools, available_functions = self.tool_registry.create_tools()
        
        # Build prompts
        system_prompt = build_system_prompt(query.instructions)
        user_prompt = build_user_prompt(
            field_name=field_name,
            question=query.question,
            terms=query.terms,
            context=context,
        )
        
        # Build messages for ollama
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': user_prompt}
        ]
        
        # Iterate until we get a final answer or reach max iterations
        for iteration in range(self.max_iterations):
            logger.info(f"Extraction iteration {iteration + 1} for field {field_name}")
            
            self._trace_llm_call(field_name, iteration + 1, messages, tools)
            
            # Call ollama with tools
            try:
                response = await self._call_llm(messages, tools, field_name, iteration + 1)
                assistant_message = response.message
                messages.append(assistant_message)
                
                # Check if there are tool calls
                if assistant_message.tool_calls:
                    logger.info(f"Tool calls: {len(assistant_message.tool_calls)}")
                    
                    self.trace_manager.add_trace_step(field_name, {
                        "type": "tool_calls_start",
                        "iteration": iteration + 1,
                        "tool_calls_count": len(assistant_message.tool_calls),
                    })
                    
                    # Execute tool calls
                    tool_results = await self._execute_tool_calls(
                        assistant_message.tool_calls,
                        available_functions,
                        field_name,
                        iteration + 1,
                    )
                    
                    # Add tool results to messages
                    messages.extend(tool_results)
                    
                    # Continue to next iteration to get model's response to tool results
                    continue
                else:
                    # No tool calls - this should be the final answer
                    return await self._parse_final_response(
                        assistant_message.content or '',
                        initial_chunks,
                        field_name,
                        iteration + 1,
                    )
                    
            except Exception as e:
                logger.error(f"Error in LLM call: {e}")
                return await self._handle_error(
                    str(e),
                    field_name,
                    iteration + 1,
                )
        
        # Max iterations reached
        return await self._handle_max_iterations(field_name)
    
    async def _call_llm(self, messages: list, tools: list, field_name: str, iteration: int):
        """Call Ollama LLM with tools."""
        llm_start_time = time.time()
        response = ollama.chat(
            model=self.llm_model,
            messages=messages,
            tools=tools,
        )
        llm_end_time = time.time()
        llm_duration = llm_end_time - llm_start_time
        
        assistant_message = response.message
        
        # Trace LLM response
        full_content = assistant_message.content or ''
        tool_calls_info = []
        if assistant_message.tool_calls:
            for tc in assistant_message.tool_calls:
                tool_calls_info.append({
                    "function_name": tc.function.name,
                    "arguments": tc.function.arguments or {},
                    "id": getattr(tc, 'id', None)
                })
        
        self.trace_manager.add_trace_step(field_name, {
            "type": "llm_response",
            "iteration": iteration,
            "model": self.llm_model,
            "content": full_content,
            "content_preview": full_content[:200],
            "content_length": len(full_content),
            "has_tool_calls": bool(assistant_message.tool_calls),
            "tool_calls": tool_calls_info,
            "duration_seconds": round(llm_duration, 3),
        })
        
        return response
    
    def _trace_llm_call(self, field_name: str, iteration: int, messages: list, tools: list):
        """Trace an LLM call before execution."""
        # Capture messages being sent (last few for context)
        recent_messages = messages[-3:] if len(messages) > 3 else messages
        messages_summary = []
        for msg in recent_messages:
            msg_content = msg.get('content', '')
            messages_summary.append({
                "role": msg.get('role', 'unknown'),
                "content_preview": (msg_content or '')[:300],
                "content_length": len(msg_content or '')
            })
        
        self.trace_manager.add_trace_step(field_name, {
            "type": "llm_call",
            "iteration": iteration,
            "model": self.llm_model,
            "messages_count": len(messages),
            "recent_messages": messages_summary,
            "tools_available": [getattr(t, '__name__', str(t)) for t in tools] if tools else [],
        })
    
    async def _execute_tool_calls(
        self,
        tool_calls: list,
        available_functions: Dict[str, str],
        field_name: str,
        iteration: int,
    ) -> List[Dict[str, Any]]:
        """Execute tool calls and return results."""
        tool_results = []
        
        for tool_call in tool_calls:
            function_name = tool_call.function.name
            arguments = tool_call.function.arguments or {}
            
            # Handle case where arguments might be a JSON string
            if isinstance(arguments, str):
                try:
                    arguments = json.loads(arguments)
                except json.JSONDecodeError:
                    arguments = {}
            
            logger.info(f"Calling function: {function_name}")
            logger.debug(f"Arguments: {arguments}")
            
            if function_name in available_functions:
                try:
                    # Execute the async tool function
                    tool_start_time = time.time()
                    output = await self.tool_registry.execute_tool_async(function_name, arguments)
                    tool_end_time = time.time()
                    tool_duration = tool_end_time - tool_start_time
                    
                    # Extract chunk IDs from output if it's a chunk-related tool
                    chunk_ids = []
                    chunk_details = []
                    if function_name in ["search_chunks", "get_chunk_by_id"]:
                        chunk_ids = self.tool_registry.extract_chunk_ids_from_output(str(output))
                        if chunk_ids:
                            chunk_details = await self.tool_registry.get_chunk_details(chunk_ids)
                    
                    output_str = str(output)
                    tool_results.append({
                        'role': 'tool',
                        'content': output_str,
                        'tool_name': function_name,
                    })
                    
                    self.trace_manager.add_trace_step(field_name, {
                        "type": "tool_call",
                        "iteration": iteration,
                        "tool_name": function_name,
                        "arguments": arguments,
                        "output": output_str,
                        "output_length": len(output_str),
                        "chunk_ids": chunk_ids,
                        "chunk_details": chunk_details,
                        "duration_seconds": round(tool_duration, 3),
                    })
                    
                    logger.debug(f"Function output length: {len(output_str)} chars")
                except Exception as e:
                    error_msg = f"Error executing {function_name}: {str(e)}"
                    error_traceback = traceback.format_exc()
                    tool_results.append({
                        'role': 'tool',
                        'content': error_msg,
                        'tool_name': function_name,
                    })
                    
                    self.trace_manager.add_trace_step(field_name, {
                        "type": "tool_error",
                        "iteration": iteration,
                        "tool_name": function_name,
                        "arguments": arguments,
                        "error": str(e),
                        "error_traceback": error_traceback,
                    })
                    
                    logger.error(f"Error: {error_msg}")
            else:
                error_msg = f"Function {function_name} not found"
                tool_results.append({
                    'role': 'tool',
                    'content': error_msg,
                    'tool_name': function_name,
                })
                
                self.trace_manager.add_trace_step(field_name, {
                    "type": "tool_error",
                    "iteration": iteration,
                    "tool_name": function_name,
                    "error": error_msg,
                })
                
                logger.error(f"Error: {error_msg}")
        
        return tool_results
    
    async def _parse_final_response(
        self,
        content: str,
        initial_chunks: List[EmbeddedChunk],
        field_name: str,
        iteration: int,
    ) -> Dict[str, Any]:
        """Parse the final LLM response and return result."""
        logger.info(f"Final response: {content[:200]}...")
        
        # Try to parse as JSON
        try:
            # Look for JSON in the response
            json_text = content
            if "```json" in content:
                json_start = content.find("```json") + 7
                json_end = content.find("```", json_start)
                json_text = content[json_start:json_end].strip()
            elif "```" in content:
                json_start = content.find("```") + 3
                json_end = content.find("```", json_start)
                json_text = content[json_start:json_end].strip()
            
            result = json.loads(json_text)
            
            # Add source information from chunks
            if initial_chunks:
                first_chunk = initial_chunks[0]
                result["source_file"] = first_chunk.metadata.file_name
                result["source_file_id"] = first_chunk.metadata.file_id
            
            self.trace_manager.add_trace_step(field_name, {
                "type": "final_result",
                "iteration": iteration,
                "result": result,
            })
            
            # Save trace to MongoDB
            await self.trace_manager.save_trace_to_mongodb(field_name)
            
            return result
        except json.JSONDecodeError:
            # If not JSON, return as text response
            error_result = {
                "value": None,
                "exact_text": "",
                "confidence": "low",
                "reasoning": f"Could not parse response as JSON: {content[:500]}"
            }
            
            self.trace_manager.add_trace_step(field_name, {
                "type": "final_result",
                "iteration": iteration,
                "result": error_result,
                "parse_error": True,
            })
            
            await self.trace_manager.save_trace_to_mongodb(field_name)
            return error_result
    
    async def _handle_error(
        self,
        error_msg: str,
        field_name: str,
        iteration: int,
    ) -> Dict[str, Any]:
        """Handle errors during extraction."""
        error_result = {
            "value": None,
            "exact_text": "",
            "confidence": "low",
            "reasoning": f"Error during extraction: {error_msg}"
        }
        
        self.trace_manager.add_trace_step(field_name, {
            "type": "error",
            "iteration": iteration,
            "error": error_msg,
        })
        
        await self.trace_manager.save_trace_to_mongodb(field_name)
        return error_result
    
    async def _handle_max_iterations(self, field_name: str) -> Dict[str, Any]:
        """Handle max iterations reached."""
        error_result = {
            "value": None,
            "exact_text": "",
            "confidence": "low",
            "reasoning": f"Max iterations reached without finding information for field '{field_name}'"
        }
        
        self.trace_manager.add_trace_step(field_name, {
            "type": "max_iterations_reached",
            "result": error_result,
        })
        
        await self.trace_manager.save_trace_to_mongodb(field_name)
        return error_result
    
    async def get_trace(self, field_name: str) -> List[Dict[str, Any]]:
        """Get trace for a specific field from MongoDB."""
        return await self.trace_manager.get_trace(field_name)
    
    async def get_all_traces(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all traces for this tender from MongoDB."""
        return await self.trace_manager.get_all_traces()
