import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useLegalCompliance } from '../context/LegalComplianceContext';

const ProtectedRoute = React.forwardRef(({ children }, ref) => {
    const location = useLocation();
    const {
        token,
        user,
        logout,
        legalComplianceStatus,
        legalLoading,
        isLegallyCompliant
    } = useContext(AuthContext);

    const [complianceChecked, setComplianceChecked] = useState(false);

    console.log('[PROTECTED_ROUTE] Route check at:', location.pathname, {
        hasToken: !!token,
        hasUser: !!user,
        userEmail: user?.email,
        legalCompliance: legalComplianceStatus?.complianceStatus,
        isLegallyCompliant,
        legalLoading,
        complianceChecked
    });

    useEffect(() => {
        if (!legalLoading && legalComplianceStatus) {
            setComplianceChecked(true);
        }
    }, [legalLoading, legalComplianceStatus]);

    if (!token) {
        console.log('[PROTECTED_ROUTE] No token, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    // Show loading while checking legal compliance
    if (legalLoading || (token && user && !complianceChecked)) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '1.2rem'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '20px'
                }}>
                    <div style={{
                        width: '50px',
                        height: '50px',
                        border: '5px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '5px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <div>Έλεγχος νομικής συμμόρφωσης...</div>
                </div>
                <style>{`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}</style>
            </div>
        );
    }

    // Allow access to legal verification page without compliance
    if (location.pathname === '/legal/verify') {
        console.log('[PROTECTED_ROUTE] Access granted to legal verification page');
        return <Outlet />;
    }

    // Check legal compliance for protected routes - just show dashboard and let modal handle
    if (complianceChecked && !isLegallyCompliant) {
        console.log('[PROTECTED_ROUTE] Legal compliance required, modal will handle');
        // Don't block access, let modal handle everything
        // The modal will auto-open based on LegalComplianceContext logic
    }

    console.log('[PROTECTED_ROUTE] Access granted to:', location.pathname);
    return <Outlet />;
});

ProtectedRoute.displayName = 'ProtectedRoute';

export default ProtectedRoute;