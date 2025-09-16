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
        <div style={{ margin: '20px 0' }}>
            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="category-select" style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold',
                    color: '#333'
                }}>
                    Κατηγορία Αρχείου:
                </label>
                <select
                    id="category-select"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    disabled={disabled || isUploading}
                    style={{
                        width: '200px',
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '14px',
                        backgroundColor: disabled || isUploading ? '#f5f5f5' : 'white',
                        cursor: disabled || isUploading ? 'not-allowed' : 'pointer'
                    }}
                >
                    {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                    ))}
                </select>
            </div>

            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleButtonClick}
                style={{
                    border: `2px dashed ${isDragOver ? '#28a745' : '#ccc'}`,
                    borderRadius: '8px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isDragOver ? '#f0fff0' : disabled || isUploading ? '#f5f5f5' : '#fafafa',
                    opacity: disabled || isUploading ? 0.6 : 1,
                    transform: isDragOver ? 'scale(1.02)' : 'scale(1)'
                }}
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
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '10px',
                        width: '100%'
                    }}>
                        <div style={{
                            width: '300px',
                            height: '20px',
                            backgroundColor: '#e0e0e0',
                            borderRadius: '10px',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: `${uploadProgress}%`,
                                height: '100%',
                                background: 'linear-gradient(90deg, #28a745, #20c997)',
                                transition: 'width 0.3s ease',
                                borderRadius: '10px'
                            }}></div>
                        </div>
                        <span style={{
                            fontWeight: 'bold',
                            color: '#28a745',
                            fontSize: '14px'
                        }}>
                            Μεταφόρτωση: {uploadProgress}%
                        </span>
                    </div>
                ) : (
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '15px'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            opacity: 0.6
                        }}>📎</div>
                        <div style={{
                            color: '#666',
                            lineHeight: '1.5'
                        }}>
                            <strong style={{
                                color: '#333',
                                fontSize: '16px'
                            }}>Κάντε κλικ ή σύρετε αρχεία εδώ</strong>
                            <br />
                            <small style={{
                                fontSize: '12px',
                                color: '#888'
                            }}>Υποστηρίζονται: PDF, DOC, JPG, PNG, TXT, ZIP (μέχρι 50MB)</small>
                        </div>
                    </div>
                )}
            </div>

            {uploadError && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '15px',
                    padding: '12px',
                    backgroundColor: '#f8d7da',
                    border: '1px solid #f5c6cb',
                    borderRadius: '4px',
                    color: '#721c24'
                }}>
                    <span style={{ fontSize: '18px' }}>❌</span>
                    <span style={{ flex: 1, fontSize: '14px' }}>{uploadError}</span>
                    <button
                        onClick={() => setUploadError(null)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '20px',
                            cursor: 'pointer',
                            color: '#721c24',
                            padding: 0,
                            width: '24px',
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(114, 28, 36, 0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                        ×
                    </button>
                </div>
            )}

            {preUploadMode && pendingFiles.length > 0 && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f8f9fa'
                }}>
                    <h4 style={{
                        margin: '0 0 15px 0',
                        color: '#333',
                        fontSize: '16px',
                        fontWeight: '600'
                    }}>
                        Επιλεγμένα Αρχεία ({pendingFiles.length})
                    </h4>
                    {pendingFiles.map(file => (
                        <div key={file.id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            padding: '10px',
                            marginBottom: '8px',
                            backgroundColor: 'white',
                            border: '1px solid #dee2e6',
                            borderRadius: '6px',
                            transition: 'all 0.2s ease'
                        }}>
                            <span style={{
                                fontSize: '24px',
                                flexShrink: 0
                            }}>
                                {getFileIcon(file.name)}
                            </span>
                            <div style={{
                                flex: 1,
                                minWidth: 0
                            }}>
                                <div style={{
                                    fontWeight: '500',
                                    color: '#333',
                                    fontSize: '14px',
                                    marginBottom: '4px',
                                    wordBreak: 'break-word'
                                }}>
                                    {file.name}
                                </div>
                                <div style={{
                                    fontSize: '12px',
                                    color: '#666',
                                    display: 'flex',
                                    gap: '8px'
                                }}>
                                    <span style={{ fontWeight: '500' }}>
                                        {formatFileSize(file.size)}
                                    </span>
                                    <span style={{
                                        color: '#007bff',
                                        fontWeight: '500'
                                    }}>
                                        • {file.category}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => removeFile(file.id)}
                                title="Αφαίρεση αρχείου"
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '20px',
                                    cursor: 'pointer',
                                    color: '#dc3545',
                                    padding: '4px',
                                    width: '28px',
                                    height: '28px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background-color 0.2s ease',
                                    flexShrink: 0
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(220, 53, 69, 0.1)'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileUpload;