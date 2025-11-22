from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.tenders import router as tenders_router
from app.routes.jobs import router as jobs_router

app = FastAPI()

origins = [
    "http://localhost:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tenders_router)
app.include_router(jobs_router)
