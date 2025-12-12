import { useState } from 'react';
import { useUploadPDF, useUploadDOCX } from '../hooks/useApi';

export default function UploadPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [uploadResult, setUploadResult] = useState<{
        success: boolean;
        message: string;
        mode?: string;
        count?: number;
    } | null>(null);

    const uploadPDFMutation = useUploadPDF();
    const uploadDOCXMutation = useUploadDOCX();
    const isLoading = uploadPDFMutation.isPending || uploadDOCXMutation.isPending;

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setSelectedFile(event.target.files[0]);
            setUploadResult(null);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        setUploadResult(null);

        const isPDF = selectedFile.name.toLowerCase().endsWith('.pdf');
        const isDOCX = selectedFile.name.toLowerCase().endsWith('.docx');

        if (!isPDF && !isDOCX) {
            setUploadResult({
                success: false,
                message: 'PDF 또는 DOCX 파일만 업로드할 수 있습니다.',
            });
            return;
        }

        try {
            const mutation = isPDF ? uploadPDFMutation : uploadDOCXMutation;
            const response = await mutation.mutateAsync(selectedFile);
            const data = response.data;
            const modeText = data.processing_mode === 'extracted'
                ? '문제를 직접 추출했습니다'
                : 'AI가 문제를 생성했습니다';

            setUploadResult({
                success: true,
                message: `${modeText} (${data.questions_count}개)`,
                mode: data.processing_mode,
                count: data.questions_count,
            });

            setSelectedFile(null);
            const fileInput = document.getElementById('file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
        } catch (error: any) {
            setUploadResult({
                success: false,
                message: error.response?.data?.detail || '파일 처리에 실패했습니다.',
            });
        }
    };

    return (
        <div>
            <h1 className="page-title">파일 업로드</h1>
            <p className="page-description">
                PDF 또는 Word 파일을 업로드하면 자동으로 문제를 추출하거나 생성합니다.
            </p>

            <div className="grid-2 mb-6">
                <div className="card">
                    <div className="card-title">📝 연습문제 파일</div>
                    <div className="card-text">문제와 정답이 있으면 자동 추출</div>
                </div>
                <div className="card">
                    <div className="card-title">📚 수업자료 파일</div>
                    <div className="card-text">학습 내용이면 AI가 문제 생성</div>
                </div>
            </div>

            <div className="upload-zone mb-6">
                <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>

                <input
                    accept=".pdf,.docx"
                    style={{ display: 'none' }}
                    id="file-upload"
                    type="file"
                    onChange={handleFileChange}
                />

                {!selectedFile ? (
                    <>
                        <p style={{ marginBottom: 16, color: 'var(--text-secondary)' }}>
                            PDF 또는 DOCX 파일을 선택하세요
                        </p>
                        <label htmlFor="file-upload">
                            <span className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                파일 선택
                            </span>
                        </label>
                    </>
                ) : (
                    <>
                        <p style={{ marginBottom: 16 }}>
                            <strong>{selectedFile.name}</strong>
                        </p>
                        <div className="flex gap-3">
                            <label htmlFor="file-upload">
                                <span className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                                    다른 파일
                                </span>
                            </label>
                            <button
                                className="btn btn-primary"
                                onClick={handleFileUpload}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="spinner"></span>
                                        처리 중...
                                    </>
                                ) : (
                                    '업로드'
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {uploadResult && (
                <div className={`alert ${uploadResult.success ? 'alert-success' : 'alert-error'}`}>
                    {uploadResult.success ? '✓' : '✕'} {uploadResult.message}
                </div>
            )}
        </div>
    );
}
