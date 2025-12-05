from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.database import get_db
from app.models import Bookmark, Question


router = APIRouter()


class BookmarkCreateRequest(BaseModel):
    """Request to create a bookmark."""
    question_id: int


@router.post("/")
async def create_bookmark(
    request: BookmarkCreateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Create a bookmark for a question."""
    
    # Check if question exists
    result = await db.execute(
        select(Question).where(Question.id == request.question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if already bookmarked
    existing = await db.execute(
        select(Bookmark).where(Bookmark.question_id == request.question_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Question already bookmarked")
    
    # Create bookmark
    bookmark = Bookmark(question_id=request.question_id)
    db.add(bookmark)
    await db.commit()
    
    return {
        "message": "Bookmark created successfully",
        "bookmark_id": bookmark.id,
        "question_id": request.question_id
    }


@router.delete("/{question_id}")
async def delete_bookmark(
    question_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a bookmark for a question."""
    
    result = await db.execute(
        select(Bookmark).where(Bookmark.question_id == question_id)
    )
    bookmark = result.scalar_one_or_none()
    
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    
    await db.delete(bookmark)
    await db.commit()
    
    return {
        "message": "Bookmark deleted successfully",
        "question_id": question_id
    }


@router.get("/")
async def get_all_bookmarks(
    db: AsyncSession = Depends(get_db)
):
    """Get all bookmarks."""
    
    result = await db.execute(select(Bookmark))
    bookmarks = result.scalars().all()
    
    return [
        {
            "id": b.id,
            "question_id": b.question_id,
            "created_at": b.created_at.isoformat()
        }
        for b in bookmarks
    ]
