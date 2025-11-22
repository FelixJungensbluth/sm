from app.models.tender import TenderProcessingStatus
from pymongo import MongoClient

class JobsRepo:
    def __init__(self, client: MongoClient):
        self.collection = client["skillMatch"]["tender_jobs"]

    def get_completed_jobs(self) -> list[dict]:
        return list(self.collection.find({
            "type": "tender_processing",
            "status": TenderProcessingStatus.done.value,
        }))