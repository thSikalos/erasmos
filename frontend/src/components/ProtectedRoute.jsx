import React, { useContext, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = () => {
    const { token, user, sessionState } = useContext(AuthContext);
    const location = useLocation();
    const redirectLogRef = useRef(new Set());

    useEffect(() => {
        console.log('[PROTECTED_ROUTE] Route check at:', location.pathname, {
            hasToken: !!token,
            hasUser: !!user,
            userEmail: user?.email,
            hasAcceptedTerms: user?.has_accepted_terms,
            sessionState
        });
    }, [location.pathname, token, user, sessionState]);

    if (!token) {
        console.log('[PROTECTED_ROUTE] No token, redirecting to login');
        return <Navigate to="/login" replace />;
    }

    // Enterprise-level terms acceptance enforcement with session tracking
    if (user && !user.has_accepted_terms && location.pathname !== '/terms') {
        const redirectKey = `${user.id}-${location.pathname}`;
        if (!redirectLogRef.current.has(redirectKey)) {
            redirectLogRef.current.add(redirectKey);
            console.log('[PROTECTED_ROUTE] User has not accepted terms, redirecting to /terms', {
                userId: user.id,
                userEmail: user.email,
                attemptedPath: location.pathname,
                sessionState
            });
            
            // Audit log for compliance
            console.log('[AUDIT] Terms acceptance required for user access', {
                userId: user.id,
                userEmail: user.email,
                attemptedResource: location.pathname,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                sessionId: sessionState.lastTokenCheck
            });
        }
        
        return <Navigate to="/terms" replace />;
    }

    // Clear redirect log when terms are accepted
    if (user && user.has_accepted_terms) {
        redirectLogRef.current.clear();
    }

    console.log('[PROTECTED_ROUTE] Access granted to:', location.pathname);
    return <Outlet />;
};

export default ProtectedRoute;