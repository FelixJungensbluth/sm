from typing import List, Optional
from pymongo import MongoClient
from datetime import datetime, timezone
import uuid

from app.config.logger import logger
from app.models.chat import ChatConversation, ChatMessage


class ChatRepo:
    def __init__(self, client: MongoClient):
        self.collection = client["skillMatch"]["chat_conversations"]

    def create_conversation(self, conversation: ChatConversation) -> ChatConversation:
        doc = self._conversation_to_doc(conversation)
        result = self.collection.insert_one(doc)
        created_doc = self.collection.find_one({"_id": result.inserted_id})
        created_conv = self._doc_to_conversation(created_doc) if created_doc else None
        return created_conv if created_conv else conversation

    def get_conversation_by_id(self, conversation_id: uuid.UUID) -> Optional[ChatConversation]:
        try:
            doc = self.collection.find_one({"id": str(conversation_id)})
            if doc:
                return self._doc_to_conversation(doc)
            return None
        except Exception as e:
            logger.error(f"Error getting conversation {conversation_id}: {e}")
            return None

    def get_conversations(self) -> List[ChatConversation]:
        conversations = []
        try:
            for doc in self.collection.find().sort("updated_at", -1):
                conversation = self._doc_to_conversation(doc)
                if conversation:
                    conversations.append(conversation)
        except Exception as e:
            logger.error(f"Error getting conversations: {e}")
        return conversations

    def add_message(self, conversation_id: uuid.UUID, message: ChatMessage) -> bool:
        try:
            result = self.collection.update_one(
                {"id": str(conversation_id)},
                {
                    "$push": {"messages": self._message_to_doc(message)},
                    "$set": {"updated_at": datetime.now(timezone.utc)},
                },
            )
            return result.matched_count > 0
        except Exception as e:
            logger.error(f"Error adding message to conversation {conversation_id}: {e}")
            return False

    def update_conversation_title(self, conversation_id: uuid.UUID, title: str) -> bool:
        try:
            result = self.collection.update_one(
                {"id": str(conversation_id)},
                {
                    "$set": {
                        "title": title,
                        "updated_at": datetime.now(timezone.utc),
                    },
                },
            )
            return result.matched_count > 0
        except Exception as e:
            logger.error(f"Error updating conversation title {conversation_id}: {e}")
            return False

    def delete_conversation(self, conversation_id: uuid.UUID) -> bool:
        try:
            result = self.collection.delete_one({"id": str(conversation_id)})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"Error deleting conversation {conversation_id}: {e}")
            return False

    def _conversation_to_doc(self, conversation: ChatConversation) -> dict:
        doc = conversation.model_dump()
        doc["id"] = str(conversation.id)
        if conversation.tender_id:
            doc["tender_id"] = str(conversation.tender_id)
        doc["messages"] = [self._message_to_doc(msg) for msg in conversation.messages]
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"]
        if isinstance(doc.get("updated_at"), datetime):
            doc["updated_at"] = doc["updated_at"]
        return doc

    def _message_to_doc(self, message: ChatMessage) -> dict:
        doc = message.model_dump()
        doc["id"] = str(message.id)
        if isinstance(doc.get("timestamp"), datetime):
            doc["timestamp"] = doc["timestamp"]
        return doc

    def _doc_to_conversation(self, doc: dict) -> Optional[ChatConversation]:
        if not doc:
            return None

        try:
            id_value = doc.get("id")
            if not id_value:
                return None

            if isinstance(id_value, str):
                conv_id = uuid.UUID(id_value)
            elif isinstance(id_value, uuid.UUID):
                conv_id = id_value
            else:
                return None

            tender_id = None
            tender_id_value = doc.get("tender_id")
            if tender_id_value:
                if isinstance(tender_id_value, str):
                    tender_id = uuid.UUID(tender_id_value)
                elif isinstance(tender_id_value, uuid.UUID):
                    tender_id = tender_id_value

            created_at = doc.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            elif not isinstance(created_at, datetime):
                created_at = datetime.now(timezone.utc)

            updated_at = doc.get("updated_at")
            if isinstance(updated_at, str):
                updated_at = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            elif not isinstance(updated_at, datetime):
                updated_at = datetime.now(timezone.utc)

            # Convert messages from list of dicts to list of ChatMessage objects
            messages = []
            messages_data = doc.get("messages", [])
            if isinstance(messages_data, list):
                for msg_dict in messages_data:
                    if isinstance(msg_dict, dict):
                        try:
                            msg_id = msg_dict.get("id")
                            if isinstance(msg_id, str):
                                msg_id = uuid.UUID(msg_id)
                            elif isinstance(msg_id, uuid.UUID):
                                pass
                            else:
                                continue

                            msg_timestamp = msg_dict.get("timestamp")
                            if isinstance(msg_timestamp, str):
                                msg_timestamp = datetime.fromisoformat(msg_timestamp.replace("Z", "+00:00"))
                            elif not isinstance(msg_timestamp, datetime):
                                msg_timestamp = datetime.now(timezone.utc)

                            messages.append(
                                ChatMessage(
                                    id=msg_id,
                                    role=msg_dict.get("role", "user"),
                                    content=msg_dict.get("content", ""),
                                    timestamp=msg_timestamp,
                                )
                            )
                        except Exception as e:
                            logger.warning(f"Error parsing message: {e}")
                            continue

            return ChatConversation(
                id=conv_id,
                title=doc.get("title", ""),
                messages=messages,
                tender_id=tender_id,
                context_type=doc.get("context_type", "none"),
                created_at=created_at,
                updated_at=updated_at,
            )
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"Error converting document to conversation: {e}")
            return None


