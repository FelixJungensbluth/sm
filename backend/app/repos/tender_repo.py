from app.models.base_information import BaseInformationStatus
from typing import List, Optional
from pymongo import MongoClient
from datetime import datetime, timezone
import uuid

from app.config.logger import logger
from app.models.tender import Tender, TenderUpdate, TenderReviewStatus
from app.models.base_information import BaseInformation


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

    def update_tender(self, tender_id: uuid.UUID, tender_update: TenderUpdate) -> Optional[Tender]:
        update_doc = {}
        
        if tender_update.title is not None:
            update_doc["title"] = tender_update.title
        
        if tender_update.description is not None:
            update_doc["description"] = tender_update.description
        
        if tender_update.status is not None:
            update_doc["status"] = tender_update.status.value
        
        if tender_update.base_information is not None:
            update_doc["base_information"] = [
                info.model_dump(mode='json') for info in tender_update.base_information
            ]
        
        if not update_doc:
            # No fields to update, return existing tender
            return self.get_tender_by_id(tender_id)
        
        update_doc["updated_at"] = datetime.now(timezone.utc)

        try:
            result = self.collection.update_one(
                {"id": str(tender_id)}, {"$set": update_doc}
            )
        except Exception as e:
            logger.error(f"Error updating tender {tender_id}: {e}")
            logger.error(f"Update document: {update_doc}")
            raise

        if result.matched_count > 0:
            updated_doc = self.collection.find_one({"id": str(tender_id)})
            return self._doc_to_tender(updated_doc) if updated_doc else None
        return None

    def delete_tender(self, tender_id: uuid.UUID) -> bool:
        try:
            result = self.collection.delete_one({"id": str(tender_id)})
            return result.deleted_count > 0
        except Exception:
            return False
    
    def update_tender_base_information_status(self, tender_id: uuid.UUID, field_name: str, base_information_status: BaseInformationStatus) -> bool:
        result = self.collection.update_one(
            {"id": str(tender_id), "base_information.field_name": field_name},
            {"$set": {"base_information.$.status": base_information_status.value}}
        )
        return result.matched_count > 0

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

            # Convert base_information from list of dicts to list of BaseInformation objects
            base_information = []
            base_info_data = doc.get("base_information", [])
            if isinstance(base_info_data, list):
                for info_dict in base_info_data:
                    if isinstance(info_dict, dict):
                        try:
                            base_information.append(BaseInformation(**info_dict))
                        except Exception as e:
                            logger.warning(f"Error parsing base_information item: {e}")
                            continue

            # Convert status from string to TenderStatus enum
            status_value = doc.get("status")
            if isinstance(status_value, str):
                try:
                    status = TenderReviewStatus(status_value)
                except ValueError:
                    # If status doesn't match any enum value, default to in_review
                    logger.warning(f"Invalid status value '{status_value}', defaulting to in_review")
                    status = TenderReviewStatus.in_review
            elif isinstance(status_value, TenderReviewStatus):
                status = status_value
            else:
                # Default to in_review if status is missing or invalid
                status = TenderReviewStatus.in_review

            return Tender(
                id=tender_id,
                title=doc.get("title", ""),
                generated_title=doc.get("generated_title", ""),
                description=doc.get("description", ""),
                base_information=base_information,
                status=status,
                created_at=created_at,
                updated_at=updated_at,
            )
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"Error converting document to tender: {e}")
            return None
