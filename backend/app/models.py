from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Integer, Float, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base


class QuestionType(str, enum.Enum):
    """Question type enumeration."""
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"


class QuestionSet(Base):
    """Question set / file upload grouping."""
    __tablename__ = "question_sets"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    file_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    file_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    questions: Mapped[list["Question"]] = relationship("Question", back_populates="question_set", cascade="all, delete-orphan")


class Question(Base):
    """Question model."""
    __tablename__ = "questions"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_set_id: Mapped[int] = mapped_column(Integer, ForeignKey("question_sets.id"), nullable=False)
    type: Mapped[QuestionType] = mapped_column(SQLEnum(QuestionType), nullable=False)
    stem: Mapped[str] = mapped_column(Text, nullable=False)  # 문제 본문
    answer: Mapped[str] = mapped_column(Text, nullable=False)  # 정답 (JSON 또는 텍스트)
    explanation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # 해설
    order_index: Mapped[int] = mapped_column(Integer, default=0)  # 문제 순서
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    question_set: Mapped["QuestionSet"] = relationship("QuestionSet", back_populates="questions")
    choices: Mapped[list["Choice"]] = relationship("Choice", back_populates="question", cascade="all, delete-orphan")
    bookmarks: Mapped[list["Bookmark"]] = relationship("Bookmark", back_populates="question", cascade="all, delete-orphan")
    attempts: Mapped[list["AttemptHistory"]] = relationship("AttemptHistory", back_populates="question", cascade="all, delete-orphan")


class Choice(Base):
    """Multiple choice option."""
    __tablename__ = "choices"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(10), nullable=False)  # A, B, C, D
    text: Mapped[str] = mapped_column(Text, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="choices")


class Bookmark(Base):
    """Bookmarked questions."""
    __tablename__ = "bookmarks"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Future: user management
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="bookmarks")


class AttemptHistory(Base):
    """Question attempt history for tracking correct/incorrect answers."""
    __tablename__ = "attempt_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(Integer, ForeignKey("questions.id"), nullable=False)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # Future: user management
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    user_answer: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    time_spent_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    attempted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    question: Mapped["Question"] = relationship("Question", back_populates="attempts")
