from typing import Annotated, List, Optional
import uuid
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    Query,
)
from fastapi.responses import JSONResponse

from app.models.chat import (
    ChatConversation,
    ChatMessage,
    ChatRequest,
    ChatResponse,
    CreateConversationResponse,
    ConversationListResponse,
    ConversationResponse,
    UpdateConversationTitleResponse,
    DeleteConversationResponse,
    ChatTenderListResponse,
)
from app.repos.shared import get_chat_repo, get_tender_repo
from app.repos.chat_repo import ChatRepo
from app.repos.tender_repo import TenderRepo
from app.config.logger import logger
from app.config.app_config import get_llm_provider, get_embedding_provider
from app.config.settings import SettingsDep, get_settings
from app.services.rag.rag_service import RagService
from app.services.chat_service import ChatService
from app.exceptions import create_not_found_exception

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


@router.post(
    "/conversations",
    status_code=status.HTTP_201_CREATED,
    response_model=CreateConversationResponse,
    operation_id="create_conversation",
    summary="Create a new conversation",
    description="Create a new chat conversation with an optional tender context.",
)
async def create_conversation(
    title: str = Query(..., description="Title of the conversation"),
    tender_id: Optional[uuid.UUID] = Query(None, description="Optional tender ID for context"),
    context_type: str = Query("none", description="Context type: 'none', 'global', or 'tender'"),
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> CreateConversationResponse:
    """
    Create a new conversation.
    
    Args:
        title: Title of the conversation
        tender_id: Optional tender ID for context
        context_type: Type of context ('none', 'global', or 'tender')
        chat_repo: Repository for chat operations
        
    Returns:
        CreateConversationResponse containing the created conversation
    """
    conversation = ChatConversation.create(title, tender_id, context_type)
    created = chat_repo.create_conversation(conversation)
    return CreateConversationResponse(conversation=created)


@router.get(
    "/conversations",
    status_code=status.HTTP_200_OK,
    response_model=ConversationListResponse,
    operation_id="get_conversations",
    summary="Get all conversations",
    description="Retrieve all chat conversations, ordered by most recently updated.",
)
async def get_conversations(
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> ConversationListResponse:
    """
    Get all conversations.
    
    Args:
        chat_repo: Repository for chat operations
        
    Returns:
        ConversationListResponse containing list of all conversations
    """
    conversations = chat_repo.get_conversations()
    return ConversationListResponse(conversations=conversations)


@router.get(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK,
    response_model=ConversationResponse,
    operation_id="get_conversation",
    summary="Get a conversation by ID",
    description="Retrieve a specific conversation with all its messages.",
)
async def get_conversation(
    conversation_id: uuid.UUID,
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> ConversationResponse:
    """
    Get a conversation by ID.
    
    Args:
        conversation_id: UUID of the conversation to retrieve
        chat_repo: Repository for chat operations
        
    Returns:
        ConversationResponse containing the conversation
        
    Raises:
        HTTPException: 404 if conversation not found
    """
    conversation = chat_repo.get_conversation_by_id(conversation_id)
    if not conversation:
        raise create_not_found_exception("Conversation", str(conversation_id))
    return ConversationResponse(conversation=conversation)


@router.put(
    "/conversations/{conversation_id}/title",
    status_code=status.HTTP_200_OK,
    response_model=UpdateConversationTitleResponse,
    operation_id="update_conversation_title",
    summary="Update conversation title",
    description="Update the title of a conversation.",
)
async def update_conversation_title(
    conversation_id: uuid.UUID,
    title: str = Query(..., description="New title for the conversation"),
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> UpdateConversationTitleResponse:
    """
    Update conversation title.
    
    Args:
        conversation_id: UUID of the conversation to update
        title: New title for the conversation
        chat_repo: Repository for chat operations
        
    Returns:
        UpdateConversationTitleResponse with success status
        
    Raises:
        HTTPException: 404 if conversation not found
    """
    success = chat_repo.update_conversation_title(conversation_id, title)
    if not success:
        raise create_not_found_exception("Conversation", str(conversation_id))
    return UpdateConversationTitleResponse(
        success=True,
        message="Conversation title updated successfully",
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK,
    response_model=DeleteConversationResponse,
    operation_id="delete_conversation",
    summary="Delete a conversation",
    description="Delete a conversation and all its messages.",
)
async def delete_conversation(
    conversation_id: uuid.UUID,
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> DeleteConversationResponse:
    """
    Delete a conversation.
    
    Args:
        conversation_id: UUID of the conversation to delete
        chat_repo: Repository for chat operations
        
    Returns:
        DeleteConversationResponse with success status
        
    Raises:
        HTTPException: 404 if conversation not found
    """
    success = chat_repo.delete_conversation(conversation_id)
    if not success:
        raise create_not_found_exception("Conversation", str(conversation_id))
    return DeleteConversationResponse(
        success=True,
        message="Conversation deleted successfully",
    )


@router.post(
    "/messages",
    status_code=status.HTTP_200_OK,
    response_model=ChatResponse,
    operation_id="send_message",
    summary="Send a chat message",
    description="Send a message in a conversation and get the AI response. Creates a new conversation if conversation_id is not provided.",
)
async def send_message(
    request: ChatRequest,
    chat_service: ChatService = Depends(get_chat_service),
    chat_repo: ChatRepo = Depends(get_chat_repo),
) -> ChatResponse:
    """
    Send a message and get the response.
    
    If no conversation_id is provided, a new conversation is created.
    
    Args:
        request: ChatRequest containing message, conversation_id, tender_id, and context_type
        chat_service: Service for chat operations
        chat_repo: Repository for chat operations
        
    Returns:
        ChatResponse containing the conversation_id, message_id, and content
        
    Raises:
        HTTPException: If conversation not found (when conversation_id is provided)
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

    try:
        response_content = await chat_service.chat_response(
            conversation_id=conversation_id,
            user_message=request.message,
            context_type=context_type,
            tender_id=request.tender_id,
        )
        
        # Get the last message (assistant message) to get its ID
        conversation = chat_repo.get_conversation_by_id(conversation_id)
        if not conversation:
            raise create_not_found_exception("Conversation", str(conversation_id))
        
        # Find the assistant message we just created
        assistant_messages = [m for m in conversation.messages if m.role == "assistant"]
        message_id = assistant_messages[-1].id if assistant_messages else uuid.uuid4()
        
        return ChatResponse(
            conversation_id=conversation_id,
            message_id=message_id,
            content=response_content,
        )
    except ValueError as e:
        raise create_not_found_exception("Conversation", str(conversation_id))
    except Exception as e:
        logger.error(f"Error getting chat response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting chat response: {str(e)}",
        )


@router.get(
    "/tenders",
    status_code=status.HTTP_200_OK,
    response_model=ChatTenderListResponse,
    operation_id="get_chat_tenders",
    summary="Get list of tenders for chat context",
    description="Retrieve a simplified list of tenders for use in chat context selection.",
)
async def get_chat_tenders(
    tender_repo: TenderRepo = Depends(get_tender_repo),
) -> ChatTenderListResponse:
    """
    Get list of tenders for context selector.
    
    Args:
        tender_repo: Repository for tender operations
        
    Returns:
        ChatTenderListResponse containing simplified tender information
    """
    from app.models.tender import Tender
    tenders = tender_repo.get_tenders()
    tender_list = [
        {
            "id": str(t.id),
            "title": t.title,
            "description": t.description,
        }
        for t in tenders
    ]
    return ChatTenderListResponse(tenders=tender_list)

