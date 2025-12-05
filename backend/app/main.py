from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import init_db
from app.routers import upload, questions, quiz, bookmarks


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Initializing database...")
    await init_db()
    print("Database initialized.")
    yield
    # Shutdown
    print("Shutting down...")


app = FastAPI(
    title="PDF Question Bank Trainer API",
    description="AI-powered question extraction and quiz platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(upload.router, prefix="/api/upload", tags=["Upload"])
app.include_router(questions.router, prefix="/api/questions", tags=["Questions"])
app.include_router(quiz.router, prefix="/api/quiz", tags=["Quiz"])
app.include_router(bookmarks.router, prefix="/api/bookmarks", tags=["Bookmarks"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "PDF Question Bank Trainer API",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}
