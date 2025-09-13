import React, { useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import '../App.css';

const TermsPage = () => {
    const { token, userAcceptedTerms } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const [terms, setTerms] = useState(null);
    const [loadingTerms, setLoadingTerms] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCurrentTerms();
    }, []);

    const fetchCurrentTerms = async () => {
        try {
            const response = await axios.get('http://localhost:3000/api/terms/current');
            setTerms(response.data);
        } catch (err) {
            console.error('Error fetching terms:', err);
            setError('Σφάλμα κατά τη φόρτωση των όρων χρήσης');
        } finally {
            setLoadingTerms(false);
        }
    };

    const handleScroll = (e) => {
        const element = e.target;
        if (element.scrollTop + element.clientHeight >= element.scrollHeight - 5) {
            setScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        if (!token) {
            setError('Δεν είστε συνδεδεμένος');
            return;
        }

        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const response = await axios.post('http://localhost:3000/api/terms/accept', {}, config);
            
            // Use the context's userAcceptedTerms function to properly handle the new token
            if (response.data.token) {
                userAcceptedTerms(response.data.token);
            } else {
                // Fallback if no token returned
                window.location.href = '/dashboard';
            }
        } catch (err) {
            console.error("Failed to accept terms", err);
            setError("Σφάλμα κατά την αποδοχή των όρων. Δοκιμάστε ξανά.");
            setLoading(false);
        }
    };

    if (loadingTerms) {
        return (
            <div className="login-container">
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
                <div className="form-container" style={{maxWidth: '700px', textAlign: 'center'}}>
                    <h2>Φόρτωση όρων χρήσης...</h2>
                    <div style={{margin: '20px 0'}}>
                        <div style={{
                            border: '3px solid #f3f4f6',
                            borderTop: '3px solid #667eea',
                            borderRadius: '50%',
                            width: '40px',
                            height: '40px',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto'
                        }}></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-container">
            <div className="form-container" style={{maxWidth: '700px'}}>
                <h2>{terms?.title || 'Όροι Χρήσης'}</h2>
                {error && (
                    <div style={{
                        background: '#fee2e2',
                        color: '#dc2626',
                        padding: '15px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        {error}
                    </div>
                )}
                <div 
                    style={{
                        textAlign: 'left', 
                        maxHeight: '400px', 
                        overflowY: 'auto', 
                        border: '1px solid #ccc', 
                        padding: '1.5rem',
                        marginBottom: '1rem',
                        fontSize: '14px',
                        lineHeight: '1.6'
                    }}
                    onScroll={handleScroll}
                >
                    {terms ? (
                        <ReactMarkdown>{terms.content}</ReactMarkdown>
                    ) : (
                        <p>Δεν ήταν δυνατή η φόρτωση των όρων χρήσης.</p>
                    )}
                    <hr style={{margin: '1.5rem 0'}} />
                    <p style={{fontSize: '12px', color: '#666'}}>
                        Έκδοση: {terms?.version} | Ημερομηνία ισχύος: {terms?.effective_date ? new Date(terms.effective_date).toLocaleDateString('el-GR') : 'N/A'}
                    </p>
                </div>
                
                <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'flex', alignItems: 'center', fontSize: '14px'}}>
                        <input 
                            type="checkbox" 
                            checked={scrolledToBottom} 
                            onChange={() => setScrolledToBottom(!scrolledToBottom)}
                            style={{marginRight: '0.5rem'}}
                        />
                        Έχω διαβάσει και συμφωνώ με τους όρους χρήσης και την πολιτική προστασίας δεδομένων
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button 
                        onClick={handleAccept} 
                        disabled={loading || !scrolledToBottom}
                        style={{
                            backgroundColor: scrolledToBottom ? '#28a745' : '#ccc',
                            color: 'white',
                            border: 'none',
                            padding: '15px 30px',
                            borderRadius: '6px',
                            cursor: scrolledToBottom ? 'pointer' : 'not-allowed',
                            fontWeight: '600',
                            fontSize: '16px',
                            flex: 3
                        }}
                    >
                        {loading ? 'Επεξεργασία...' : '✅ Αποδέχομαι τους Όρους'}
                    </button>
                    
                    <button 
                        onClick={() => {
                            window.location.href = '/dashboard';
                        }}
                        disabled={loading}
                        style={{
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            padding: '12px 18px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            fontSize: '14px',
                            flex: 1
                        }}
                    >
                        ❌ Απόρριψη
                    </button>
                </div>
            </div>
        </div>
    );
};
export default TermsPage;