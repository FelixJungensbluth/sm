from app.repos.tender_repo import TenderRepo
from app.database.mongo import MongoClientDep

def get_tender_repo(client: MongoClientDep):
    return TenderRepo(client)