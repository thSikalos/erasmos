import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import setAuthToken from '../utils/setAuthToken';
import useSessionTimeout from '../hooks/useSessionTimeout';
import { apiUrl } from '../utils/api';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [legalComplianceStatus, setLegalComplianceStatus] = useState(null);
  const [legalLoading, setLegalLoading] = useState(false);
  const [sessionState, setSessionState] = useState({
    redirectInProgress: false,
    lastTokenCheck: null
  });
  const navigate = useNavigate();

  const refreshTokenFromServer = useCallback(async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post(apiUrl('/api/users/refresh-token'), {}, config);
      const newToken = response.data.token;

      // Update localStorage and state
      localStorage.setItem('token', newToken);
      setAuthToken(newToken);
      setToken(newToken);

      // Update user data from new token
      const decoded = jwtDecode(newToken);
      setUser(decoded.user);

      console.log('[AUTH] Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('[AUTH] Token refresh failed:', error);
      return false;
    }
  }, [token]);

  // Check legal compliance status
  const checkLegalCompliance = useCallback(async (forceCheck = false) => {
    if (!token || !user) {
      setLegalComplianceStatus({ complianceStatus: 'not_started', requiresAction: true });
      return false;
    }

    // Skip if we already have a recent status and not forcing check
    if (!forceCheck && legalComplianceStatus && legalComplianceStatus.lastChecked &&
        (Date.now() - legalComplianceStatus.lastChecked < 60000)) { // 1 minute cache
      return legalComplianceStatus.complianceStatus === 'compliant';
    }

    try {
      setLegalLoading(true);
      console.log('[AUTH] Checking legal compliance status...');

      const response = await axios.get(apiUrl('/api/legal/status'), {
        headers: { Authorization: `Bearer ${token}` }
      });

      const statusData = {
        ...response.data,
        lastChecked: Date.now()
      };

      setLegalComplianceStatus(statusData);
      console.log('[AUTH] Legal compliance status:', statusData.complianceStatus);

      return statusData.complianceStatus === 'compliant';
    } catch (error) {
      console.error('[AUTH] Legal compliance check failed:', error);
      setLegalComplianceStatus({
        complianceStatus: 'not_started',
        requiresAction: true,
        lastChecked: Date.now()
      });
      return false;
    } finally {
      setLegalLoading(false);
    }
  }, [token, user, legalComplianceStatus]);

  const logout = useCallback(() => {
    console.log('[AUTH] User logout initiated');
    localStorage.removeItem('token');
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setLegalComplianceStatus(null);
    setSessionState({
      redirectInProgress: false,
      lastTokenCheck: null
    });
    // Use window.location for more reliable logout navigation
    window.location.href = '/login';
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401 && window.location.pathname !== '/login') { logout(); }
        return Promise.reject(error);
      }
    );
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        console.log('[AUTH] Token decoded, user:', decoded.user?.email);

        // Removed old token format check to fix login loop issue

        if (decoded.exp * 1000 < Date.now()) {
          console.log('[AUTH] Token expired, logging out');
          logout();
        } else {
          setAuthToken(storedToken);
          setUser(decoded.user);
          setSessionState({
            redirectInProgress: false,
            lastTokenCheck: Date.now()
          });
          console.log('[AUTH] User authenticated successfully');

        }
      } catch (error) {
        console.log('[AUTH] Token decode error:', error);
        logout();
      }
    } else {
      console.log('[AUTH] No token found in localStorage');
    }
    setLoading(false);
    return () => { axios.interceptors.response.eject(interceptor); };
  }, [logout]); // Remove checkLegalCompliance dependency to avoid infinite loop

  // Separate useEffect to check legal compliance when user is loaded
  useEffect(() => {
    if (token && user && !loading && !legalComplianceStatus) {
      console.log('[AUTH] User and token available, checking legal compliance...');
      checkLegalCompliance(true);
    }
  }, [token, user, loading, legalComplianceStatus, checkLegalCompliance]);

  const login = useCallback(async (newToken) => {
    console.log('[AUTH] Login initiated with new token');
    localStorage.setItem('token', newToken);
    setAuthToken(newToken);
    const decodedUser = jwtDecode(newToken).user;
    console.log('[AUTH] New user login:', decodedUser?.email);

    setUser(decodedUser);
    setToken(newToken);
    setSessionState({
      redirectInProgress: false,
      lastTokenCheck: Date.now()
    });

    // Check legal compliance after login
    try {
      setLegalLoading(true);
      const response = await axios.get(apiUrl('/api/legal/status'), {
        headers: { Authorization: `Bearer ${newToken}` }
      });

      const statusData = {
        ...response.data,
        lastChecked: Date.now()
      };

      setLegalComplianceStatus(statusData);
      console.log('[AUTH] Post-login legal compliance status:', statusData.complianceStatus);

      // Navigate based on compliance status
      if (statusData.complianceStatus === 'compliant') {
        console.log('[AUTH] Legal compliance OK, redirecting to /dashboard');
        navigate('/dashboard');
      } else {
        console.log('[AUTH] Legal compliance required, staying on current page for modal trigger');
        // Don't navigate - let the ProtectedRoute handle the legal compliance flow
        navigate('/dashboard'); // Will be intercepted by ProtectedRoute
      }
    } catch (error) {
      console.error('[AUTH] Post-login legal compliance check failed:', error);
      // Default to dashboard, ProtectedRoute will handle compliance
      navigate('/dashboard');
    } finally {
      setLegalLoading(false);
    }
  }, [navigate]);


  // Session timeout hook
  const sessionTimeout = useSessionTimeout(token, refreshTokenFromServer, logout);

  const value = useMemo(() => ({
    token,
    user,
    loading,
    login,
    logout,
    sessionState,
    sessionTimeout,
    // Legal compliance state
    legalComplianceStatus,
    legalLoading,
    checkLegalCompliance,
    isLegallyCompliant: legalComplianceStatus?.complianceStatus === 'compliant'
  }), [token, user, loading, login, logout, sessionState, sessionTimeout, legalComplianceStatus, legalLoading, checkLegalCompliance]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};