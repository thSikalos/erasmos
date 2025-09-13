import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Call the backend API
      const response = await axios.post('http://localhost:3000/api/users/register', formData);

      console.log('Registration successful:', response.data);
      setIsSubmitted(true);
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Παρουσιάστηκε σφάλμα κατά την υποβολή. Παρακαλώ δοκιμάστε ξανά.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="modern-register-container">
        <div className="floating-shapes">
          <div className="shape"></div>
          <div className="shape"></div>
          <div className="shape"></div>
        </div>

        <div className="modern-register-card success-card">
          <div className="success-icon">✅</div>
          <h2 className="success-title">Η αίτησή σας εστάλη επιτυχώς!</h2>
          <p className="success-message">
            Σας ευχαριστούμε για το ενδιαφέρον σας! Θα επικοινωνήσουμε μαζί σας σύντομα για να σας ενημερώσουμε για τα επόμενα βήματα.
          </p>
          <div className="success-info">
            <p><strong>Όνομα:</strong> {formData.fullName}</p>
            <p><strong>Email:</strong> {formData.email}</p>
            <p><strong>Τηλέφωνο:</strong> {formData.phone}</p>
          </div>
          <Link to="/login" className="back-to-login-button">
            ← Επιστροφή στο Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="modern-register-container">
      <style>
        {`
          .modern-register-container {
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            position: relative;
            overflow: hidden;
            padding: 20px;
          }

          .modern-register-container::before {
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

          .modern-register-card {
            background: rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(20px);
            border-radius: 20px;
            padding: 40px;
            width: 100%;
            max-width: 500px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
            position: relative;
            z-index: 10;
          }

          .modern-register-card::before {
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

          .register-header {
            text-align: center;
            margin-bottom: 30px;
            position: relative;
            z-index: 2;
          }

          .register-title {
            font-size: 2rem;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 10px;
          }

          .register-subtitle {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1rem;
            line-height: 1.5;
          }

          .register-form {
            position: relative;
            z-index: 2;
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-label {
            display: block;
            margin-bottom: 8px;
            color: rgba(255, 255, 255, 0.9);
            font-weight: 600;
            font-size: 0.95rem;
          }

          .form-input,
          .form-textarea {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid rgba(255, 255, 255, 0.2);
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            font-size: 1rem;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            box-sizing: border-box;
          }

          .form-input::placeholder,
          .form-textarea::placeholder {
            color: rgba(255, 255, 255, 0.6);
          }

          .form-input:focus,
          .form-textarea:focus {
            outline: none;
            border-color: #667eea;
            background: rgba(255, 255, 255, 0.2);
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            transform: translateY(-2px);
          }

          .form-textarea {
            resize: vertical;
            min-height: 100px;
          }

          .submit-button {
            width: 100%;
            padding: 15px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 12px;
            font-size: 1.1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            margin-top: 10px;
          }

          .submit-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .submit-button:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
          }

          .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top: 2px solid white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-right: 10px;
            display: inline-block;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          .error-message {
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

          .back-to-login {
            text-align: center;
            margin-top: 20px;
            position: relative;
            z-index: 2;
          }

          .back-to-login a {
            color: rgba(255, 255, 255, 0.8);
            text-decoration: none;
            font-size: 0.9rem;
            transition: all 0.3s ease;
            padding: 10px;
            border-radius: 8px;
            display: inline-block;
          }

          .back-to-login a:hover {
            color: white;
            background: rgba(255, 255, 255, 0.1);
            transform: translateY(-1px);
          }

          /* Success Styles */
          .success-card {
            text-align: center;
            max-width: 600px;
          }

          .success-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            animation: bounce 1s ease-in-out;
          }

          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }

          .success-title {
            font-size: 1.8rem;
            font-weight: 700;
            color: rgba(255, 255, 255, 0.95);
            margin-bottom: 15px;
            position: relative;
            z-index: 2;
          }

          .success-message {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.1rem;
            line-height: 1.6;
            margin-bottom: 25px;
            position: relative;
            z-index: 2;
          }

          .success-info {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin: 25px 0;
            text-align: left;
            position: relative;
            z-index: 2;
          }

          .success-info p {
            margin: 8px 0;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.95rem;
          }

          .success-info strong {
            color: rgba(255, 255, 255, 1);
          }

          .back-to-login-button {
            display: inline-block;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 1rem;
            transition: all 0.3s ease;
            position: relative;
            z-index: 2;
            margin-top: 20px;
          }

          .back-to-login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
            text-decoration: none;
            color: white;
          }

          @media (max-width: 600px) {
            .modern-register-card {
              padding: 30px 20px;
              margin: 10px;
            }

            .register-title {
              font-size: 1.6rem;
            }

            .register-subtitle {
              font-size: 0.9rem;
            }
          }
        `}
      </style>

      <div className="floating-shapes">
        <div className="shape"></div>
        <div className="shape"></div>
        <div className="shape"></div>
      </div>

      <div className="modern-register-card">
        <div className="register-header">
          <h1 className="register-title">👤 Εγγραφή Νέου Χρήστη</h1>
          <p className="register-subtitle">
            Συμπληρώστε τα στοιχεία σας και θα επικοινωνήσουμε μαζί σας σύντομα!
          </p>
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">📝 Ονοματεπώνυμο</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Εισάγετε το πλήρες όνομά σας"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">📧 Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Εισάγετε το email σας"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">📞 Τηλέφωνο</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="form-input"
              placeholder="Εισάγετε το τηλέφωνό σας"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="message" className="form-label">💬 Μήνυμα (προαιρετικό)</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleInputChange}
              className="form-textarea"
              placeholder="Μπορείτε να μας πείτε περισσότερα για τις ανάγκες σας..."
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="submit-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="loading-spinner"></span>
                Υποβολή...
              </>
            ) : (
              '🚀 Υποβολή Αίτησης'
            )}
          </button>
        </form>

        {error && <div className="error-message">❌ {error}</div>}

        <div className="back-to-login">
          <Link to="/login">← Επιστροφή στη σελίδα σύνδεσης</Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;