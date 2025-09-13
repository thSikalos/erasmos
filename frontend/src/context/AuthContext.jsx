import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import setAuthToken from '../utils/setAuthToken';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionState, setSessionState] = useState({
    termsChecked: false,
    redirectInProgress: false,
    lastTokenCheck: null
  });
  const navigate = useNavigate();

  const logout = () => {
    console.log('[AUTH] User logout initiated');
    localStorage.removeItem('token');
    setAuthToken(null);
    setToken(null);
    setUser(null);
    setSessionState({
      termsChecked: false,
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
        if (error.response?.data?.errorCode === 'TERMS_NOT_ACCEPTED' && window.location.pathname !== '/terms') { navigate('/terms'); }
        return Promise.reject(error);
      }
    );
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        console.log('[AUTH] Token decoded, user:', decoded.user?.email, 'has_accepted_terms:', decoded.user?.has_accepted_terms);
        
        if (decoded.exp * 1000 < Date.now()) { 
          console.log('[AUTH] Token expired, logging out');
          logout(); 
        } else {
          setAuthToken(storedToken);
          setUser(decoded.user);
          setSessionState(prev => ({
            ...prev,
            termsChecked: true,
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
    console.log('[AUTH] New user login:', decodedUser?.email, 'has_accepted_terms:', decodedUser?.has_accepted_terms);
    
    setUser(decodedUser);
    setToken(newToken);
    setSessionState({
      termsChecked: true,
      redirectInProgress: false,
      lastTokenCheck: Date.now()
    });
    
    if (!decodedUser.has_accepted_terms) { 
      console.log('[AUTH] User needs to accept terms, redirecting to /terms');
      navigate('/terms'); 
    } else { 
      console.log('[AUTH] User has accepted terms, redirecting to /dashboard');
      navigate('/dashboard'); 
    }
  };

  const userAcceptedTerms = (newToken) => {
      login(newToken); // Απλά κάνουμε login με το νέο, ενημερωμένο token
  };

  const value = { token, user, loading, login, logout, userAcceptedTerms, sessionState };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};