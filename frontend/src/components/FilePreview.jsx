import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const FilePreview = ({ attachment, onClose, onDelete }) => {
    const { token } = useContext(AuthContext);
    const [isLoading, setIsLoading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [error, setError] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const getFileIcon = (fileName, fileType) => {
        if (fileType?.startsWith('image/')) return '🖼️';
        
        const ext = fileName.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return '📄';
            case 'doc':
            case 'docx': return '📝';
            case 'txt': return '📄';
            case 'zip':
            case 'rar': return '🗜️';
            case 'xlsx':
            case 'xls': return '📊';
            default: return '📎';
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('el-GR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const canPreview = (fileType) => {
        return fileType && (
            fileType.startsWith('image/') ||
            fileType === 'application/pdf' ||
            fileType === 'text/plain'
        );
    };

    const handlePreview = async () => {
        if (!canPreview(attachment.file_type)) return;

        setIsLoading(true);
        setError(null);

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `http://localhost:3000/api/attachments/preview/${attachment.id}`,
                config
            );

            if (response.data.url) {
                setPreviewUrl(response.data.url);
            }
        } catch (error) {
            console.error('Preview error:', error);
            setError('Αποτυχία φόρτωσης προεπισκόπησης');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async () => {
        try {
            setIsLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `http://localhost:3000/api/attachments/download/${attachment.id}`,
                config
            );

            if (response.data.url) {
                // Create temporary link to trigger download
                const link = document.createElement('a');
                link.href = response.data.url;
                link.download = attachment.file_name;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        } catch (error) {
            console.error('Download error:', error);
            setError('Αποτυχία λήψης αρχείου');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setIsLoading(true);
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(
                `http://localhost:3000/api/attachments/${attachment.id}`,
                config
            );

            if (onDelete) {
                onDelete(attachment.id);
            }
            onClose();
        } catch (error) {
            console.error('Delete error:', error);
            setError('Αποτυχία διαγραφής αρχείου');
            setShowDeleteConfirm(false);
        } finally {
            setIsLoading(false);
        }
    };

    const renderPreview = () => {
        if (!previewUrl) return null;

        if (attachment.file_type?.startsWith('image/')) {
            return (
                <div className="image-preview">
                    <img 
                        src={previewUrl} 
                        alt={attachment.file_name}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setError('Αποτυχία φόρτωσης εικόνας');
                            setIsLoading(false);
                        }}
                    />
                </div>
            );
        }

        if (attachment.file_type === 'application/pdf') {
            return (
                <div className="pdf-preview">
                    <iframe
                        src={previewUrl}
                        title={attachment.file_name}
                        onLoad={() => setIsLoading(false)}
                        onError={() => {
                            setError('Αποτυχία φόρτωσης PDF');
                            setIsLoading(false);
                        }}
                    />
                </div>
            );
        }

        if (attachment.file_type === 'text/plain') {
            return (
                <div className="text-preview">
                    <iframe
                        src={previewUrl}
                        title={attachment.file_name}
                        onLoad={() => setIsLoading(false)}
                    />
                </div>
            );
        }

        return null;
    };

    return (
        <div className="file-preview-modal">
            <div className="file-preview-backdrop" onClick={onClose} />
            <div className="file-preview-container">
                <div className="file-preview-header">
                    <div className="file-info">
                        <span className="file-icon">
                            {getFileIcon(attachment.file_name, attachment.file_type)}
                        </span>
                        <div className="file-details">
                            <h3 className="file-name">{attachment.file_name}</h3>
                            <div className="file-meta">
                                <span className="file-size">{formatFileSize(attachment.file_size)}</span>
                                <span className="file-category">• {attachment.category}</span>
                                {attachment.is_compressed && (
                                    <span className="file-compressed">• Συμπιεσμένο</span>
                                )}
                            </div>
                            <div className="file-stats">
                                <span>Ανέβηκε: {formatDate(attachment.created_at)}</span>
                                {attachment.uploaded_by && (
                                    <span> • Από: {attachment.uploaded_by}</span>
                                )}
                                {attachment.download_count > 0 && (
                                    <span> • Λήψεις: {attachment.download_count}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button className="close-button" onClick={onClose}>✕</button>
                </div>

                <div className="file-preview-content">
                    {error && (
                        <div className="preview-error">
                            <span className="error-icon">❌</span>
                            <span>{error}</span>
                            <button onClick={() => setError(null)}>×</button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="preview-loading">
                            <div className="loading-spinner"></div>
                            <span>Φόρτωση...</span>
                        </div>
                    )}

                    {!previewUrl && !isLoading && canPreview(attachment.file_type) && (
                        <div className="preview-placeholder">
                            <div className="placeholder-icon">
                                {getFileIcon(attachment.file_name, attachment.file_type)}
                            </div>
                            <button 
                                className="preview-button"
                                onClick={handlePreview}
                                disabled={isLoading}
                            >
                                Προεπισκόπηση
                            </button>
                        </div>
                    )}

                    {!canPreview(attachment.file_type) && !isLoading && (
                        <div className="no-preview">
                            <div className="no-preview-icon">
                                {getFileIcon(attachment.file_name, attachment.file_type)}
                            </div>
                            <p>Δεν είναι δυνατή η προεπισκόπηση αυτού του τύπου αρχείου</p>
                            <p>Κάντε κλικ στο "Λήψη" για να ανοίξετε το αρχείο</p>
                        </div>
                    )}

                    {renderPreview()}
                </div>

                <div className="file-preview-actions">
                    <button 
                        className="action-button download"
                        onClick={handleDownload}
                        disabled={isLoading}
                    >
                        📥 Λήψη
                    </button>
                    
                    {canPreview(attachment.file_type) && !previewUrl && (
                        <button 
                            className="action-button preview"
                            onClick={handlePreview}
                            disabled={isLoading}
                        >
                            👁️ Προεπισκόπηση
                        </button>
                    )}

                    <button 
                        className="action-button delete"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isLoading}
                    >
                        🗑️ Διαγραφή
                    </button>
                </div>

                {showDeleteConfirm && (
                    <div className="delete-confirm">
                        <p>Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το αρχείο;</p>
                        <div className="confirm-actions">
                            <button 
                                className="confirm-button cancel"
                                onClick={() => setShowDeleteConfirm(false)}
                            >
                                Άκυρο
                            </button>
                            <button 
                                className="confirm-button delete"
                                onClick={handleDelete}
                                disabled={isLoading}
                            >
                                Διαγραφή
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .file-preview-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 1000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .file-preview-backdrop {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(2px);
                }

                .file-preview-container {
                    position: relative;
                    width: 95vw;
                    max-width: 1400px;
                    height: 90vh;
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .file-preview-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 15px;
                    border-bottom: 1px solid #eee;
                    background-color: #f8f9fa;
                    flex-shrink: 0;
                    min-height: 60px;
                }

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                    flex: 1;
                }

                .file-icon {
                    font-size: 36px;
                    flex-shrink: 0;
                }

                .file-details {
                    min-width: 0;
                    flex: 1;
                }

                .file-name {
                    margin: 0 0 3px 0;
                    font-size: 16px;
                    font-weight: bold;
                    color: #333;
                    word-break: break-word;
                }

                .file-meta {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 2px;
                }

                .file-stats {
                    font-size: 11px;
                    color: #888;
                }

                .file-compressed {
                    color: #28a745;
                    font-weight: bold;
                }

                .close-button {
                    width: 40px;
                    height: 40px;
                    border: none;
                    background: #f1f3f4;
                    border-radius: 50%;
                    font-size: 18px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background-color 0.2s;
                }

                .close-button:hover {
                    background: #e8eaed;
                }

                .file-preview-content {
                    flex: 1;
                    display: flex;
                    align-items: stretch;
                    justify-content: stretch;
                    position: relative;
                    overflow: hidden;
                    min-height: 0;
                }

                .preview-error {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 15px;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 6px;
                    color: #721c24;
                    margin: 20px;
                }

                .preview-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                    color: #666;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #007bff;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .preview-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                }

                .placeholder-icon {
                    font-size: 80px;
                    opacity: 0.5;
                }

                .preview-button {
                    padding: 12px 24px;
                    background: #007bff;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 16px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .preview-button:hover:not(:disabled) {
                    background: #0056b3;
                }

                .preview-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .no-preview {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                    padding: 40px;
                    text-align: center;
                    color: #666;
                }

                .no-preview-icon {
                    font-size: 80px;
                    opacity: 0.5;
                }

                .image-preview img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                    border-radius: 6px;
                }

                .pdf-preview,
                .text-preview {
                    width: 100%;
                    height: 100%;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }

                .pdf-preview iframe,
                .text-preview iframe {
                    width: 100%;
                    height: 100%;
                    flex: 1;
                    border: none;
                    min-height: 0;
                }

                .file-preview-actions {
                    display: flex;
                    gap: 10px;
                    padding: 8px 15px;
                    border-top: 1px solid #eee;
                    background-color: #f8f9fa;
                    flex-shrink: 0;
                    min-height: 50px;
                }

                .action-button {
                    flex: 1;
                    padding: 8px 16px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s;
                    background: white;
                }

                .action-button:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }

                .action-button:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .action-button.download {
                    background: #28a745;
                    color: white;
                    border-color: #28a745;
                }

                .action-button.download:hover:not(:disabled) {
                    background: #218838;
                }

                .action-button.preview {
                    background: #007bff;
                    color: white;
                    border-color: #007bff;
                }

                .action-button.preview:hover:not(:disabled) {
                    background: #0056b3;
                }

                .action-button.delete {
                    background: #dc3545;
                    color: white;
                    border-color: #dc3545;
                }

                .action-button.delete:hover:not(:disabled) {
                    background: #c82333;
                }

                .delete-confirm {
                    position: absolute;
                    bottom: 80px;
                    left: 20px;
                    right: 20px;
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    text-align: center;
                }

                .confirm-actions {
                    display: flex;
                    gap: 10px;
                    margin-top: 15px;
                }

                .confirm-button {
                    flex: 1;
                    padding: 10px 20px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: background-color 0.2s;
                }

                .confirm-button.cancel {
                    background: white;
                    color: #666;
                }

                .confirm-button.cancel:hover {
                    background: #f8f9fa;
                }

                .confirm-button.delete {
                    background: #dc3545;
                    color: white;
                    border-color: #dc3545;
                }

                .confirm-button.delete:hover:not(:disabled) {
                    background: #c82333;
                }

                /* Responsive design for different screen sizes */
                @media (min-width: 1600px) {
                    .file-preview-container {
                        width: 90vw;
                        max-width: 1600px;
                        height: 92vh;
                    }
                }

                @media (max-width: 768px) {
                    .file-preview-container {
                        width: 98vw;
                        height: 95vh;
                        border-radius: 8px;
                    }

                    .file-preview-header {
                        padding: 12px 15px;
                    }

                    .file-icon {
                        font-size: 36px;
                    }

                    .file-name {
                        font-size: 16px;
                    }

                    .file-preview-actions {
                        flex-direction: column;
                        padding: 12px 15px;
                    }

                    .action-button {
                        flex: none;
                    }
                }

                @media (max-width: 480px) {
                    .file-preview-container {
                        width: 100vw;
                        height: 100vh;
                        border-radius: 0;
                    }

                    .file-info {
                        gap: 10px;
                    }

                    .file-icon {
                        font-size: 24px;
                    }

                    .file-name {
                        font-size: 14px;
                    }
                }
            `}</style>
        </div>
    );
};

export default FilePreview;