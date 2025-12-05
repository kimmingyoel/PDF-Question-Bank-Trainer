import { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormControlLabel,
    Switch,
    Card,
    CardContent,
    Radio,
    RadioGroup,
    TextField,
    Alert,
    LinearProgress,
    Chip,
    IconButton,
    Grid,
} from '@mui/material';
import { Star, StarBorder, NavigateNext, NavigateBefore } from '@mui/icons-material';
import { useStartQuiz, useSubmitAnswer, useQuestionSets, useCreateBookmark, useDeleteBookmark } from '../hooks/useApi';
import { QuizQuestion, SubmitAnswerResponse } from '../types';

export default function QuizPage() {
    const [quizStarted, setQuizStarted] = useState(false);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswer, setUserAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [result, setResult] = useState<SubmitAnswerResponse | null>(null);
    const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<number>>(new Set());

    // Quiz options
    const [selectedSet, setSelectedSet] = useState<number | ''>('');
    const [shuffleQuestions, setShuffleQuestions] = useState(true);
    const [shuffleChoices, setShuffleChoices] = useState(true);
    const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
    const [frequentlyWrongOnly, setFrequentlyWrongOnly] = useState(false);
    const [questionLimit, setQuestionLimit] = useState(20);

    const { data: questionSets } = useQuestionSets();
    const startQuizMutation = useStartQuiz();
    const submitAnswerMutation = useSubmitAnswer();
    const createBookmarkMutation = useCreateBookmark();
    const deleteBookmarkMutation = useDeleteBookmark();

    const currentQuestion = questions[currentQuestionIndex];

    const handleStartQuiz = async () => {
        try {
            const response = await startQuizMutation.mutateAsync({
                question_set_id: selectedSet || undefined,
                shuffle_questions: shuffleQuestions,
                shuffle_choices: shuffleChoices,
                bookmarked_only: bookmarkedOnly,
                frequently_wrong_only: frequentlyWrongOnly,
                limit: questionLimit,
            });

            setQuestions(response.data.questions);
            setQuizStarted(true);
            setCurrentQuestionIndex(0);
            setUserAnswer('');
            setSubmitted(false);
            setResult(null);
        } catch (error) {
            console.error('Failed to start quiz:', error);
        }
    };

    const handleSubmitAnswer = async () => {
        if (!currentQuestion || !userAnswer) return;

        try {
            const response = await submitAnswerMutation.mutateAsync({
                question_id: currentQuestion.id,
                user_answer: userAnswer,
            });

            setResult(response.data);
            setSubmitted(true);
        } catch (error) {
            console.error('Failed to submit answer:', error);
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

    const handlePreviousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(currentQuestionIndex - 1);
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
                await deleteBookmarkMutation.mutateAsync(currentQuestion.id);
                setBookmarkedQuestions(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(currentQuestion.id);
                    return newSet;
                });
            } else {
                await createBookmarkMutation.mutateAsync(currentQuestion.id);
                setBookmarkedQuestions(prev => new Set(prev).add(currentQuestion.id));
            }
        } catch (error) {
            console.error('Failed to toggle bookmark:', error);
        }
    };

    if (!quizStarted) {
        return (
            <Box>
                <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                    Start Quiz
                </Typography>

                <Paper sx={{ p: 4, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel>Question Set</InputLabel>
                                <Select
                                    value={selectedSet}
                                    label="Question Set"
                                    onChange={(e) => setSelectedSet(e.target.value as number)}
                                >
                                    <MenuItem value="">All Sets</MenuItem>
                                    {questionSets?.map((set: any) => (
                                        <MenuItem key={set.id} value={set.id}>
                                            {set.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={shuffleQuestions} onChange={(e) => setShuffleQuestions(e.target.checked)} />}
                                label="Shuffle Questions"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={shuffleChoices} onChange={(e) => setShuffleChoices(e.target.checked)} />}
                                label="Shuffle Choices"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={bookmarkedOnly} onChange={(e) => setBookmarkedOnly(e.target.checked)} />}
                                label="Bookmarked Only"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <FormControlLabel
                                control={<Switch checked={frequentlyWrongOnly} onChange={(e) => setFrequentlyWrongOnly(e.target.checked)} />}
                                label="Frequently Wrong Only"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                type="number"
                                label="Number of Questions"
                                value={questionLimit}
                                onChange={(e) => setQuestionLimit(parseInt(e.target.value) || 20)}
                                fullWidth
                                inputProps={{ min: 1, max: 100 }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                onClick={handleStartQuiz}
                                disabled={startQuizMutation.isPending}
                                fullWidth
                                size="large"
                                sx={{ mt: 2 }}
                            >
                                Start Quiz
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    Quiz Mode
                </Typography>
                <Button variant="outlined" onClick={() => setQuizStarted(false)}>
                    End Quiz
                </Button>
            </Box>

            <LinearProgress
                variant="determinate"
                value={((currentQuestionIndex + 1) / questions.length) * 100}
                sx={{ mb: 3, height: 8, borderRadius: 4 }}
            />

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Question {currentQuestionIndex + 1} of {questions.length}
            </Typography>

            {currentQuestion && (
                <Card sx={{ background: 'rgba(30, 41, 59, 0.5)', mb: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 3 }}>
                            <Typography variant="h5" sx={{ flexGrow: 1 }}>
                                {currentQuestion.stem}
                            </Typography>
                            <IconButton onClick={handleToggleBookmark} color={bookmarkedQuestions.has(currentQuestion.id) ? 'warning' : 'default'}>
                                {bookmarkedQuestions.has(currentQuestion.id) ? <Star /> : <StarBorder />}
                            </IconButton>
                        </Box>

                        {currentQuestion.choices && currentQuestion.choices.length > 0 ? (
                            <FormControl component="fieldset" fullWidth>
                                <RadioGroup value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)}>
                                    {currentQuestion.choices.map((choice) => (
                                        <Paper
                                            key={choice.label}
                                            sx={{
                                                p: 2,
                                                mb: 1,
                                                background: submitted && choice.label === result?.correct_answer
                                                    ? 'rgba(34, 197, 94, 0.2)'
                                                    : submitted && choice.label === userAnswer && !result?.is_correct
                                                        ? 'rgba(239, 68, 68, 0.2)'
                                                        : 'rgba(51, 65, 85, 0.3)',
                                                border: submitted && choice.label === result?.correct_answer
                                                    ? '2px solid rgba(34, 197, 94, 0.5)'
                                                    : submitted && choice.label === userAnswer
                                                        ? '2px solid rgba(239, 68, 68, 0.5)'
                                                        : '1px solid rgba(71, 85, 105, 0.3)',
                                                cursor: submitted ? 'default' : 'pointer',
                                            }}
                                        >
                                            <FormControlLabel
                                                value={choice.label}
                                                control={<Radio disabled={submitted} />}
                                                label={`${choice.label}. ${choice.text}`}
                                                sx={{ width: '100%' }}
                                            />
                                        </Paper>
                                    ))}
                                </RadioGroup>
                            </FormControl>
                        ) : (
                            <TextField
                                fullWidth
                                placeholder="Type your answer..."
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                disabled={submitted}
                                sx={{ mb: 2 }}
                            />
                        )}

                        {!submitted ? (
                            <Button
                                variant="contained"
                                onClick={handleSubmitAnswer}
                                disabled={!userAnswer || submitAnswerMutation.isPending}
                                fullWidth
                                size="large"
                                sx={{ mt: 3 }}
                            >
                                Submit Answer
                            </Button>
                        ) : (
                            <>
                                {result && (
                                    <Alert severity={result.is_correct ? 'success' : 'error'} sx={{ mt: 3 }}>
                                        <Typography variant="h6">
                                            {result.is_correct ? '✓ Correct!' : '✗ Incorrect'}
                                        </Typography>
                                        {!result.is_correct && (
                                            <Typography>Correct answer: {result.correct_answer}</Typography>
                                        )}
                                        {result.explanation && (
                                            <Typography variant="body2" sx={{ mt: 1 }}>
                                                {result.explanation}
                                            </Typography>
                                        )}
                                    </Alert>
                                )}

                                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                                    <Button
                                        variant="outlined"
                                        onClick={handlePreviousQuestion}
                                        disabled={currentQuestionIndex === 0}
                                        startIcon={<NavigateBefore />}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={handleNextQuestion}
                                        disabled={currentQuestionIndex === questions.length - 1}
                                        endIcon={<NavigateNext />}
                                        fullWidth
                                    >
                                        Next Question
                                    </Button>
                                </Box>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}
