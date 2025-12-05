import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionsAPI, quizAPI, bookmarksAPI, uploadAPI } from '../api/client';

// Questions hooks
export const useQuestions = (params?: any) => {
    return useQuery({
        queryKey: ['questions', params],
        queryFn: async () => {
            const response = await questionsAPI.getQuestions(params);
            return response.data;
        },
    });
};

export const useQuestionSets = () => {
    return useQuery({
        queryKey: ['questionSets'],
        queryFn: async () => {
            const response = await questionsAPI.getQuestionSets();
            return response.data;
        },
    });
};

// Upload hooks
export const useUploadPDF = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => uploadAPI.uploadPDF(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
            queryClient.invalidateQueries({ queryKey: ['questionSets'] });
        },
    });
};

export const useUploadDOCX = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (file: File) => uploadAPI.uploadDOCX(file),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['questions'] });
            queryClient.invalidateQueries({ queryKey: ['questionSets'] });
        },
    });
};

// Quiz hooks
export const useStartQuiz = () => {
    return useMutation({
        mutationFn: (options: any) => quizAPI.startQuiz(options),
    });
};

export const useSubmitAnswer = () => {
    return useMutation({
        mutationFn: (data: { question_id: number; user_answer: string; time_spent_seconds?: number }) =>
            quizAPI.submitAnswer(data),
    });
};

export const useBookmarkedQuestions = () => {
    return useQuery({
        queryKey: ['bookmarkedQuestions'],
        queryFn: async () => {
            const response = await quizAPI.getBookmarkedQuestions();
            return response.data;
        },
    });
};

export const useFrequentlyWrongQuestions = () => {
    return useQuery({
        queryKey: ['frequentlyWrongQuestions'],
        queryFn: async () => {
            const response = await quizAPI.getFrequentlyWrongQuestions();
            return response.data;
        },
    });
};

// Bookmark hooks
export const useCreateBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (question_id: number) => bookmarksAPI.createBookmark(question_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookmarkedQuestions'] });
            queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        },
    });
};

export const useDeleteBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (question_id: number) => bookmarksAPI.deleteBookmark(question_id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookmarkedQuestions'] });
            queryClient.invalidateQueries({ queryKey: ['bookmarks'] });
        },
    });
};
