import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const AdminTermsPage = () => {
    const { token } = useContext(AuthContext);
    const [termsHistory, setTermsHistory] = useState([]);
    const [pdfFiles, setPdfFiles] = useState([]);
    const [acceptanceReport, setAcceptanceReport] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('terms');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTerms, setNewTerms] = useState({
        version: '',
        title: '',
        content: '',
        effectiveDate: ''
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            // Fetch terms history, PDF files, and acceptance report in parallel
            const [termsRes, pdfRes, acceptanceRes] = await Promise.all([
                axios.get('http://localhost:3000/api/terms/history', config),
                axios.get('http://localhost:3000/api/terms/pdfs', config),
                axios.get('http://localhost:3000/api/terms/acceptance-report', config)
            ]);

            setTermsHistory(termsRes.data);
            setPdfFiles(pdfRes.data);
            setAcceptanceReport(acceptanceRes.data);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Σφάλμα κατά τη φόρτωση των δεδομένων');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTerms = async (e) => {
        e.preventDefault();
        if (!newTerms.version || !newTerms.title || !newTerms.content) {
            setError('Συμπληρώστε όλα τα απαραίτητα πεδία');
            return;
        }

        try {
            setCreating(true);
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            await axios.post('http://localhost:3000/api/terms', {
                version: newTerms.version,
                title: newTerms.title,
                content: newTerms.content,
                effectiveDate: newTerms.effectiveDate || new Date().toISOString()
            }, config);

            setShowCreateModal(false);
            setNewTerms({ version: '', title: '', content: '', effectiveDate: '' });
            setError('');
            fetchData(); // Refresh data
        } catch (err) {
            console.error('Error creating terms:', err);
            setError(err.response?.data?.message || 'Σφάλμα κατά τη δημιουργία των όρων');
        } finally {
            setCreating(false);
        }
    };

    const handleGeneratePdf = async (termsId) => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            await axios.post(`http://localhost:3000/api/terms/version/${termsId}/generate-pdf`, {}, config);
            fetchData(); // Refresh data to show new PDF
        } catch (err) {
            console.error('Error generating PDF:', err);
            setError('Σφάλμα κατά τη δημιουργία του PDF');
        }
    };

    const handleDownloadPdf = (pdfId) => {
        window.open(`http://localhost:3000/api/terms/pdf/download/${pdfId}`, '_blank');
    };

    if (loading) {
        return (
            <div className="admin-terms-loading">
                <style>{`
                    .admin-terms-loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    
                    .spinner {
                        border: 3px solid rgba(255, 255, 255, 0.3);
                        border-top: 3px solid white;
                        border-radius: 50%;
                        width: 40px;
                        height: 40px;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }
                    
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
                <div className="spinner"></div>
                <p>Φόρτωση δεδομένων όρων χρήσης...</p>
            </div>
        );
    }

    return (
        <div className="admin-terms-container">
            <style jsx>{`
                .admin-terms-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }

                .admin-header {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    padding: 30px;
                    margin-bottom: 30px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                }

                .header-content {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }

                .header-title {
                    font-size: 2.2rem;
                    font-weight: 700;
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .header-actions {
                    display: flex;
                    gap: 15px;
                }

                .admin-button, .back-button {
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    text-decoration: none;
                    transition: all 0.3s ease;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .back-button {
                    background: linear-gradient(135deg, #6b7280, #4b5563);
                    color: white;
                    box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                }

                .back-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
                    color: white;
                    text-decoration: none;
                }

                .create-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                }

                .create-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                }

                .tabs-container {
                    background: rgba(255, 255, 255, 0.95);
                    backdrop-filter: blur(20px);
                    border-radius: 20px;
                    margin-bottom: 30px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                }

                .tabs-header {
                    display: flex;
                    border-radius: 20px 20px 0 0;
                    overflow: hidden;
                }

                .tab-button {
                    flex: 1;
                    padding: 20px;
                    border: none;
                    background: rgba(255, 255, 255, 0.5);
                    color: #6b7280;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                }

                .tab-button.active {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                }

                .tab-button:hover:not(.active) {
                    background: rgba(255, 255, 255, 0.8);
                }

                .tab-content {
                    padding: 30px;
                }

                .error-message {
                    background: #fee2e2;
                    color: #dc2626;
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin-bottom: 20px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .terms-grid, .pdf-grid {
                    display: grid;
                    gap: 20px;
                }

                .terms-card, .pdf-card {
                    background: rgba(255, 255, 255, 0.8);
                    border-radius: 15px;
                    padding: 25px;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                    transition: all 0.3s ease;
                }

                .terms-card:hover, .pdf-card:hover {
                    transform: translateY(-3px);
                    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.15);
                }

                .card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 15px;
                }

                .card-title {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 5px 0;
                }

                .card-version {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 6px 12px;
                    border-radius: 8px;
                    font-size: 0.8rem;
                    font-weight: 600;
                }

                .card-meta {
                    color: #6b7280;
                    font-size: 0.9rem;
                    margin-bottom: 15px;
                    display: flex;
                    gap: 20px;
                }

                .card-content {
                    max-height: 100px;
                    overflow: hidden;
                    color: #374151;
                    line-height: 1.5;
                    margin-bottom: 20px;
                }

                .card-actions {
                    display: flex;
                    gap: 10px;
                }

                .action-button {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: none;
                    font-weight: 500;
                    font-size: 0.85rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .generate-pdf-btn {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .download-btn {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                }

                .action-button:hover {
                    transform: translateY(-1px);
                    opacity: 0.9;
                }

                .current-badge {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .acceptance-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: rgba(255, 255, 255, 0.9);
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
                }

                .acceptance-table th,
                .acceptance-table td {
                    padding: 15px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }

                .acceptance-table th {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    font-weight: 600;
                }

                .acceptance-table tr:hover {
                    background: rgba(102, 126, 234, 0.05);
                }

                .status-badge {
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-accepted {
                    background: #d1fae5;
                    color: #065f46;
                }

                .status-pending {
                    background: #fed7aa;
                    color: #9a3412;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                }

                .modal {
                    background: white;
                    border-radius: 20px;
                    width: 100%;
                    max-width: 800px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .modal-header {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 25px 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .modal-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                }

                .modal-close {
                    background: rgba(255, 255, 255, 0.2);
                    border: none;
                    border-radius: 50%;
                    width: 36px;
                    height: 36px;
                    color: white;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }

                .modal-body {
                    padding: 30px;
                    flex: 1;
                    overflow-y: auto;
                }

                .form-group {
                    margin-bottom: 25px;
                }

                .form-label {
                    display: block;
                    margin-bottom: 8px;
                    font-weight: 600;
                    color: #374151;
                }

                .form-input, .form-textarea {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                }

                .form-input:focus, .form-textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .form-textarea {
                    height: 200px;
                    resize: vertical;
                    font-family: inherit;
                }

                .modal-actions {
                    padding: 20px 30px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                }

                .modal-button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }

                .cancel-button {
                    background: #f3f4f6;
                    color: #374151;
                }

                .save-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                }

                .save-button:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .save-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 768px) {
                    .admin-terms-container {
                        padding: 15px;
                    }

                    .header-content {
                        flex-direction: column;
                        text-align: center;
                    }

                    .header-title {
                        font-size: 1.8rem;
                    }

                    .tabs-header {
                        flex-direction: column;
                    }

                    .tab-content {
                        padding: 20px;
                    }

                    .card-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 10px;
                    }

                    .card-actions {
                        flex-wrap: wrap;
                    }

                    .acceptance-table {
                        font-size: 0.85rem;
                    }

                    .acceptance-table th,
                    .acceptance-table td {
                        padding: 10px;
                    }
                }
            `}</style>

            <div className="admin-header">
                <div className="header-content">
                    <h1 className="header-title">
                        📄 Διαχείριση Όρων Χρήσης
                    </h1>
                    <div className="header-actions">
                        <button 
                            className="admin-button create-button" 
                            onClick={() => setShowCreateModal(true)}
                        >
                            ➕ Νέοι Όροι
                        </button>
                        <Link to="/admin" className="back-button">
                            ← Πίσω στο Admin
                        </Link>
                    </div>
                </div>
            </div>

            {error && (
                <div className="error-message">
                    ⚠️ {error}
                </div>
            )}

            <div className="tabs-container">
                <div className="tabs-header">
                    <button 
                        className={`tab-button ${activeTab === 'terms' ? 'active' : ''}`}
                        onClick={() => setActiveTab('terms')}
                    >
                        📝 Ιστορικό Όρων
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'pdfs' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pdfs')}
                    >
                        📄 PDF Αρχεία
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'acceptance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('acceptance')}
                    >
                        📊 Αποδοχές Χρηστών
                    </button>
                </div>

                <div className="tab-content">
                    {activeTab === 'terms' && (
                        <div className="terms-grid">
                            {termsHistory.map(terms => (
                                <div key={terms.id} className="terms-card">
                                    <div className="card-header">
                                        <div>
                                            <h3 className="card-title">{terms.title}</h3>
                                            {terms.is_current && <span className="current-badge">Τρέχων</span>}
                                        </div>
                                        <span className="card-version">v{terms.version}</span>
                                    </div>
                                    <div className="card-meta">
                                        <span>📅 {new Date(terms.effective_date).toLocaleDateString('el-GR')}</span>
                                        <span>👤 {terms.created_by_name}</span>
                                    </div>
                                    <div className="card-content">
                                        {terms.content?.substring(0, 200)}...
                                    </div>
                                    <div className="card-actions">
                                        <button 
                                            className="action-button generate-pdf-btn"
                                            onClick={() => handleGeneratePdf(terms.id)}
                                        >
                                            📄 Δημιουργία PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'pdfs' && (
                        <div className="pdf-grid">
                            {pdfFiles.map(pdf => (
                                <div key={pdf.id} className="pdf-card">
                                    <div className="card-header">
                                        <div>
                                            <h3 className="card-title">{pdf.title}</h3>
                                        </div>
                                        <span className="card-version">v{pdf.version}</span>
                                    </div>
                                    <div className="card-meta">
                                        <span>📄 {pdf.filename}</span>
                                        <span>📁 {(pdf.file_size / 1024).toFixed(2)} KB</span>
                                        <span>📅 {new Date(pdf.created_at).toLocaleDateString('el-GR')}</span>
                                    </div>
                                    <div className="card-actions">
                                        <button 
                                            className="action-button download-btn"
                                            onClick={() => handleDownloadPdf(pdf.id)}
                                        >
                                            ⬇️ Κατέβασμα
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'acceptance' && (
                        <div className="acceptance-overview">
                            <table className="acceptance-table">
                                <thead>
                                    <tr>
                                        <th>Χρήστης</th>
                                        <th>Email</th>
                                        <th>Ρόλος</th>
                                        <th>Κατάσταση</th>
                                        <th>Ημερομηνία Αποδοχής</th>
                                        <th>IP Address</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {acceptanceReport.map(user => (
                                        <tr key={user.id}>
                                            <td>{user.name}</td>
                                            <td>{user.email}</td>
                                            <td>{user.role}</td>
                                            <td>
                                                <span className={`status-badge ${user.needs_terms_acceptance ? 'status-pending' : 'status-accepted'}`}>
                                                    {user.needs_terms_acceptance ? 'Εκκρεμεί' : 'Αποδεκτοί'}
                                                </span>
                                            </td>
                                            <td>
                                                {user.accepted_at ? 
                                                    new Date(user.accepted_at).toLocaleDateString('el-GR') + ' ' + 
                                                    new Date(user.accepted_at).toLocaleTimeString('el-GR') : 
                                                    '-'
                                                }
                                            </td>
                                            <td>{user.ip_address || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Terms Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}>
                    <div className="modal">
                        <div className="modal-header">
                            <h2 className="modal-title">➕ Δημιουργία Νέων Όρων Χρήσης</h2>
                            <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateTerms}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Έκδοση *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newTerms.version}
                                        onChange={(e) => setNewTerms({ ...newTerms, version: e.target.value })}
                                        placeholder="π.χ. 2.0, 2.1"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Τίτλος *</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={newTerms.title}
                                        onChange={(e) => setNewTerms({ ...newTerms, title: e.target.value })}
                                        placeholder="π.χ. Όροι Χρήσης Υπηρεσίας"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Περιεχόμενο (Markdown) *</label>
                                    <textarea
                                        className="form-textarea"
                                        value={newTerms.content}
                                        onChange={(e) => setNewTerms({ ...newTerms, content: e.target.value })}
                                        placeholder="Εισάγετε το περιεχόμενο των όρων χρήσης..."
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ημερομηνία Ισχύος</label>
                                    <input
                                        type="datetime-local"
                                        className="form-input"
                                        value={newTerms.effectiveDate}
                                        onChange={(e) => setNewTerms({ ...newTerms, effectiveDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-actions">
                                <button 
                                    type="button" 
                                    className="modal-button cancel-button"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Ακύρωση
                                </button>
                                <button 
                                    type="submit" 
                                    className="modal-button save-button"
                                    disabled={creating}
                                >
                                    {creating ? 'Δημιουργία...' : '✅ Δημιουργία'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminTermsPage;