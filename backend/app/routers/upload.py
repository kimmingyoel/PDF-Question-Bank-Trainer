from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pathlib import Path
import os
from datetime import datetime

from app.database import get_db
from app.config import settings
from app.models import QuestionSet, Question, Choice, QuestionType
from app.services.pdf_parser import parse_pdf_questions, extract_pdf_text
from app.services.docx_parser import parse_docx_questions, extract_docx_text
from app.services.llm_service import generate_questions_from_content


router = APIRouter()


async def save_questions_to_db(questions_data: list, question_set: QuestionSet, db: AsyncSession):
    """Helper function to save questions to database."""
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
        
        if question.type == QuestionType.MULTIPLE_CHOICE and "choices" in q_data:
            for choice_idx, choice_data in enumerate(q_data["choices"]):
                choice = Choice(
                    question_id=question.id,
                    label=choice_data["label"],
                    text=choice_data["text"],
                    order_index=choice_idx
                )
                db.add(choice)


@router.post("/pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload PDF file and process it intelligently:
    1. Try to extract questions if file contains practice problems
    2. If no questions found, generate questions from content using AI
    """
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="PDF 파일만 업로드할 수 있습니다.")
    
    upload_dir = Path(settings.file_storage_path)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    try:
        # Step 1: Try to extract questions from the file
        questions_data = await parse_pdf_questions(str(file_path))
        
        processing_mode = "extracted"  # 문제 추출 모드
        
        # Step 2: If no questions found, generate using AI
        if not questions_data or len(questions_data) == 0:
            processing_mode = "generated"  # AI 생성 모드
            
            # Extract text from PDF
            text_content = await extract_pdf_text(str(file_path))
            
            if not text_content or len(text_content.strip()) < 100:
                raise HTTPException(
                    status_code=400, 
                    detail="파일에서 충분한 텍스트를 추출할 수 없습니다."
                )
            
            # Generate questions using AI
            questions_data = await generate_questions_from_content(
                content=text_content,
                num_questions=10,
                question_type="multiple_choice"
            )
        
        # Create question set
        question_set = QuestionSet(
            name=file.filename,
            description=f"{'문제 추출' if processing_mode == 'extracted' else 'AI 생성'}: {file.filename}",
            file_name=file.filename,
            file_path=str(file_path)
        )
        db.add(question_set)
        await db.flush()
        
        # Save questions
        await save_questions_to_db(questions_data, question_set, db)
        await db.commit()
        
        return {
            "message": f"파일 처리 완료 ({processing_mode})",
            "processing_mode": processing_mode,
            "question_set_id": question_set.id,
            "questions_count": len(questions_data),
            "file_path": str(file_path)
        }
        
    except HTTPException:
        if file_path.exists():
            os.remove(file_path)
        raise
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"파일 처리 중 오류 발생: {str(e)}")


@router.post("/docx")
async def upload_docx(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload DOCX file and process it intelligently:
    1. Try to extract questions if file contains practice problems
    2. If no questions found, generate questions from content using AI
    """
    
    if not file.filename.endswith('.docx'):
        raise HTTPException(status_code=400, detail="DOCX 파일만 업로드할 수 있습니다.")
    
    upload_dir = Path(settings.file_storage_path)
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_filename = f"{timestamp}_{file.filename}"
    file_path = upload_dir / safe_filename
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    try:
        # Step 1: Try to extract questions from the file
        questions_data = await parse_docx_questions(str(file_path))
        
        processing_mode = "extracted"
        
        # Step 2: If no questions found, generate using AI
        if not questions_data or len(questions_data) == 0:
            processing_mode = "generated"
            
            # Extract text from DOCX
            text_content = await extract_docx_text(str(file_path))
            
            if not text_content or len(text_content.strip()) < 100:
                raise HTTPException(
                    status_code=400, 
                    detail="파일에서 충분한 텍스트를 추출할 수 없습니다."
                )
            
            # Generate questions using AI
            questions_data = await generate_questions_from_content(
                content=text_content,
                num_questions=10,
                question_type="multiple_choice"
            )
        
        # Create question set
        question_set = QuestionSet(
            name=file.filename,
            description=f"{'문제 추출' if processing_mode == 'extracted' else 'AI 생성'}: {file.filename}",
            file_name=file.filename,
            file_path=str(file_path)
        )
        db.add(question_set)
        await db.flush()
        
        # Save questions
        await save_questions_to_db(questions_data, question_set, db)
        await db.commit()
        
        return {
            "message": f"파일 처리 완료 ({processing_mode})",
            "processing_mode": processing_mode,
            "question_set_id": question_set.id,
            "questions_count": len(questions_data),
            "file_path": str(file_path)
        }
        
    except HTTPException:
        if file_path.exists():
            os.remove(file_path)
        raise
    except Exception as e:
        if file_path.exists():
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"파일 처리 중 오류 발생: {str(e)}")
