# PDF Question Bank Trainer

문제은행 기반 반복 학습을 위한 **PDF/DOCX 문제 추출 & 자동 문제 생성 플랫폼**입니다.  
사용자가 가진 문제집 또는 수업 자료를 업로드하면, 문제를 자동으로 추출하거나 생성하고,  
북마크·오답 중심 반복 학습까지 지원합니다.

---


## 1. 개요 및 목적

### 1-1. 서비스 개요

이 프로젝트는 다음을 목표로 하는 **문제은행 기반 학습 도구**입니다.

- PDF / Word(docx) 파일에서 **문제와 정답을 자동으로 추출**
- 수업 자료(설명 위주 문서)로부터 **AI가 문제를 자동 생성**
- 사용자가 문제를 **여러 번 반복해서 풀어보며 정답에 익숙해질 수 있도록 지원**
- **북마크, 자주 틀리는 문제** 중심으로 효율적인 복습 기능 제공
- 문제/선택지 순서를 랜덤 셔플하여 **암기보다 이해 위주의 학습** 유도

---

### 1-2. 주요 기능

#### (1) 파일 업로드 및 문제/정답 추출

- 지원 형식: **PDF, DOCX(Word)**
- 기능
  - 업로드한 파일에서 텍스트 추출
  - 규칙 + LLM 보조 파싱으로 **문항, 선택지, 정답, 해설 구조화**
  - 객관식 / 주관식 문제 유형 구분

예상 데이터 구조(개념):

    {
      "id": "q_001",
      "type": "multiple_choice",
      "stem": "다음 중 옳은 것은?",
      "choices": [
        { "label": "A", "text": "..." },
        { "label": "B", "text": "..." },
        { "label": "C", "text": "..." },
        { "label": "D", "text": "..." }
      ],
      "answer": ["C"],
      "explanation": "정답 해설 텍스트"
    }

---

#### (2) 수업 자료 기반 자동 문제 생성

- 수업 슬라이드, 요약본, 강의 노트 등 **설명 위주 자료만 있어도 문제 자동 생성**
- **LangChain + Ollama (gemma3:12b)** 조합으로:
  - 객관식, 단답형, 서술형 등 다양한 유형 생성
  - 생성 문항 수, 유형 비율 등 옵션을 설정 가능하도록 설계

예시 프롬프트:

> 다음 텍스트를 기반으로 4지선다 객관식 10문제를 생성하고,  
> 각 문항에 정답과 간단한 해설을 포함한 JSON 배열을 만들어줘.

---

#### (3) 문제 풀이 모드

- **문제 세트 선택**
  - 특정 파일 기반, 태그 기반 등으로 문제 묶음 선택
- **풀이 옵션**
  - 문제 순서 셔플(랜덤)
  - 객관식 선택지 순서 셔플
- **풀이 화면**
  - 문제 표시 → 답 선택/입력 → 정답 여부/해설 표시
  - 풀이 기록(정답/오답, 시간 등) 저장

---

#### (4) 북마크 & 자주 틀리는 문제 관리

- **북마크 기능**
  - 풀이 중 특정 문제를 ⭐ 북마크
  - “북마크한 문제만 풀기” 모드 제공
- **오답 기반 학습**
  - 각 문제별 정답/오답 횟수 기록
  - 정답률이 낮은 문제를 모아 “자주 틀리는 문제만 풀기” 제공

---

### 1-3. 기본 사용 흐름

1. 사용자가 PDF / DOCX 업로드  
2. 시스템이 문제를 추출하거나, 수업 자료라면 문제를 자동 생성  
3. 사용자는 문제 세트를 선택 후, 셔플 옵션을 설정하고 풀이 시작  
4. 풀이 중 헷갈리는 문제는 북마크, 틀린 문제는 통계에 반영  
5. 이후 **북마크 모드** 또는 **자주 틀리는 문제 모드**로 반복 학습

---

## 2. 기술 스택

### 2-1. 전체 아키텍처

- 구조: **Frontend (웹 클라이언트) + Backend API 서버 + DB + AI/문서 처리 모듈**
- AI 부분은 **LangChain + Ollama (로컬 LLM 서버)** 를 사용하며,  
  로컬에 설치된 **gemma3:12b** 모델을 기본 LLM으로 활용합니다.

---

### 2-2. 백엔드

- 언어 & 프레임워크
  - Python 3.11+
  - FastAPI

- 주요 라이브러리
  - 웹 프레임워크: fastapi, uvicorn
  - ORM: SQLAlchemy (또는 SQLModel 등 선택)
  - PDF 파싱: pdfplumber 또는 PyPDF2
  - DOCX 파싱: python-docx
  - AI/LLM 오케스트레이션: langchain, langchain-community
  - Ollama 연동:
    - langchain_community.llms.Ollama
    - 또는 langchain_community.chat_models.ChatOllama

- 주요 역할
  - 파일 업로드 및 저장
  - 문서 파싱 및 문제/정답 추출 API
  - LangChain 체인을 통한 **문제 자동 생성 / 파싱 보조 API**
  - 문제/북마크/오답 통계 CRUD API
  - 풀이 기록 및 통계 관리

---

### 2-3. AI / LLM 구성 (LangChain + Ollama + gemma3:12b)

- Ollama
  - 로컬 LLM 서버 역할
  - 기본 HTTP 엔드포인트: http://localhost:11434
- 모델
  - 로컬에 설치된 gemma3:12b 사용

예시 LangChain 구성 (개념, 실제 코드는 별도 파일에 구현):

    from langchain_community.llms import Ollama
    from langchain.prompts import PromptTemplate
    from langchain.chains import LLMChain

    llm = Ollama(
        model="gemma3:12b",       # 로컬에 설치된 모델 이름
        base_url="http://localhost:11434"
    )

    prompt = PromptTemplate(
        input_variables=["content", "num_questions"],
        template=(
            "다음 학습 내용을 바탕으로 한국어 객관식 문제 {num_questions}개를 생성해줘.\n"
            "각 문항은 JSON 배열 원소로, "
            "stem, choices(4개), answer(정답 선택지 인덱스), explanation 필드를 포함해야 해.\n\n"
            "학습 내용:\n{content}"
        ),
    )

    generate_questions_chain = LLMChain(llm=llm, prompt=prompt)

예시 FastAPI 엔드포인트 스케치:

    from fastapi import APIRouter
    from pydantic import BaseModel

    router = APIRouter()

    class GenerateRequest(BaseModel):
        content: str
        num_questions: int = 10

    @router.post("/questions/generate")
    async def generate_questions(req: GenerateRequest):
        response = generate_questions_chain.run(
            content=req.content,
            num_questions=req.num_questions
        )
        # response를 JSON으로 파싱하여 DB 저장 또는 그대로 반환
        return {"raw": response}

---

### 2-4. 데이터베이스 & 스토리지

- DB: PostgreSQL
  - 문제, 선택지, 정답, 풀이 기록, 북마크, 통계 등 저장
- 파일 스토리지
  - 초기: 로컬 디렉터리(./uploads)
  - 향후: 필요 시 S3 등 오브젝트 스토리지로 확장 가능하도록 추상화

---

### 2-5. 프론트엔드

- 언어 & 프레임워크
  - TypeScript
  - React
  - Vite

- 주요 라이브러리
  - 서버 상태 관리: React Query(TanStack Query)
  - UI 컴포넌트: MUI(Material UI) 또는 Chakra UI

- 주요 화면
  - 파일 업로드 화면
  - 문제 리스트 / 필터링 화면
  - 문제 풀이 화면 (셔플, 선택지 랜덤, 북마크 버튼 포함)
  - 북마크 / 자주 틀리는 문제 전용 풀이 화면

---

### 2-6. 로컬 실행 가이드

※ 실제 폴더 구조나 명령어는 프로젝트 구현 시점에 맞게 조정하세요.

#### 1) Ollama 및 모델 준비

1. Ollama 설치 (https://ollama.com)  
2. 서버 실행 (설치 후 자동 실행되지만, 필요 시 수동 실행)

       ollama serve

3. gemma3:12b 모델 다운로드

       ollama pull gemma3:12b

#### 2) 백엔드

    # 의존성 설치
    pip install -r requirements.txt

    # 서버 실행
    uvicorn app.main:app --reload --port 8000

- API 문서: http://localhost:8000/docs

#### 3) 프론트엔드

    cd frontend
    npm install
    npm run dev

- 개발 서버: http://localhost:5173 (또는 콘솔에 출력된 주소)

---

### 2-7. 환경 변수 예시

    # backend/.env
    DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/question_bank
    FILE_STORAGE_PATH=./uploads

    # Ollama 관련 설정 (기본값 사용 시 생략 가능)
    OLLAMA_BASE_URL=http://localhost:11434
    LLM_MODEL_NAME=gemma3:12b

백엔드 코드에서는 OLLAMA_BASE_URL, LLM_MODEL_NAME 값을 읽어  
LangChain의 Ollama(또는 ChatOllama) 인스턴스를 초기화하도록 구성할 수 있습니다.
>>>>>>> 3fab084 (Initial commit: PDF Question Bank Trainer project setup)
