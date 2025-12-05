from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from typing import Optional
import random

from app.database import get_db
from app.models import Question, Choice, AttemptHistory, Bookmark


router = APIRouter()


class QuizStartRequest(BaseModel):
    """Request to start a quiz."""
    question_set_id: Optional[int] = None
    question_type: Optional[str] = None
    shuffle_questions: bool = True
    shuffle_choices: bool = True
    bookmarked_only: bool = False
    frequently_wrong_only: bool = False
    limit: int = 20


class SubmitAnswerRequest(BaseModel):
    """Request to submit an answer."""
    question_id: int
    user_answer: str
    time_spent_seconds: Optional[float] = None


@router.post("/start")
async def start_quiz(
    request: QuizStartRequest,
    db: AsyncSession = Depends(get_db)
):
    """Start a quiz session with specified options."""
    
    query = select(Question)
    
    # Filter by question set
    if request.question_set_id:
        query = query.where(Question.question_set_id == request.question_set_id)
    
    # Filter by question type
    if request.question_type:
        query = query.where(Question.type == request.question_type)
    
    # Filter by bookmarked only
    if request.bookmarked_only:
        query = query.join(Bookmark).where(Bookmark.question_id == Question.id)
    
    # Filter by frequently wrong only (questions with <50% correct rate)
    if request.frequently_wrong_only:
        # Subquery to calculate correct rate
        subquery = (
            select(
                AttemptHistory.question_id,
                func.avg(AttemptHistory.is_correct.cast(db.bind.dialect.NUMERIC)).label("correct_rate")
            )
            .group_by(AttemptHistory.question_id)
            .having(func.avg(AttemptHistory.is_correct.cast(db.bind.dialect.NUMERIC)) < 0.5)
            .alias()
        )
        query = query.join(subquery, Question.id == subquery.c.question_id)
    
    result = await db.execute(query)
    questions = list(result.scalars().all())
    
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found matching criteria")
    
    # Shuffle questions if requested
    if request.shuffle_questions:
        random.shuffle(questions)
    
    # Limit number of questions
    questions = questions[:request.limit]
    
    # Prepare response
    quiz_questions = []
    for q in questions:
        # Load choices
        choices_result = await db.execute(
            select(Choice).where(Choice.question_id == q.id).order_by(Choice.order_index)
        )
        choices = list(choices_result.scalars().all())
        
        # Shuffle choices if requested
        if request.shuffle_choices and choices:
            random.shuffle(choices)
        
        quiz_questions.append({
            "id": q.id,
            "type": q.type.value,
            "stem": q.stem,
            "choices": [{"label": c.label, "text": c.text} for c in choices]
        })
    
    return {
        "questions": quiz_questions,
        "total_questions": len(quiz_questions),
        "options": {
            "shuffle_questions": request.shuffle_questions,
            "shuffle_choices": request.shuffle_choices
        }
    }


@router.post("/submit")
async def submit_answer(
    request: SubmitAnswerRequest,
    db: AsyncSession = Depends(get_db)
):
    """Submit an answer and get feedback."""
    
    # Get question
    result = await db.execute(
        select(Question).where(Question.id == request.question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Check if answer is correct
    is_correct = request.user_answer.strip().lower() == question.answer.strip().lower()
    
    # Record attempt
    attempt = AttemptHistory(
        question_id=request.question_id,
        is_correct=is_correct,
        user_answer=request.user_answer,
        time_spent_seconds=request.time_spent_seconds
    )
    db.add(attempt)
    await db.commit()
    
    return {
        "is_correct": is_correct,
        "correct_answer": question.answer,
        "explanation": question.explanation,
        "user_answer": request.user_answer
    }


@router.get("/bookmarked")
async def get_bookmarked_questions(
    db: AsyncSession = Depends(get_db)
):
    """Get all bookmarked questions."""
    
    query = select(Question).join(Bookmark).where(Bookmark.question_id == Question.id)
    result = await db.execute(query)
    questions = result.scalars().all()
    
    response = []
    for q in questions:
        choices_result = await db.execute(
            select(Choice).where(Choice.question_id == q.id).order_by(Choice.order_index)
        )
        choices = choices_result.scalars().all()
        
        response.append({
            "id": q.id,
            "type": q.type.value,
            "stem": q.stem,
            "answer": q.answer,
            "explanation": q.explanation,
            "choices": [{"label": c.label, "text": c.text} for c in choices]
        })
    
    return response


@router.get("/frequently-wrong")
async def get_frequently_wrong_questions(
    threshold: float = 0.5,
    db: AsyncSession = Depends(get_db)
):
    """Get questions with low correct rate."""
    
    # Subquery to calculate correct rate per question
    subquery = (
        select(
            AttemptHistory.question_id,
            func.avg(AttemptHistory.is_correct.cast(db.bind.dialect.NUMERIC)).label("correct_rate"),
            func.count(AttemptHistory.id).label("attempt_count")
        )
        .group_by(AttemptHistory.question_id)
        .having(func.count(AttemptHistory.id) >= 2)  # At least 2 attempts
        .having(func.avg(AttemptHistory.is_correct.cast(db.bind.dialect.NUMERIC)) < threshold)
        .alias()
    )
    
    query = select(Question).join(subquery, Question.id == subquery.c.question_id)
    result = await db.execute(query)
    questions = result.scalars().all()
    
    response = []
    for q in questions:
        choices_result = await db.execute(
            select(Choice).where(Choice.question_id == q.id).order_by(Choice.order_index)
        )
        choices = choices_result.scalars().all()
        
        response.append({
            "id": q.id,
            "type": q.type.value,
            "stem": q.stem,
            "answer": q.answer,
            "explanation": q.explanation,
            "choices": [{"label": c.label, "text": c.text} for c in choices]
        })
    
    return response
