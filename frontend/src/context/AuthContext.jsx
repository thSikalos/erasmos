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
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    setAuthToken(null);
    setToken(null);
    setUser(null);
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
        if (decoded.exp * 1000 < Date.now()) { logout(); } 
        else {
          setAuthToken(storedToken);
          setUser(decoded.user);
          if (!decoded.user.has_accepted_terms && window.location.pathname !== '/terms') {
            navigate('/terms');
          }
        }
      } catch (error) { logout(); }
    }
    setLoading(false);
    return () => { axios.interceptors.response.eject(interceptor); };
  }, [navigate]);

  const login = (newToken) => {
    localStorage.setItem('token', newToken);
    setAuthToken(newToken);
    const decodedUser = jwtDecode(newToken).user;
    setUser(decodedUser);
    setToken(newToken);
    if (!decodedUser.has_accepted_terms) { navigate('/terms'); } 
    else { navigate('/dashboard'); }
  };

  const userAcceptedTerms = (newToken) => {
      login(newToken); // Απλά κάνουμε login με το νέο, ενημερωμένο token
  };

  const value = { token, user, loading, login, logout, userAcceptedTerms };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};