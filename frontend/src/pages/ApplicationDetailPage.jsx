import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import FileUpload from '../components/FileUpload';
import FilePreview from '../components/FilePreview';

const ApplicationDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const { showErrorToast } = useNotifications();
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

    const fetchData = useCallback(async () => {
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
    }, [id, token]);

    useEffect(() => { fetchData(); }, [fetchData]);
    
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

    // Payment control handlers
    const handlePaymentToggle = async () => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const endpoint = application.is_paid_by_company ? 'unpaid' : 'paid';
            await axios.patch(`http://localhost:3000/api/applications/${id}/${endpoint}`, {}, config);
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Failed to update payment status", error);
            setError('Σφάλμα κατά την ενημέρωση της πληρωμής');
        }
    };

    const handleFieldPaymentUpdate = async (fieldId, isPaid) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(
                `http://localhost:3000/api/applications/${id}/fields/${fieldId}/payment`,
                { isPaid },
                config
            );
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Failed to update field payment", error);
            setError('Σφάλμα κατά την ενημέρωση της πληρωμής');
        }
    };

    const handleFieldClawback = async (fieldId) => {
        const percentage = prompt('Εισάγετε το ποσοστό clawback σε δωδεκατημόρια (1-12):', '12');
        if (!percentage || isNaN(percentage) || percentage < 1 || percentage > 12) {
            if (percentage !== null) showErrorToast('Σφάλμα', 'Παρακαλώ εισάγετε έναν αριθμό από 1 έως 12.');
            return;
        }
        
        const reason = prompt('Εισάγετε τον λόγο για το clawback:');
        if (!reason) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(
                `http://localhost:3000/api/applications/${id}/fields/${fieldId}/clawback`,
                { percentage: parseFloat(percentage), reason },
                config
            );
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Failed to create field clawback", error);
            setError(error.response?.data?.message || 'Σφάλμα κατά τη δημιουργία του clawback');
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

    if (loading) return (
        <div className="modern-application-detail-container">
            <div className="modern-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση λεπτομερειών...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="modern-application-detail-container">
            <div className="modern-error">❌ {error}</div>
        </div>
    );
    
    if (!application) return (
        <div className="modern-application-detail-container">
            <div className="modern-error">❌ Η αίτηση δεν βρέθηκε.</div>
        </div>
    );

    const getStatusBadge = (status) => {
        const statusMap = {
            'Προς Καταχώρηση': { emoji: '⏳', class: 'pending' },
            'Καταχωρήθηκε': { emoji: '✅', class: 'approved' },
            'Εκκρεμότητα': { emoji: '🚨', class: 'needs-action' }
        };
        const statusInfo = statusMap[status] || { emoji: '📋', class: 'default' };
        return `${statusInfo.emoji} ${status}`;
    };

    return (
        <div className="modern-application-detail-container">
            <style>
                {`
                    .modern-application-detail-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-application-detail-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }

                    .modern-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                    }

                    .modern-header::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }

                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }

                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        position: relative;
                        z-index: 2;
                    }

                    .header-title {
                        font-size: 2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                    }

                    .modern-back-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }

                    .modern-back-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modern-back-button:hover::before {
                        left: 100%;
                    }

                    .modern-back-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                        color: white;
                        text-decoration: none;
                    }

                    .modern-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                    }

                    .modern-card::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }

                    .card-content {
                        position: relative;
                        z-index: 2;
                    }

                    .card-header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid rgba(102, 126, 234, 0.1);
                    }

                    .card-title {
                        font-size: 1.4rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                    }

                    .status-badge {
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        color: white;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .pending-alert {
                        background: rgba(239, 68, 68, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        border-radius: 15px;
                        padding: 20px;
                        margin-bottom: 25px;
                        backdrop-filter: blur(10px);
                        color: #dc2626;
                        font-weight: 600;
                    }

                    .detail-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 25px;
                    }

                    .detail-item {
                        background: rgba(255, 255, 255, 0.7);
                        padding: 20px;
                        border-radius: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }

                    .detail-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    }

                    .detail-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 600;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .detail-value {
                        color: #374151;
                        font-size: 1.1rem;
                        font-weight: 700;
                    }

                    /* Field Payment Styles */
                    .field-payments-grid {
                        display: grid;
                        gap: 20px;
                        margin-top: 20px;
                    }

                    .field-payment-item {
                        background: rgba(255, 255, 255, 0.1);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        border-radius: 15px;
                        padding: 20px;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .field-payment-item::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 3px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }

                    .field-payment-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                        border-color: rgba(102, 126, 234, 0.3);
                    }

                    .field-payment-info {
                        display: grid;
                        grid-template-columns: 1fr auto auto;
                        gap: 15px;
                        align-items: center;
                        margin-bottom: 15px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .field-label {
                        color: #667eea;
                        font-weight: 600;
                        font-size: 1rem;
                    }

                    .field-value {
                        color: #374151;
                        font-weight: 500;
                        text-align: center;
                        padding: 4px 8px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        font-size: 0.9rem;
                    }

                    .field-commission {
                        color: #059669;
                        font-weight: 700;
                        font-size: 1.1rem;
                        text-align: right;
                    }

                    .field-payment-controls {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 15px;
                    }

                    .payment-checkbox-container {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .payment-checkbox {
                        width: 18px;
                        height: 18px;
                        border-radius: 4px;
                        border: 2px solid #667eea;
                        background: transparent;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .payment-checkbox:checked {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-color: #667eea;
                    }

                    .payment-checkbox-label {
                        color: #374151;
                        font-size: 0.9rem;
                        font-weight: 500;
                        cursor: pointer;
                        user-select: none;
                    }

                    .clawback-button {
                        padding: 6px 12px;
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }

                    .clawback-button:hover {
                        background: linear-gradient(135deg, #d97706, #b45309);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
                    }

                    .clawback-indicator {
                        color: #f59e0b;
                        font-size: 0.9rem;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    }

                    .modern-actions {
                        display: flex;
                        gap: 15px;
                        flex-wrap: wrap;
                        margin-bottom: 25px;
                    }

                    .modern-button {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .modern-button.primary {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }

                    .modern-button.warning {
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                    }

                    .modern-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modern-button:hover::before {
                        left: 100%;
                    }

                    .modern-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }

                    .data-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 15px;
                    }

                    .data-list li {
                        background: rgba(255, 255, 255, 0.7);
                        padding: 15px;
                        border-radius: 12px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }

                    .data-list li:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    }

                    .files-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        flex-wrap: wrap;
                        gap: 15px;
                    }

                    .add-file-button {
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .add-file-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
                    }

                    .file-upload-wrapper {
                        background: rgba(248, 250, 252, 0.8);
                        backdrop-filter: blur(10px);
                        border-radius: 15px;
                        padding: 25px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                    }

                    .no-files {
                        text-align: center;
                        padding: 50px;
                        color: #6b7280;
                        border: 2px dashed rgba(102, 126, 234, 0.3);
                        border-radius: 15px;
                        background: rgba(248, 250, 252, 0.5);
                        backdrop-filter: blur(10px);
                    }

                    .upload-first-file {
                        margin-top: 15px;
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .upload-first-file:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
                    }

                    .files-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                        gap: 20px;
                    }

                    .file-item {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        border-radius: 15px;
                        transition: all 0.3s ease;
                    }

                    .file-item:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 12px 30px rgba(102, 126, 234, 0.2);
                        border-color: rgba(102, 126, 234, 0.3);
                    }

                    .file-icon-wrapper {
                        position: relative;
                        flex-shrink: 0;
                    }

                    .file-icon {
                        font-size: 36px;
                        display: block;
                    }

                    .compressed-badge {
                        position: absolute;
                        top: -8px;
                        right: -8px;
                        font-size: 14px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border-radius: 50%;
                        width: 24px;
                        height: 24px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
                    }

                    .file-details {
                        flex: 1;
                        min-width: 0;
                    }

                    .file-name {
                        margin: 0 0 8px 0;
                        font-size: 1rem;
                        font-weight: 700;
                        color: #374151;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }

                    .file-meta {
                        font-size: 0.85rem;
                        color: #6b7280;
                        margin-bottom: 5px;
                        font-weight: 600;
                    }

                    .file-stats {
                        font-size: 0.8rem;
                        color: #9ca3af;
                    }

                    .file-actions {
                        display: flex;
                        gap: 10px;
                        flex-shrink: 0;
                    }

                    .preview-button {
                        width: 44px;
                        height: 44px;
                        border: 1px solid rgba(102, 126, 234, 0.2);
                        border-radius: 12px;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 18px;
                        transition: all 0.3s ease;
                    }

                    .preview-button:hover {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-color: transparent;
                        transform: translateY(-2px) scale(1.05);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
                    }

                    .comments-list {
                        margin-bottom: 25px;
                    }

                    .comment {
                        background: rgba(255, 255, 255, 0.7);
                        backdrop-filter: blur(10px);
                        padding: 20px;
                        border-radius: 15px;
                        margin-bottom: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        transition: all 0.3s ease;
                    }

                    .comment:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    }

                    .comment.own-comment {
                        background: rgba(102, 126, 234, 0.1);
                        border-color: rgba(102, 126, 234, 0.2);
                    }

                    .comment strong {
                        color: #667eea;
                        font-weight: 700;
                        font-size: 1rem;
                    }

                    .comment p {
                        margin: 10px 0;
                        color: #374151;
                        line-height: 1.6;
                    }

                    .comment small {
                        color: #6b7280;
                        font-size: 0.85rem;
                    }

                    .comment-form {
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        padding: 25px;
                        border-radius: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                    }

                    .comment-form textarea {
                        width: 100%;
                        padding: 15px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                        resize: vertical;
                        min-height: 100px;
                        margin-bottom: 15px;
                    }

                    .comment-form textarea:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                    }

                    .comment-form button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }

                    .comment-form button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }

                    .modal-backdrop {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        backdrop-filter: blur(10px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 20px;
                    }

                    .modal {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 40px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        max-width: 500px;
                        width: 100%;
                        position: relative;
                    }

                    .modal h2 {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 25px;
                        font-size: 1.5rem;
                        font-weight: 700;
                    }

                    .modal textarea {
                        width: 100%;
                        padding: 15px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                        resize: vertical;
                        min-height: 120px;
                        margin-bottom: 20px;
                    }

                    .modal textarea:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                    }

                    .modal .form-actions {
                        display: flex;
                        gap: 15px;
                        justify-content: flex-end;
                    }

                    .modal button {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }

                    .modal button[type="submit"] {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }

                    .modal .button-secondary {
                        background: rgba(107, 114, 128, 0.1);
                        color: #6b7280;
                        border: 1px solid rgba(107, 114, 128, 0.2);
                    }

                    .modal button:hover {
                        transform: translateY(-2px);
                    }

                    .modern-loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 50vh;
                        color: white;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .modern-error {
                        background: rgba(239, 68, 68, 0.1);
                        color: #dc2626;
                        padding: 20px;
                        border-radius: 15px;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        backdrop-filter: blur(10px);
                        text-align: center;
                        font-weight: 600;
                    }

                    @media (max-width: 768px) {
                        .modern-application-detail-container {
                            padding: 15px;
                        }

                        .modern-header, .modern-card {
                            padding: 20px;
                        }

                        .header-content {
                            flex-direction: column;
                            gap: 15px;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.5rem;
                        }

                        .detail-grid {
                            grid-template-columns: 1fr;
                        }

                        .files-header {
                            flex-direction: column;
                            align-items: stretch;
                        }

                        .files-grid {
                            grid-template-columns: 1fr;
                        }

                        .file-item {
                            flex-direction: column;
                            text-align: center;
                            gap: 15px;
                        }

                        .file-name {
                            white-space: normal;
                            word-break: break-word;
                        }

                        .modern-actions {
                            flex-direction: column;
                        }

                        .modal {
                            margin: 20px;
                            padding: 30px;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">📋 Λεπτομέρειες Αίτησης #{application.application_id}</h1>
                    <Link to="/dashboard" className="modern-back-button">
                        ← Πίσω στο Dashboard
                    </Link>
                </div>
            </div>

            {application.status === 'Εκκρεμότητα' && application.pending_reason && (
                <div className="pending-alert">
                    <strong>🚨 Λόγος Εκκρεμότητας:</strong> {application.pending_reason}
                </div>
            )}

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h2 className="card-title">📊 Στοιχεία Αίτησης</h2>
                        <div className="status-badge">
                            {getStatusBadge(application.status)}
                        </div>
                    </div>
                    
                    <div className="detail-grid">
                        <div className="detail-item">
                            <div className="detail-label">👤 Πελάτης</div>
                            <div className="detail-value">{application.customer_name}</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">🤝 Συνεργάτης</div>
                            <div className="detail-value">{application.associate_name}</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">🏢 Εταιρεία</div>
                            <div className="detail-value">{application.company_name}</div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">💰 Συνολική Αμοιβή</div>
                            <div className="detail-value">
                                {application.total_commission ? parseFloat(application.total_commission).toFixed(2) : '0.00'} €
                            </div>
                        </div>
                        <div className="detail-item">
                            <div className="detail-label">📅 Ημερομηνία Λήξης</div>
                            <div className="detail-value">
                                {application.contract_end_date ? new Date(application.contract_end_date).toLocaleDateString('el-GR') : '-'}
                            </div>
                        </div>

                        {/* Payment Controls - Only for TeamLeaders/Admins */}
                        {(user.role === 'TeamLeader' || user.role === 'Admin') && (
                            <div className="detail-item payment-control">
                                <div className="detail-label">💳 Πληρωμή</div>
                                <div className="detail-value">
                                    <div className="payment-checkbox-container">
                                        <input
                                            type="checkbox"
                                            id="payment-toggle"
                                            checked={application.is_paid_by_company}
                                            onChange={handlePaymentToggle}
                                            className="payment-checkbox"
                                        />
                                        <label htmlFor="payment-toggle" className="payment-checkbox-label">
                                            Πληρώθηκα από την εταιρία
                                        </label>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {renderActionButtons() && (
                        <div className="modern-actions">
                            {isTeamLeaderOfApplication && (
                                <>
                                    {application.status === 'Προς Καταχώρηση' && (
                                        <button 
                                            onClick={() => handleStatusChange('Καταχωρήθηκε')} 
                                            className="modern-button primary"
                                        >
                                            ✅ Αλλαγή σε "Καταχωρήθηκε"
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => handleStatusChange('Εκκρεμότητα')} 
                                        className="modern-button warning"
                                    >
                                        🚨 Αλλαγή σε "Εκκρεμότητα"
                                    </button>
                                </>
                            )}
                            {isOwnerOfApplication && application.status === 'Εκκρεμότητα' && (
                                <button 
                                    onClick={() => navigate(`/application/edit/${application.application_id}`)} 
                                    className="modern-button primary"
                                >
                                    ✏️ Επεξεργασία & Επανυποβολή
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Field Payment Controls - Only for applications with commissionable fields */}
            {(user.role === 'TeamLeader' || user.role === 'Admin') && application.fields?.some(f => f.is_commissionable) && (
                <div className="modern-card">
                    <div className="card-content">
                        <div className="card-header">
                            <h3 className="card-title">💰 Διαχείριση Πληρωμών Πεδίων</h3>
                        </div>
                        <div className="field-payments-grid">
                            {application.fields?.filter(f => f.is_commissionable).map((field) => (
                                <div key={field.id} className="field-payment-item">
                                    <div className="field-payment-info">
                                        <span className="field-label">{field.label}</span>
                                        <span className="field-value">{field.value}</span>
                                        <span className="field-commission">
                                            {field.commission_amount ? `€${parseFloat(field.commission_amount).toFixed(2)}` : '€0.00'}
                                        </span>
                                    </div>
                                    <div className="field-payment-controls">
                                        <div className="payment-checkbox-container">
                                            <input
                                                type="checkbox"
                                                id={`field-paid-${field.id}`}
                                                checked={field.is_paid || false}
                                                onChange={(e) => handleFieldPaymentUpdate(field.id, e.target.checked)}
                                                className="payment-checkbox"
                                                disabled={field.is_in_statement}
                                            />
                                            <label htmlFor={`field-paid-${field.id}`} className="payment-checkbox-label">
                                                Πληρώθηκα από την εταιρία
                                            </label>
                                        </div>
                                        {field.is_paid && field.is_in_statement && !field.has_clawback && (
                                            <button
                                                onClick={() => handleFieldClawback(field.id)}
                                                className="clawback-button"
                                            >
                                                + Clawback
                                            </button>
                                        )}
                                        {field.has_clawback && (
                                            <span className="clawback-indicator">
                                                ⚠️ Έχει Clawback
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">📝 Υποβληθέντα Στοιχεία</h3>
                    </div>
                    <ul className="data-list">
                        {application.fields?.map((f, index) => (
                            <li key={index}>
                                <strong>{f.label}:</strong> {String(f.value)}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="files-header">
                        <h3 className="card-title">📎 Επισυναπτόμενα Αρχεία ({attachments.length})</h3>
                        {application?.status !== 'Καταχωρήθηκε' && (
                            <button
                                className="add-file-button"
                                onClick={() => setShowFileUpload(!showFileUpload)}
                            >
                                {showFileUpload ? '❌ Ακύρωση' : '📎 Προσθήκη Αρχείου'}
                            </button>
                        )}
                        {application?.status === 'Καταχωρήθηκε' && (
                            <span className="status-message">
                                🔒 Η αίτηση έχει καταχωρηθεί - δεν επιτρέπεται επεξεργασία αρχείων
                            </span>
                        )}
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
                                {application?.status !== 'Καταχωρήθηκε' && (
                                    <button
                                        className="upload-first-file"
                                        onClick={() => setShowFileUpload(true)}
                                    >
                                        Ανέβασε το πρώτο αρχείο
                                    </button>
                                )}
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
                                                <span className="file-category"> • {file.category}</span>
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
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">💬 Ιστορικό Σχολίων</h3>
                    </div>
                    <div className="comments-list">
                        {comments.map(comment => (
                            <div key={comment.id} className={`comment ${comment.user_id === user.id ? 'own-comment' : ''}`}>
                                <strong>{comment.user_name}</strong>
                                <p>{comment.comment}</p>
                                <small>{new Date(comment.created_at).toLocaleString('el-GR')}</small>
                            </div>
                        ))}
                    </div>
                    {/* Comments form - Only authenticated users can comment */}
                    {user && (
                        <form onSubmit={handleAddComment} className="comment-form">
                            <textarea
                                rows="3"
                                placeholder="Γράψε ένα σχόλιο..."
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                required
                            />
                            <button type="submit">💬 Αποστολή</button>
                        </form>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h2>🚨 Λόγος Εκκρεμότητας</h2>
                        <form onSubmit={handlePendingSubmit}>
                            <textarea 
                                rows="5" 
                                value={pendingReason} 
                                onChange={(e) => setPendingReason(e.target.value)} 
                                placeholder="Εισάγετε τον λόγο εκκρεμότητας..."
                                required
                            />
                            <div className="form-actions">
                                <button type="submit">✅ Υποβολή</button>
                                <button type="button" className="button-secondary" onClick={() => setIsModalOpen(false)}>❌ Ακύρωση</button>
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
                    applicationStatus={application?.status}
                />
            )}
        </div>
    );
};

export default ApplicationDetailPage;