import { useState } from 'react';
import { useQuestions, useQuestionSets } from '../hooks/useApi';
import { questionsAPI } from '../api/client';
import type { Question } from '../types';

export default function QuestionListPage() {
    const [selectedSet, setSelectedSet] = useState<number | ''>('');
    const [selectedType, setSelectedType] = useState<string>('');
    const [deleteMessage, setDeleteMessage] = useState<string>('');

    // Confirmation states
    const [confirmingDeleteSetId, setConfirmingDeleteSetId] = useState<number | null>(null);
    const [confirmingDeleteQuestionId, setConfirmingDeleteQuestionId] = useState<number | null>(null);

    const { data: questionSets, refetch: refetchSets } = useQuestionSets();
    const { data: questions, isLoading, refetch: refetchQuestions } = useQuestions({
        question_set_id: selectedSet || undefined,
        question_type: selectedType || undefined,
    });

    const handleDeleteQuestion = async (id: number) => {
        try {
            await questionsAPI.deleteQuestion(id);
            setDeleteMessage('문제가 삭제되었습니다.');
            setConfirmingDeleteQuestionId(null);
            refetchQuestions();
            setTimeout(() => setDeleteMessage(''), 3000);
        } catch (error) {
            setDeleteMessage('삭제에 실패했습니다.');
        }
    };

    const handleDeleteSet = async (id: number) => {
        try {
            await questionsAPI.deleteQuestionSet(id);
            setDeleteMessage('문제 세트가 삭제되었습니다.');
            setConfirmingDeleteSetId(null);
            if (selectedSet === id) {
                setSelectedSet('');
            }
            refetchSets();
            refetchQuestions();
            setTimeout(() => setDeleteMessage(''), 3000);
        } catch (error) {
            setDeleteMessage('삭제에 실패했습니다.');
        }
    };

    return (
        <div>
            <h1 className="page-title">문제 라이브러리</h1>
            <p className="page-description">업로드하거나 생성한 모든 문제를 확인하세요.</p>

            {deleteMessage && (
                <div className="alert alert-success mb-4">
                    {deleteMessage}
                </div>
            )}

            <div className="card mb-6">
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <select
                        className="select"
                        value={selectedSet}
                        onChange={(e) => setSelectedSet(e.target.value ? Number(e.target.value) : '')}
                        style={{ flex: 1, minWidth: 200 }}
                    >
                        <option value="">전체 세트</option>
                        {questionSets?.map((set: any) => (
                            <option key={set.id} value={set.id}>{set.name}</option>
                        ))}
                    </select>

                    <select
                        className="select"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        style={{ flex: 1, minWidth: 150 }}
                    >
                        <option value="">전체 유형</option>
                        <option value="multiple_choice">객관식</option>
                        <option value="short_answer">단답형</option>
                    </select>

                    {selectedSet && (
                        confirmingDeleteSetId === Number(selectedSet) ? (
                            <div className="flex gap-2">
                                <button
                                    className="btn btn-primary"
                                    style={{ background: '#ef4444', borderColor: '#ef4444' }}
                                    onClick={() => handleDeleteSet(Number(selectedSet))}
                                >
                                    확인
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setConfirmingDeleteSetId(null)}
                                >
                                    취소
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setConfirmingDeleteSetId(Number(selectedSet))}
                                style={{
                                    color: '#ef4444',
                                    borderColor: '#fca5a5',
                                    background: '#fef2f2'
                                }}
                            >
                                이 세트 삭제
                            </button>
                        )
                    )}
                </div>
            </div>

            {/* Question Sets List */}
            {!selectedSet && questionSets && questionSets.length > 0 && (
                <div className="mb-6">
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>문제 세트</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                        {questionSets.map((set: any) => (
                            <div key={set.id} className="card" style={{ padding: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                                    <div
                                        style={{ cursor: 'pointer', flex: 1 }}
                                        onClick={() => setSelectedSet(set.id)}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{set.name}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                            {set.description || '설명 없음'}
                                        </div>
                                    </div>

                                    {confirmingDeleteSetId === set.id ? (
                                        <div className="flex gap-1 flex-col">
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: '4px 8px', fontSize: 12, background: '#ef4444', borderColor: '#ef4444' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteSet(set.id);
                                                }}
                                            >
                                                확인
                                            </button>
                                            <button
                                                className="btn btn-secondary"
                                                style={{ padding: '4px 8px', fontSize: 12 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setConfirmingDeleteSetId(null);
                                                }}
                                            >
                                                취소
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmingDeleteSetId(set.id);
                                            }}
                                            style={{
                                                padding: '6px 10px',
                                                fontSize: 12,
                                                color: '#ef4444',
                                                borderColor: '#fca5a5',
                                                background: '#fef2f2',
                                                flexShrink: 0
                                            }}
                                        >
                                            삭제
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="empty-state">
                    <p>로딩 중...</p>
                </div>
            ) : questions && questions.length > 0 ? (
                <div>
                    <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>
                        문제 목록 ({questions.length}개)
                    </h2>
                    {questions.map((question: Question, index: number) => (
                        <div key={question.id} className="question-card">
                            <div className="question-header">
                                <div className="question-number">{index + 1}</div>
                                <span className="question-type">
                                    {question.type === 'multiple_choice' ? '객관식' : '단답형'}
                                </span>

                                {confirmingDeleteQuestionId === question.id ? (
                                    <div className="flex gap-2 ml-auto">
                                        <span style={{ fontSize: 12, color: '#ef4444', alignSelf: 'center' }}>삭제하시겠습니까?</span>
                                        <button
                                            className="btn btn-primary"
                                            style={{ padding: '4px 10px', fontSize: 12, background: '#ef4444', borderColor: '#ef4444' }}
                                            onClick={() => handleDeleteQuestion(question.id)}
                                        >
                                            예
                                        </button>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '4px 10px', fontSize: 12 }}
                                            onClick={() => setConfirmingDeleteQuestionId(null)}
                                        >
                                            아니오
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setConfirmingDeleteQuestionId(question.id)}
                                        style={{
                                            marginLeft: 'auto',
                                            padding: '4px 10px',
                                            fontSize: 12,
                                            color: '#ef4444',
                                            borderColor: '#fca5a5',
                                            background: '#fef2f2'
                                        }}
                                    >
                                        삭제
                                    </button>
                                )}
                            </div>

                            <div className="question-stem">{question.stem}</div>

                            {question.choices && question.choices.length > 0 && (
                                <div>
                                    {question.choices.map((choice) => (
                                        <div
                                            key={choice.label}
                                            className={`choice-item ${choice.label === question.answer ? 'correct' : ''}`}
                                        >
                                            <div className="choice-label">{choice.label}</div>
                                            <div className="choice-text">{choice.text}</div>
                                            {choice.label === question.answer && (
                                                <span style={{ marginLeft: 'auto', color: 'var(--success)', fontSize: 13 }}>
                                                    정답
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {question.type === 'short_answer' && (
                                <div className="alert alert-success">
                                    정답: {question.answer}
                                </div>
                            )}

                            {question.explanation && (
                                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                                    💡 {question.explanation}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <svg className="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p>아직 문제가 없습니다.</p>
                    <p style={{ fontSize: 13, marginTop: 8 }}>파일을 업로드해서 문제를 추가하세요.</p>
                </div>
            )}
        </div>
    );
}
