import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import TermsModal from './TermsModal';
import axios from 'axios';

const TermsGuard = ({ children }) => {
    const { token, user } = useContext(AuthContext);
    const [needsAcceptance, setNeedsAcceptance] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [hasCheckedOnce, setHasCheckedOnce] = useState(false);

    useEffect(() => {
        if (token && user && !hasCheckedOnce) {
            checkTermsAcceptance();
            setHasCheckedOnce(true);
        } else if (!token || !user) {
            setIsChecking(false);
            setNeedsAcceptance(false); // If no token/user, don't require terms acceptance
        }
    }, [token, user, hasCheckedOnce]);

    const checkTermsAcceptance = async () => {
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            
            const response = await axios.get('http://localhost:3000/api/terms/acceptance-status', config);
            
            if (response.data.needsAcceptance) {
                setNeedsAcceptance(true);
                setShowTermsModal(true);
            } else {
                setNeedsAcceptance(false);
            }
        } catch (err) {
            console.error('Error checking terms acceptance:', err);
            // On error, don't block access but log the issue
            setNeedsAcceptance(false);
        } finally {
            setIsChecking(false);
        }
    };

    const handleTermsAccepted = () => {
        setNeedsAcceptance(false);
        setShowTermsModal(false);
        // Don't re-check - just assume it worked
    };

    const handleTermsRejected = () => {
        // Logout user and redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Show loading while checking
    if (isChecking) {
        return (
            <div className="terms-guard-loading">
                <style>{`
                    .terms-guard-loading {
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
                <p>Έλεγχος όρων χρήσης...</p>
            </div>
        );
    }

    // If user needs to accept terms, show modal and block access
    if (needsAcceptance) {
        return (
            <div className="terms-guard-blocked">
                <style>{`
                    .terms-guard-blocked {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        color: white;
                        text-align: center;
                    }
                    
                    .blocked-content {
                        max-width: 600px;
                        margin-bottom: 30px;
                    }
                    
                    .blocked-content h1 {
                        font-size: 2rem;
                        margin-bottom: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                    }
                    
                    .blocked-content p {
                        font-size: 1.1rem;
                        line-height: 1.6;
                        opacity: 0.9;
                    }
                `}</style>
                
                <div className="blocked-content">
                    <h1>📄 Απαιτείται Αποδοχή Όρων</h1>
                    <p>
                        Οι όροι χρήσης της πλατφόρμας έχουν ενημερωθεί. 
                        Για να συνεχίσετε τη χρήση της υπηρεσίας, πρέπει να αποδεχτείτε τους νέους όρους.
                    </p>
                </div>
                
                <TermsModal
                    isOpen={showTermsModal}
                    onAccept={handleTermsAccepted}
                    onReject={handleTermsRejected}
                    forcedAcceptance={true}
                />
            </div>
        );
    }

    // If everything is ok, render children normally
    return <>{children}</>;
};

export default TermsGuard;