import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from './AuthContext';

const LegalComplianceContext = createContext(null);

export const useLegalCompliance = () => {
  const context = useContext(LegalComplianceContext);
  if (!context) {
    throw new Error('useLegalCompliance must be used within a LegalComplianceProvider');
  }
  return context;
};

const LEGAL_STORAGE_KEY = 'erasmos_legal_compliance';
const CURRENT_LEGAL_VERSION = '1.0';

export const LegalComplianceProvider = ({ children }) => {
  const {
    user,
    token,
    legalComplianceStatus,
    legalLoading,
    checkLegalCompliance: authCheckCompliance,
    isLegallyCompliant
  } = useContext(AuthContext);
  const [legalStatus, setLegalStatus] = useState(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);

  // Monitor legal compliance status from AuthContext and auto-trigger modal
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Use AuthContext legal compliance status as source of truth
    if (legalComplianceStatus) {
      setLegalStatus(legalComplianceStatus);
      setLoading(false);

      // Auto-trigger modal if compliance is required
      if (legalComplianceStatus.requiresAction && !isLegallyCompliant) {
        console.log('[LEGAL_CONTEXT] Auto-triggering legal modal due to compliance requirement');
        console.log('[LEGAL_CONTEXT] Compliance status:', legalComplianceStatus.complianceStatus);
        setShowLegalModal(true);
      }
    } else if (!legalLoading) {
      // Fallback to localStorage if AuthContext doesn't have status yet
      try {
        const storedStatus = localStorage.getItem(`${LEGAL_STORAGE_KEY}_${user.id}`);
        if (storedStatus) {
          const parsed = JSON.parse(storedStatus);
          if (parsed.version === CURRENT_LEGAL_VERSION) {
            setLegalStatus(parsed);
          } else {
            setLegalStatus(null);
            setShowLegalModal(true); // Version mismatch - need new acceptance
          }
        } else {
          setShowLegalModal(true); // No stored status - need acceptance
        }
      } catch (error) {
        console.error('Error loading legal compliance:', error);
        setLegalStatus(null);
        setShowLegalModal(true);
      } finally {
        setLoading(false);
      }
    }
  }, [user, legalComplianceStatus, legalLoading, isLegallyCompliant]);

  // Check if user needs legal acceptance before action
  const checkLegalCompliance = useCallback((action = null) => {
    if (!user) return false;

    // Use AuthContext compliance status if available
    if (legalComplianceStatus) {
      if (legalComplianceStatus.requiresAction || !isLegallyCompliant) {
        setPendingAction(action);
        setShowLegalModal(true);
        return false;
      }
      return true;
    }

    // Fallback to local status
    if (!legalStatus) {
      setPendingAction(action);
      setShowLegalModal(true);
      return false;
    }

    return true;
  }, [user, legalStatus, legalComplianceStatus, isLegallyCompliant]);

  // Save legal acceptance
  const saveLegalAcceptance = useCallback(async (acceptanceData) => {
    if (!user || !token) {
      throw new Error('User must be authenticated');
    }

    const legalRecord = {
      version: CURRENT_LEGAL_VERSION,
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      acceptances: {
        termsOfService: acceptanceData.termsOfService || false,
        dataProcessingAgreement: acceptanceData.dataProcessingAgreement || false,
        userDeclarations: acceptanceData.userDeclarations || false,
        privacyPolicy: acceptanceData.privacyPolicy || false
      },
      declarations: acceptanceData.declarations || {},
      emailVerification: {
        required: true,
        verified: false,
        verificationToken: null
      }
    };

    try {
      // Save to backend for audit trail
      const response = await fetch('/api/legal/acceptance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          acceptances: legalRecord.acceptances,
          declarations: legalRecord.declarations,
          sessionId: crypto.randomUUID ? crypto.randomUUID() : 'session-' + Date.now(),
          userAgent: legalRecord.userAgent
        })
      });

      if (!response.ok) {
        let errorMessage = 'Failed to save legal acceptance';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();

      // Update local state
      setLegalStatus(legalRecord);

      // Save to localStorage as backup
      localStorage.setItem(`${LEGAL_STORAGE_KEY}_${user.id}`, JSON.stringify(legalRecord));

      // Send verification email if code provided
      if (result.verificationCode) {
        await sendVerificationEmail(result.verificationCode);
      }

      console.log('[LEGAL] Legal acceptance saved successfully');

      return result;
    } catch (error) {
      console.error('[LEGAL] Error saving legal acceptance:', error);
      throw error;
    }
  }, [user, token]);

  // Send verification email
  const sendVerificationEmail = useCallback(async (verificationCode) => {
    try {
      const response = await fetch('/api/legal/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verificationCode })
      });

      if (!response.ok) {
        throw new Error('Failed to send verification email');
      }

      console.log('[LEGAL] Verification email sent');
    } catch (error) {
      console.error('[LEGAL] Error sending verification email:', error);
      // Don't throw - email is not critical for legal validity
    }
  }, [token]);

  // Verify email acceptance
  const verifyEmailAcceptance = useCallback(async (verificationToken) => {
    try {
      const response = await fetch('/api/legal/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verificationToken })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Αποτυχία επιβεβαίωσης email');
      }

      const result = await response.json();

      // Update local status
      setLegalStatus(prev => ({
        ...prev,
        emailVerification: {
          ...prev.emailVerification,
          verified: true,
          verifiedAt: new Date().toISOString()
        }
      }));

      // Update localStorage
      if (user) {
        const updatedStatus = {
          ...legalStatus,
          emailVerification: {
            ...legalStatus?.emailVerification,
            verified: true,
            verifiedAt: new Date().toISOString()
          }
        };
        localStorage.setItem(`${LEGAL_STORAGE_KEY}_${user.id}`, JSON.stringify(updatedStatus));
      }

      console.log('[LEGAL] Email verification completed');
      return result;
    } catch (error) {
      console.error('[LEGAL] Error verifying email:', error);
      throw error;
    }
  }, [token, user, legalStatus]);

  // Verify email with manual code
  const verifyCodeAcceptance = useCallback(async (verificationCode) => {
    try {
      const response = await fetch('/api/legal/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verificationCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Αποτυχία επιβεβαίωσης κωδικού');
      }

      const result = await response.json();

      // Update local status
      setLegalStatus(prev => ({
        ...prev,
        emailVerification: {
          ...prev.emailVerification,
          verified: true,
          verifiedAt: new Date().toISOString()
        }
      }));

      // Update localStorage
      if (user) {
        const updatedStatus = {
          ...legalStatus,
          emailVerification: {
            ...legalStatus?.emailVerification,
            verified: true,
            verifiedAt: new Date().toISOString()
          }
        };
        localStorage.setItem(`${LEGAL_STORAGE_KEY}_${user.id}`, JSON.stringify(updatedStatus));
      }

      // Refresh legal compliance status from backend
      if (authCheckCompliance) {
        await authCheckCompliance();
      }

      console.log('[LEGAL] Email verification completed with code');
      return result;
    } catch (error) {
      console.error('[LEGAL] Error verifying code:', error);
      throw error;
    }
  }, [token, user, legalStatus, authCheckCompliance]);

  // Complete legal acceptance flow
  const completeLegalAcceptance = useCallback(async (acceptanceData) => {
    try {
      setLoading(true);

      const result = await saveLegalAcceptance(acceptanceData);

      // Don't close modal here - let the modal component handle it after email verification
      // setShowLegalModal(false);

      console.log('[LEGAL] Legal acceptance saved, email verification required');
      return result;
    } catch (error) {
      console.error('[LEGAL] Error completing legal acceptance:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [saveLegalAcceptance]);

  // Get legal compliance status
  const getLegalStatus = useCallback(() => {
    return legalStatus;
  }, [legalStatus]);

  // Check if specific legal document is accepted
  const hasAccepted = useCallback((documentType) => {
    return legalStatus?.acceptances?.[documentType] || false;
  }, [legalStatus]);

  // Check if all legal requirements are met (using AuthContext isLegallyCompliant)
  const checkAllRequirementsMet = useCallback(() => {
    if (!legalStatus) return false;

    const required = [
      'termsOfService',
      'dataProcessingAgreement',
      'userDeclarations',
      'privacyPolicy'
    ];

    return required.every(doc => legalStatus.acceptances[doc]);
  }, [legalStatus]);

  // Resend verification email
  const resendVerificationEmail = useCallback(async () => {
    if (!user || !token) {
      throw new Error('User must be authenticated');
    }

    try {
      const response = await fetch('/api/legal/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        let errorMessage = 'Failed to resend verification email';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          errorMessage = `Server error: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('[LEGAL] Verification email resent successfully');
      return result;
    } catch (error) {
      console.error('[LEGAL] Error resending verification email:', error);
      throw error;
    }
  }, [user, token]);

  // Reset legal status (for testing or version updates)
  const resetLegalStatus = useCallback(() => {
    if (user) {
      localStorage.removeItem(`${LEGAL_STORAGE_KEY}_${user.id}`);
      setLegalStatus(null);
    }
  }, [user]);

  const value = {
    // State
    legalStatus,
    showLegalModal,
    loading,
    pendingAction,

    // Actions
    checkLegalCompliance,
    completeLegalAcceptance,
    verifyEmailAcceptance,
    verifyCodeAcceptance,
    resendVerificationEmail,
    resetLegalStatus,
    setShowLegalModal,

    // Utilities
    getLegalStatus,
    hasAccepted,
    isLegallyCompliant,

    // Constants
    CURRENT_LEGAL_VERSION
  };

  return (
    <LegalComplianceContext.Provider value={value}>
      {children}
    </LegalComplianceContext.Provider>
  );
};

// IP address is now handled by the backend from request headers

export default LegalComplianceContext;