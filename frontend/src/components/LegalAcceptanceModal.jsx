import React, { useState, useEffect, useContext } from 'react';
import { useLegalCompliance } from '../context/LegalComplianceContext';
import { AuthContext } from '../context/AuthContext';
import UserComplianceDeclarations from './UserComplianceDeclarations';

const LegalAcceptanceModal = () => {
  const {
    showLegalModal,
    setShowLegalModal,
    completeLegalAcceptance,
    verifyCodeAcceptance,
    resendVerificationEmail,
    loading,
    legalStatus
  } = useLegalCompliance();
  const { logout, legalComplianceStatus, checkLegalCompliance: authCheckCompliance } = useContext(AuthContext);
  const [currentStep, setCurrentStep] = useState(1);
  const [acceptances, setAcceptances] = useState({
    termsOfService: false,
    dataProcessingAgreement: false,
    privacyPolicy: false,
    userDeclarations: false
  });
  const [declarations, setDeclarations] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  // Reset state when modal opens (but preserve step 5 state)
  useEffect(() => {
    if (showLegalModal) {
      // Check if we need to go directly to email verification
      if (legalComplianceStatus?.complianceStatus === 'pending_email_verification') {
        console.log('[MODAL] Going directly to Step 5 for email verification');
        setCurrentStep(5);
        setEmailSent(true);
        // Set acceptances as completed since user already went through them
        setAcceptances({
          termsOfService: true,
          dataProcessingAgreement: true,
          privacyPolicy: true,
          userDeclarations: true
        });
      } else if (!emailSent && currentStep !== 5) {
        // Normal reset for new users
        setCurrentStep(1);
        setAcceptances({
          termsOfService: false,
          dataProcessingAgreement: false,
          privacyPolicy: false,
          userDeclarations: false
        });
        setDeclarations({});
      }
    }
  }, [showLegalModal, emailSent]);

  if (!showLegalModal) return null;

  const handleStepComplete = (stepAcceptances) => {
    setAcceptances(prev => ({ ...prev, ...stepAcceptances }));

    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleDeclarationsChange = (newDeclarations) => {
    setDeclarations(newDeclarations);
    const allDeclarationsAccepted = Object.values(newDeclarations).every(Boolean);
    setAcceptances(prev => ({ ...prev, userDeclarations: allDeclarationsAccepted }));
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: return acceptances.termsOfService;
      case 2: return acceptances.dataProcessingAgreement;
      case 3: return acceptances.privacyPolicy;
      case 4: return acceptances.userDeclarations;
      default: return false;
    }
  };

  const allRequirementsCompleted = () => {
    return Object.values(acceptances).every(Boolean);
  };

  const handleFinalSubmit = async () => {
    if (!allRequirementsCompleted()) return;

    setIsSubmitting(true);
    try {
      console.log('[MODAL] Submitting legal acceptance...');
      const result = await completeLegalAcceptance({
        ...acceptances,
        declarations
      });

      console.log('[MODAL] Legal acceptance result:', result);

      // After successful submission, move to email verification step
      if (result && result.verificationCode) {
        console.log('[MODAL] Moving to Step 5 for email verification');
        setEmailSent(true);
        setCurrentStep(5);
      } else {
        console.warn('[MODAL] No verificationCode in result, cannot proceed to Step 5');
      }
    } catch (error) {
      console.error('Error completing legal acceptance:', error);
      alert('Σφάλμα κατά την αποθήκευση. Παρακαλούμε δοκιμάστε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCodeVerification = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setVerificationError('Παρακαλούμε εισάγετε έναν έγκυρο 6-ψήφιο κωδικό');
      return;
    }

    setIsVerifyingCode(true);
    setVerificationError('');

    try {
      console.log('[MODAL] Starting email verification with code:', verificationCode);

      await verifyCodeAcceptance(verificationCode);

      console.log('[MODAL] Email verification successful');

      // Close modal immediately
      setShowLegalModal(false);

      // Reset modal state to prevent re-opening
      setCurrentStep(1);
      setEmailSent(false);
      setVerificationCode('');
      setVerificationError('');

      // Force a legal compliance re-check to update AuthContext
      if (authCheckCompliance) {
        console.log('[MODAL] Forcing legal compliance re-check...');
        await authCheckCompliance();
      }

      // Navigate to dashboard after a brief delay
      setTimeout(() => {
        console.log('[MODAL] Navigating to dashboard');
        window.location.href = '/dashboard';
      }, 100);

    } catch (error) {
      console.error('[MODAL] Error verifying code:', error);
      setVerificationError(error.message || 'Μη έγκυρος κωδικός επιβεβαίωσης');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleResendEmail = async () => {
    try {
      await resendVerificationEmail();
      alert('Το email επιβεβαίωσης στάλθηκε ξανά!');
    } catch (error) {
      console.error('Error resending email:', error);
      alert('Σφάλμα κατά την αποστολή email. Παρακαλούμε δοκιμάστε ξανά.');
    }
  };

  const steps = [
    { number: 1, title: 'Όροι Χρήσης', key: 'termsOfService' },
    { number: 2, title: 'Συμφωνία Επεξεργασίας', key: 'dataProcessingAgreement' },
    { number: 3, title: 'Πολιτική Απορρήτου', key: 'privacyPolicy' },
    { number: 4, title: 'Δηλώσεις Συμμόρφωσης', key: 'userDeclarations' },
    { number: 5, title: 'Επιβεβαίωση Email', key: 'emailVerification' }
  ];

  return (
    <div className="legal-modal-overlay">
      <style>
        {`
          .legal-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(4px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
          }

          .legal-modal {
            background: white;
            border-radius: 20px;
            max-width: 900px;
            width: 100%;
            max-height: 95vh;
            overflow: hidden;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
          }

          .legal-modal-header {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 30px;
            text-align: center;
            position: relative;
          }

          .modal-button.logout {
            background: #dc2626;
            color: white;
          }

          .modal-button.logout:hover:not(:disabled) {
            background: #b91c1c;
            transform: translateY(-1px);
          }

          .legal-modal-title {
            font-size: 2rem;
            font-weight: 700;
            margin: 0 0 8px 0;
          }

          .legal-modal-subtitle {
            font-size: 1rem;
            opacity: 0.9;
            margin: 0;
          }

          .step-indicator {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-top: 20px;
          }

          .step-dot {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            transition: all 0.3s ease;
          }

          .step-dot.active {
            background: white;
            transform: scale(1.2);
          }

          .step-dot.completed {
            background: #10b981;
          }

          .legal-modal-content {
            flex: 1;
            overflow-y: auto;
            padding: 0;
          }

          .step-content {
            padding: 40px;
            min-height: 500px;
          }

          .step-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 20px 0;
            text-align: center;
          }

          .document-container {
            background: #f9fafb;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 30px;
            border: 1px solid #e5e7eb;
            max-height: 400px;
            overflow-y: auto;
          }

          .document-content {
            line-height: 1.6;
            color: #374151;
          }

          .document-content h3 {
            color: #1f2937;
            font-weight: 600;
            margin: 20px 0 10px 0;
          }

          .document-content ul {
            padding-left: 20px;
            margin: 10px 0;
          }

          .document-content li {
            margin: 5px 0;
          }

          .acceptance-area {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
          }

          .acceptance-area.accepted {
            border-color: #10b981;
            background: #f0fdf4;
          }

          .acceptance-checkbox-container {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .acceptance-checkbox {
            width: 20px;
            height: 20px;
            margin-top: 2px;
            cursor: pointer;
            accent-color: #10b981;
          }

          .acceptance-text {
            flex: 1;
            font-size: 0.95rem;
            line-height: 1.5;
            color: #374151;
          }

          .acceptance-text strong {
            color: #1f2937;
          }

          .legal-modal-footer {
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
          }

          .step-info {
            font-size: 0.9rem;
            color: #6b7280;
          }

          .modal-actions {
            display: flex;
            gap: 12px;
          }

          .modal-button {
            padding: 12px 24px;
            border-radius: 8px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 0.95rem;
          }

          .modal-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .modal-button.secondary {
            background: #e5e7eb;
            color: #374151;
          }

          .modal-button.secondary:hover:not(:disabled) {
            background: #d1d5db;
          }

          .modal-button.primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
          }

          .modal-button.primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #5a67d8, #6b46c1);
            transform: translateY(-1px);
          }

          .final-summary {
            background: #f0fdf4;
            border: 2px solid #10b981;
            border-radius: 12px;
            padding: 30px;
            text-align: center;
            margin-bottom: 20px;
          }

          .final-summary h3 {
            color: #065f46;
            font-size: 1.3rem;
            margin: 0 0 15px 0;
          }

          .final-summary ul {
            text-align: left;
            color: #047857;
            margin: 15px 0;
          }

          .warning-box {
            background: #fef2f2;
            border: 2px solid #ef4444;
            border-radius: 8px;
            padding: 16px;
            margin: 20px 0;
            text-align: center;
          }

          .warning-box h4 {
            color: #dc2626;
            margin: 0 0 8px 0;
          }

          .warning-box p {
            color: #991b1b;
            margin: 0;
            font-size: 0.9rem;
          }

          .verification-code-container {
            background: #f8f9fa;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            padding: 30px;
            margin: 20px 0;
            text-align: center;
          }

          .verification-code-input {
            font-size: 2rem;
            font-family: 'Courier New', monospace;
            font-weight: bold;
            text-align: center;
            letter-spacing: 0.5em;
            padding: 15px;
            border: 2px solid #10b981;
            border-radius: 8px;
            width: 200px;
            margin: 15px 0;
            text-transform: uppercase;
          }

          .verification-code-input:focus {
            outline: none;
            border-color: #059669;
            box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
          }

          .verification-code-input.error {
            border-color: #ef4444;
          }

          .verification-actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            margin-top: 20px;
          }

          .verification-button {
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .verification-button.primary {
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
          }

          .verification-button.primary:hover:not(:disabled) {
            background: linear-gradient(135deg, #059669, #047857);
            transform: translateY(-1px);
          }

          .verification-button.secondary {
            background: #e5e7eb;
            color: #374151;
          }

          .verification-button.secondary:hover:not(:disabled) {
            background: #d1d5db;
          }

          .verification-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .verification-error {
            color: #ef4444;
            margin-top: 10px;
            font-size: 0.9rem;
          }

          .email-sent-notice {
            background: #dbeafe;
            border: 2px solid #3b82f6;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
          }

          .email-sent-notice h4 {
            color: #1d4ed8;
            margin: 0 0 10px 0;
          }

          .email-sent-notice p {
            color: #1e40af;
            margin: 0;
          }

          @media (max-width: 768px) {
            .legal-modal {
              margin: 10px;
              max-height: calc(100vh - 20px);
            }

            .legal-modal-header {
              padding: 20px;
            }

            .legal-modal-title {
              font-size: 1.5rem;
            }

            .step-content {
              padding: 20px;
            }

            .legal-modal-footer {
              padding: 20px;
              flex-direction: column;
              gap: 15px;
            }

            .modal-actions {
              width: 100%;
              justify-content: space-between;
            }

          }
        `}
      </style>

      <div className="legal-modal">
        {/* Header */}
        <div className="legal-modal-header">
          <h1 className="legal-modal-title">
            📜 Νομική Συμφωνία
          </h1>
          <p className="legal-modal-subtitle">
            Αποδοχή νομικών όρων για χρήση της πλατφόρμας Erasmos
          </p>

          <div className="step-indicator">
            {steps.map((step) => (
              <div
                key={step.number}
                className={`step-dot ${
                  step.number === currentStep ? 'active' : ''
                } ${acceptances[step.key] ? 'completed' : ''}`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="legal-modal-content">
          {currentStep === 1 && (
            <div className="step-content">
              <h2 className="step-title">📋 Όροι Χρήσης Υπηρεσίας</h2>

              <div className="document-container">
                <div className="document-content">
                  <h3>🛡️ Περιορισμός Ευθύνης και Αποποίηση</h3>
                  <p>Η πλατφόρμα Erasmos παρέχεται "ως έχει" χωρίς καμία εγγύηση. Ο πάροχος δεν φέρει ευθύνη για:</p>
                  <ul>
                    <li>Παραβιάσεις GDPR από χρήστες</li>
                    <li>Μη νόμιμη συλλογή προσωπικών δεδομένων</li>
                    <li>Ανακρίβειες στο περιεχόμενο χρηστών</li>
                    <li>Απώλεια ή κλοπή δεδομένων</li>
                    <li>Νομικές συνέπειες από χρήση της υπηρεσίας</li>
                  </ul>

                  <h3>👤 Υποχρεώσεις Χρήστη</h3>
                  <p>Ο χρήστης δηλώνει ότι:</p>
                  <ul>
                    <li>Έχει συλλέξει νόμιμα όλα τα δεδομένα</li>
                    <li>Έχει λάβει απαραίτητες συναινέσεις GDPR</li>
                    <li>Έχει ενημερώσει τα υποκείμενα των δεδομένων</li>
                    <li>Αναλαμβάνει πλήρη ευθύνη για τη χρήση</li>
                  </ul>

                  <h3>💰 Οικονομικοί Όροι</h3>
                  <p>Η χρήση της υπηρεσίας συνεπάγεται χρεώσεις σύμφωνα με τον ισχύοντα τιμοκατάλογο.</p>
                </div>
              </div>

              <div className={`acceptance-area ${acceptances.termsOfService ? 'accepted' : ''}`}>
                <div className="acceptance-checkbox-container">
                  <input
                    type="checkbox"
                    className="acceptance-checkbox"
                    checked={acceptances.termsOfService}
                    onChange={(e) => setAcceptances(prev => ({ ...prev, termsOfService: e.target.checked }))}
                    id="acceptTerms"
                  />
                  <label htmlFor="acceptTerms" className="acceptance-text">
                    <strong>Αποδέχομαι τους Όρους Χρήσης</strong> και κατανοώ ότι αναλαμβάνω την πλήρη ευθύνη
                    για τη νόμιμη χρήση της πλατφόρμας και την προστασία των προσωπικών δεδομένων που επεξεργάζομαι.
                  </label>
                </div>
              </div>

              {!acceptances.termsOfService && (
                <div className="warning-box">
                  <h4>⚠️ Απαιτείται Αποδοχή</h4>
                  <p>Η αποδοχή των Όρων Χρήσης είναι υποχρεωτική για τη συνέχιση.</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="step-content">
              <h2 className="step-title">🤝 Συμφωνία Επεξεργασίας Δεδομένων (DPA)</h2>

              <div className="document-container">
                <div className="document-content">
                  <h3>🏢 Ρόλοι GDPR</h3>
                  <p><strong>Υπεύθυνος Επεξεργασίας:</strong> Ο χρήστης (εσείς)</p>
                  <p><strong>Εκτελών Επεξεργασία:</strong> Σίκαλος Θεολόγης - Erasmos Platform</p>

                  <h3>🔒 Τεχνικά Μέτρα Ασφαλείας</h3>
                  <ul>
                    <li>Κρυπτογράφηση δεδομένων (TLS, AES-256)</li>
                    <li>Έλεγχος πρόσβασης και αυθεντικοποίηση</li>
                    <li>Τακτικά αντίγραφα ασφαλείας</li>
                    <li>Παρακολούθηση security incidents</li>
                  </ul>

                  <h3>📋 Κατηγορίες Δεδομένων</h3>
                  <ul>
                    <li>Στοιχεία ταυτότητας</li>
                    <li>Στοιχεία επικοινωνίας</li>
                    <li>Οικονομικά στοιχεία</li>
                    <li>Επαγγελματικά στοιχεία</li>
                    <li>Επισυναπτόμενα αρχεία</li>
                  </ul>

                  <h3>🚨 Παραβιάσεις Δεδομένων</h3>
                  <p>Ειδοποίηση εντός 24 ωρών και συνεργασία για αντιμετώπιση.</p>
                </div>
              </div>

              <div className={`acceptance-area ${acceptances.dataProcessingAgreement ? 'accepted' : ''}`}>
                <div className="acceptance-checkbox-container">
                  <input
                    type="checkbox"
                    className="acceptance-checkbox"
                    checked={acceptances.dataProcessingAgreement}
                    onChange={(e) => setAcceptances(prev => ({ ...prev, dataProcessingAgreement: e.target.checked }))}
                    id="acceptDPA"
                  />
                  <label htmlFor="acceptDPA" className="acceptance-text">
                    <strong>Αποδέχομαι τη Συμφωνία Επεξεργασίας Δεδομένων</strong> και κατανοώ τους ρόλους
                    και υποχρεώσεις μας σύμφωνα με το GDPR.
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="step-content">
              <h2 className="step-title">🔒 Πολιτική Απορρήτου</h2>

              <div className="document-container">
                <div className="document-content">
                  <h3>📊 Συλλογή Δεδομένων</h3>
                  <p>Συλλέγουμε μόνο τα απαραίτητα δεδομένα για την παροχή των υπηρεσιών:</p>
                  <ul>
                    <li>Στοιχεία λογαριασμού</li>
                    <li>Δεδομένα αιτήσεων</li>
                    <li>Τεχνικά δεδομένα (logs, IP addresses)</li>
                  </ul>

                  <h3>🍪 Cookies</h3>
                  <p>Χρησιμοποιούμε:</p>
                  <ul>
                    <li>Απαραίτητα cookies για λειτουργικότητα</li>
                    <li>Προαιρετικά analytics cookies (με συναίνεση)</li>
                  </ul>

                  <h3>⚖️ Δικαιώματά σας</h3>
                  <ul>
                    <li>Πρόσβαση στα δεδομένα</li>
                    <li>Διόρθωση ανακριβών δεδομένων</li>
                    <li>Διαγραφή δεδομένων</li>
                    <li>Φορητότητα δεδομένων</li>
                    <li>Αντίρρηση στην επεξεργασία</li>
                  </ul>

                  <h3>🗄️ Διατήρηση Δεδομένων</h3>
                  <p>Διατηρούμε δεδομένα για 7 έτη για φορολογικούς λόγους.</p>
                </div>
              </div>

              <div className={`acceptance-area ${acceptances.privacyPolicy ? 'accepted' : ''}`}>
                <div className="acceptance-checkbox-container">
                  <input
                    type="checkbox"
                    className="acceptance-checkbox"
                    checked={acceptances.privacyPolicy}
                    onChange={(e) => setAcceptances(prev => ({ ...prev, privacyPolicy: e.target.checked }))}
                    id="acceptPrivacy"
                  />
                  <label htmlFor="acceptPrivacy" className="acceptance-text">
                    <strong>Αποδέχομαι την Πολιτική Απορρήτου</strong> και κατανοώ πώς επεξεργάζονται
                    τα δεδομένα μου και ποια είναι τα δικαιώματά μου.
                  </label>
                </div>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="step-content">
              <UserComplianceDeclarations
                onDeclarationsChange={handleDeclarationsChange}
                initialValues={declarations}
              />
            </div>
          )}

          {currentStep === 5 && (
            <div className="step-content">
              <h2 className="step-title">📧 Επιβεβαίωση Email</h2>

              {emailSent && (
                <div className="email-sent-notice">
                  <h4>📬 Email Στάλθηκε!</h4>
                  <p>Ελέγξτε τα εισερχόμενά σας για τον κωδικό επιβεβαίωσης.</p>
                </div>
              )}

              <div className="verification-code-container">
                <h3>🔑 Εισάγετε τον Κωδικό Επιβεβαίωσης</h3>
                <p>Εισάγετε τον 6-ψήφιο κωδικό που λάβατε στο email σας:</p>

                <input
                  type="text"
                  className={`verification-code-input ${verificationError ? 'error' : ''}`}
                  value={verificationCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                    if (value.length <= 6) {
                      setVerificationCode(value);
                      setVerificationError('');
                    }
                  }}
                  placeholder="A1B2C3"
                  maxLength="6"
                  disabled={isVerifyingCode}
                />

                {verificationError && (
                  <div className="verification-error">
                    ⚠️ {verificationError}
                  </div>
                )}

                <div className="verification-actions">
                  <button
                    className="verification-button secondary"
                    onClick={handleResendEmail}
                    disabled={isVerifyingCode}
                  >
                    📤 Αποστολή Ξανά
                  </button>

                  <button
                    className="verification-button primary"
                    onClick={handleCodeVerification}
                    disabled={verificationCode.length !== 6 || isVerifyingCode}
                  >
                    {isVerifyingCode ? 'Επαλήθευση...' : '✅ Επιβεβαίωση'}
                  </button>
                </div>
              </div>

              <div className="document-container">
                <div className="document-content">
                  <h3>ℹ️ Οδηγίες</h3>
                  <ul>
                    <li>Ελέγξτε τα εισερχόμενά σας και το φάκελο spam</li>
                    <li>Ο κωδικός αποτελείται από 6 χαρακτήρες (γράμματα και αριθμούς)</li>
                    <li>Ο κωδικός λήγει σε 24 ώρες</li>
                    <li>Μπορείτε να ζητήσετε νέο κωδικό αν χρειαστεί</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="legal-modal-footer">
          <div className="step-info">
            {currentStep === 5 ? 'Επιβεβαίωση Email' : `Βήμα ${currentStep} από 4`}
          </div>

          <div className="modal-actions">
            <button
              className="modal-button logout"
              onClick={() => {
                setShowLegalModal(false);
                setTimeout(() => logout(), 100);
              }}
              disabled={isSubmitting || isVerifyingCode}
              title="Έξοδος από την εφαρμογή"
            >
              🚪 Έξοδος
            </button>

            {currentStep > 1 && currentStep < 5 && (
              <button
                className="modal-button secondary"
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={isSubmitting}
              >
                Προηγούμενο
              </button>
            )}

            {currentStep < 4 ? (
              <button
                className="modal-button primary"
                onClick={() => handleStepComplete({})}
                disabled={!canProceedToNext() || isSubmitting}
              >
                Επόμενο
              </button>
            ) : currentStep === 4 ? (
              <button
                className="modal-button primary"
                onClick={handleFinalSubmit}
                disabled={!allRequirementsCompleted() || isSubmitting || loading}
              >
                {isSubmitting ? 'Αποθήκευση...' : 'Αποστολή Email Επιβεβαίωσης'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LegalAcceptanceModal;