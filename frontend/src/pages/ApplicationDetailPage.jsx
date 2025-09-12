import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const ApplicationDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const [application, setApplication] = useState(null);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State για το modal και τα σχόλια
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingReason, setPendingReason] = useState('');
    const [newComment, setNewComment] = useState('');

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [appRes, commentsRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/applications/${id}`, config),
                axios.get(`http://localhost:3000/api/applications/${id}/comments`, config)
            ]);
            setApplication(appRes.data);
            setComments(commentsRes.data);
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
        </div>
    );
};

export default ApplicationDetailPage;