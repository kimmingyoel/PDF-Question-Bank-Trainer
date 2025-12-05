# PDF Question Bank Trainer - Quick Start Guide

프로젝트 초안이 생성되었습니다! 🎉

## 📁 프로젝트 구조

```
vibe/
├── backend/              # FastAPI 백엔드
│   ├── app/
│   │   ├── main.py      # FastAPI 진입점
│   │   ├── config.py    # 환경 변수 설정
│   │   ├── database.py  # DB 연결 설정
│   │   ├── models.py    # SQLAlchemy 모델
│   │   ├── routers/     # API 라우터
│   │   │   ├── upload.py
│   │   │   ├── questions.py
│   │   │   ├── quiz.py
│   │   │   └── bookmarks.py
│   │   └── services/    # 비즈니스 로직
│   │       ├── pdf_parser.py
│   │       ├── docx_parser.py
│   │       └── llm_service.py
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/            # React 프론트엔드
    ├── src/
    │   ├── App.tsx      # 메인 앱 컴포넌트
    │   ├── api/         # API 클라이언트
    │   ├── hooks/       # React Query 훅
    │   ├── pages/       # 페이지 컴포넌트
    │   │   ├── UploadPage.tsx
    │   │   ├── QuestionListPage.tsx
    │   │   └── QuizPage.tsx
    │   └── types/       # TypeScript 타입
    └── package.json
```

## 🚀 시작하기

### 1. 사전 요구사항

#### Ollama 설치 및 모델 다운로드
```bash
# Ollama 설치 (https://ollama.com)
# 설치 후 모델 다운로드
ollama pull gemma3:12b
```

#### PostgreSQL 설치
```bash
# macOS (Homebrew)
brew install postgresql@15
brew services start postgresql@15

# 데이터베이스 생성
createdb question_bank
```

### 2. 백엔드 설정

```bash
cd backend

# 가상환경 생성 및 활성화
python3 -m venv venv
source venv/bin/activate  # macOS/Linux

# 의존성 설치
pip install -r requirements.txt

# 환경 변수 설정
cp .env.example .env
# .env 파일을 편집하여 데이터베이스 URL 등을 설정하세요

# 서버 실행
uvicorn app.main:app --reload --port 8000
```

백엔드 API 문서: http://localhost:8000/docs

### 3. 프론트엔드 설정

```bash
cd frontend

# 환경 변수 설정
cp .env.example .env

# 개발 서버 실행 (의존성은 이미 설치됨)
npm run dev
```

프론트엔드: http://localhost:5173

## 🎯 주요 기능

### 📤 Upload Page
- **PDF/DOCX 업로드**: 문제집 파일을 업로드하여 자동으로 문제 추출
- **AI 문제 생성**: 학습 자료를 붙여넣으면 AI가 문제 자동 생성

### 📚 Questions Page
- 추출/생성된 모든 문제 확인
- 문제 세트별, 유형별 필터링
- 정답 및 해설 표시

### 🎮 Quiz Page
- 다양한 퀴즈 옵션 설정
  - 문제/선택지 셔플
  - 북마크한 문제만 풀기
  - 자주 틀리는 문제만 풀기
- 실시간 정답 확인 및 해설
- 북마크 관리

## 🛠️ 기술 스택

### Backend
- **FastAPI**: 고성능 Python 웹 프레임워크
- **SQLAlchemy**: ORM (PostgreSQL)
- **LangChain + Ollama**: AI 기반 문제 생성
- **pdfplumber / python-docx**: 문서 파싱

### Frontend
- **React + TypeScript**: UI 프레임워크
- **Vite**: 빌드 도구
- **React Router**: 라우팅
- **TanStack Query**: 서버 상태 관리
- **Material-UI**: UI 컴포넌트 라이브러리

## 📝 다음 단계

1. ✅ PostgreSQL 데이터베이스 설정 및 연결 확인
2. ✅ Ollama 서버 실행 및 gemma3:12b 모델 준비
3. ✅ 백엔드 서버 실행 후 http://localhost:8000/docs 에서 API 테스트
4. ✅ 프론트엔드 실행 후 파일 업로드 테스트
5. 🔧 실제 PDF/DOCX 파일로 문제 추출 정확도 테스트
6. 🔧 AI 문제 생성 기능 테스트 및 프롬프트 최적화

## 🐛 문제 해결

### 백엔드 서버가 시작되지 않음
- PostgreSQL이 실행 중인지 확인
- `.env` 파일의 `DATABASE_URL`이 올바른지 확인
- 의존성이 모두 설치되었는지 확인

### Ollama 연결 오류
- `ollama serve` 명령으로 Ollama 서버가 실행 중인지 확인
- `ollama list`로 gemma3:12b 모델이 설치되었는지 확인

### 프론트엔드에서 API 호출 실패
- 백엔드 서버가 http://localhost:8000 에서 실행 중인지 확인
- 브라우저 콘솔에서 CORS 오류 확인

## 📖 더 알아보기

전체 프로젝트 개요는 [README.md](../README.md)를 참조하세요.
