export interface Question {
    id: number;
    type: 'multiple_choice' | 'short_answer' | 'essay';
    stem: string;
    answer: string;
    explanation?: string;
    choices?: Choice[];
}

export interface Choice {
    label: string;
    text: string;
}

export interface QuestionSet {
    id: number;
    name: string;
    description?: string;
    file_name?: string;
    created_at: string;
}

export interface QuizStartOptions {
    question_set_id?: number;
    question_type?: string;
    shuffle_questions?: boolean;
    shuffle_choices?: boolean;
    bookmarked_only?: boolean;
    frequently_wrong_only?: boolean;
    limit?: number;
}

export interface QuizQuestion {
    id: number;
    type: string;
    stem: string;
    choices?: Choice[];
}

export interface SubmitAnswerResponse {
    is_correct: boolean;
    correct_answer: string;
    explanation?: string;
    user_answer: string;
}
