import { useState, useEffect, useCallback, useRef } from 'react';
import { jwtDecode } from 'jwt-decode';

const useSessionTimeout = (token, onTokenRefresh, onLogout) => {
    const [sessionWarning, setSessionWarning] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const warningTimerRef = useRef(null);
    const logoutTimerRef = useRef(null);
    const refreshTimerRef = useRef(null);

    const WARNING_TIME = 5 * 60 * 1000; // 5 λεπτά σε milliseconds
    const REFRESH_TIME = 2 * 60 * 1000; // 2 λεπτά πριν τη λήξη για auto-refresh

    const clearAllTimers = useCallback(() => {
        if (warningTimerRef.current) {
            clearTimeout(warningTimerRef.current);
            warningTimerRef.current = null;
        }
        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
        if (refreshTimerRef.current) {
            clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
    }, []);

    const refreshToken = useCallback(async () => {
        try {
            console.log('[SESSION] Attempting token refresh...');
            const success = await onTokenRefresh();
            if (success) {
                console.log('[SESSION] Token refreshed successfully');
                setSessionWarning(null);
                return true;
            } else {
                console.log('[SESSION] Token refresh failed, logging out');
                onLogout();
                return false;
            }
        } catch (error) {
            console.error('[SESSION] Token refresh error:', error);
            onLogout();
            return false;
        }
    }, [onTokenRefresh, onLogout]);

    const handleRefreshClick = useCallback(async () => {
        const success = await refreshToken();
        if (success) {
            setSessionWarning(null);
        }
    }, [refreshToken]);

    const dismissWarning = useCallback(() => {
        setSessionWarning(null);
        clearAllTimers();
    }, [clearAllTimers]);

    const setupTimers = useCallback((tokenExpiration) => {
        clearAllTimers();

        const now = Date.now();
        const timeToExpiry = tokenExpiration - now;
        const timeToWarning = timeToExpiry - WARNING_TIME;
        const timeToAutoRefresh = timeToExpiry - REFRESH_TIME;

        console.log('[SESSION] Setting up timers:', {
            timeToExpiry: Math.floor(timeToExpiry / 1000 / 60),
            timeToWarning: Math.floor(timeToWarning / 1000 / 60),
            timeToAutoRefresh: Math.floor(timeToAutoRefresh / 1000 / 60),
            autoRefreshEnabled: autoRefresh
        });

        // Auto-refresh timer (if enabled)
        if (autoRefresh && timeToAutoRefresh > 0) {
            refreshTimerRef.current = setTimeout(() => {
                console.log('[SESSION] Auto-refresh triggered');
                refreshToken();
            }, timeToAutoRefresh);
        }

        // Warning timer
        if (timeToWarning > 0) {
            warningTimerRef.current = setTimeout(() => {
                const remainingTime = Math.floor((tokenExpiration - Date.now()) / 1000);

                if (remainingTime > 0) {
                    console.log('[SESSION] Showing session warning, remaining time:', remainingTime);
                    setSessionWarning({
                        remainingTime,
                        onRefresh: handleRefreshClick,
                        onDismiss: dismissWarning,
                        autoRefresh,
                        onAutoRefreshToggle: () => setAutoRefresh(!autoRefresh)
                    });

                    // Set logout timer for when token actually expires
                    logoutTimerRef.current = setTimeout(() => {
                        console.log('[SESSION] Token expired, logging out');
                        onLogout();
                    }, remainingTime * 1000);
                }
            }, timeToWarning);
        } else if (timeToExpiry > 0) {
            // If we're already within warning time, show warning immediately
            const remainingTime = Math.floor(timeToExpiry / 1000);
            console.log('[SESSION] Already within warning time, showing immediate warning');
            setSessionWarning({
                remainingTime,
                onRefresh: handleRefreshClick,
                onDismiss: dismissWarning,
                autoRefresh,
                onAutoRefreshToggle: () => setAutoRefresh(!autoRefresh)
            });

            logoutTimerRef.current = setTimeout(() => {
                console.log('[SESSION] Token expired, logging out');
                onLogout();
            }, timeToExpiry);
        } else {
            // Token already expired
            console.log('[SESSION] Token already expired');
            onLogout();
        }
    }, [autoRefresh, handleRefreshClick, dismissWarning, refreshToken, onLogout]);

    // Initialize timers when token changes
    useEffect(() => {
        if (!token) {
            clearAllTimers();
            setSessionWarning(null);
            return;
        }

        try {
            const decoded = jwtDecode(token);
            const tokenExpiration = decoded.exp * 1000; // Convert to milliseconds

            console.log('[SESSION] Token decoded:', {
                exp: new Date(tokenExpiration).toLocaleString(),
                currentTime: new Date().toLocaleString()
            });

            if (tokenExpiration <= Date.now()) {
                console.log('[SESSION] Token already expired on setup');
                onLogout();
                return;
            }

            setupTimers(tokenExpiration);
        } catch (error) {
            console.error('[SESSION] Error decoding token:', error);
            onLogout();
        }

        return clearAllTimers;
    }, [token, setupTimers, clearAllTimers, onLogout]);

    // Update timers when autoRefresh setting changes
    useEffect(() => {
        if (token && sessionWarning) {
            try {
                const decoded = jwtDecode(token);
                const tokenExpiration = decoded.exp * 1000;
                setupTimers(tokenExpiration);
            } catch (error) {
                console.error('[SESSION] Error updating timers:', error);
            }
        }
    }, [autoRefresh, token, setupTimers, sessionWarning]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearAllTimers();
        };
    }, [clearAllTimers]);

    return {
        sessionWarning,
        autoRefresh,
        setAutoRefresh,
        dismissWarning,
        refreshToken: handleRefreshClick
    };
};

export default useSessionTimeout;