from typing import Annotated, List, Optional
import uuid
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from fastapi.responses import StreamingResponse, JSONResponse
import json

from app.models.chat import ChatConversation, ChatMessage, ChatRequest
from app.repos.shared import get_chat_repo, get_tender_repo
from app.repos.chat_repo import ChatRepo
from app.repos.tender_repo import TenderRepo
from app.config.logger import logger
from app.config.app_config import get_llm_provider, get_embedding_provider
from app.config.settings import SettingsDep, get_settings
from app.services.rag.rag_service import RagService
from app.services.chat_service import ChatService

router = APIRouter(
    prefix="/chat",
    tags=["chat"],
    responses={404: {"description": "Not found"}},
)


def get_chat_service(
    settings: SettingsDep,
    chat_repo: ChatRepo = Depends(get_chat_repo),
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> ChatService:
    llm_provider = get_llm_provider(settings)
    embedding_provider = get_embedding_provider(settings)
    rag_service = RagService(settings, embedding_provider)
    return ChatService(settings, llm_provider, rag_service, chat_repo, tender_repo)


@router.post("/conversations", status_code=201, operation_id="create_conversation")
async def create_conversation(
    title: str = Query(...),
    tender_id: Optional[uuid.UUID] = Query(None),
    context_type: str = Query("none"),
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> ChatConversation:
    """Create a new conversation."""
    conversation = ChatConversation.create(title, tender_id, context_type)
    created = chat_repo.create_conversation(conversation)
    return created


@router.get("/conversations", status_code=200, operation_id="get_conversations")
async def get_conversations(
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> List[ChatConversation]:
    """Get all conversations."""
    return chat_repo.get_conversations()


@router.get("/conversations/{conversation_id}", status_code=200, operation_id="get_conversation")
async def get_conversation(
    conversation_id: uuid.UUID,
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> ChatConversation:
    """Get a conversation by ID."""
    conversation = chat_repo.get_conversation_by_id(conversation_id)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return conversation


@router.put("/conversations/{conversation_id}/title", status_code=200, operation_id="update_conversation_title")
async def update_conversation_title(
    conversation_id: uuid.UUID,
    title: str = Query(...),
    chat_repo: ChatRepo = Depends(get_chat_repo),
):
    """Update conversation title."""
    success = chat_repo.update_conversation_title(conversation_id, title)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return {"success": True}


@router.delete("/conversations/{conversation_id}", status_code=200, operation_id="delete_conversation")
async def delete_conversation(
    conversation_id: uuid.UUID,
    chat_repo: ChatRepo = Depends(get_chat_repo),
):
    """Delete a conversation."""
    success = chat_repo.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )
    return {"success": True}


@router.post("/messages", status_code=200, operation_id="send_message")
async def send_message(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    chat_repo: ChatRepo = Depends(get_chat_repo),
):
    """
    Send a message and stream the response.
    """
    # Get or create conversation
    conversation_id = request.conversation_id
    if not conversation_id:
        # Create new conversation
        title = request.message[:50] if request.message else "New Conversation"
        conversation = ChatConversation.create(
            title, request.tender_id, request.context_type
        )
        created = chat_repo.create_conversation(conversation)
        conversation_id = created.id

    # Determine context type
    context_type = request.context_type
    if context_type == "tender" and request.tender_id:
        context_type = "tender"
    elif context_type == "global":
        context_type = "global"
    else:
        context_type = "none"

    async def generate():
        try:
            async for token in chat_service.stream_chat_response(
                conversation_id=conversation_id,
                user_message=request.message,
                context_type=context_type,
                tender_id=request.tender_id,
            ):
                # Send as Server-Sent Events format
                yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            
            # Send completion message
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': str(conversation_id)})}\n\n"
        except Exception as e:
            logger.error(f"Error streaming chat response: {e}")
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/tenders", status_code=200, operation_id="get_chat_tenders")
async def get_chat_tenders(
    tender_repo: TenderRepo = Depends(get_tender_repo),
):
    """Get list of tenders for context selector."""
    from app.models.tender import Tender
    tenders = tender_repo.get_tenders()
    return [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
        }
        for t in tenders
    ]

