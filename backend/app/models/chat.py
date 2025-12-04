from datetime import datetime, timezone
from typing import Optional
import uuid
from pydantic import BaseModel


class ChatMessage(BaseModel):
    id: uuid.UUID
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime

    @classmethod
    def create(cls, role: str, content: str) -> "ChatMessage":
        return cls(
            id=uuid.uuid4(),
            role=role,
            content=content,
            timestamp=datetime.now(timezone.utc),
        )


class ChatConversation(BaseModel):
    id: uuid.UUID
    title: str
    messages: list[ChatMessage]
    tender_id: Optional[uuid.UUID] = None
    context_type: str = "none"  # "none", "global", or tender_id
    created_at: datetime
    updated_at: datetime

    @classmethod
    def create(cls, title: str, tender_id: Optional[uuid.UUID] = None, context_type: str = "none") -> "ChatConversation":
        return cls(
            id=uuid.uuid4(),
            title=title,
            messages=[],
            tender_id=tender_id,
            context_type=context_type,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[uuid.UUID] = None
    tender_id: Optional[uuid.UUID] = None
    context_type: str = "none"  # "none", "global", or "tender"


class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    content: str


