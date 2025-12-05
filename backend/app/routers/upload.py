from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import os
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.models import QuestionSet, Question, Choice, QuestionType
from app.services.pdf_parser import parse_pdf_questions
from app.services.docx_parser import parse_docx_questions


router = APIRouter()


@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and parse PDF file to extract questions."""
    
    # Validate file type
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Create uploads directory if not exists
    upload_dir = Path(settings.file_storage_path)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    try:
        # Parse PDF to extract questions
        questions_data = await parse_pdf_questions(str(file_path))
        
        # Create question set
        question_set = QuestionSet(
            name=file.filename,
            description=f"Uploaded from {file.filename}",
            file_name=file.filename,
            file_path=str(file_path)
        )
        db.add(question_set)
        await db.flush()  # Get question_set.id
        
        # Create questions
        for idx, q_data in enumerate(questions_data):
            question = Question(
                question_set_id=question_set.id,
                type=QuestionType(q_data.get("type", "multiple_choice")),
                stem=q_data["stem"],
                answer=q_data["answer"],
                explanation=q_data.get("explanation", ""),
                order_index=idx
            )
            db.add(question)
            await db.flush()  # Get question.id
            
            # Add choices if multiple choice
            if question.type == QuestionType.MULTIPLE_CHOICE and "choices" in q_data:
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
            "message": "PDF uploaded and parsed successfully",
            "question_set_id": question_set.id,
            "questions_extracted": len(questions_data),
            "file_path": str(file_path)
        }
        
    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")


@router.post("/docx")
async def upload_docx(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """Upload and parse DOCX file to extract questions."""
    
    # Validate file type
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="File must be a DOCX")
    
    # Create uploads directory if not exists
    upload_dir = Path(settings.file_storage_path)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    try:
        # Parse DOCX to extract questions
        questions_data = await parse_docx_questions(str(file_path))
        
        # Create question set
        question_set = QuestionSet(
            name=file.filename,
            description=f"Uploaded from {file.filename}",
            file_name=file.filename,
            file_path=str(file_path)
        )
        db.add(question_set)
        await db.flush()
        
        # Create questions
        for idx, q_data in enumerate(questions_data):
            question = Question(
                question_set_id=question_set.id,
                type=QuestionType(q_data.get("type", "multiple_choice")),
                stem=q_data["stem"],
                answer=q_data["answer"],
                explanation=q_data.get("explanation", ""),
                order_index=idx
            )
            db.add(question)
            await db.flush()
            
            # Add choices if multiple choice
            if question.type == QuestionType.MULTIPLE_CHOICE and "choices" in q_data:
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
            "message": "DOCX uploaded and parsed successfully",
            "question_set_id": question_set.id,
            "questions_extracted": len(questions_data),
            "file_path": str(file_path)
        }
        
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Error parsing DOCX: {str(e)}")
