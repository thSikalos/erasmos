import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import FileUpload from '../components/FileUpload';
import FilePreview from '../components/FilePreview';
import '../App.css';

const ApplicationDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const [application, setApplication] = useState(null);
    const [comments, setComments] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State για το modal και τα σχόλια
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingReason, setPendingReason] = useState('');
    const [newComment, setNewComment] = useState('');
    
    // State για file management
    const [selectedFile, setSelectedFile] = useState(null);
    const [showFileUpload, setShowFileUpload] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [appRes, commentsRes, attachmentsRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/applications/${id}`, config),
                axios.get(`http://localhost:3000/api/applications/${id}/comments`, config),
                axios.get(`http://localhost:3000/api/attachments/${id}`, config)
            ]);
            setApplication(appRes.data);
            setComments(commentsRes.data);
            setAttachments(attachmentsRes.data);
        } catch (err) {
            setError('Failed to fetch application details.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id, token]);
    
    const handleStatusChange = (newStatus) => {
        if (newStatus === 'Εκκρεμότητα') {
            setIsModalOpen(true);
            return;
        }
        updateStatusOnServer(newStatus, null);
    };

    const handlePendingSubmit = (e) => {
        e.preventDefault();
        updateStatusOnServer('Εκκρεμότητα', pendingReason);
        setIsModalOpen(false);
        setPendingReason('');
    };

    const updateStatusOnServer = async (status, reason) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { status, reason };
            await axios.patch(`http://localhost:3000/api/applications/${id}/status`, body, config);
            fetchData();
        } catch (err) {
            setError("Could not update status.");
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`http://localhost:3000/api/applications/${id}/comments`, { comment: newComment }, config);
            setNewComment('');
            fetchData();
        } catch (err) {
            setError("Failed to post comment.");
        }
    };

    const handleFileUploadSuccess = (uploadData) => {
        console.log('File uploaded successfully:', uploadData);
        setAttachments(prev => [uploadData.attachment, ...prev]);
        setShowFileUpload(false);
    };

    const handleFileDelete = (deletedFileId) => {
        setAttachments(prev => prev.filter(file => file.id !== deletedFileId));
    };

    const getFileIcon = (fileName, fileType) => {
        if (fileType?.startsWith('image/')) return '🖼️';
        
        if (!fileName) return '📄';
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
    
    const isTeamLeaderOfApplication = user && application && (user.id === application.associate_parent_id || user.role === 'Admin');
    const isOwnerOfApplication = user && application && (user.id === application.associate_id);

    const renderActionButtons = () => {
        if (isTeamLeaderOfApplication) {
            if (application.status === 'Προς Καταχώρηση' || application.status === 'Καταχωρήθηκε') {
                return (
                    <div className="admin-section form-actions">
                        {application.status === 'Προς Καταχώρηση' && 
                            <button onClick={() => handleStatusChange('Καταχωρήθηκε')} className="button-new">Αλλαγή σε "Καταχωρήθηκε"</button>
                        }
                        <button onClick={() => handleStatusChange('Εκκρεμότητα')} className="button-edit">Αλλαγή σε "Εκκρεμότητα"</button>
                    </div>
                );
            }
        } else if (isOwnerOfApplication && application.status === 'Εκκρεμότητα') {
            return (
                 <div className="admin-section form-actions">
                    <button onClick={() => navigate(`/application/edit/${application.application_id}`)} className="button-new">Επεξεργασία & Επανυποβολή</button>
                </div>
            )
        }
        return null;
    };

    if (loading) return <div className="dashboard-container"><p>Loading details...</p></div>;
    if (error) return <div className="dashboard-container"><p className="error-message">{error}</p></div>;
    if (!application) return <div className="dashboard-container"><p>Application not found.</p></div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Λεπτομέρειες Αίτησης #{application.application_id}</h1>
                <Link to="/dashboard" className='button-new'>&larr; Πίσω στο Dashboard</Link>
            </header>
            <main>
                {application.status === 'Εκκρεμότητα' && application.pending_reason && (
                    <div className="pending-reason-box">
                        <strong>Λόγος Εκκρεμότητας:</strong> {application.pending_reason}
                    </div>
                )}
                <div className="detail-grid">
                    <div className="detail-item"><strong>Πελάτης:</strong> {application.customer_name}</div>
                    <div className="detail-item"><strong>Συνεργάτης:</strong> {application.associate_name}</div>
                    <div className="detail-item"><strong>Εταιρεία:</strong> {application.company_name}</div>
                    <div className="detail-item"><strong>Status:</strong> {application.status}</div>
                    <div className="detail-item"><strong>Συνολική Αμοιβή:</strong> {application.total_commission ? parseFloat(application.total_commission).toFixed(2) : '0.00'} €</div>
                    <div className="detail-item"><strong>Ημερομηνία Λήξης:</strong> {application.contract_end_date ? new Date(application.contract_end_date).toLocaleDateString('el-GR') : '-'}</div>
                </div>

                {renderActionButtons()}

                <div className="admin-section">
                    <h3>Υποβληθέντα Στοιχεία</h3>
                    <ul className="data-list">
                        {application.fields?.map((f, index) => (
                            <li key={index}><strong>{f.label}:</strong> {String(f.value)}</li>
                        ))}
                    </ul>
                </div>

                <div className="admin-section">
                    <div className="files-header">
                        <h3>Επισυναπτόμενα Αρχεία ({attachments.length})</h3>
                        <button 
                            className="add-file-button"
                            onClick={() => setShowFileUpload(!showFileUpload)}
                        >
                            {showFileUpload ? '❌ Ακύρωση' : '📎 Προσθήκη Αρχείου'}
                        </button>
                    </div>

                    {showFileUpload && (
                        <div className="file-upload-wrapper">
                            <FileUpload
                                applicationId={id}
                                onUploadSuccess={handleFileUploadSuccess}
                            />
                        </div>
                    )}

                    <div className="files-list">
                        {attachments.length === 0 && !showFileUpload ? (
                            <div className="no-files">
                                <p>📎 Δεν έχουν ανεβάσει αρχεία για αυτή την αίτηση</p>
                                <button 
                                    className="upload-first-file"
                                    onClick={() => setShowFileUpload(true)}
                                >
                                    Ανέβασε το πρώτο αρχείο
                                </button>
                            </div>
                        ) : (
                            <div className="files-grid">
                                {attachments.map(file => (
                                    <div key={file.id} className="file-item">
                                        <div className="file-icon-wrapper">
                                            <span className="file-icon">
                                                {getFileIcon(file.file_name, file.file_type)}
                                            </span>
                                            {file.is_compressed && (
                                                <span className="compressed-badge">📦</span>
                                            )}
                                        </div>
                                        <div className="file-details">
                                            <h4 className="file-name" title={file.file_name}>
                                                {file.file_name}
                                            </h4>
                                            <div className="file-meta">
                                                <span className="file-size">{formatFileSize(file.file_size)}</span>
                                                <span className="file-category">• {file.category}</span>
                                            </div>
                                            <div className="file-stats">
                                                <small>Ανέβηκε από: {file.uploaded_by}</small>
                                                {file.download_count > 0 && (
                                                    <small> • Λήψεις: {file.download_count}</small>
                                                )}
                                            </div>
                                        </div>
                                        <div className="file-actions">
                                            <button 
                                                className="preview-button"
                                                onClick={() => setSelectedFile(file)}
                                                title="Προβολή/Λήψη"
                                            >
                                                👁️
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="admin-section">
                    <h3>Ιστορικό Σχολίων</h3>
                    <div className="comments-list">
                        {comments.map(comment => (
                            <div key={comment.id} className={`comment ${comment.user_id === user.id ? 'own-comment' : ''}`}>
                                <strong>{comment.user_name}</strong>
                                <p>{comment.comment}</p>
                                <small>{new Date(comment.created_at).toLocaleString('el-GR')}</small>
                            </div>
                        ))}
                    </div>
                    <form onSubmit={handleAddComment} className="comment-form">
                        <textarea rows="3" placeholder="Γράψε ένα σχόλιο..." value={newComment} onChange={(e) => setNewComment(e.target.value)} required></textarea>
                        <button type="submit">Αποστολή</button>
                    </form>
                </div>
            </main>

            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h2>Λόγος Εκκρεμότητας</h2>
                        <form onSubmit={handlePendingSubmit}>
                            <div className="form-group"><textarea rows="5" value={pendingReason} onChange={(e) => setPendingReason(e.target.value)} required></textarea></div>
                            <div className="form-actions">
                                <button type="submit">Υποβολή</button>
                                <button type="button" className="button-secondary" onClick={() => setIsModalOpen(false)}>Ακύρωση</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedFile && (
                <FilePreview 
                    attachment={selectedFile}
                    onClose={() => setSelectedFile(null)}
                    onDelete={handleFileDelete}
                />
            )}

            <style jsx>{`
                .files-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 20px;
                }

                .add-file-button {
                    padding: 8px 16px;
                    background-color: #007bff;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: background-color 0.2s;
                }

                .add-file-button:hover {
                    background-color: #0056b3;
                }

                .file-upload-wrapper {
                    margin-bottom: 25px;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-radius: 8px;
                    border: 1px solid #dee2e6;
                }

                .no-files {
                    text-align: center;
                    padding: 40px;
                    color: #666;
                    border: 2px dashed #ddd;
                    border-radius: 8px;
                    background-color: #fafafa;
                }

                .upload-first-file {
                    margin-top: 15px;
                    padding: 10px 20px;
                    background-color: #28a745;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }

                .upload-first-file:hover {
                    background-color: #218838;
                }

                .files-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 15px;
                }

                .file-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 15px;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    background-color: white;
                    transition: all 0.2s;
                }

                .file-item:hover {
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    border-color: #007bff;
                }

                .file-icon-wrapper {
                    position: relative;
                    flex-shrink: 0;
                }

                .file-icon {
                    font-size: 32px;
                    display: block;
                }

                .compressed-badge {
                    position: absolute;
                    top: -5px;
                    right: -5px;
                    font-size: 12px;
                    background-color: #28a745;
                    color: white;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }

                .file-details {
                    flex: 1;
                    min-width: 0;
                }

                .file-name {
                    margin: 0 0 5px 0;
                    font-size: 14px;
                    font-weight: bold;
                    color: #333;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .file-meta {
                    font-size: 12px;
                    color: #666;
                    margin-bottom: 3px;
                }

                .file-stats {
                    font-size: 11px;
                    color: #888;
                }

                .file-stats small {
                    display: block;
                }

                .file-actions {
                    display: flex;
                    gap: 8px;
                    flex-shrink: 0;
                }

                .preview-button {
                    width: 36px;
                    height: 36px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    background: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 16px;
                    transition: all 0.2s;
                }

                .preview-button:hover {
                    background: #007bff;
                    border-color: #007bff;
                    transform: translateY(-1px);
                }

                .preview-button:hover {
                    filter: brightness(0) invert(1);
                }

                @media (max-width: 768px) {
                    .files-header {
                        flex-direction: column;
                        gap: 10px;
                        align-items: stretch;
                    }

                    .files-grid {
                        grid-template-columns: 1fr;
                    }

                    .file-item {
                        flex-direction: column;
                        text-align: center;
                        gap: 10px;
                    }

                    .file-details {
                        width: 100%;
                    }

                    .file-name {
                        white-space: normal;
                        word-break: break-word;
                    }
                }
            `}</style>
        </div>
    );
};

export default ApplicationDetailPage;