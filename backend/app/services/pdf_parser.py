import pdfplumber
import re
from typing import List, Dict, Any


def extract_red_text_choices(pdf_path: str) -> Dict[int, str]:
    """
    Extract red-colored choice symbols from PDF.
    Returns a dict mapping question number to the red (correct) choice symbol.
    """
    question_answers = {}
    label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            all_chars = []
            for page in pdf.pages:
                all_chars.extend(page.chars)
            
            full_text = ""
            red_positions = set()
            
            for i, char in enumerate(all_chars):
                full_text += char['text']
                color = char.get('non_stroking_color', None)
                
                if color and len(color) == 3:
                    r, g, b = color
                    if r > 0.5 and g < 0.4 and b < 0.4:
                        red_positions.add(i)
            
            question_pattern = r'(\d+)\s*[\.）\)]\s*'
            
            for match in re.finditer(question_pattern, full_text):
                q_num = int(match.group(1))
                start_pos = match.end()
                
                next_match = re.search(r'\n\d+\s*[\.）\)]', full_text[start_pos:])
                end_pos = start_pos + next_match.start() if next_match else len(full_text)
                
                for pos in range(start_pos, min(end_pos, len(full_text))):
                    if pos in red_positions:
                        char = full_text[pos] if pos < len(full_text) else ''
                        if char in label_map:
                            question_answers[q_num] = label_map[char]
                            break
    except Exception:
        pass
    
    return question_answers


async def extract_pdf_text(file_path: str) -> str:
    """Extract raw text from PDF file."""
    try:
        with pdfplumber.open(file_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
        return full_text.strip()
    except Exception as e:
        raise Exception(f"Failed to extract PDF text: {str(e)}")


async def parse_pdf_questions(file_path: str) -> List[Dict[str, Any]]:
    """
    Parse PDF file to extract questions.
    Handles both multiple choice (①②③④) and short answer questions.
    """
    questions = []
    
    try:
        red_answers = extract_red_text_choices(file_path)
        full_text = await extract_pdf_text(file_path)
        
        if not full_text:
            return []
        
        # Detect if there's a short answer section
        short_answer_section = None
        short_answer_markers = ['※ 주관식', '주관식 문제', '서술형 문제', '단답형 문제']
        for marker in short_answer_markers:
            if marker in full_text:
                idx = full_text.find(marker)
                short_answer_section = full_text[idx:]
                full_text = full_text[:idx]  # Multiple choice section
                break
        
        # Parse multiple choice questions
        mc_questions = parse_multiple_choice(full_text, red_answers)
        questions.extend(mc_questions)
        
        # Parse short answer questions
        if short_answer_section:
            sa_questions = parse_short_answer(short_answer_section)
            questions.extend(sa_questions)
    
    except Exception as e:
        raise Exception(f"Failed to parse PDF: {str(e)}")
    
    return questions


def parse_multiple_choice(text: str, red_answers: Dict[int, str]) -> List[Dict[str, Any]]:
    """Parse multiple choice questions from text."""
    questions = []
    
    question_splits = re.split(r'(?:^|\n)(\d+)\s*[\.）\)]\s*', text)
    
    i = 1
    while i < len(question_splits) - 1:
        q_num_str = question_splits[i]
        q_num = int(q_num_str) if q_num_str.isdigit() else 0
        q_text = question_splits[i + 1].strip()
        
        if not q_text:
            i += 2
            continue
        
        # Extract choices
        choice_pattern = r'([①②③④])\s*([^①②③④\n]+)'
        choices_matches = re.findall(choice_pattern, q_text)
        
        if not choices_matches:
            choice_pattern = r'([A-D])\s*[\.）\)]\s*([^\n]+)'
            choices_matches = re.findall(choice_pattern, q_text)
        
        if choices_matches and len(choices_matches) >= 2:
            first_choice_match = re.search(r'[①②③④]|[A-D]\s*[\.）\)]', q_text)
            if first_choice_match:
                stem = q_text[:first_choice_match.start()].strip()
            else:
                stem = q_text
            
            choices = []
            label_map = {'①': 'A', '②': 'B', '③': 'C', '④': 'D'}
            for choice_label, choice_text in choices_matches:
                normalized_label = label_map.get(choice_label, choice_label)
                choices.append({
                    "label": normalized_label,
                    "text": choice_text.strip()
                })
            
            answer = red_answers.get(q_num, "A")
            stem = re.sub(r'(?:정답|답)\s*[:：]\s*[①②③④A-D]', '', stem).strip()
            
            if stem and len(choices) >= 2:
                questions.append({
                    "type": "multiple_choice",
                    "stem": stem,
                    "choices": choices[:4],
                    "answer": answer,
                    "explanation": ""
                })
        
        i += 2
    
    return questions


def parse_short_answer(text: str) -> List[Dict[str, Any]]:
    """Parse short answer questions from text."""
    questions = []
    
    # Pattern: "1. 문제 내용 정답"
    # 정답은 마침표나 개행 전에 있음
    lines = text.split('\n')
    current_q = None
    current_text = ""
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Check if this is a new question (starts with number)
        q_match = re.match(r'^(\d+)\s*[\.）\)]\s*(.+)', line)
        
        if q_match:
            # Save previous question
            if current_q and current_text:
                stem, answer = extract_short_answer_parts(current_text)
                if stem and answer:
                    questions.append({
                        "type": "short_answer",
                        "stem": stem,
                        "answer": answer,
                        "explanation": ""
                    })
            
            current_q = int(q_match.group(1))
            current_text = q_match.group(2)
        elif current_q:
            current_text += " " + line
    
    # Save last question
    if current_q and current_text:
        stem, answer = extract_short_answer_parts(current_text)
        if stem and answer:
            questions.append({
                "type": "short_answer",
                "stem": stem,
                "answer": answer,
                "explanation": ""
            })
    
    return questions


def extract_short_answer_parts(text: str) -> tuple:
    """
    Extract stem and answer from short answer question text.
    Format examples:
    - "문제 내용. 정답"
    - "문제 내용? 정답"
    - "~를 쓰시오. 정답"
    """
    # Common question endings
    endings = ['쓰시오', '하시오', '서술하시오', '설명하시오', '무엇인가', '무엇입니까']
    
    # Try to find where the answer starts after a question ending
    for ending in endings:
        pattern = rf'(.*?{ending}[\.?]?)\s*(.+)'
        match = re.search(pattern, text, re.DOTALL)
        if match:
            stem = match.group(1).strip()
            answer = match.group(2).strip()
            return stem, answer
    
    # Fallback: Last sentence might be the answer
    # Split by periods and assume last part is answer
    parts = re.split(r'[\?？]', text)
    if len(parts) >= 2:
        stem = parts[0].strip() + '?'
        answer = ''.join(parts[1:]).strip()
        # Clean up answer (remove trailing punctuation patterns)
        answer = re.sub(r'^[\.\s]+', '', answer)
        if answer:
            return stem, answer
    
    return None, None
