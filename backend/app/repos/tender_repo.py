from typing import List, Optional
from pymongo import MongoClient
from datetime import datetime, timezone
import uuid

from app.config.logger import logger
from app.models.tender import Tender


class TenderRepo:
    def __init__(self, client: MongoClient):
        self.collection = client["skillMatch"]["tenders"]

    def get_tenders(self) -> List[Tender]:
        tenders = []
        for doc in self.collection.find():
            tender = self._doc_to_tender(doc)
            if tender:
                tenders.append(tender)
        return tenders

    def get_tender_by_id(self, tender_id: uuid.UUID) -> Optional[Tender]:
        try:
            doc = self.collection.find_one({"id": str(tender_id)})
            if doc:
                return self._doc_to_tender(doc)

            return None
        except Exception:
            return None

    def create_tender(self, tender: Tender) -> Tender | None:
        doc = self._tender_to_doc(tender)
        result = self.collection.insert_one(doc)
        created_doc = self.collection.find_one({"_id": result.inserted_id})
        created_tender = self._doc_to_tender(created_doc) if created_doc else None

        return created_tender if created_tender else None

    def update_tender(self, tender: Tender) -> Optional[Tender]:
        doc = self._tender_to_doc(tender)
        update_doc = {k: v for k, v in doc.items() if k != "_id"}
        update_doc["updated_at"] = datetime.now(timezone.utc)

        result = self.collection.update_one(
            {"id": str(tender.id)}, {"$set": update_doc}
        )

        if result.matched_count > 0:
            updated_doc = self.collection.find_one({"id": str(tender.id)})
            return self._doc_to_tender(updated_doc) if updated_doc else None
        return None

    def delete_tender(self, tender_id: uuid.UUID) -> bool:
        try:
            result = self.collection.delete_one({"id": str(tender_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    def _tender_to_doc(self, tender: Tender) -> dict:
        doc = tender.model_dump()
        doc["id"] = str(tender.id)
        if isinstance(doc.get("created_at"), datetime):
            doc["created_at"] = doc["created_at"]
        if isinstance(doc.get("updated_at"), datetime):
            doc["updated_at"] = doc["updated_at"]
        return doc

    def _doc_to_tender(self, doc: dict) -> Optional[Tender]:
        if not doc:
            return None

        try:
            id_value = doc.get("id")
            if not id_value:
                return None

            if isinstance(id_value, str):
                tender_id = uuid.UUID(id_value)
            elif isinstance(id_value, uuid.UUID):
                tender_id = id_value
            else:
                return None

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

            return Tender(
                id=tender_id,
                title=doc.get("title", ""),
                description=doc.get("description", ""),
                created_at=created_at,
                updated_at=updated_at,
            )
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"Error converting document to tender: {e}")
            return None
