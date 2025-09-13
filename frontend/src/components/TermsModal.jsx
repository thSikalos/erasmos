import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const TermsModal = ({ isOpen, onClose, onAccept, onReject, forcedAcceptance = false }) => {
    const { token } = useContext(AuthContext);
    const [terms, setTerms] = useState(null);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchCurrentTerms();
        }
    }, [isOpen]);

    const fetchCurrentTerms = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:3000/api/terms/current');
            setTerms(response.data);
        } catch (err) {
            console.error('Error fetching terms:', err);
            setError('Σφάλμα κατά τη φόρτωση των όρων χρήσης');
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async () => {
        if (!token) {
            setError('Δεν είστε συνδεδεμένος');
            return;
        }

        try {
            setAccepting(true);
            setError('');
            
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            
            await axios.post('http://localhost:3000/api/terms/accept', {}, config);
            
            if (onAccept) {
                onAccept();
            }
            
            if (!forcedAcceptance && onClose) {
                onClose();
            }
            
            // No need to reload - let TermsGuard handle the state update
        } catch (err) {
            console.error('Error accepting terms:', err);
            setError('Σφάλμα κατά την αποδοχή των όρων');
        } finally {
            setAccepting(false);
        }
    };

    const handleClose = () => {
        if (!forcedAcceptance && onClose) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="terms-modal-overlay">
            <style>{`
                .terms-modal-overlay {
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

                .terms-modal {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
                    width: 100%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                }

                .terms-header {
                    background: linear-gradient(135deg, #667eea, #764ba2);
                    color: white;
                    padding: 25px 30px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }

                .terms-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .close-button {
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
                    transition: all 0.2s ease;
                }

                .close-button:hover {
                    background: rgba(255, 255, 255, 0.3);
                    transform: rotate(90deg);
                }

                .close-button:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .terms-content {
                    flex: 1;
                    overflow-y: auto;
                    padding: 30px;
                }

                .loading-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 60px 20px;
                    color: #6b7280;
                }

                .spinner {
                    border: 3px solid #f3f4f6;
                    border-top: 3px solid #667eea;
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 15px;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
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

                .terms-text {
                    font-size: 0.95rem;
                    line-height: 1.7;
                    color: #374151;
                }

                .terms-text h1 {
                    color: #1f2937;
                    font-size: 1.8rem;
                    margin: 30px 0 20px 0;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #e5e7eb;
                }

                .terms-text h2 {
                    color: #374151;
                    font-size: 1.3rem;
                    margin: 25px 0 15px 0;
                    font-weight: 600;
                }

                .terms-text h3 {
                    color: #4b5563;
                    font-size: 1.1rem;
                    margin: 20px 0 10px 0;
                    font-weight: 600;
                }

                .terms-text ul, .terms-text ol {
                    margin: 15px 0;
                    padding-left: 25px;
                }

                .terms-text li {
                    margin: 8px 0;
                }

                .terms-text p {
                    margin: 15px 0;
                }

                .terms-text strong {
                    color: #1f2937;
                    font-weight: 600;
                }

                .terms-text code {
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'Courier New', monospace;
                    font-size: 0.9em;
                }

                .terms-footer {
                    background: #f9fafb;
                    padding: 25px 30px;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 15px;
                    justify-content: flex-end;
                    align-items: center;
                }

                .warning-text {
                    flex: 1;
                    font-size: 0.9rem;
                    color: #dc2626;
                    font-weight: 500;
                }

                .action-button {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    position: relative;
                    overflow: hidden;
                }

                .accept-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                }

                .accept-button:hover {
                    background: linear-gradient(135deg, #059669, #047857);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                }

                .accept-button:disabled {
                    background: #9ca3af;
                    box-shadow: none;
                    transform: none;
                    cursor: not-allowed;
                }

                .decline-button {
                    background: linear-gradient(135deg, #6b7280, #4b5563);
                    color: white;
                    box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                }

                .decline-button:hover {
                    background: linear-gradient(135deg, #4b5563, #374151);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
                }

                .acceptance-notice {
                    background: linear-gradient(135deg, #fef3c7, #fde68a);
                    color: #92400e;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    border: 1px solid #f59e0b;
                }

                .forced-notice {
                    background: linear-gradient(135deg, #fee2e2, #fecaca);
                    color: #dc2626;
                    padding: 20px;
                    border-radius: 12px;
                    margin-bottom: 20px;
                    border: 1px solid #ef4444;
                    font-weight: 600;
                }

                @media (max-width: 768px) {
                    .terms-modal-overlay {
                        padding: 10px;
                    }

                    .terms-modal {
                        max-height: 95vh;
                    }

                    .terms-header {
                        padding: 20px;
                        flex-direction: column;
                        text-align: center;
                        gap: 15px;
                    }

                    .terms-content {
                        padding: 20px;
                    }

                    .terms-footer {
                        padding: 20px;
                        flex-direction: column;
                        gap: 10px;
                    }

                    .warning-text {
                        text-align: center;
                    }

                    .action-button {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>

            <div className="terms-modal">
                <div className="terms-header">
                    <h1 className="terms-title">
                        📄 Όροι Χρήσης Υπηρεσίας
                    </h1>
                    <button
                        className="close-button"
                        onClick={handleClose}
                        disabled={forcedAcceptance}
                        title={forcedAcceptance ? "Πρέπει να αποδεχτείτε τους όρους για να συνεχίσετε" : "Κλείσιμο"}
                    >
                        ×
                    </button>
                </div>

                <div className="terms-content">
                    {error && (
                        <div className="error-message">
                            ⚠️ {error}
                        </div>
                    )}

                    {forcedAcceptance && (
                        <div className="forced-notice">
                            🚨 <strong>Απαιτείται Αποδοχή:</strong> Οι όροι χρήσης έχουν ενημερωθεί. Πρέπει να τους αποδεχτείτε για να συνεχίσετε τη χρήση της πλατφόρμας.
                        </div>
                    )}

                    {!forcedAcceptance && (
                        <div className="acceptance-notice">
                            ℹ️ <strong>Σημείωση:</strong> Παρακαλούμε διαβάστε προσεκτικά τους όρους χρήσης πριν την αποδοχή τους.
                        </div>
                    )}

                    {loading ? (
                        <div className="loading-container">
                            <div className="spinner"></div>
                            <p>Φόρτωση όρων χρήσης...</p>
                        </div>
                    ) : terms ? (
                        <div className="terms-text">
                            <ReactMarkdown>{terms.content}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="error-message">
                            ❌ Δεν ήταν δυνατή η φόρτωση των όρων χρήσης
                        </div>
                    )}
                </div>

                <div className="terms-footer">
                    {forcedAcceptance && (
                        <div className="warning-text">
                            ⚠️ Δεν μπορείτε να χρησιμοποιήσετε την πλατφόρμα χωρίς αποδοχή των όρων
                        </div>
                    )}

                    <button
                        className="action-button accept-button"
                        onClick={handleAccept}
                        disabled={accepting || loading || !terms}
                    >
                        {accepting ? (
                            <>
                                <div className="spinner" style={{width: '16px', height: '16px', borderWidth: '2px', margin: 0}}></div>
                                Αποδοχή...
                            </>
                        ) : (
                            <>
                                ✅ Αποδέχομαι τους Όρους
                            </>
                        )}
                    </button>

                    {!forcedAcceptance ? (
                        <button
                            className="action-button decline-button"
                            onClick={handleClose}
                            disabled={accepting}
                        >
                            ❌ Κλείσιμο
                        </button>
                    ) : (
                        <button
                            className="action-button decline-button"
                            onClick={onReject}
                            disabled={accepting}
                        >
                            ❌ Απόρριψη & Αποσύνδεση
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TermsModal;