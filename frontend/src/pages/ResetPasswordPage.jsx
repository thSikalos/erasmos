import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';
import { getApiUrl } from '../config/api';
import '../App.css';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { showSuccessToast, showErrorToast } = useNotifications();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [isValidToken, setIsValidToken] = useState(true);

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (!tokenFromUrl) {
      setIsValidToken(false);
      setError('Λείπει το token επαναφοράς από το URL');
    } else {
      setToken(tokenFromUrl);
    }
  }, [searchParams]);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Validation
    if (formData.newPassword.length < 6) {
      setError('Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες');
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Οι κωδικοί δεν ταιριάζουν');
      setIsLoading(false);
      return;
    }

    try {
      const response = await axios.post(getApiUrl('users/reset-password'), {
        token: token,
        newPassword: formData.newPassword
      });

      showSuccessToast(
        'Επιτυχία!',
        'Ο κωδικός σας επαναφέρθηκε επιτυχώς. Μπορείτε τώρα να συνδεθείτε'
      );

      // Redirect to login page after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά';
      setError(errorMessage);
      showErrorToast('Σφάλμα', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isValidToken) {
    return (
      <div className="modern-reset-password-container">
        <div className="floating-shapes">
          <div className="shape"></div>
          <div className="shape"></div>
          <div className="shape"></div>
        </div>

        <div className="modern-reset-password-form error-state">
          <div className="reset-password-header">
            <div className="error-icon">❌</div>
            <h1 className="reset-password-title">Άκυρο Link</h1>
            <p className="reset-password-subtitle">Το link επαναφοράς είναι άκυρο ή έχει λήξει</p>
          </div>

          <div className="error-message">
            <p>Το link που χρησιμοποιήσατε είναι άκυρο ή έχει λήξει. Παρακαλώ ζητήστε νέο link επαναφοράς κωδικού.</p>
          </div>

          <div className="reset-password-links">
            <Link to="/forgot-password" className="forgot-password-link">
              🔑 Νέο Link Επαναφοράς
            </Link>
            <Link to="/login" className="back-to-login-link">
              ← Επιστροφή στη Σύνδεση
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-reset-password-container">
      <style>
        {`
          .modern-reset-password-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
            overflow: hidden;
            padding: 20px;
          }

          .modern-reset-password-container::before {
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

          .modern-reset-password-form {
            background: rgba(255, 255, 255, 0.15);
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

          .modern-reset-password-form::before {
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

          .reset-password-header {
            text-align: center;
            margin-bottom: 40px;
            position: relative;
            z-index: 2;
          }

          .error-icon,
          .success-icon {
            font-size: 3rem;
            margin-bottom: 15px;
            display: block;
          }

          .reset-password-title {
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

          .reset-password-subtitle {
            color: #6b7280;
            font-size: 1rem;
            font-weight: 400;
            margin: 0;
            position: relative;
            z-index: 2;
          }

          .modern-reset-password-form form {
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
            background: rgba(255, 255, 255, 0.15);
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

          .password-strength {
            margin-top: 8px;
            font-size: 0.85rem;
            color: #6b7280;
            position: relative;
            z-index: 2;
          }

          .modern-reset-password-button {
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

          .modern-reset-password-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: all 0.5s ease;
          }

          .modern-reset-password-button:hover::before {
            left: 100%;
          }

          .modern-reset-password-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }

          .modern-reset-password-button:active {
            transform: translateY(-1px);
          }

          .modern-reset-password-button:disabled {
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

          .reset-password-links {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: 25px;
            text-align: center;
            position: relative;
            z-index: 2;
          }

          .back-to-login-link,
          .forgot-password-link {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            font-size: 0.9rem;
            padding: 12px 20px;
            border-radius: 10px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
          }

          .back-to-login-link:hover,
          .forgot-password-link:hover {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(255, 255, 255, 0.1);
          }

          .forgot-password-link {
            background: rgba(102, 126, 234, 0.2);
            border: 1px solid rgba(102, 126, 234, 0.3);
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
          }

          .forgot-password-link:hover {
            background: rgba(102, 126, 234, 0.3);
            border-color: rgba(102, 126, 234, 0.5);
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
          }

          .error-message {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.2);
            padding: 20px;
            border-radius: 12px;
            margin: 25px 0;
            position: relative;
            z-index: 2;
            color: #374151;
            line-height: 1.6;
            text-align: center;
          }

          .error-state {
            text-align: center;
          }

          @media (max-width: 768px) {
            .modern-reset-password-container {
              padding: 15px;
            }

            .modern-reset-password-form {
              padding: 40px 30px;
            }

            .reset-password-title {
              font-size: 1.8rem;
            }

            .modern-input {
              padding: 12px 16px;
            }

            .modern-reset-password-button {
              padding: 14px 18px;
              font-size: 1rem;
            }
          }

          @media (max-width: 480px) {
            .modern-reset-password-form {
              padding: 30px 25px;
            }

            .reset-password-title {
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

      <div className="modern-reset-password-form">
        <div className="reset-password-header">
          <div className="success-icon">🔐</div>
          <h1 className="reset-password-title">Νέος Κωδικός</h1>
          <p className="reset-password-subtitle">Εισάγετε τον νέο σας κωδικό πρόσβασης</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modern-form-group">
            <label htmlFor="newPassword">🔒 Νέος Κωδικός</label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleInputChange}
              className="modern-input"
              placeholder="Εισάγετε τον νέο κωδικό"
              required
              disabled={isLoading}
            />
            <div className="password-strength">
              Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες
            </div>
          </div>

          <div className="modern-form-group">
            <label htmlFor="confirmPassword">🔒 Επιβεβαίωση Κωδικού</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className="modern-input"
              placeholder="Επιβεβαιώστε τον νέο κωδικό"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="modern-reset-password-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Επαναφορά...
              </>
            ) : (
              '✅ Επαναφορά Κωδικού'
            )}
          </button>
        </form>

        {error && <div className="modern-error-message">❌ {error}</div>}

        <div className="reset-password-links">
          <Link to="/login" className="back-to-login-link">
            ← Επιστροφή στη Σύνδεση
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;