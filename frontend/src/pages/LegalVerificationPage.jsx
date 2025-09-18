import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useLegalCompliance } from '../context/LegalComplianceContext';

const LegalVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmailAcceptance } = useLegalCompliance();

  const [verificationState, setVerificationState] = useState('verifying'); // verifying, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [verificationDetails, setVerificationDetails] = useState(null);

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setVerificationState('error');
      setErrorMessage('Λείπει το token επιβεβαίωσης από το URL');
      return;
    }

    performVerification();
  }, [token]);

  const performVerification = async () => {
    try {
      setVerificationState('verifying');

      const result = await verifyEmailAcceptance(token);

      setVerificationDetails(result);
      setVerificationState('success');

      // Auto-redirect after 5 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 5000);

    } catch (error) {
      console.error('Verification failed:', error);
      setVerificationState('error');
      setErrorMessage(error.message || 'Αποτυχία επιβεβαίωσης email');
    }
  };

  const retryVerification = () => {
    performVerification();
  };

  const goToDashboard = () => {
    navigate('/dashboard');
  };

  const goToHome = () => {
    navigate('/');
  };

  if (verificationState === 'verifying') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.loadingContainer}>
            <div style={styles.spinner}></div>
            <h2 style={styles.title}>🔍 Επιβεβαίωση σε εξέλιξη...</h2>
            <p style={styles.description}>
              Παρακαλούμε περιμένετε ενώ επιβεβαιώνουμε την νομική σας αποδοχή.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (verificationState === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successContainer}>
            <div style={styles.successIcon}>✅</div>
            <h2 style={styles.successTitle}>Επιτυχής Επιβεβαίωση!</h2>
            <p style={styles.successDescription}>
              Η νομική σας αποδοχή έχει επιβεβαιωθεί επιτυχώς μέσω email.
            </p>

            {verificationDetails && (
              <div style={styles.detailsBox}>
                <h3 style={styles.detailsTitle}>📋 Στοιχεία Επιβεβαίωσης</h3>
                <div style={styles.detailItem}>
                  <strong>ID Αποδοχής:</strong> {verificationDetails.acceptanceId}
                </div>
                <div style={styles.detailItem}>
                  <strong>Χρόνος Επιβεβαίωσης:</strong> {new Date(verificationDetails.verifiedAt).toLocaleString('el-GR')}
                </div>
                <div style={styles.detailItem}>
                  <strong>Κατάσταση:</strong> <span style={styles.statusVerified}>✅ Επιβεβαιωμένο</span>
                </div>
              </div>
            )}

            <div style={styles.legalNotice}>
              <h4 style={styles.legalNoticeTitle}>⚖️ Νομικές Πληροφορίες</h4>
              <ul style={styles.legalList}>
                <li>Η επιβεβαίωση αυτή καταγράφηκε στο σύστημα audit trail</li>
                <li>Η νομική σας αποδοχή είναι πλέον ισχυρή και δεσμευτική</li>
                <li>Μπορείτε να χρησιμοποιήσετε πλήρως την πλατφόρμα</li>
                <li>Το email επιβεβαίωσης αποτελεί νομικό αποδεικτικό στοιχείο</li>
              </ul>
            </div>

            <div style={styles.buttonContainer}>
              <button onClick={goToDashboard} style={styles.primaryButton}>
                🏠 Μετάβαση στο Dashboard
              </button>
              <p style={styles.autoRedirectText}>
                Αυτόματη μετάβαση σε 5 δευτερόλεπτα...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (verificationState === 'error') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.errorContainer}>
            <div style={styles.errorIcon}>❌</div>
            <h2 style={styles.errorTitle}>Αποτυχία Επιβεβαίωσης</h2>
            <p style={styles.errorDescription}>
              Δεν ήταν δυνατή η επιβεβαίωση της νομικής σας αποδοχής.
            </p>

            <div style={styles.errorBox}>
              <h3 style={styles.errorBoxTitle}>🚨 Λεπτομέρειες Σφάλματος</h3>
              <p style={styles.errorMessage}>{errorMessage}</p>
            </div>

            <div style={styles.troubleshootingBox}>
              <h4 style={styles.troubleshootingTitle}>🔧 Πιθανά Αίτια:</h4>
              <ul style={styles.troubleshootingList}>
                <li>Το token επιβεβαίωσης έχει λήξει (24 ώρες)</li>
                <li>Το token έχει ήδη χρησιμοποιηθεί</li>
                <li>Μη έγκυρος σύνδεσμος επιβεβαίωσης</li>
                <li>Τεχνικό πρόβλημα στο σύστημα</li>
              </ul>
            </div>

            <div style={styles.solutionsBox}>
              <h4 style={styles.solutionsTitle}>💡 Προτεινόμενες Λύσεις:</h4>
              <ul style={styles.solutionsList}>
                <li>Ελέγξτε αν έχετε κλικάρει σε παλαιότερο email</li>
                <li>Αναζητήστε νεότερο email επιβεβαίωσης</li>
                <li>Επικοινωνήστε με την υποστήριξη για νέο token</li>
                <li>Δοκιμάστε την επιβεβαίωση ξανά</li>
              </ul>
            </div>

            <div style={styles.buttonContainer}>
              <button onClick={retryVerification} style={styles.retryButton}>
                🔄 Δοκιμή Ξανά
              </button>
              <button onClick={goToHome} style={styles.secondaryButton}>
                🏠 Επιστροφή στην Αρχική
              </button>
            </div>

            <div style={styles.supportBox}>
              <h4 style={styles.supportTitle}>📞 Χρειάζεστε Βοήθεια;</h4>
              <p style={styles.supportText}>
                Επικοινωνήστε με την ομάδα υποστήριξης στο:{' '}
                <a href="mailto:support@erasmos.gr" style={styles.supportLink}>
                  support@erasmos.gr
                </a>
              </p>
              <p style={styles.supportText}>
                Συμπεριλάβετε στο email σας τον παρακάτω κωδικό αναφοράς:<br/>
                <code style={styles.referenceCode}>{token ? token.substring(0, 16) + '...' : 'N/A'}</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    width: '100%',
    overflow: 'hidden'
  },
  loadingContainer: {
    padding: '60px 40px',
    textAlign: 'center'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #10b981',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 30px'
  },
  title: {
    color: '#1f2937',
    fontSize: '1.8rem',
    fontWeight: '600',
    margin: '0 0 15px 0'
  },
  description: {
    color: '#6b7280',
    fontSize: '1.1rem',
    lineHeight: '1.6',
    margin: '0'
  },
  successContainer: {
    padding: '60px 40px',
    textAlign: 'center'
  },
  successIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },
  successTitle: {
    color: '#065f46',
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 15px 0'
  },
  successDescription: {
    color: '#047857',
    fontSize: '1.2rem',
    lineHeight: '1.6',
    margin: '0 0 30px 0'
  },
  detailsBox: {
    background: '#f0fdf4',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '20px',
    margin: '30px 0',
    textAlign: 'left'
  },
  detailsTitle: {
    color: '#065f46',
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: '0 0 15px 0'
  },
  detailItem: {
    color: '#047857',
    fontSize: '1rem',
    margin: '8px 0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  statusVerified: {
    color: '#065f46',
    fontWeight: '600'
  },
  legalNotice: {
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
    textAlign: 'left'
  },
  legalNoticeTitle: {
    color: '#92400e',
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '0 0 10px 0'
  },
  legalList: {
    color: '#78350f',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    margin: '0',
    paddingLeft: '20px'
  },
  buttonContainer: {
    marginTop: '30px'
  },
  primaryButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '15px 30px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.3s ease',
    marginBottom: '15px'
  },
  autoRedirectText: {
    color: '#6b7280',
    fontSize: '0.9rem',
    margin: '10px 0 0 0',
    fontStyle: 'italic'
  },
  errorContainer: {
    padding: '60px 40px',
    textAlign: 'center'
  },
  errorIcon: {
    fontSize: '4rem',
    marginBottom: '20px'
  },
  errorTitle: {
    color: '#dc2626',
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 15px 0'
  },
  errorDescription: {
    color: '#ef4444',
    fontSize: '1.2rem',
    lineHeight: '1.6',
    margin: '0 0 30px 0'
  },
  errorBox: {
    background: '#fef2f2',
    border: '2px solid #ef4444',
    borderRadius: '8px',
    padding: '20px',
    margin: '20px 0',
    textAlign: 'left'
  },
  errorBoxTitle: {
    color: '#dc2626',
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '0 0 10px 0'
  },
  errorMessage: {
    color: '#991b1b',
    fontSize: '1rem',
    margin: '0',
    fontFamily: 'monospace',
    background: '#fee2e2',
    padding: '10px',
    borderRadius: '4px'
  },
  troubleshootingBox: {
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    padding: '15px',
    margin: '15px 0',
    textAlign: 'left'
  },
  troubleshootingTitle: {
    color: '#374151',
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 10px 0'
  },
  troubleshootingList: {
    color: '#4b5563',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: '0',
    paddingLeft: '20px'
  },
  solutionsBox: {
    background: '#f0f9ff',
    border: '1px solid #0ea5e9',
    borderRadius: '8px',
    padding: '15px',
    margin: '15px 0',
    textAlign: 'left'
  },
  solutionsTitle: {
    color: '#0c4a6e',
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 10px 0'
  },
  solutionsList: {
    color: '#075985',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: '0',
    paddingLeft: '20px'
  },
  retryButton: {
    background: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginRight: '15px',
    marginBottom: '10px'
  },
  secondaryButton: {
    background: '#6b7280',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '12px 24px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginBottom: '10px'
  },
  supportBox: {
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '20px',
    margin: '25px 0 0 0',
    textAlign: 'left'
  },
  supportTitle: {
    color: '#475569',
    fontSize: '1rem',
    fontWeight: '600',
    margin: '0 0 10px 0'
  },
  supportText: {
    color: '#64748b',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    margin: '5px 0'
  },
  supportLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontWeight: '600'
  },
  referenceCode: {
    background: '#e2e8f0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontFamily: 'monospace',
    color: '#475569'
  }
};

// Add spinner animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default LegalVerificationPage;