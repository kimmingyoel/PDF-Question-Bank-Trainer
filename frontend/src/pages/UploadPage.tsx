import { useState } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    TextField,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Tabs,
    Tab,
} from '@mui/material';
import { CloudUpload, AutoAwesome } from '@mui/icons-material';
import { useUploadPDF, useUploadDOCX } from '../hooks/useApi';
import { questionsAPI } from '../api/client';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export default function UploadPage() {
    const [tabValue, setTabValue] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [generateContent, setGenerateContent] = useState('');
    const [numQuestions, setNumQuestions] = useState(10);
    const [generating, setGenerating] = useState(false);
    const [generateError, setGenerateError] = useState('');
    const [generateSuccess, setGenerateSuccess] = useState('');

    const uploadPDFMutation = useUploadPDF();
    const uploadDOCXMutation = useUploadDOCX();

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;

        const isBDF = selectedFile.name.endsWith('.pdf');
        const mutation = isBDF ? uploadPDFMutation : uploadDOCXMutation;

        try {
            await mutation.mutateAsync(selectedFile);
            setSelectedFile(null);
            // Reset file input
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error) {
            console.error('Upload failed:', error);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!generateContent.trim()) return;

        setGenerating(true);
        setGenerateError('');
        setGenerateSuccess('');

        try {
            const response = await questionsAPI.generateQuestions({
                content: generateContent,
                num_questions: numQuestions,
                question_type: 'multiple_choice',
            });

            setGenerateSuccess(`Successfully generated ${response.data.questions_generated} questions!`);
            setGenerateContent('');
        } catch (error: any) {
            setGenerateError(error.response?.data?.detail || 'Failed to generate questions');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 3 }}>
                Upload & Generate Questions
            </Typography>

            <Paper sx={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)' }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                >
                    <Tab label="📄 Upload File" />
                    <Tab label="✨ AI Generate" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Card sx={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Upload PDF or DOCX File
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Upload a file with questions to extract and parse them automatically.
                            </Typography>

                            <input
                                accept=".pdf,.docx"
                                style={{ display: 'none' }}
                                id="file-upload"
                                type="file"
                                onChange={handleFileChange}
                            />
                            <label htmlFor="file-upload">
                                <Button
                                    variant="outlined"
                                    component="span"
                                    startIcon={<CloudUpload />}
                                    sx={{ mb: 2 }}
                                >
                                    Choose File
                                </Button>
                            </label>

                            {selectedFile && (
                                <Alert severity="info" sx={{ mb: 2 }}>
                                    Selected: {selectedFile.name}
                                </Alert>
                            )}

                            <Button
                                variant="contained"
                                onClick={handleFileUpload}
                                disabled={!selectedFile || uploadPDFMutation.isPending || uploadDOCXMutation.isPending}
                                fullWidth
                                size="large"
                            >
                                {uploadPDFMutation.isPending || uploadDOCXMutation.isPending ? (
                                    <CircularProgress size={24} />
                                ) : (
                                    'Upload & Extract Questions'
                                )}
                            </Button>

                            {(uploadPDFMutation.isSuccess || uploadDOCXMutation.isSuccess) && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    File uploaded successfully! Questions extracted.
                                </Alert>
                            )}

                            {(uploadPDFMutation.isError || uploadDOCXMutation.isError) && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    Upload failed. Please try again.
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Card sx={{ background: 'rgba(30, 41, 59, 0.5)' }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                AI-Powered Question Generation
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                Paste learning materials and let AI generate questions automatically.
                            </Typography>

                            <TextField
                                fullWidth
                                multiline
                                rows={8}
                                placeholder="Paste your learning content here..."
                                value={generateContent}
                                onChange={(e) => setGenerateContent(e.target.value)}
                                sx={{ mb: 2 }}
                            />

                            <TextField
                                type="number"
                                label="Number of Questions"
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
                                sx={{ mb: 2, width: 200 }}
                                inputProps={{ min: 1, max: 50 }}
                            />

                            <Button
                                variant="contained"
                                onClick={handleGenerateQuestions}
                                disabled={!generateContent.trim() || generating}
                                fullWidth
                                size="large"
                                startIcon={<AutoAwesome />}
                            >
                                {generating ? <CircularProgress size={24} /> : 'Generate Questions with AI'}
                            </Button>

                            {generateSuccess && (
                                <Alert severity="success" sx={{ mt: 2 }}>
                                    {generateSuccess}
                                </Alert>
                            )}

                            {generateError && (
                                <Alert severity="error" sx={{ mt: 2 }}>
                                    {generateError}
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabPanel>
            </Paper>
        </Box>
    );
}
