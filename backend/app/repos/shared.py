from app.repos.requirements_repo import RequirementsRepo
from app.repos.jobs_repo import JobsRepo
from app.repos.tender_repo import TenderRepo
from app.database.mongo import MongoClientDep
from app.repos.document_repo import DocumentRepo

def get_tender_repo(client: MongoClientDep):
    return TenderRepo(client)

def get_document_repo(client: MongoClientDep):
    return DocumentRepo(client)

def get_jobs_repo(client: MongoClientDep):
    return JobsRepo(client)

def get_requirements_repo(client: MongoClientDep):
    return RequirementsRepo(client)