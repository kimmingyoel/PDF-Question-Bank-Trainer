import { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Card,
    CardContent,
    Chip,
    Grid,
} from '@mui/material';
import { useQuestions, useQuestionSets } from '../hooks/useApi';
import { Question } from '../types';

export default function QuestionListPage() {
    const [selectedSet, setSelectedSet] = useState<number | ''>('');
    const [selectedType, setSelectedType] = useState<string | ''>('');

    const { data: questionSets } = useQuestionSets();
    const { data: questions, isLoading } = useQuestions({
        question_set_id: selectedSet || undefined,
        question_type: selectedType || undefined,
    });

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                Question Library
            </Typography>

            <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
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

                    <Grid item xs={12} md={6}>
                        <FormControl fullWidth>
                            <InputLabel>Question Type</InputLabel>
                            <Select
                                value={selectedType}
                                label="Question Type"
                                onChange={(e) => setSelectedType(e.target.value)}
                            >
                                <MenuItem value="">All Types</MenuItem>
                                <MenuItem value="multiple_choice">Multiple Choice</MenuItem>
                                <MenuItem value="short_answer">Short Answer</MenuItem>
                                <MenuItem value="essay">Essay</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {isLoading ? (
                <Typography>Loading questions...</Typography>
            ) : (
                <Grid container spacing={2}>
                    {questions?.map((question: Question) => (
                        <Grid item xs={12} key={question.id}>
                            <Card
                                sx={{
                                    background: 'rgba(30, 41, 59, 0.5)',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 4,
                                    },
                                }}
                            >
                                <CardContent>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Chip
                                            label={question.type.replace('_', ' ').toUpperCase()}
                                            color={question.type === 'multiple_choice' ? 'primary' : 'secondary'}
                                            size="small"
                                        />
                                        <Typography variant="caption" color="text.secondary">
                                            ID: {question.id}
                                        </Typography>
                                    </Box>

                                    <Typography variant="h6" sx={{ mb: 2 }}>
                                        {question.stem}
                                    </Typography>

                                    {question.choices && question.choices.length > 0 && (
                                        <Box sx={{ ml: 2 }}>
                                            {question.choices.map((choice) => (
                                                <Typography
                                                    key={choice.label}
                                                    variant="body2"
                                                    sx={{
                                                        mb: 1,
                                                        p: 1,
                                                        borderRadius: 1,
                                                        background: choice.label === question.answer ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                                        border: choice.label === question.answer ? '1px solid rgba(34, 197, 94, 0.3)' : 'none',
                                                    }}
                                                >
                                                    <strong>{choice.label}.</strong> {choice.text}
                                                    {choice.label === question.answer && (
                                                        <Chip label="✓ Correct" color="success" size="small" sx={{ ml: 1 }} />
                                                    )}
                                                </Typography>
                                            ))}
                                        </Box>
                                    )}

                                    {question.type === 'short_answer' && (
                                        <Typography variant="body2" color="success.main" sx={{ mt: 2 }}>
                                            <strong>Answer:</strong> {question.answer}
                                        </Typography>
                                    )}

                                    {question.explanation && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                                            <strong>Explanation:</strong> {question.explanation}
                                        </Typography>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    {questions?.length === 0 && (
                        <Grid item xs={12}>
                            <Typography align="center" color="text.secondary">
                                No questions found. Upload a file or generate questions to get started.
                            </Typography>
                        </Grid>
                    )}
                </Grid>
            )}
        </Box>
    );
}
