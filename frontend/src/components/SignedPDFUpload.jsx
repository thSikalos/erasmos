import React, { useState } from 'react';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';

const SignedPDFUpload = ({
    applicationId,
    currentSignedPDF = null,
    onUploadSuccess,
    onUploadError,
    disabled = false
}) => {
    const { showConfirmModal } = useNotifications();
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);

    const handleFileSelect = (file) => {
        if (!file || file.type !== 'application/pdf') {
            if (onUploadError) {
                onUploadError('Παρακαλώ επιλέξτε αρχείο PDF');
            } else {
                alert('Παρακαλώ επιλέξτε αρχείο PDF');
            }
            return;
        }

        handleUpload(file);
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0];
        handleFileSelect(file);
        e.target.value = ''; // Reset input
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        if (!disabled) {
            setDragOver(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);

        if (disabled) return;

        const file = e.dataTransfer.files[0];
        handleFileSelect(file);
    };

    const handleUpload = async (file) => {
        try {
            setUploading(true);

            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('signedPDF', file);

            const response = await axios.post(
                apiUrl(`/api/applications/${applicationId}/upload-signed`),
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.success) {
                if (onUploadSuccess) {
                    onUploadSuccess(response.data);
                }
            }

        } catch (error) {
            console.error('Error uploading signed PDF:', error);
            const errorMessage = error.response?.data?.message || 'Σφάλμα κατά το ανέβασμα';

            if (onUploadError) {
                onUploadError(errorMessage);
            } else {
                alert(`Σφάλμα: ${errorMessage}`);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveSignedPDF = async () => {
        showConfirmModal({
            title: 'Αφαίρεση Υπογεγραμμένου PDF',
            message: 'Είστε σίγουροι ότι θέλετε να αφαιρέσετε το υπογεγραμμένο PDF;',
            onConfirm: async () => {
                try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.delete(
                apiUrl(`/api/applications/${applicationId}/signed-pdf`),
                config
            );

            if (onUploadSuccess) {
                onUploadSuccess({ signedPDFRemoved: true });
            }

                } catch (error) {
                    console.error('Error removing signed PDF:', error);
                    const errorMessage = error.response?.data?.message || 'Σφάλμα κατά την αφαίρεση';

                    if (onUploadError) {
                        onUploadError(errorMessage);
                    } else {
                        alert(`Σφάλμα: ${errorMessage}`);
                    }
                }
            },
            type: 'danger',
            confirmText: 'Αφαίρεση',
            cancelText: 'Ακύρωση'
        });
    };

    return (
        <div className="signed-pdf-upload">
            <style>
                {`
                    .signed-pdf-upload {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 20px;
                        margin: 15px 0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .upload-header {
                        color: white;
                        font-weight: 600;
                        margin-bottom: 15px;
                        font-size: 1.1rem;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .upload-zone {
                        border: 2px dashed rgba(255, 255, 255, 0.3);
                        border-radius: 12px;
                        padding: 30px;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        background: rgba(255, 255, 255, 0.05);
                        position: relative;
                        overflow: hidden;
                    }

                    .upload-zone:not(.disabled):hover {
                        border-color: rgba(142, 68, 173, 0.7);
                        background: rgba(142, 68, 173, 0.1);
                        transform: translateY(-2px);
                    }

                    .upload-zone.drag-over {
                        border-color: #8e44ad;
                        background: rgba(142, 68, 173, 0.2);
                        transform: scale(1.02);
                    }

                    .upload-zone.disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        border-color: rgba(255, 255, 255, 0.2);
                    }

                    .upload-icon {
                        font-size: 3rem;
                        margin-bottom: 15px;
                        color: rgba(255, 255, 255, 0.7);
                    }

                    .upload-text {
                        color: white;
                        font-size: 1.1rem;
                        font-weight: 600;
                        margin-bottom: 8px;
                    }

                    .upload-subtext {
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 0.9rem;
                        margin-bottom: 15px;
                    }

                    .upload-button {
                        background: linear-gradient(135deg, #8e44ad, #9b59b6);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 24px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        font-size: 0.9rem;
                        margin-top: 10px;
                    }

                    .upload-button:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(142, 68, 173, 0.3);
                    }

                    .upload-button:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .file-input {
                        display: none;
                    }

                    .current-file {
                        background: rgba(39, 174, 96, 0.1);
                        border: 1px solid rgba(39, 174, 96, 0.3);
                        border-radius: 8px;
                        padding: 15px;
                        margin-top: 15px;
                    }

                    .current-file-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }

                    .current-file-title {
                        color: #27ae60;
                        font-weight: 600;
                        font-size: 0.9rem;
                    }

                    .file-actions {
                        display: flex;
                        gap: 10px;
                    }

                    .file-action-btn {
                        padding: 6px 12px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    }

                    .download-btn {
                        background: rgba(52, 152, 219, 0.3);
                        color: #3498db;
                    }

                    .download-btn:hover {
                        background: #3498db;
                        color: white;
                    }

                    .remove-btn {
                        background: rgba(231, 76, 60, 0.3);
                        color: #e74c3c;
                    }

                    .remove-btn:hover {
                        background: #e74c3c;
                        color: white;
                    }

                    .file-info {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.8rem;
                        display: flex;
                        gap: 15px;
                        flex-wrap: wrap;
                    }

                    .upload-progress {
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.8);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        border-radius: 12px;
                    }

                    .progress-spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .progress-text {
                        color: white;
                        font-weight: 600;
                    }

                    .requirement-notice {
                        background: rgba(243, 156, 18, 0.1);
                        border: 1px solid rgba(243, 156, 18, 0.3);
                        border-radius: 8px;
                        padding: 12px;
                        color: #f39c12;
                        font-size: 0.9rem;
                        margin-top: 10px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    @media (max-width: 768px) {
                        .upload-zone {
                            padding: 20px;
                        }

                        .upload-icon {
                            font-size: 2.5rem;
                        }

                        .current-file-header {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 10px;
                        }

                        .file-info {
                            flex-direction: column;
                            gap: 5px;
                        }
                    }
                `}
            </style>

            <div className="upload-header">
                <span>📝</span>
                Ανέβασμα Υπογεγραμμένου PDF
            </div>

            {currentSignedPDF ? (
                <div className="current-file">
                    <div className="current-file-header">
                        <div className="current-file-title">
                            ✅ Υπογεγραμμένο PDF ανεβασμένο
                        </div>
                        <div className="file-actions">
                            <button
                                className="file-action-btn download-btn"
                                onClick={() => window.open(apiUrl(currentSignedPDF.downloadUrl), '_blank')}
                            >
                                📥 Λήψη
                            </button>
                            <button
                                className="file-action-btn remove-btn"
                                onClick={handleRemoveSignedPDF}
                            >
                                🗑️ Αφαίρεση
                            </button>
                        </div>
                    </div>
                    <div className="file-info">
                        <span>📄 {currentSignedPDF.fileName}</span>
                        <span>📅 {new Date(currentSignedPDF.uploadedAt).toLocaleDateString('el-GR')}</span>
                        {currentSignedPDF.fileSize && (
                            <span>📊 {Math.round(currentSignedPDF.fileSize / 1024)} KB</span>
                        )}
                    </div>
                </div>
            ) : (
                <div
                    className={`upload-zone ${dragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => !disabled && document.getElementById('signedPdfInput').click()}
                >
                    {uploading && (
                        <div className="upload-progress">
                            <div className="progress-spinner"></div>
                            <div className="progress-text">Ανέβασμα σε εξέλιξη...</div>
                        </div>
                    )}

                    <div className="upload-icon">
                        {disabled ? '🔒' : '📤'}
                    </div>
                    <div className="upload-text">
                        {disabled
                            ? 'Το PDF δεν έχει δημιουργηθεί ακόμα'
                            : 'Σύρετε το υπογεγραμμένο PDF εδώ'
                        }
                    </div>
                    <div className="upload-subtext">
                        {disabled
                            ? 'Πρώτα συμπληρώστε όλα τα πεδία και δημιουργήστε το PDF'
                            : 'ή κάντε κλικ για επιλογή αρχείου'
                        }
                    </div>

                    {!disabled && (
                        <button className="upload-button" type="button">
                            📁 Επιλογή Αρχείου PDF
                        </button>
                    )}

                    <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleFileInputChange}
                        className="file-input"
                        id="signedPdfInput"
                        disabled={disabled || uploading}
                    />
                </div>
            )}

            <div className="requirement-notice">
                <span>⚠️</span>
                Το υπογεγραμμένο PDF είναι απαραίτητο για την υποβολή της αίτησης προς καταχώρηση.
                Αφού δημιουργήσετε το PDF από το σύστημα, υπογράψτε το και ανεβάστε το εδώ.
            </div>
        </div>
    );
};

export default SignedPDFUpload;