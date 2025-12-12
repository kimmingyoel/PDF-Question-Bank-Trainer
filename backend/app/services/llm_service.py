from langchain_community.llms import Ollama
import json
from typing import List, Dict, Any, Optional

from app.config import settings


# Initialize Ollama LLM
llm = Ollama(
    model=settings.llm_model_name,
    base_url=settings.ollama_base_url,
    temperature=0.7,
)


async def generate_questions_from_content(
    content: str,
    num_questions: int = 10,
    question_type: Optional[str] = "multiple_choice"
) -> List[Dict[str, Any]]:
    """
    Generate questions from content using Ollama.
    
    Args:
        content: The learning material content
        num_questions: Number of questions to generate
        question_type: "multiple_choice" or "short_answer"
    
    Returns:
        List of generated questions
    """
    try:
        if question_type == "short_answer":
            prompt = f"""다음 학습 내용을 바탕으로 한국어 단답형 문제 {num_questions}개를 생성해줘.

각 문항은 다음 JSON 형식을 따라야 해:
{{
  "stem": "문제 본문",
  "answer": "정답",
  "explanation": "정답 설명"
}}

학습 내용:
{content}

생성된 문제들을 JSON 배열로 반환해줘. 다른 텍스트 없이 오직 JSON만 반환해.
"""
        else:
            prompt = f"""다음 학습 내용을 바탕으로 한국어 객관식 문제 {num_questions}개를 생성해줘.

각 문항은 다음 JSON 형식을 따라야 해:
{{
  "stem": "문제 본문",
  "choices": [
    {{"label": "A", "text": "선택지 1"}},
    {{"label": "B", "text": "선택지 2"}},
    {{"label": "C", "text": "선택지 3"}},
    {{"label": "D", "text": "선택지 4"}}
  ],
  "answer": "A",
  "explanation": "정답 설명"
}}

학습 내용:
{content}

생성된 문제들을 JSON 배열로 반환해줘. 다른 텍스트 없이 오직 JSON만 반환해.
"""
        
        # Call LLM
        response = llm.invoke(prompt)
        
        # Parse JSON response
        response = response.strip()
        
        # Remove markdown code blocks if present
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1])
        
        # Try to find JSON array in the response
        start_idx = response.find("[")
        end_idx = response.rfind("]")
        
        if start_idx != -1 and end_idx != -1:
            json_str = response[start_idx:end_idx + 1]
            questions = json.loads(json_str)
        else:
            # Fallback: try to parse entire response
            questions = json.loads(response)
        
        # Add type field if not present
        for q in questions:
            if "type" not in q:
                q["type"] = question_type
        
        return questions
    
    except json.JSONDecodeError as e:
        # If JSON parsing fails, return a fallback error question
        return [{
            "type": "short_answer",
            "stem": f"LLM 응답 파싱 실패. 원본 응답: {response[:200]}...",
            "answer": "",
            "explanation": f"JSON 파싱 오류: {str(e)}"
        }]
    except Exception as e:
        raise Exception(f"Failed to generate questions: {str(e)}")


async def parse_text_with_llm(text: str) -> List[Dict[str, Any]]:
    """
    Use LLM to parse unstructured text into questions.
    
    This can be used as a fallback when rule-based parsing fails.
    """
    prompt = f"""다음 텍스트에서 문제와 정답을 추출해서 JSON 배열로 변환해줘.

텍스트:
{text}

각 문항은 다음 형식을 따라야 해:
- 객관식인 경우: {{"stem": "문제", "choices": [{{"label": "A", "text": "..."}}, ...], "answer": "A", "type": "multiple_choice"}}
- 단답형인 경우: {{"stem": "문제", "answer": "정답", "type": "short_answer"}}

JSON 배열만 반환해줘.
"""
    
    try:
        response = llm.invoke(prompt)
        
        # Parse JSON
        response = response.strip()
        if response.startswith("```"):
            lines = response.split("\n")
            response = "\n".join(lines[1:-1])
        
        start_idx = response.find("[")
        end_idx = response.rfind("]")
        
        if start_idx != -1 and end_idx != -1:
            json_str = response[start_idx:end_idx + 1]
            questions = json.loads(json_str)
        else:
            questions = json.loads(response)
        
        return questions
    
    except Exception as e:
        raise Exception(f"Failed to parse with LLM: {str(e)}")
