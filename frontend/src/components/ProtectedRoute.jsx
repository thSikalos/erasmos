import React, { useContext, useEffect, useRef } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = React.memo(() => {
    const { token, user, sessionState } = useContext(AuthContext);
    const location = useLocation();
    const redirectLogRef = useRef(new Set());

    useEffect(() => {
        console.log('[PROTECTED_ROUTE] Route check at:', location.pathname, {
            hasToken: !!token,
            hasUser: !!user,
            userEmail: user?.email,
            sessionState
        });
    }, [location.pathname, token, user, sessionState]);

    if (!token) {
        console.log('[PROTECTED_ROUTE] No token, redirecting to login');
        return <Navigate to="/login" replace />;
    }


    console.log('[PROTECTED_ROUTE] Access granted to:', location.pathname);
    return <Outlet />;
});

export default ProtectedRoute;