import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await axios.post('http://localhost:3000/api/users/login', { email, password });
      login(response.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Παρουσιάστηκε σφάλμα κατά τη σύνδεση');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modern-login-container">
      <style>
        {`
          .modern-login-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
            overflow: hidden;
            padding: 20px;
          }
          
          .modern-login-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            pointer-events: none;
          }
          
          .floating-shapes {
            position: absolute;
            width: 100%;
            height: 100%;
            overflow: hidden;
            pointer-events: none;
          }
          
          .shape {
            position: absolute;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            animation: float 6s ease-in-out infinite;
          }
          
          .shape:nth-child(1) {
            width: 80px;
            height: 80px;
            top: 20%;
            left: 10%;
            animation-delay: 0s;
          }
          
          .shape:nth-child(2) {
            width: 60px;
            height: 60px;
            top: 60%;
            right: 10%;
            animation-delay: 2s;
          }
          
          .shape:nth-child(3) {
            width: 40px;
            height: 40px;
            top: 30%;
            right: 20%;
            animation-delay: 4s;
          }
          
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            33% { transform: translateY(-20px) rotate(120deg); }
            66% { transform: translateY(10px) rotate(240deg); }
          }
          
          .modern-login-form {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(20px);
            border-radius: 25px;
            padding: 50px 40px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.2);
            width: 100%;
            max-width: 450px;
            position: relative;
            overflow: hidden;
            z-index: 10;
          }
          
          .modern-login-form::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
            transform: rotate(45deg);
            animation: shimmer 4s ease-in-out infinite;
          }
          
          @keyframes shimmer {
            0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
            50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
          }
          
          .login-header {
            text-align: center;
            margin-bottom: 40px;
            position: relative;
            z-index: 2;
          }
          
          .app-logo-login {
            font-size: 2.5rem;
            margin-bottom: 10px;
          }
          
          .login-title {
            font-size: 2rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea, #764ba2);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 8px;
            position: relative;
            z-index: 2;
          }
          
          .login-subtitle {
            color: #6b7280;
            font-size: 1rem;
            font-weight: 400;
            margin: 0;
            position: relative;
            z-index: 2;
          }
          
          .modern-login-form form {
            position: relative;
            z-index: 2;
          }
          
          .modern-form-group {
            margin-bottom: 25px;
            position: relative;
          }
          
          .modern-form-group label {
            display: block;
            margin-bottom: 8px;
            color: #374151;
            font-weight: 600;
            font-size: 0.95rem;
            position: relative;
            z-index: 2;
          }
          
          .modern-input {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            font-size: 1rem;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            box-sizing: border-box;
            position: relative;
            z-index: 2;
          }
          
          .modern-input:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            background: rgba(255, 255, 255, 1);
            transform: translateY(-2px);
          }
          
          .modern-input::placeholder {
            color: #9ca3af;
          }
          
          .modern-login-button {
            width: 100%;
            padding: 16px 20px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            overflow: hidden;
            margin-top: 10px;
            z-index: 2;
          }
          
          .modern-login-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: all 0.5s ease;
          }
          
          .modern-login-button:hover::before {
            left: 100%;
          }
          
          .modern-login-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }
          
          .modern-login-button:active {
            transform: translateY(-1px);
          }
          
          .modern-login-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
            transform: none;
          }
          
          .loading-spinner {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
          }
          
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .modern-error-message {
            background: rgba(239, 68, 68, 0.1);
            color: #dc2626;
            padding: 15px 20px;
            border-radius: 12px;
            margin-top: 20px;
            border: 1px solid rgba(239, 68, 68, 0.2);
            font-size: 0.95rem;
            text-align: center;
            position: relative;
            z-index: 2;
            backdrop-filter: blur(10px);
          }
          
          .welcome-message {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            background: rgba(102, 126, 234, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(102, 126, 234, 0.2);
            color: #374151;
            font-size: 0.9rem;
            line-height: 1.5;
            position: relative;
            z-index: 2;
          }
          
          .feature-highlight {
            color: #667eea;
            font-weight: 600;
          }
          
          @media (max-width: 768px) {
            .modern-login-container {
              padding: 15px;
            }
            
            .modern-login-form {
              padding: 40px 30px;
            }
            
            .login-title {
              font-size: 1.8rem;
            }
            
            .modern-input {
              padding: 12px 16px;
            }
            
            .modern-login-button {
              padding: 14px 18px;
              font-size: 1rem;
            }
          }
          
          @media (max-width: 480px) {
            .modern-login-form {
              padding: 30px 25px;
            }
            
            .login-title {
              font-size: 1.6rem;
            }
          }
        `}
      </style>
      
      <div className="floating-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>
      
      <div className="modern-login-form">
        <div className="login-header">
          <div className="app-logo-login">✨</div>
          <h1 className="login-title">Erasmos App</h1>
          <p className="login-subtitle">Σύνδεση στην πλατφόρμα διαχείρισης</p>
        </div>
        
        <form onSubmit={handleLogin}>
          <div className="modern-form-group">
            <label htmlFor="email">📧 Email</label>
            <input 
              id="email"
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="modern-input"
              placeholder="Εισάγετε το email σας"
              required 
              disabled={isLoading}
            />
          </div>
          
          <div className="modern-form-group">
            <label htmlFor="password">🔒 Κωδικός Πρόσβασης</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="modern-input"
              placeholder="Εισάγετε τον κωδικό σας"
              required 
              disabled={isLoading}
            />
          </div>
          
          <button 
            type="submit" 
            className="modern-login-button" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Σύνδεση...
              </>
            ) : (
              '🚀 Σύνδεση'
            )}
          </button>
        </form>
        
        {error && <div className="modern-error-message">❌ {error}</div>}
        
        <div className="welcome-message">
          💼 Καλώς ήρθατε στο <span className="feature-highlight">Erasmos Business Management Platform</span><br />
          🎯 Διαχειριστείτε εύκολα τις αιτήσεις, τους πελάτες και τις αμοιβές σας
        </div>
      </div>
    </div>
  );
};

export default LoginPage;