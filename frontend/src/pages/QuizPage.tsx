import { useState, useEffect } from 'react';
import { useQuestionSets } from '../hooks/useApi';
import { quizAPI, bookmarksAPI } from '../api/client';
import type { QuizQuestion, SubmitAnswerResponse } from '../types';
import './QuizPage.css';

export default function QuizPage() {
    const [quizStarted, setQuizStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswer, setUserAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
    const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(new Set());
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [loading, setLoading] = useState(false);

    // Quiz options
    const [selectedSets, setSelectedSets] = useState<number[]>([]);
    const [questionType, setQuestionType] = useState<string>('');  // '' = all, 'multiple_choice', 'short_answer'
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleChoices, setShuffleChoices] = useState(true);
    const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
    const [frequentlyWrongOnly, setFrequentlyWrongOnly] = useState(false);

    // Dynamic question count
    const [questionCount, setQuestionCount] = useState(0);
    const [displayCount, setDisplayCount] = useState(0);

    const { data: questionSets } = useQuestionSets();

    const currentQuestion = questions[currentQuestionIndex];

    // Fetch question count when options change
    useEffect(() => {
        const fetchCount = async () => {
            // No sets selected = 0 questions
            if (selectedSets.length === 0) {
                setQuestionCount(0);
                return;
            }

            try {
                const response = await quizAPI.getQuestionCount({
                    question_set_ids: selectedSets,
                    question_type: questionType || undefined,
                    bookmarked_only: bookmarkedOnly,
                    frequently_wrong_only: frequentlyWrongOnly,
                });
                setQuestionCount(response.data.count);
            } catch (error) {
                setQuestionCount(0);
            }
        };
        fetchCount();
    }, [selectedSets, questionType, bookmarkedOnly, frequentlyWrongOnly]);

    // Animate count changes
    useEffect(() => {
        const diff = questionCount - displayCount;
        if (diff === 0) return;

        const step = diff > 0 ? 1 : -1;
        const interval = setInterval(() => {
            setDisplayCount(prev => {
                const next = prev + step;
                if ((step > 0 && next >= questionCount) || (step < 0 && next <= questionCount)) {
                    clearInterval(interval);
                    return questionCount;
                }
                return next;
            });
        }, 30);

        return () => clearInterval(interval);
    }, [questionCount]);

    const handleToggleSet = (id: number) => {
        setSelectedSets(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    const handleStartQuiz = async () => {
        if (questionCount === 0) return;

        setLoading(true);
        try {
            const response = await quizAPI.startQuiz({
                question_set_ids: selectedSets.length > 0 ? selectedSets : undefined,
                question_type: questionType || undefined,
                shuffle_questions: shuffleQuestions,
                shuffle_choices: shuffleChoices,
                bookmarked_only: bookmarkedOnly,
                frequently_wrong_only: frequentlyWrongOnly,
            });
            setQuestions(response.data.questions);
            setQuizStarted(true);
            setCurrentQuestionIndex(0);
            setUserAnswer('');
            setSubmitted(false);
            setResult(null);
            setScore({ correct: 0, total: 0 });
        } catch (error: any) {
            alert(error.response?.data?.detail || '퀴즈를 시작할 수 없습니다.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!currentQuestion || !userAnswer) return;
        try {
            const response = await quizAPI.submitAnswer({
                question_id: currentQuestion.id,
                user_answer: userAnswer,
            });
            setResult(response.data);
            setSubmitted(true);
            setScore(prev => ({
                correct: prev.correct + (response.data.is_correct ? 1 : 0),
                total: prev.total + 1,
            }));
        } catch (error) {
            console.error('Failed to submit:', error);
        }
    };

    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
            setUserAnswer('');
            setSubmitted(false);
            setResult(null);
        }
    };

    const handleToggleBookmark = async () => {
        if (!currentQuestion) return;
        const isBookmarked = bookmarkedQuestions.has(currentQuestion.id);
        try {
            if (isBookmarked) {
                await bookmarksAPI.deleteBookmark(currentQuestion.id);
                setBookmarkedQuestions(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(currentQuestion.id);
                    return newSet;
                });
            } else {
                await bookmarksAPI.createBookmark(currentQuestion.id);
                setBookmarkedQuestions(prev => new Set(prev).add(currentQuestion.id));
            }
        } catch (error) {
            console.error('Bookmark error:', error);
        }
    };

    if (!quizStarted) {
        return (
            <div>
                <h1 className="page-title">퀴즈</h1>
                <p className="page-description">출제할 문제를 선택하고 퀴즈를 시작하세요.</p>

                <div className="card mb-6">
                    <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                        문제 세트 선택
                    </label>
                    <div className="set-grid">
                        {questionSets?.map((set: any) => (
                            <button
                                key={set.id}
                                className={`set-item ${selectedSets.includes(set.id) ? 'selected' : ''}`}
                                onClick={() => handleToggleSet(set.id)}
                            >
                                <span className="set-checkbox">
                                    {selectedSets.includes(set.id) ? '✓' : ''}
                                </span>
                                <span className="set-name">{set.name}</span>
                            </button>
                        ))}
                        {(!questionSets || questionSets.length === 0) && (
                            <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                                문제 세트가 없습니다. 먼저 파일을 업로드하세요.
                            </p>
                        )}
                    </div>
                </div>

                <div className="card mb-6">
                    <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                        문제 유형
                    </label>
                    <div className="radio-group">
                        <label className={`radio-item ${questionType === '' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="questionType"
                                checked={questionType === ''}
                                onChange={() => setQuestionType('')}
                            />
                            <span className="radio-circle"></span>
                            <span>전체</span>
                        </label>
                        <label className={`radio-item ${questionType === 'multiple_choice' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="questionType"
                                checked={questionType === 'multiple_choice'}
                                onChange={() => setQuestionType('multiple_choice')}
                            />
                            <span className="radio-circle"></span>
                            <span>객관식만</span>
                        </label>
                        <label className={`radio-item ${questionType === 'short_answer' ? 'selected' : ''}`}>
                            <input
                                type="radio"
                                name="questionType"
                                checked={questionType === 'short_answer'}
                                onChange={() => setQuestionType('short_answer')}
                            />
                            <span className="radio-circle"></span>
                            <span>단답형만</span>
                        </label>
                    </div>
                </div>

                <div className="card mb-6">
                    <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 600 }}>
                        퀴즈 옵션
                    </label>
                    <div className="toggle-group">
                        <button
                            className={`toggle ${shuffleQuestions ? 'active' : ''}`}
                            onClick={() => setShuffleQuestions(!shuffleQuestions)}
                        >
                            🔀 문제 섞기
                        </button>
                        <button
                            className={`toggle ${shuffleChoices ? 'active' : ''}`}
                            onClick={() => setShuffleChoices(!shuffleChoices)}
                        >
                            🔀 선택지 섞기
                        </button>
                        <button
                            className={`toggle ${bookmarkedOnly ? 'active' : ''}`}
                            onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
                        >
                            ⭐ 북마크만
                        </button>
                        <button
                            className={`toggle ${frequentlyWrongOnly ? 'active' : ''}`}
                            onClick={() => setFrequentlyWrongOnly(!frequentlyWrongOnly)}
                        >
                            ❌ 오답만
                        </button>
                    </div>
                </div>

                <div className="quiz-start-section">
                    <div className="question-count">
                        <span className="count-number">{displayCount}</span>
                        <span className="count-label">문제</span>
                    </div>
                    <button
                        className="btn btn-primary btn-large"
                        onClick={handleStartQuiz}
                        disabled={questionCount === 0 || loading}
                    >
                        {loading ? '로딩...' : questionCount === 0 ? '출제할 문제 없음' : '퀴즈 시작'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="page-title" style={{ marginBottom: 4 }}>퀴즈</h1>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                        점수: {score.correct} / {score.total}
                    </p>
                </div>
                <button className="btn btn-secondary" onClick={() => setQuizStarted(false)}>
                    종료
                </button>
            </div>

            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {currentQuestionIndex + 1} / {questions.length}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}%
                    </span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    />
                </div>
            </div>

            {currentQuestion && (
                <div className="card">
                    <div className="flex items-center justify-between mb-4">
                        <div className="question-stem" style={{ marginBottom: 0 }}>
                            {currentQuestion.stem}
                        </div>
                        <button
                            className="btn btn-secondary"
                            onClick={handleToggleBookmark}
                            style={{ padding: '8px 12px', flexShrink: 0 }}
                        >
                            {bookmarkedQuestions.has(currentQuestion.id) ? '★' : '☆'}
                        </button>
                    </div>

                    {currentQuestion.choices && currentQuestion.choices.length > 0 ? (
                        <div className="mb-4">
                            {currentQuestion.choices.map((choice) => (
                                <div
                                    key={choice.label}
                                    className={`choice-item ${submitted && choice.label === result?.correct_answer ? 'correct' :
                                        submitted && choice.label === userAnswer && !result?.is_correct ? 'incorrect' :
                                            userAnswer === choice.label ? 'selected' : ''
                                        }`}
                                    onClick={() => !submitted && setUserAnswer(choice.label)}
                                >
                                    <div className="choice-label">{choice.label}</div>
                                    <div className="choice-text">{choice.text}</div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <input
                            type="text"
                            className="input mb-4"
                            placeholder="답을 입력하세요..."
                            value={userAnswer}
                            onChange={(e) => setUserAnswer(e.target.value)}
                            disabled={submitted}
                        />
                    )}

                    {!submitted ? (
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmitAnswer}
                            disabled={!userAnswer}
                        >
                            정답 제출
                        </button>
                    ) : (
                        <>
                            <div className={`alert ${result?.is_correct ? 'alert-success' : 'alert-error'} mb-4`}>
                                <div style={{ fontWeight: 600, marginBottom: result?.is_correct ? 0 : 4 }}>
                                    {result?.is_correct ? '✓ 정답입니다!' : '✕ 틀렸습니다.'}
                                </div>
                                {!result?.is_correct && (
                                    <div style={{ fontSize: 14 }}>
                                        정답: <span style={{ fontWeight: 600 }}>{result?.correct_answer}</span>
                                    </div>
                                )}
                            </div>

                            {result?.explanation && (
                                <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13 }}>
                                    💡 {result.explanation}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    className="btn btn-primary"
                                    onClick={handleNextQuestion}
                                    disabled={currentQuestionIndex === questions.length - 1}
                                >
                                    다음 문제 →
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
