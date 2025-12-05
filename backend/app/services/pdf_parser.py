import pdfplumber
import re
from typing import List, Dict, Any


async def parse_pdf_questions(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse PDF file to extract questions.
    
    This is a basic implementation that uses pattern matching.
    For production, consider using LLM assistance for more robust parsing.
    """
    questions = []
    
    try:
        with pdfplumber.open(file_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        
        # Pattern matching for common question formats
        # Example: "1. 문제 내용" or "Q1. 문제 내용"
        question_pattern = r'(?:^|\n)(\d+|Q\d+)[\.\)]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\)]|\Z)'
        matches = re.finditer(question_pattern, full_text, re.MULTILINE | re.DOTALL)
        
        for idx, match in enumerate(matches):
            question_text = match.group(2).strip()
            
            # Try to extract choices (A, B, C, D format)
            choice_pattern = r'([A-D]|[①-④])[\.\)]\s*([^\n]+)'
            choices_matches = re.findall(choice_pattern, question_text)
            
            if choices_matches:
                # Multiple choice question
                # Extract stem (text before choices)
                stem_match = re.match(r'(.+?)(?=[A-D①-④][\.\)])', question_text, re.DOTALL)
                stem = stem_match.group(1).strip() if stem_match else question_text
                
                choices = []
                for choice_label, choice_text in choices_matches:
                    # Normalize choice label
                    label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
                    normalized_label = label_map.get(choice_label, choice_label)
                    
                    choices.append({
                        "label": normalized_label,
                        "text": choice_text.strip()
                    })
                
                # Try to extract answer (look for "정답:" or "답:" patterns)
                answer_pattern = r'(?:정답|답)\s*[:：]\s*([A-D]|[①-④])'
                answer_match = re.search(answer_pattern, question_text)
                answer = answer_match.group(1) if answer_match else "A"  # Default to A if not found
                
                # Normalize answer
                label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
                answer = label_map.get(answer, answer)
                
                questions.append({
                    "type": "multiple_choice",
                    "stem": stem,
                    "choices": choices,
                    "answer": answer,
                    "explanation": ""
                })
            else:
                # Short answer question
                # Try to extract answer
                answer_pattern = r'(?:정답|답)\s*[:：]\s*(.+?)(?:\n|$)'
                answer_match = re.search(answer_pattern, question_text)
                
                if answer_match:
                    stem = re.sub(answer_pattern, '', question_text).strip()
                    answer = answer_match.group(1).strip()
                else:
                    stem = question_text
                    answer = ""
                
                questions.append({
                    "type": "short_answer",
                    "stem": stem,
                    "answer": answer,
                    "explanation": ""
                })
        
        # If no questions found with pattern matching, return at least the full text as one question
        if not questions:
            questions.append({
                "type": "short_answer",
                "stem": full_text[:500] + "..." if len(full_text) > 500 else full_text,
                "answer": "",
                "explanation": "Failed to parse structured questions. Please review manually."
            })
    
    except Exception as e:
        raise Exception(f"Failed to parse PDF: {str(e)}")
    
    return questions
