"""
Trace management for agentic data extraction.

Handles saving, loading, and managing execution traces.
"""

import time
import asyncio
from typing import Dict, List, Any, Optional
from dataclasses import asdict
from threading import Lock
from pymongo import MongoClient

from app.config.logger import logger
from app.services.data_extraction.agentic.types import TraceStep


class TraceManager:
    """Manages execution traces for the agent."""
    
    def __init__(
        self,
        mongo_client: MongoClient,
        tender_id: str,
        enable_tracing: bool = True,
    ):
        self.mongo_client = mongo_client
        self.tender_id = tender_id
        self.enable_tracing = enable_tracing
        
        # MongoDB collection for traces
        self.db = mongo_client.get_database("skillMatch")
        self.traces_collection = self.db.agent_traces
        
        # In-memory trace storage (for current extraction)
        self.traces: Dict[str, List[TraceStep]] = {}
        self.trace_lock = Lock()
    
    def add_trace_step(self, field_name: str, step_data: Dict[str, Any]) -> None:
        """Add a trace step for a field (thread-safe)."""
        if not self.enable_tracing:
            return
        
        step_data["timestamp"] = time.time()
        step = TraceStep(
            type=step_data.get("type", "unknown"),
            timestamp=step_data["timestamp"],
            field_name=field_name,
            iteration=step_data.get("iteration"),
            data=step_data,
        )
        
        with self.trace_lock:
            if field_name not in self.traces:
                self.traces[field_name] = []
            self.traces[field_name].append(step)
    
    def initialize_trace(self, field_name: str) -> None:
        """Initialize trace for a new field extraction."""
        if self.enable_tracing:
            self.traces[field_name] = []
    
    async def save_trace_to_mongodb(self, field_name: str) -> None:
        """Save trace for a field to MongoDB."""
        if not self.enable_tracing or field_name not in self.traces:
            return
        
        try:
            trace_doc = {
                "tender_id": self.tender_id,
                "field_name": field_name,
                "steps": [asdict(step) for step in self.traces[field_name]],
                "created_at": time.time(),
            }
            
            # Upsert trace (replace if exists)
            await asyncio.to_thread(
                self.traces_collection.replace_one,
                {
                    "tender_id": self.tender_id,
                    "field_name": field_name,
                },
                trace_doc,
                upsert=True,
            )
            
            logger.info(f"Saved trace for field {field_name} to MongoDB")
        except Exception as e:
            logger.error(f"Error saving trace to MongoDB: {e}")
    
    async def get_trace(self, field_name: str) -> List[Dict[str, Any]]:
        """Get trace for a specific field from MongoDB."""
        try:
            trace_doc = await asyncio.to_thread(
                self.traces_collection.find_one,
                {
                    "tender_id": self.tender_id,
                    "field_name": field_name,
                }
            )
            
            if trace_doc:
                return trace_doc.get("steps", [])
            return []
        except Exception as e:
            logger.error(f"Error getting trace from MongoDB: {e}")
            return []
    
    async def get_all_traces(self) -> Dict[str, List[Dict[str, Any]]]:
        """Get all traces for this tender from MongoDB."""
        try:
            trace_docs = await asyncio.to_thread(
                self.traces_collection.find,
                {"tender_id": self.tender_id},
            )
            
            traces = {}
            for doc in trace_docs:
                field_name = doc.get("field_name")
                if field_name:
                    traces[field_name] = doc.get("steps", [])
            
            return traces
        except Exception as e:
            logger.error(f"Error getting all traces from MongoDB: {e}")
            return {}
