"""
API routes for agent trace visualization.
"""

import uuid
import asyncio
from typing import Dict, List, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pymongo import MongoClient

from app.database.mongo import MongoClientDep
from app.database.qdrant import QdrantClientDep
from app.config.settings import SettingsDep, get_settings
from app.config.logger import logger
from app.exceptions import create_not_found_exception

router = APIRouter(
    prefix="/agent-traces",
    tags=["agent-traces"],
    responses={404: {"description": "Not found"}},
)


@router.get(
    "/{tender_id}",
    status_code=status.HTTP_200_OK,
    operation_id="get_agent_traces",
    summary="Get all agent traces for a tender",
    description="Retrieve all agent execution traces for a specific tender.",
)
async def get_agent_traces(
    tender_id: uuid.UUID,
    mongo_client: MongoClientDep,
    settings: SettingsDep,
) -> Dict[str, List[Dict[str, Any]]]:
    """
    Get all agent traces for a tender.
    
    Args:
        tender_id: UUID of the tender
        mongo_client: MongoDB client
        settings: Application settings
        
    Returns:
        Dictionary mapping field names to their trace steps
    """
    try:
        db = mongo_client.get_database("skillMatch")
        traces_collection = db.agent_traces
        
        trace_docs = await asyncio.to_thread(
            traces_collection.find,
            {"tender_id": str(tender_id)},
        )
        
        traces = {}
        for doc in trace_docs:
            field_name = doc.get("field_name")
            if field_name:
                traces[field_name] = doc.get("steps", [])
        
        return traces
    except Exception as e:
        logger.error(f"Error getting agent traces: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving traces: {str(e)}"
        )


@router.get(
    "/{tender_id}/{field_name}",
    status_code=status.HTTP_200_OK,
    operation_id="get_agent_trace",
    summary="Get agent trace for a specific field",
    description="Retrieve the agent execution trace for a specific field extraction.",
)
async def get_agent_trace(
    tender_id: uuid.UUID,
    field_name: str,
    mongo_client: MongoClientDep,
    settings: SettingsDep,
) -> List[Dict[str, Any]]:
    """
    Get agent trace for a specific field.
    
    Args:
        tender_id: UUID of the tender
        field_name: Name of the field
        mongo_client: MongoDB client
        settings: Application settings
        
    Returns:
        List of trace steps for the field
    """
    try:
        db = mongo_client.get_database("skillMatch")
        traces_collection = db.agent_traces
        
        trace_doc = await asyncio.to_thread(
            traces_collection.find_one,
            {
                "tender_id": str(tender_id),
                "field_name": field_name,
            }
        )
        
        if not trace_doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Trace not found for field '{field_name}' in tender '{tender_id}'"
            )
        
        return trace_doc.get("steps", [])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent trace: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving trace: {str(e)}"
        )


@router.get(
    "/{tender_id}/chunks/{chunk_id}",
    status_code=status.HTTP_200_OK,
    operation_id="get_chunk_by_id",
    summary="Get chunk by ID",
    description="Retrieve a specific chunk by its ID from Qdrant.",
)
async def get_chunk_by_id(
    tender_id: uuid.UUID,
    chunk_id: str,
    qdrant_client: QdrantClientDep,
) -> Dict[str, Any]:
    """
    Get a chunk by its ID.
    
    Args:
        tender_id: UUID of the tender
        chunk_id: ID of the chunk (format: chunk_123)
        qdrant_client: Qdrant client
        
    Returns:
        Chunk data including content and metadata
    """
    try:
        collection_name = str(tender_id)
        
        # Extract numeric ID from chunk_id
        try:
            numeric_id = int(chunk_id.replace("chunk_", ""))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid chunk_id format: {chunk_id}"
            )
        
        # Retrieve point from Qdrant (sync call in async context)
        points = await asyncio.to_thread(
            qdrant_client.retrieve,
            collection_name=collection_name,
            ids=[numeric_id],
        )
        
        if not points or len(points) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chunk {chunk_id} not found"
            )
        
        point = points[0]
        if not point.payload:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Chunk {chunk_id} has no payload"
            )
        
        return {
            "chunk_id": chunk_id,
            "content": point.payload.get("content", ""),
            "file_name": point.payload.get("file_name", ""),
            "file_id": point.payload.get("file_id", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting chunk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chunk: {str(e)}"
        )
