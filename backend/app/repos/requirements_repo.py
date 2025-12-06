from app.models.requirement import RequirementStatus
from app.models.requirement import Requirement
import uuid
from pymongo import MongoClient


class RequirementsRepo:
    def __init__(self, client: MongoClient):
        self.collection = client["skillMatch"]["requirements"]

    def get_requirements_by_tender_id(self, tender_id: uuid.UUID) -> list[Requirement]:
        return list(self.collection.find({"tender_id": str(tender_id)}))

    def create_requirements(self, requirements: list[Requirement]) -> None:
        docs = []
        for req in requirements:
            doc = req.model_dump()
            doc["id"] = str(req.id)
            doc["tender_id"] = str(req.tender_id)
            docs.append(doc)
        self.collection.insert_many(docs)


    def update_requirement_status(self, requirement_id: uuid.UUID, requirement_status: RequirementStatus) -> bool:
        result = self.collection.update_one({"id": str(requirement_id)}, {"$set": {"status": requirement_status.value}})
        return result.matched_count > 0