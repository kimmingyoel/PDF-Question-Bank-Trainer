from docx import Document
import re
from typing import List, Dict, Any


async def extract_docx_text(file_path: str) -> str:
    """
    Extract raw text from DOCX file.
    """
    try:
        doc = Document(file_path)
        full_text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        return full_text.strip()
    except Exception as e:
        raise Exception(f"Failed to extract DOCX text: {str(e)}")


async def parse_docx_questions(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse DOCX file to extract questions.
    Returns empty list if no questions found (for AI generation fallback).
    """
    questions = []
    
    try:
        full_text = await extract_docx_text(file_path)
        
        if not full_text:
            return []
        
        # Pattern matching for common question formats
        question_pattern = r'(?:^|\n)(\d+|Q\d+)[\.\\)]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\\)]|\Z)'
        matches = list(re.finditer(question_pattern, full_text, re.MULTILINE | re.DOTALL))
        
        # If no question patterns found, return empty for AI fallback
        if not matches:
            return []
        
        for idx, match in enumerate(matches):
            question_text = match.group(2).strip()
            
            # Try to extract choices
            choice_pattern = r'([A-D]|[①-④])[\.\\)]\s*([^\n]+)'
            choices_matches = re.findall(choice_pattern, question_text)
            
            if choices_matches:
                # Multiple choice question
                stem_match = re.match(r'(.+?)(?=[A-D①-④][\.\\)])', question_text, re.DOTALL)
                stem = stem_match.group(1).strip() if stem_match else question_text
                
                choices = []
                for choice_label, choice_text in choices_matches:
                    label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
                    normalized_label = label_map.get(choice_label, choice_label)
                    
                    choices.append({
                        "label": normalized_label,
                        "text": choice_text.strip()
                    })
                
                # Extract answer
                answer_pattern = r'(?:정답|답)\s*[:：]\s*([A-D]|[①-④])'
                answer_match = re.search(answer_pattern, question_text)
                answer = answer_match.group(1) if answer_match else "A"
                
                label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
                answer = label_map.get(answer, answer)
                
                # Extract explanation
                explanation_pattern = r'(?:해설|설명)\s*[:：]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\\)]|\Z)'
                explanation_match = re.search(explanation_pattern, question_text, re.DOTALL)
                explanation = explanation_match.group(1).strip() if explanation_match else ""
                
                questions.append({
                    "type": "multiple_choice",
                    "stem": stem,
                    "choices": choices,
                    "answer": answer,
                    "explanation": explanation
                })
            else:
                # Short answer question
                answer_pattern = r'(?:정답|답)\s*[:：]\s*(.+?)(?:\n|$)'
                answer_match = re.search(answer_pattern, question_text)
                
                if answer_match:
                    stem = re.sub(answer_pattern, '', question_text).strip()
                    answer = answer_match.group(1).strip()
                    
                    explanation_pattern = r'(?:해설|설명)\s*[:：]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\\)]|\Z)'
                    explanation_match = re.search(explanation_pattern, question_text, re.DOTALL)
                    explanation = explanation_match.group(1).strip() if explanation_match else ""
                    
                    questions.append({
                        "type": "short_answer",
                        "stem": stem,
                        "answer": answer,
                        "explanation": explanation
                    })
    
    except Exception as e:
        raise Exception(f"Failed to parse DOCX: {str(e)}")
    
    return questions
