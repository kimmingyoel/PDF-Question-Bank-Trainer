from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models import Question, Choice, QuestionSet, QuestionType
from app.services.llm_service import generate_questions_from_content


router = APIRouter()


class GenerateQuestionsRequest(BaseModel):
    """Request model for generating questions from content."""
    content: str
    num_questions: int = 10
    question_type: Optional[str] = "multiple_choice"
    question_set_name: Optional[str] = "AI Generated Questions"


class QuestionResponse(BaseModel):
    """Question response model."""
    id: int
    type: str
    stem: str
    answer: str
    explanation: Optional[str]
    choices: list[dict] = []
    
    model_config = {"from_attributes": True}


@router.get("/")
async def get_questions(
    question_set_id: Optional[int] = Query(None),
    question_type: Optional[str] = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db)
):
    """Get questions with optional filtering."""
    
    query = select(Question)
    
    if question_set_id:
        query = query.where(Question.question_set_id == question_set_id)
    
    if question_type:
        try:
            q_type = QuestionType(question_type)
            query = query.where(Question.type == q_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid question type")
    
    query = query.offset(offset).limit(limit).order_by(Question.order_index)
    
    result = await db.execute(query)
    questions = result.scalars().all()
    
    # Load choices for each question
    response = []
    for q in questions:
        choices_query = select(Choice).where(Choice.question_id == q.id).order_by(Choice.order_index)
        choices_result = await db.execute(choices_query)
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


@router.get("/{question_id}")
async def get_question(
    question_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get a specific question by ID."""
    
    result = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    # Load choices
    choices_result = await db.execute(
        select(Choice).where(Choice.question_id == question.id).order_by(Choice.order_index)
    )
    choices = choices_result.scalars().all()
    
    return {
        "id": question.id,
        "type": question.type.value,
        "stem": question.stem,
        "answer": question.answer,
        "explanation": question.explanation,
        "choices": [{"label": c.label, "text": c.text} for c in choices]
    }


@router.post("/generate")
async def generate_questions(
    request: GenerateQuestionsRequest,
    db: AsyncSession = Depends(get_db)
):
    """Generate questions from content using AI."""
    
    try:
        # Generate questions using LLM
        questions_data = await generate_questions_from_content(
            content=request.content,
            num_questions=request.num_questions,
            question_type=request.question_type
        )
        
        # Create question set
        question_set = QuestionSet(
            name=request.question_set_name,
            description="AI-generated questions"
        )
        db.add(question_set)
        await db.flush()
        
        # Create questions
        for idx, q_data in enumerate(questions_data):
            question = Question(
                question_set_id=question_set.id,
                type=QuestionType(q_data.get("type", request.question_type)),
                stem=q_data["stem"],
                answer=q_data["answer"],
                explanation=q_data.get("explanation", ""),
                order_index=idx
            )
            db.add(question)
            await db.flush()
            
            # Add choices if multiple choice
            if "choices" in q_data:
                for choice_idx, choice_data in enumerate(q_data["choices"]):
                    choice = Choice(
                        question_id=question.id,
                        label=choice_data["label"],
                        text=choice_data["text"],
                        order_index=choice_idx
                    )
                    db.add(choice)
        
        await db.commit()
        
        return {
            "message": "Questions generated successfully",
            "question_set_id": question_set.id,
            "questions_generated": len(questions_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating questions: {str(e)}")


@router.get("/sets/")
async def get_question_sets(
    db: AsyncSession = Depends(get_db)
):
    """Get all question sets."""
    
    result = await db.execute(select(QuestionSet).order_by(QuestionSet.created_at.desc()))
    question_sets = result.scalars().all()
    
    return [
        {
            "id": qs.id,
            "name": qs.name,
            "description": qs.description,
            "file_name": qs.file_name,
            "created_at": qs.created_at.isoformat()
        }
        for qs in question_sets
    ]


@router.delete("/{question_id}")
async def delete_question(
    question_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a specific question by ID."""
    
    result = await db.execute(
        select(Question).where(Question.id == question_id)
    )
    question = result.scalar_one_or_none()
    
    if not question:
        raise HTTPException(status_code=404, detail="문제를 찾을 수 없습니다.")
    
    await db.delete(question)
    await db.commit()
    
    return {"message": "문제가 삭제되었습니다.", "id": question_id}


@router.delete("/sets/{question_set_id}")
async def delete_question_set(
    question_set_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a question set and all its questions."""
    
    result = await db.execute(
        select(QuestionSet).where(QuestionSet.id == question_set_id)
    )
    question_set = result.scalar_one_or_none()
    
    if not question_set:
        raise HTTPException(status_code=404, detail="문제 세트를 찾을 수 없습니다.")
    
    await db.delete(question_set)
    await db.commit()
    
    return {"message": "문제 세트가 삭제되었습니다.", "id": question_set_id}

