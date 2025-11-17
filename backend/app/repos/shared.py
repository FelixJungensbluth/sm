from app.repos.tender_repo import TenderRepo
from app.database.mongo import MongoClientDep
from app.repos.document_repo import DocumentRepo

def get_tender_repo(client: MongoClientDep):
    return TenderRepo(client)

def get_document_repo(client: MongoClientDep):
    return DocumentRepo(client)