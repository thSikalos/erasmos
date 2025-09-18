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
  const { user, token } = useContext(AuthContext);
  const [legalStatus, setLegalStatus] = useState(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState(null);

  // Load legal compliance status
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const storedStatus = localStorage.getItem(`${LEGAL_STORAGE_KEY}_${user.id}`);
      if (storedStatus) {
        const parsed = JSON.parse(storedStatus);

        // Check if legal version is current
        if (parsed.version === CURRENT_LEGAL_VERSION) {
          setLegalStatus(parsed);
        } else {
          // Version mismatch - need new acceptance
          setLegalStatus(null);
        }
      }
    } catch (error) {
      console.error('Error loading legal compliance:', error);
      setLegalStatus(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Check if user needs legal acceptance before action
  const checkLegalCompliance = useCallback((action = null) => {
    if (!user) return false;

    if (!legalStatus) {
      setPendingAction(action);
      setShowLegalModal(true);
      return false;
    }

    return true;
  }, [user, legalStatus]);

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
      ipAddress: await getUserIP(),
      userAgent: navigator.userAgent,
      acceptances: {
        termsOfService: acceptanceData.termsOfService || false,
        dataProcessingAgreement: acceptanceData.dataProcessingAgreement || false,
        userDeclarations: acceptanceData.userDeclarations || false,
        privacyPolicy: acceptanceData.privacyPolicy || false
      },
      declarations: {
        hasLegalAuthority: acceptanceData.declarations?.hasLegalAuthority || false,
        hasObtainedConsents: acceptanceData.declarations?.hasObtainedConsents || false,
        hasInformedDataSubjects: acceptanceData.declarations?.hasInformedDataSubjects || false,
        dataIsAccurate: acceptanceData.declarations?.dataIsAccurate || false,
        acceptsLiability: acceptanceData.declarations?.acceptsLiability || false
      },
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
        body: JSON.stringify(legalRecord)
      });

      if (!response.ok) {
        throw new Error('Failed to save legal acceptance');
      }

      const result = await response.json();

      // Update local state
      setLegalStatus(legalRecord);

      // Save to localStorage as backup
      localStorage.setItem(`${LEGAL_STORAGE_KEY}_${user.id}`, JSON.stringify(legalRecord));

      // Send verification email
      await sendVerificationEmail(result.verificationToken);

      console.log('[LEGAL] Legal acceptance saved successfully');

      return result;
    } catch (error) {
      console.error('[LEGAL] Error saving legal acceptance:', error);
      throw error;
    }
  }, [user, token]);

  // Send verification email
  const sendVerificationEmail = useCallback(async (verificationToken) => {
    try {
      const response = await fetch('/api/legal/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ verificationToken })
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

  // Complete legal acceptance flow
  const completeLegalAcceptance = useCallback(async (acceptanceData) => {
    try {
      setLoading(true);

      await saveLegalAcceptance(acceptanceData);

      setShowLegalModal(false);

      // Execute pending action if any
      if (pendingAction) {
        setPendingAction(null);
        // Here you would execute the pending action
        console.log('[LEGAL] Executing pending action after legal acceptance');
      }

      return true;
    } catch (error) {
      console.error('[LEGAL] Error completing legal acceptance:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [saveLegalAcceptance, pendingAction]);

  // Get legal compliance status
  const getLegalStatus = useCallback(() => {
    return legalStatus;
  }, [legalStatus]);

  // Check if specific legal document is accepted
  const hasAccepted = useCallback((documentType) => {
    return legalStatus?.acceptances?.[documentType] || false;
  }, [legalStatus]);

  // Check if all legal requirements are met
  const isLegallyCompliant = useCallback(() => {
    if (!legalStatus) return false;

    const required = [
      'termsOfService',
      'dataProcessingAgreement',
      'userDeclarations',
      'privacyPolicy'
    ];

    return required.every(doc => legalStatus.acceptances[doc]);
  }, [legalStatus]);

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

// Helper function to get user IP
async function getUserIP() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

export default LegalComplianceContext;