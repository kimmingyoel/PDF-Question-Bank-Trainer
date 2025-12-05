# PDF Question Bank Trainer - 프로젝트 구조

이 문서는 PDF Question Bank Trainer 프로젝트의 전체 구조와 각 컴포넌트의 역할을 설명합니다.

---

## 📁 전체 디렉토리 구조

```
vibe/
│
├── README.md                  # 프로젝트 개요 및 기술 스택 설명
├── QUICKSTART.md              # 빠른 시작 가이드
├── ARCHITECTURE.md            # 현재 문서 (프로젝트 구조 상세 설명)
│
├── backend/                   # FastAPI 백엔드 서버
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py           # 애플리케이션 진입점
│   │   ├── config.py         # 환경 설정
│   │   ├── database.py       # 데이터베이스 연결
│   │   ├── models.py         # ORM 모델
│   │   │
│   │   ├── routers/          # API 엔드포인트
│   │   │   ├── __init__.py
│   │   │   ├── upload.py     # 파일 업로드 API
│   │   │   ├── questions.py  # 문제 관리 API
│   │   │   ├── quiz.py       # 퀴즈 API
│   │   │   └── bookmarks.py  # 북마크 API
│   │   │
│   │   └── services/         # 비즈니스 로직
│   │       ├── __init__.py
│   │       ├── pdf_parser.py    # PDF 파싱
│   │       ├── docx_parser.py   # DOCX 파싱
│   │       └── llm_service.py   # AI 문제 생성
│   │
│   ├── requirements.txt      # Python 의존성
│   ├── .env.example          # 환경 변수 템플릿
│   └── .gitignore
│
└── frontend/                  # React 프론트엔드
    ├── src/
    │   ├── main.tsx          # React 진입점
    │   ├── App.tsx           # 루트 컴포넌트
    │   │
    │   ├── api/              # API 통신
    │   │   └── client.ts     # Axios 클라이언트
    │   │
    │   ├── hooks/            # React 훅
    │   │   └── useApi.ts     # React Query 훅
    │   │
    │   ├── pages/            # 페이지 컴포넌트
    │   │   ├── UploadPage.tsx
    │   │   ├── QuestionListPage.tsx
    │   │   └── QuizPage.tsx
    │   │
    │   └── types/            # TypeScript 타입
    │       └── index.ts
    │
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── .env.example
    └── .gitignore
```

---

## 🏗️ 백엔드 아키텍처

### 계층 구조

```
┌─────────────────────────────────────┐
│        FastAPI Application          │  ← main.py
├─────────────────────────────────────┤
│           API Routers               │  ← routers/
│  (upload, questions, quiz, etc.)    │
├─────────────────────────────────────┤
│         Business Logic              │  ← services/
│  (parsers, LLM service)              │
├─────────────────────────────────────┤
│         Database Layer              │  ← database.py, models.py
│      (SQLAlchemy ORM)                │
└─────────────────────────────────────┘
              ↓
      PostgreSQL Database
```

### 핵심 컴포넌트

#### 1. **main.py** - 애플리케이션 진입점
- FastAPI 앱 인스턴스 생성
- CORS 미들웨어 설정
- 라우터 등록 (upload, questions, quiz, bookmarks)
- 데이터베이스 초기화 (lifespan events)
- 헬스체크 엔드포인트 (`/health`)

```python
# 주요 구조
app = FastAPI(title="PDF Question Bank Trainer API")
app.add_middleware(CORSMiddleware, ...)
app.include_router(upload.router, prefix="/api/upload")
```

#### 2. **config.py** - 설정 관리
- Pydantic Settings를 사용한 환경 변수 로드
- 주요 설정:
  - `database_url`: PostgreSQL 연결 URL
  - `file_storage_path`: 업로드 파일 저장 경로
  - `ollama_base_url`: Ollama 서버 URL
  - `llm_model_name`: 사용할 LLM 모델 이름

#### 3. **database.py** - 데이터베이스 연결
- SQLAlchemy async engine 생성
- 비동기 세션 팩토리 (`AsyncSessionLocal`)
- 의존성 주입용 `get_db()` 함수
- 테이블 자동 생성 `init_db()` 함수

#### 4. **models.py** - ORM 모델

```mermaid
erDiagram
    QuestionSet ||--o{ Question : contains
    Question ||--o{ Choice : has
    Question ||--o{ Bookmark : has
    Question ||--o{ AttemptHistory : has

    QuestionSet {
        int id PK
        string name
        string description
        string file_name
        string file_path
        datetime created_at
    }

    Question {
        int id PK
        int question_set_id FK
        enum type
        text stem
        text answer
        text explanation
        int order_index
    }

    Choice {
        int id PK
        int question_id FK
        string label
        text text
        int order_index
    }

    Bookmark {
        int id PK
        int question_id FK
        int user_id
        datetime created_at
    }

    AttemptHistory {
        int id PK
        int question_id FK
        int user_id
        bool is_correct
        text user_answer
        float time_spent_seconds
        datetime attempted_at
    }
```

### API 라우터

#### **upload.py**
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/upload/pdf` | POST | PDF 파일 업로드 및 문제 추출 |
| `/api/upload/docx` | POST | DOCX 파일 업로드 및 문제 추출 |

**처리 흐름:**
1. 파일 검증 (확장자 체크)
2. 파일 저장 (`uploads/` 디렉토리)
3. 파서 호출 (PDF/DOCX)
4. QuestionSet 생성
5. 추출된 문제 및 선택지 DB 저장

#### **questions.py**
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/questions/` | GET | 문제 리스트 조회 (필터링 지원) |
| `/api/questions/{id}` | GET | 특정 문제 상세 조회 |
| `/api/questions/generate` | POST | AI 기반 문제 자동 생성 |
| `/api/questions/sets/` | GET | 문제 세트 리스트 조회 |

**필터 옵션:**
- `question_set_id`: 특정 세트의 문제만
- `question_type`: 문제 유형별 필터링
- `limit`, `offset`: 페이지네이션

#### **quiz.py**
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/quiz/start` | POST | 퀴즈 세션 시작 |
| `/api/quiz/submit` | POST | 답안 제출 및 채점 |
| `/api/quiz/bookmarked` | GET | 북마크한 문제 조회 |
| `/api/quiz/frequently-wrong` | GET | 자주 틀리는 문제 조회 |

**퀴즈 시작 옵션:**
```json
{
  "question_set_id": 1,
  "shuffle_questions": true,
  "shuffle_choices": true,
  "bookmarked_only": false,
  "frequently_wrong_only": false,
  "limit": 20
}
```

#### **bookmarks.py**
| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/bookmarks/` | POST | 북마크 추가 |
| `/api/bookmarks/{question_id}` | DELETE | 북마크 삭제 |
| `/api/bookmarks/` | GET | 모든 북마크 조회 |

### 서비스 레이어

#### **pdf_parser.py**
- **역할**: PDF 파일에서 문제 추출
- **라이브러리**: `pdfplumber`
- **파싱 방법**: 정규표현식 패턴 매칭
  - 문제 번호: `1.`, `Q1.`, `문1.`
  - 선택지: `A.`, `B.`, `①`, `②`
  - 정답: `정답: A`, `답: A`

**반환 형식:**
```python
[
  {
    "type": "multiple_choice",
    "stem": "문제 내용",
    "choices": [
      {"label": "A", "text": "선택지 1"},
      {"label": "B", "text": "선택지 2"}
    ],
    "answer": "A",
    "explanation": "해설"
  }
]
```

#### **docx_parser.py**
- **역할**: DOCX 파일에서 문제 추출
- **라이브러리**: `python-docx`
- **파싱 방법**: PDF와 동일한 패턴 매칭
- 단락(paragraph) 단위로 텍스트 추출 후 처리

#### **llm_service.py**
- **역할**: AI 기반 문제 자동 생성
- **라이브러리**: `langchain`, `langchain-community`
- **LLM**: Ollama (gemma3:12b)

**주요 함수:**
- `generate_questions_from_content()`: 학습 자료 → 문제 생성
- `parse_text_with_llm()`: 비구조화 텍스트 → 구조화된 문제 (LLM 보조 파싱)

**프롬프트 구조:**
```python
prompt = """다음 학습 내용을 바탕으로 한국어 객관식 문제 {num_questions}개를 생성해줘.
각 문항은 JSON 형식으로...
"""
```

---

## 🎨 프론트엔드 아키텍처

### 계층 구조

```
┌─────────────────────────────────────┐
│          React Components           │  ← pages/, App.tsx
├─────────────────────────────────────┤
│         React Query Hooks           │  ← hooks/useApi.ts
├─────────────────────────────────────┤
│         API Client (Axios)          │  ← api/client.ts
└─────────────────────────────────────┘
              ↓
    Backend API (FastAPI)
```

### 핵심 컴포넌트

#### 1. **App.tsx** - 루트 컴포넌트
- React Router 설정 (BrowserRouter)
- React Query Provider 설정
- Material-UI ThemeProvider (다크 모드)
- 전역 레이아웃 (AppBar, Container)

**라우팅:**
- `/` → UploadPage
- `/questions` → QuestionListPage
- `/quiz` → QuizPage

#### 2. **api/client.ts** - API 클라이언트
- Axios 인스턴스 생성
- 기본 URL: `http://localhost:8000`
- API 엔드포인트별 함수 그룹:
  - `uploadAPI`: PDF/DOCX 업로드
  - `questionsAPI`: 문제 CRUD, 생성
  - `quizAPI`: 퀴즈 관련
  - `bookmarksAPI`: 북마크 관리

#### 3. **hooks/useApi.ts** - React Query 훅
모든 API 호출을 React Query로 래핑:

**Query Hooks (데이터 조회):**
- `useQuestions()`: 문제 리스트
- `useQuestionSets()`: 문제 세트 리스트
- `useBookmarkedQuestions()`: 북마크 문제
- `useFrequentlyWrongQuestions()`: 오답 문제

**Mutation Hooks (데이터 변경):**
- `useUploadPDF()`, `useUploadDOCX()`: 파일 업로드
- `useStartQuiz()`: 퀴즈 시작
- `useSubmitAnswer()`: 답안 제출
- `useCreateBookmark()`, `useDeleteBookmark()`: 북마크 관리

**자동 캐시 무효화:**
```typescript
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: ['questions'] });
}
```

#### 4. **types/index.ts** - TypeScript 타입
- `Question`, `Choice`: 문제 데이터 구조
- `QuestionSet`: 문제 세트
- `QuizStartOptions`: 퀴즈 설정
- `SubmitAnswerResponse`: 채점 결과

### 페이지 컴포넌트

#### **UploadPage.tsx**
**구조:**
- 탭 인터페이스 (Material-UI Tabs)
  - Tab 1: 파일 업로드
  - Tab 2: AI 문제 생성

**파일 업로드 기능:**
1. 파일 선택 (`input[type="file"]`)
2. 업로드 버튼 클릭
3. `useUploadPDF` 또는 `useUploadDOCX` mutation 호출
4. 성공/실패 Alert 표시

**AI 생성 기능:**
1. 학습 내용 텍스트 입력 (TextField multiline)
2. 문제 개수 설정
3. `questionsAPI.generateQuestions()` 호출
4. 결과 피드백 표시

#### **QuestionListPage.tsx**
**구조:**
- 필터 섹션 (Paper)
  - 문제 세트 선택 (Select)
  - 문제 유형 선택 (Select)
- 문제 목록 (Grid)
  - 각 문제를 Card로 표시
  - 문제 유형 Chip
  - 선택지 표시 (정답은 그린 배경)
  - 해설 표시

**데이터 흐름:**
```
useQuestions(filters) → API 호출 → 문제 리스트 렌더링
```

#### **QuizPage.tsx**
**두 가지 모드:**

1. **퀴즈 설정 모드** (`quizStarted === false`)
   - 문제 세트 선택
   - 옵션 설정 (Switch)
     - 문제 셔플
     - 선택지 셔플
     - 북마크만
     - 자주 틀리는 문제만
   - 문제 개수 설정
   - "Start Quiz" 버튼

2. **퀴즈 풀이 모드** (`quizStarted === true`)
   - 진행률 표시 (LinearProgress)
   - 현재 문제 표시 (Card)
   - 북마크 버튼 (Star icon)
   - 답안 선택 (Radio or TextField)
   - 제출 버튼
   - 정답/오답 피드백 (Alert)
   - 이전/다음 버튼

**상태 관리:**
```typescript
const [quizStarted, setQuizStarted] = useState(false);
const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
const [questions, setQuestions] = useState<QuizQuestion[]>([]);
const [userAnswer, setUserAnswer] = useState('');
const [submitted, setSubmitted] = useState(false);
const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
```

---

## 🔄 데이터 흐름

### 1. 파일 업로드 → 문제 추출

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API (upload.py)
    participant P as Parser (pdf/docx)
    participant D as Database

    U->>F: 파일 선택 및 업로드
    F->>A: POST /api/upload/pdf
    A->>A: 파일 저장 (uploads/)
    A->>P: parse_pdf_questions(file_path)
    P->>P: 정규표현식 파싱
    P-->>A: questions_data[]
    A->>D: QuestionSet 생성
    A->>D: Question, Choice 생성
    D-->>A: 저장 완료
    A-->>F: 성공 응답
    F-->>U: 알림 표시
```

### 2. AI 문제 생성

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant A as API (questions.py)
    participant L as LLM Service
    participant O as Ollama
    participant D as Database

    U->>F: 학습 내용 입력
    F->>A: POST /api/questions/generate
    A->>L: generate_questions_from_content()
    L->>O: LLM chain 실행 (프롬프트)
    O-->>L: JSON 응답
    L->>L: JSON 파싱
    L-->>A: questions_data[]
    A->>D: QuestionSet, Question 저장
    D-->>A: 저장 완료
    A-->>F: 성공 응답
    F-->>U: 알림 표시
```

### 3. 퀴즈 풀이

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant Q as API (quiz.py)
    participant D as Database

    U->>F: 퀴즈 시작 (옵션 선택)
    F->>Q: POST /api/quiz/start
    Q->>D: 문제 조회 (필터링)
    Q->>Q: 셔플 (옵션에 따라)
    Q-->>F: questions[]
    F-->>U: 문제 표시
    
    U->>F: 답안 선택 및 제출
    F->>Q: POST /api/quiz/submit
    Q->>D: Question 조회
    Q->>Q: 정답 확인
    Q->>D: AttemptHistory 저장
    Q-->>F: is_correct, explanation
    F-->>U: 정답/오답 피드백
```

### 4. 북마크 관리

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as API (bookmarks.py)
    participant D as Database

    U->>F: 북마크 버튼 클릭
    F->>B: POST /api/bookmarks/
    B->>D: Bookmark 생성
    D-->>B: 저장 완료
    B-->>F: 성공 응답
    F->>F: React Query 캐시 무효화
    F-->>U: 북마크 아이콘 업데이트
```

---

## 🎨 UI/UX 디자인 시스템

### 색상 팔레트

```typescript
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1' },      // 인디고
    secondary: { main: '#ec4899' },    // 핑크
    background: {
      default: '#0f172a',              // 다크 블루
      paper: '#1e293b',                // 슬레이트 그레이
    },
  },
});
```

### 그라데이션

- **헤더**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **카드**: `linear-gradient(135deg, #1e293b 0%, #334155 100%)`
- **반투명 카드**: `rgba(30, 41, 59, 0.5)`

### 인터랙션

- **카드 호버**: `transform: translateY(-4px)` + `boxShadow: 4`
- **정답 표시**: 그린 배경 + 테두리
- **오답 표시**: 레드 배경 + 테두리
- **북마크**: Star/StarBorder 아이콘 토글

### 컴포넌트 라이브러리

Material-UI (MUI) 사용:
- `AppBar`, `Toolbar`: 네비게이션
- `Card`, `Paper`: 컨테이너
- `Button`, `IconButton`: 액션
- `TextField`, `Select`: 입력
- `Tabs`, `Tab`: 탭 인터페이스
- `Alert`: 피드백
- `LinearProgress`: 진행률
- `Chip`: 라벨/태그

---

## 🔧 환경 설정

### Backend (.env)
```bash
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/question_bank
FILE_STORAGE_PATH=./uploads
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL_NAME=gemma3:12b
```

### Frontend (.env)
```bash
VITE_API_BASE_URL=http://localhost:8000
```

---

## 📦 의존성

### Backend (requirements.txt)
- **Web Framework**: `fastapi`, `uvicorn`
- **Database**: `sqlalchemy`, `asyncpg`
- **File Parsing**: `pdfplumber`, `PyPDF2`, `python-docx`
- **AI/LLM**: `langchain`, `langchain-community`
- **Utilities**: `python-multipart`, `pydantic-settings`

### Frontend (package.json)
- **Core**: `react`, `react-dom`, `typescript`
- **Build**: `vite`
- **Routing**: `react-router-dom`
- **State**: `@tanstack/react-query`
- **HTTP**: `axios`
- **UI**: `@mui/material`, `@emotion/react`, `@emotion/styled`

---
