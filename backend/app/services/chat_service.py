from typing import Optional, AsyncGenerator
import uuid

from app.config.settings import SettingsDep
from app.llm.provider.base_llm import BaseLLM, LlmRequest
from app.services.rag.rag_service import RagService
from app.repos.chat_repo import ChatRepo
from app.repos.tender_repo import TenderRepo
from app.models.chat import ChatConversation, ChatMessage
from app.config.logger import logger


class ChatService:
    def __init__(
        self,
        settings: SettingsDep,
        llm_provider: BaseLLM,
        rag_service: RagService,
        chat_repo: ChatRepo,
        tender_repo: TenderRepo,
    ):
        self.settings = settings
        self.llm_provider = llm_provider
        self.rag_service = rag_service
        self.chat_repo = chat_repo
        self.tender_repo = tender_repo

    async def get_rag_context(
        self, query: str, context_type: str, tender_id: Optional[uuid.UUID] = None
    ) -> str:
        """
        Retrieve RAG context based on context type.
        
        Args:
            query: User's query
            context_type: "none", "global", or "tender"
            tender_id: Optional tender ID for tender-specific context
            
        Returns:
            Formatted context string with retrieved chunks
        """
        if context_type == "none":
            return ""

        chunks = []
        if context_type == "global":
            # Get all tender IDs and search globally
            tenders = self.tender_repo.get_tenders()
            tender_ids = [t.id for t in tenders]
            if tender_ids:
                chunks = await self.rag_service.retrieve_chunks_global(
                    tender_ids, query, top_k=10
                )
        elif context_type == "tender" and tender_id:
            # Search specific tender collection
            chunks = await self.rag_service.retrieve_chunks(tender_id, query, top_k=10)

        if not chunks:
            return ""

        # Format chunks as context
        context_parts = ["Relevant document excerpts:"]
        for i, chunk in enumerate(chunks, 1):
            source_info = f"File: {chunk.file_name}"
            if chunk.tender_id:
                source_info += f" (Tender: {chunk.tender_id})"
            context_parts.append(f"\n[{i}] {source_info}")
            context_parts.append(f"{chunk.content}")

        return "\n".join(context_parts)

    def build_llm_messages(
        self,
        conversation: ChatConversation,
        user_message: str,
        rag_context: str,
    ) -> list[LlmRequest]:
        """
        Build LLM messages from conversation history and RAG context.
        
        Args:
            conversation: The conversation with message history
            user_message: Current user message
            rag_context: RAG context string
            
        Returns:
            List of LlmRequest objects for the LLM
        """
        messages = []

        # Add system message with RAG context if available
        if rag_context:
            system_message = f"""You are a helpful assistant that answers questions about tender documents.
Use the following context from documents to answer questions accurately. If the context doesn't contain relevant information, say so.

{rag_context}

Answer the user's question based on the context above."""
            messages.append(LlmRequest(role="system", message=system_message))
        else:
            messages.append(
                LlmRequest(
                    role="system",
                    message="You are a helpful assistant that answers questions about tender documents.",
                )
            )

        # Add conversation history (last 10 messages to avoid token limits)
        history_messages = conversation.messages[-10:]
        for msg in history_messages:
            messages.append(LlmRequest(role=msg.role, message=msg.content))

        # Add current user message
        messages.append(LlmRequest(role="user", message=user_message))

        return messages

    async def stream_chat_response(
        self,
        conversation_id: uuid.UUID,
        user_message: str,
        context_type: str = "none",
        tender_id: Optional[uuid.UUID] = None,
    ) -> AsyncGenerator[str, None]:
        """
        Stream chat response with RAG context.
        
        Args:
            conversation_id: ID of the conversation
            user_message: User's message
            context_type: "none", "global", or "tender"
            tender_id: Optional tender ID for tender-specific context
            
        Yields:
            Token strings as they are generated
        """
        # Get or create conversation
        conversation = self.chat_repo.get_conversation_by_id(conversation_id)
        if not conversation:
            logger.error(f"Conversation {conversation_id} not found")
            yield "[Error: Conversation not found]"
            return

        # Retrieve RAG context
        try:
            rag_context = await self.get_rag_context(user_message, context_type, tender_id)
        except Exception as e:
            logger.error(f"Error retrieving RAG context: {e}")
            rag_context = ""

        # Build LLM messages
        llm_messages = self.build_llm_messages(conversation, user_message, rag_context)

        # Stream response
        full_response = ""
        try:
            async for token in self.llm_provider.stream_response(llm_messages):
                full_response += token
                yield token
        except Exception as e:
            logger.error(f"Error streaming response: {e}")
            yield f"[Error: {str(e)}]"
            return

        # Save messages to conversation
        user_msg = ChatMessage.create("user", user_message)
        assistant_msg = ChatMessage.create("assistant", full_response)

        self.chat_repo.add_message(conversation_id, user_msg)
        self.chat_repo.add_message(conversation_id, assistant_msg)


