import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import setAuthToken from '../utils/setAuthToken';
import useSessionTimeout from '../hooks/useSessionTimeout';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionState, setSessionState] = useState({
    redirectInProgress: false,
    lastTokenCheck: null
  });
  const navigate = useNavigate();

  const refreshTokenFromServer = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const response = await axios.post('http://localhost:3000/api/users/refresh-token', {}, config);
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
  };

  const logout = () => {
    console.log('[AUTH] User logout initiated');
    localStorage.removeItem('token');
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setSessionState({
      redirectInProgress: false,
      lastTokenCheck: null
    });
    navigate('/login');
  };

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

        // Check if token contains old has_accepted_terms field - if so, force logout for new token
        if (decoded.user && 'has_accepted_terms' in decoded.user) {
          console.log('[AUTH] Old token format detected, forcing logout for new token');
          logout();
          return;
        }

        if (decoded.exp * 1000 < Date.now()) {
          console.log('[AUTH] Token expired, logging out');
          logout();
        } else {
          setAuthToken(storedToken);
          setUser(decoded.user);
          setSessionState(prev => ({
            ...prev,
            lastTokenCheck: Date.now()
          }));
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
  }, [navigate]);

  const login = (newToken) => {
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
    
    console.log('[AUTH] Redirecting to /dashboard');
    navigate('/dashboard');
  };


  // Session timeout hook
  const sessionTimeout = useSessionTimeout(token, refreshTokenFromServer, logout);

  const value = {
    token,
    user,
    loading,
    login,
    logout,
    sessionState,
    sessionTimeout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};