import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const NotificationsPage = () => {
    const { token } = useContext(AuthContext);
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [isPreparing, setIsPreparing] = useState(false);

    const fetchDrafts = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:3000/api/notifications/drafts', config);
            setDrafts(res.data);
        } catch (err) {
            console.error("Failed to fetch drafts", err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => { fetchDrafts(); }, [token]);

    const handlePrepare = async () => {
        setIsPreparing(true);
        setMessage('Προετοιμασία μηνυμάτων, παρακαλώ περιμένετε...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:3000/api/notifications/prepare-summary', {}, config);
            setMessage('Τα προσχέδια μηνυμάτων ετοιμάστηκαν με επιτυχία!');
            fetchDrafts();
        } catch (err) {
            setMessage('Σφάλμα κατά την προετοιμασία των μηνυμάτων.');
        } finally {
            setIsPreparing(false);
        }
    };

    const handleSend = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`http://localhost:3000/api/notifications/${id}/send`, {}, config);
            fetchDrafts();
        } catch (err) {
            console.error("Failed to send", err);
        }
    };
    
    const getMessagePreview = (message) => {
        return message.length > 100 ? message.substring(0, 100) + '...' : message;
    };

    return (
        <div className="modern-notifications-container">
            <style>
                {`
                    .modern-notifications-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-notifications-container::before {
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
                        background: rgba(255, 255, 255, 0.95);
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
                        flex-wrap: wrap;
                        gap: 15px;
                    }

                    .header-title {
                        font-size: 2.2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 15px;
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
                        background: rgba(255, 255, 255, 0.95);
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
                        margin-bottom: 20px;
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

                    .card-description {
                        color: #6b7280;
                        font-size: 1rem;
                        line-height: 1.6;
                        margin-bottom: 25px;
                    }

                    .prepare-button {
                        width: 100%;
                        padding: 16px 20px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    }

                    .prepare-button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .prepare-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .prepare-button:hover::before {
                        left: 100%;
                    }

                    .prepare-button:not(:disabled):hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }

                    .status-message {
                        margin-top: 20px;
                        padding: 15px 20px;
                        border-radius: 12px;
                        text-align: center;
                        font-weight: 600;
                        backdrop-filter: blur(10px);
                    }

                    .status-message.preparing {
                        background: rgba(59, 130, 246, 0.1);
                        color: #1d4ed8;
                        border: 1px solid rgba(59, 130, 246, 0.3);
                    }

                    .status-message.success {
                        background: rgba(16, 185, 129, 0.1);
                        color: #065f46;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                    }

                    .status-message.error {
                        background: rgba(239, 68, 68, 0.1);
                        color: #dc2626;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                    }

                    .drafts-grid {
                        display: grid;
                        gap: 15px;
                    }

                    .draft-item {
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        padding: 20px;
                        border-radius: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        transition: all 0.3s ease;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                        gap: 20px;
                    }

                    .draft-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                        border-color: rgba(102, 126, 234, 0.2);
                    }

                    .draft-content {
                        flex: 1;
                        min-width: 0;
                    }

                    .draft-preview {
                        color: #374151;
                        font-size: 0.95rem;
                        line-height: 1.5;
                        word-wrap: break-word;
                        white-space: pre-wrap;
                    }

                    .draft-actions {
                        flex-shrink: 0;
                    }

                    .send-button {
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .send-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }

                    .loading-state {
                        text-align: center;
                        padding: 40px;
                        color: #6b7280;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 32px;
                        height: 32px;
                        border: 3px solid rgba(102, 126, 234, 0.3);
                        border-top: 3px solid #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-right: 10px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .empty-state {
                        text-align: center;
                        padding: 50px;
                        color: #6b7280;
                    }

                    .empty-icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                        opacity: 0.5;
                    }

                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 10;
                    }

                    .stat-card {
                        background: rgba(255, 255, 255, 0.9);
                        backdrop-filter: blur(15px);
                        border-radius: 15px;
                        padding: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        transition: all 0.3s ease;
                    }

                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    }

                    .stat-icon {
                        font-size: 2.5rem;
                        margin-bottom: 15px;
                    }

                    .stat-number {
                        font-size: 1.8rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 8px;
                    }

                    .stat-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    @media (max-width: 768px) {
                        .modern-notifications-container {
                            padding: 15px;
                        }

                        .modern-header, .modern-card {
                            padding: 25px;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.8rem;
                        }

                        .draft-item {
                            flex-direction: column;
                            gap: 15px;
                        }

                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    @media (max-width: 480px) {
                        .stats-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">
                        🔔 Ειδοποιήσεις
                    </h1>
                    <Link to="/dashboard" className="modern-back-button">
                        ← Πίσω στο Dashboard
                    </Link>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📱</div>
                    <div className="stat-number">{drafts.length}</div>
                    <div className="stat-label">Προσχέδια</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📤</div>
                    <div className="stat-number">Viber</div>
                    <div className="stat-label">Πλατφόρμα</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📊</div>
                    <div className="stat-number">Μηνιαία</div>
                    <div className="stat-label">Περιοδικότητα</div>
                </div>
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">📱 Μηνιαία Ενημέρωση Συνεργατών (Viber)</h3>
                    </div>
                    
                    <p className="card-description">
                        Πατώντας το κουμπί, το σύστημα θα ετοιμάσει τα προσχέδια μηνυμάτων για τις αμοιβές του προηγούμενου μήνα.
                        Στη συνέχεια μπορείτε να τα αποστείλετε ξεχωριστά σε κάθε συνεργάτη.
                    </p>
                    
                    <button 
                        onClick={handlePrepare} 
                        className="prepare-button"
                        disabled={isPreparing}
                    >
                        {isPreparing ? (
                            <>
                                <div className="loading-spinner"></div>
                                Προετοιμασία...
                            </>
                        ) : (
                            <>
                                🚀 Προετοιμασία Μηνυμάτων
                            </>
                        )}
                    </button>
                    
                    {message && (
                        <div className={`status-message ${
                            message.includes('Προετοιμασία') ? 'preparing' : 
                            message.includes('επιτυχία') ? 'success' : 'error'
                        }`}>
                            {message.includes('Προετοιμασία') && '⏳ '}
                            {message.includes('επιτυχία') && '✅ '}
                            {message.includes('Σφάλμα') && '❌ '}
                            {message}
                        </div>
                    )}
                </div>
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">📤 Προσχέδια προς Αποστολή</h3>
                    </div>
                    
                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            Φόρτωση προσχεδίων...
                        </div>
                    ) : drafts.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <p>Δεν υπάρχουν προσχέδια προς αποστολή</p>
                            <p style={{fontSize: '0.9rem', opacity: '0.7'}}>
                                Χρησιμοποιήστε το κουμπί "Προετοιμασία Μηνυμάτων" για να δημιουργήσετε νέα προσχέδια
                            </p>
                        </div>
                    ) : (
                        <div className="drafts-grid">
                            {drafts.map(draft => (
                                <div key={draft.id} className="draft-item">
                                    <div className="draft-content">
                                        <div className="draft-preview">
                                            {getMessagePreview(draft.message)}
                                        </div>
                                    </div>
                                    <div className="draft-actions">
                                        <button 
                                            onClick={() => handleSend(draft.id)} 
                                            className="send-button"
                                        >
                                            📤 Αποστολή
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;