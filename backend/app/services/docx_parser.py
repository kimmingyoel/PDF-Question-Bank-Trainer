from docx import Document
import re
from typing import List, Dict, Any


async def parse_docx_questions(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse DOCX file to extract questions.
    
    Similar to PDF parser, uses pattern matching to identify questions.
    """
    questions = []
    
    try:
        doc = Document(file_path)
        
        # Extract all text from paragraphs
        full_text = "\n".join([para.text for para in doc.paragraphs if para.text.strip()])
        
        # Pattern matching for common question formats
        question_pattern = r'(?:^|\n)(\d+|Q\d+)[\.\)]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\)]|\Z)'
        matches = re.finditer(question_pattern, full_text, re.MULTILINE | re.DOTALL)
        
        for idx, match in enumerate(matches):
            question_text = match.group(2).strip()
            
            # Try to extract choices (A, B, C, D format)
            choice_pattern = r'([A-D]|[①-④])[\.\)]\s*([^\n]+)'
            choices_matches = re.findall(choice_pattern, question_text)
            
            if choices_matches:
                # Multiple choice question
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
                
                # Extract answer
                answer_pattern = r'(?:정답|답)\s*[:：]\s*([A-D]|[①-④])'
                answer_match = re.search(answer_pattern, question_text)
                answer = answer_match.group(1) if answer_match else "A"
                
                # Normalize answer
                label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
                answer = label_map.get(answer, answer)
                
                # Extract explanation if exists
                explanation_pattern = r'(?:해설|설명)\s*[:：]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\)]|\Z)'
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
                else:
                    stem = question_text
                    answer = ""
                
                # Extract explanation
                explanation_pattern = r'(?:해설|설명)\s*[:：]\s*(.+?)(?=\n(?:\d+|Q\d+)[\.\)]|\Z)'
                explanation_match = re.search(explanation_pattern, question_text, re.DOTALL)
                explanation = explanation_match.group(1).strip() if explanation_match else ""
                
                questions.append({
                    "type": "short_answer",
                    "stem": stem,
                    "answer": answer,
                    "explanation": explanation
                })
        
        # Fallback if no questions found
        if not questions:
            questions.append({
                "type": "short_answer",
                "stem": full_text[:500] + "..." if len(full_text) > 500 else full_text,
                "answer": "",
                "explanation": "Failed to parse structured questions. Please review manually."
            })
    
    except Exception as e:
        raise Exception(f"Failed to parse DOCX: {str(e)}")
    
    return questions
