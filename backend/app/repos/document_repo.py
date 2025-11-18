from typing import List, Optional
from pymongo import MongoClient
import uuid

from app.config.logger import logger
from app.models.document import Document


class DocumentRepo:
    def __init__(self, client: MongoClient):
        self.collection = client["skillMatch"]["documents"]

    def get_documents(self) -> List[Document]:
        documents = []
        for doc in self.collection.find():
            document = self._doc_to_document(doc)
            if document:
                documents.append(document)
        return documents

    def get_documents_by_tender_id(self, tender_id: uuid.UUID) -> List[Document]:
        documents = []
        for doc in self.collection.find({"tender_id": str(tender_id)}):
            document = self._doc_to_document(doc)
            if document:
                documents.append(document)
        return documents


    def create_documents(self, documents: list[Document]) -> list[Document]:
        if not documents:
            return []
        
        docs = [self._document_to_doc(doc) for doc in documents]
        result = self.collection.insert_many(docs)
        
        created_docs = list(self.collection.find({"_id": {"$in": result.inserted_ids}}))
        created_documents = []
        for doc in created_docs:
            document = self._doc_to_document(doc)
            if document:
                created_documents.append(document)
        
        return created_documents

    def delete_document(self, document_id: uuid.UUID) -> bool:
        try:
            result = self.collection.delete_one({"id": str(document_id)})
            return result.deleted_count > 0
        except Exception:
            return False

    def _document_to_doc(self, document: Document) -> dict:
        doc = document.model_dump()
        doc["id"] = str(document.id)
        doc["tender_id"] = str(document.tender_id)
        return doc

    def _doc_to_document(self, doc: dict) -> Optional[Document]:
        if not doc:
            return None

        try:
            id_value = doc.get("id")
            tender_id_value = doc.get("tender_id")

            return Document(
                id=uuid.UUID(id_value),
                name=doc.get("name", ""),
                tender_id=uuid.UUID(tender_id_value),
            )
            
        except (ValueError, KeyError, TypeError) as e:
            logger.error(f"Error converting document to document: {e}")
            return None
