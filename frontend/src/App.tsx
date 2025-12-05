import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, AppBar, Toolbar, Typography, Container, Button, Box } from '@mui/material';
import UploadPage from './pages/UploadPage';
import QuestionListPage from './pages/QuestionListPage';
import QuizPage from './pages/QuizPage';

const queryClient = new QueryClient();

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6366f1',
    },
    secondary: {
      main: '#ec4899',
    },
    background: {
      default: '#0f172a',
      paper: '#1e293b',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ flexGrow: 1 }}>
            <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
                  📚 PDF Question Bank Trainer
                </Typography>
                <Button color="inherit" component={Link} to="/">
                  Upload
                </Button>
                <Button color="inherit" component={Link} to="/questions">
                  Questions
                </Button>
                <Button color="inherit" component={Link} to="/quiz">
                  Quiz
                </Button>
              </Toolbar>
            </AppBar>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
              <Routes>
                <Route path="/" element={<UploadPage />} />
                <Route path="/questions" element={<QuestionListPage />} />
                <Route path="/quiz" element={<QuizPage />} />
              </Routes>
            </Container>
          </Box>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
