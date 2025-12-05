import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Upload API
export const uploadAPI = {
    uploadPDF: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/api/upload/pdf', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },

    uploadDOCX: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return apiClient.post('/api/upload/docx', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
};

// Questions API
export const questionsAPI = {
    getQuestions: (params?: { question_set_id?: number; question_type?: string; limit?: number; offset?: number }) =>
        apiClient.get('/api/questions/', { params }),

    getQuestion: (id: number) =>
        apiClient.get(`/api/questions/${id}`),

    generateQuestions: (data: { content: string; num_questions?: number; question_type?: string; question_set_name?: string }) =>
        apiClient.post('/api/questions/generate', data),

    getQuestionSets: () =>
        apiClient.get('/api/questions/sets/'),
};

// Quiz API
export const quizAPI = {
    startQuiz: (data: {
        question_set_id?: number;
        question_type?: string;
        shuffle_questions?: boolean;
        shuffle_choices?: boolean;
        bookmarked_only?: boolean;
        frequently_wrong_only?: boolean;
        limit?: number;
    }) =>
        apiClient.post('/api/quiz/start', data),

    submitAnswer: (data: { question_id: number; user_answer: string; time_spent_seconds?: number }) =>
        apiClient.post('/api/quiz/submit', data),

    getBookmarkedQuestions: () =>
        apiClient.get('/api/quiz/bookmarked'),

    getFrequentlyWrongQuestions: (threshold?: number) =>
        apiClient.get('/api/quiz/frequently-wrong', { params: { threshold } }),
};

// Bookmarks API
export const bookmarksAPI = {
    createBookmark: (question_id: number) =>
        apiClient.post('/api/bookmarks/', { question_id }),

    deleteBookmark: (question_id: number) =>
        apiClient.delete(`/api/bookmarks/${question_id}`),

    getAllBookmarks: () =>
        apiClient.get('/api/bookmarks/'),
};
