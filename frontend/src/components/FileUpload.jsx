import React, { useState, useRef, useCallback, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const FileUpload = ({ applicationId, onUploadSuccess, disabled = false, preUploadMode = false, onFilesChange }) => {
    const { token } = useContext(AuthContext);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('Άλλο');
    const [categories, setCategories] = useState([
        'Ταυτότητα', 'Εισόδημα', 'Συμβόλαιο', 'Λοιπά Δικαιολογητικά', 'Άλλο'
    ]);
    const [pendingFiles, setPendingFiles] = useState([]);
    const fileInputRef = useRef(null);

    // Load file categories on mount
    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const response = await axios.get('http://localhost:3000/api/attachments/config/categories', config);
                if (response.data.length > 0) {
                    setCategories(response.data.map(cat => cat.name));
                }
            } catch (error) {
                console.error('Failed to load categories:', error);
            }
        };
        loadCategories();
    }, [token]);

    const validateFile = (file) => {
        const allowedTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png', 
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip'
        ];

        const maxSizes = {
            'application/pdf': 20 * 1024 * 1024, // 20MB
            'image/jpeg': 10 * 1024 * 1024, // 10MB
            'image/jpg': 10 * 1024 * 1024,
            'image/png': 10 * 1024 * 1024,
            'application/msword': 15 * 1024 * 1024, // 15MB
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 15 * 1024 * 1024,
            'text/plain': 5 * 1024 * 1024, // 5MB
            'application/zip': 50 * 1024 * 1024 // 50MB
        };

        if (!allowedTypes.includes(file.type)) {
            return `Μη υποστηριζόμενος τύπος αρχείου: ${file.type}`;
        }

        const maxSize = maxSizes[file.type] || 10 * 1024 * 1024;
        if (file.size > maxSize) {
            return `Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${Math.round(maxSize / 1024 / 1024)}MB`;
        }

        return null;
    };

    const addFile = (file) => {
        const validationError = validateFile(file);
        if (validationError) {
            setUploadError(validationError);
            return;
        }

        const fileInfo = {
            id: Date.now() + Math.random(),
            file: file,
            name: file.name,
            size: file.size,
            type: file.type,
            category: selectedCategory
        };

        const newFiles = [...pendingFiles, fileInfo];
        setPendingFiles(newFiles);
        
        if (onFilesChange) {
            onFilesChange(newFiles);
        }

        // Reset form
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        setUploadError(null);
    };

    const uploadFile = async (file) => {
        if (preUploadMode) {
            addFile(file);
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadError(null);

        const validationError = validateFile(file);
        if (validationError) {
            setUploadError(validationError);
            setIsUploading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('category', selectedCategory);

            const config = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(progress);
                }
            };

            const response = await axios.post(
                `http://localhost:3000/api/attachments/${applicationId}/upload`,
                formData,
                config
            );

            setUploadProgress(100);
            setIsUploading(false);
            
            if (onUploadSuccess) {
                onUploadSuccess(response.data);
            }

            // Reset form
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            
            setTimeout(() => setUploadProgress(0), 1000);

        } catch (error) {
            setIsUploading(false);
            setUploadProgress(0);
            
            const errorMessage = error.response?.data?.message || 'Αποτυχία μεταφόρτωσης αρχείου';
            setUploadError(errorMessage);
            console.error('Upload error:', error);
        }
    };

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        if (!disabled && !isUploading) {
            setIsDragOver(true);
        }
    }, [disabled, isUploading]);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragOver(false);

        if (disabled || isUploading) return;

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    }, [disabled, isUploading, uploadFile]);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            uploadFile(files[0]);
        }
    };

    const handleButtonClick = () => {
        if (!disabled && !isUploading) {
            fileInputRef.current?.click();
        }
    };

    const removeFile = (fileId) => {
        const newFiles = pendingFiles.filter(f => f.id !== fileId);
        setPendingFiles(newFiles);
        
        if (onFilesChange) {
            onFilesChange(newFiles);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (fileName) => {
        if (!fileName) return '📎';
        const ext = fileName.split('.').pop().toLowerCase();
        switch (ext) {
            case 'pdf': return '📄';
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif': return '🖼️';
            case 'doc':
            case 'docx': return '📝';
            case 'txt': return '📄';
            case 'zip':
            case 'rar': return '🗜️';
            default: return '📎';
        }
    };

    return (
        <div className="file-upload-container">
            <div className="file-upload-category">
                <label htmlFor="category-select">Κατηγορία Αρχείου:</label>
                <select 
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={disabled || isUploading}
                    className="category-select"
                >
                    {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            <div
                className={`file-upload-zone ${isDragOver ? 'drag-over' : ''} ${disabled || isUploading ? 'disabled' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleButtonClick}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,.zip"
                    disabled={disabled || isUploading}
                    style={{ display: 'none' }}
                />

                {isUploading ? (
                    <div className="upload-progress">
                        <div className="progress-bar">
                            <div 
                                className="progress-fill" 
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <span className="progress-text">Μεταφόρτωση: {uploadProgress}%</span>
                    </div>
                ) : (
                    <div className="upload-placeholder">
                        <div className="upload-icon">📎</div>
                        <div className="upload-text">
                            <strong>Κάντε κλικ ή σύρετε αρχεία εδώ</strong>
                            <br />
                            <small>Υποστηρίζονται: PDF, DOC, JPG, PNG, TXT, ZIP (μέχρι 50MB)</small>
                        </div>
                    </div>
                )}
            </div>

            {uploadError && (
                <div className="upload-error">
                    <span className="error-icon">❌</span>
                    <span className="error-text">{uploadError}</span>
                    <button 
                        className="error-close"
                        onClick={() => setUploadError(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            {preUploadMode && pendingFiles.length > 0 && (
                <div className="pending-files">
                    <h4>Επιλεγμένα Αρχεία ({pendingFiles.length})</h4>
                    {pendingFiles.map(file => (
                        <div key={file.id} className="pending-file">
                            <span className="file-icon">{getFileIcon(file.name)}</span>
                            <div className="file-info">
                                <div className="file-name">{file.name}</div>
                                <div className="file-details">
                                    <span className="file-size">{formatFileSize(file.size)}</span>
                                    <span className="file-category">• {file.category}</span>
                                </div>
                            </div>
                            <button 
                                className="remove-file"
                                onClick={() => removeFile(file.id)}
                                title="Αφαίρεση αρχείου"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .file-upload-container {
                    margin: 20px 0;
                }

                .file-upload-category {
                    margin-bottom: 15px;
                }

                .file-upload-category label {
                    display: block;
                    margin-bottom: 5px;
                    font-weight: bold;
                    color: #333;
                }

                .category-select {
                    width: 200px;
                    padding: 8px 12px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    font-size: 14px;
                    background-color: white;
                }

                .category-select:disabled {
                    background-color: #f5f5f5;
                    cursor: not-allowed;
                }

                .file-upload-zone {
                    border: 2px dashed #ccc;
                    border-radius: 8px;
                    padding: 40px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    background-color: #fafafa;
                }

                .file-upload-zone:hover:not(.disabled) {
                    border-color: #007bff;
                    background-color: #f0f8ff;
                }

                .file-upload-zone.drag-over {
                    border-color: #28a745;
                    background-color: #f0fff0;
                    transform: scale(1.02);
                }

                .file-upload-zone.disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    background-color: #f5f5f5;
                }

                .upload-placeholder {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 15px;
                }

                .upload-icon {
                    font-size: 48px;
                    opacity: 0.6;
                }

                .upload-text {
                    color: #666;
                    line-height: 1.5;
                }

                .upload-text strong {
                    color: #333;
                    font-size: 16px;
                }

                .upload-text small {
                    font-size: 12px;
                    color: #888;
                }

                .upload-progress {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                    width: 100%;
                }

                .progress-bar {
                    width: 300px;
                    height: 20px;
                    background-color: #e0e0e0;
                    border-radius: 10px;
                    overflow: hidden;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #28a745, #20c997);
                    transition: width 0.3s ease;
                    border-radius: 10px;
                }

                .progress-text {
                    font-weight: bold;
                    color: #28a745;
                    font-size: 14px;
                }

                .upload-error {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-top: 15px;
                    padding: 12px;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 4px;
                    color: #721c24;
                }

                .error-icon {
                    font-size: 18px;
                }

                .error-text {
                    flex: 1;
                    font-size: 14px;
                }

                .error-close {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #721c24;
                    padding: 0;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .error-close:hover {
                    background-color: rgba(114, 28, 36, 0.1);
                    border-radius: 50%;
                }

                .pending-files {
                    margin-top: 20px;
                    padding: 15px;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    background-color: #f8f9fa;
                }

                .pending-files h4 {
                    margin: 0 0 15px 0;
                    color: #333;
                    font-size: 16px;
                    font-weight: 600;
                }

                .pending-file {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px;
                    margin-bottom: 8px;
                    background-color: white;
                    border: 1px solid #dee2e6;
                    border-radius: 6px;
                    transition: all 0.2s ease;
                }

                .pending-file:hover {
                    background-color: #f0f8ff;
                    border-color: #007bff;
                }

                .pending-file:last-child {
                    margin-bottom: 0;
                }

                .file-icon {
                    font-size: 24px;
                    flex-shrink: 0;
                }

                .file-info {
                    flex: 1;
                    min-width: 0;
                }

                .file-name {
                    font-weight: 500;
                    color: #333;
                    font-size: 14px;
                    margin-bottom: 4px;
                    word-break: break-word;
                }

                .file-details {
                    font-size: 12px;
                    color: #666;
                    display: flex;
                    gap: 8px;
                }

                .file-size {
                    font-weight: 500;
                }

                .file-category {
                    color: #007bff;
                    font-weight: 500;
                }

                .remove-file {
                    background: none;
                    border: none;
                    font-size: 20px;
                    cursor: pointer;
                    color: #dc3545;
                    padding: 4px;
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    transition: background-color 0.2s ease;
                    flex-shrink: 0;
                }

                .remove-file:hover {
                    background-color: rgba(220, 53, 69, 0.1);
                }

                @media (max-width: 768px) {
                    .file-upload-zone {
                        padding: 30px 15px;
                    }
                    
                    .upload-icon {
                        font-size: 36px;
                    }
                    
                    .progress-bar {
                        width: 250px;
                    }
                    
                    .category-select {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
};

export default FileUpload;