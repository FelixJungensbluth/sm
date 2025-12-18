"""Main FastAPI application module."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routes.tenders import router as tenders_router
from app.routes.jobs import router as jobs_router
from app.routes.requirements import router as requirements_router
from app.routes.chat import router as chat_router
from app.routes.agent_traces import router as agent_traces_router
from app.config.settings import get_settings
from app.config.logger import logger
from app.database.mongo import get_mongo_client, close_mongo_client
from app.database.qdrant import get_qdrant_client, close_qdrant_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan: startup and shutdown events."""
    # Startup
    logger.info("Starting application...")
    
    # Initialize database connections
    get_mongo_client()
    get_qdrant_client()
    
    logger.info("Application started successfully")
    yield
    
    # Shutdown
    logger.info("Shutting down application...")
    close_mongo_client()
    close_qdrant_client()
    logger.info("Application shut down successfully")


app = FastAPI(
    title="SkillMatch API",
    description="API for managing tenders, requirements, and chat conversations",
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

settings = get_settings()
origins = [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.exception(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"},
    )


@app.get("/health", tags=["health"], summary="Health check endpoint")
async def health_check():
    """Health check endpoint to verify the API is running."""
    return {"status": "healthy"}


app.include_router(tenders_router)
app.include_router(jobs_router)
app.include_router(requirements_router)
app.include_router(chat_router)
app.include_router(agent_traces_router)