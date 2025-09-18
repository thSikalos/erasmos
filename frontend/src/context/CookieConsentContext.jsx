import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const CookieConsentContext = createContext(null);

export const useCookieConsent = () => {
  const context = useContext(CookieConsentContext);
  if (!context) {
    throw new Error('useCookieConsent must be used within a CookieConsentProvider');
  }
  return context;
};

const COOKIE_CONSENT_KEY = 'erasmos_cookie_consent';
const CONSENT_VERSION = '1.0';

export const CookieConsentProvider = ({ children }) => {
  const [consentData, setConsentData] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load consent data from localStorage on mount
  useEffect(() => {
    try {
      const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
      if (storedConsent) {
        const parsed = JSON.parse(storedConsent);

        // Check if consent version matches current version
        if (parsed.version === CONSENT_VERSION) {
          setConsentData(parsed);
          setShowBanner(false);
        } else {
          // Version mismatch, show banner again
          setShowBanner(true);
        }
      } else {
        // No consent found, show banner
        setShowBanner(true);
      }
    } catch (error) {
      console.error('Error loading cookie consent:', error);
      setShowBanner(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveConsent = useCallback((consent) => {
    const consentObject = {
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
      consent: {
        essential: true, // Always true - required for app functionality
        analytics: consent.analytics || false,
        marketing: consent.marketing || false
      },
      userAgent: navigator.userAgent,
      language: navigator.language
    };

    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(consentObject));
      setConsentData(consentObject);
      setShowBanner(false);

      console.log('[COOKIE_CONSENT] Consent saved:', consentObject.consent);
    } catch (error) {
      console.error('Error saving cookie consent:', error);
    }
  }, []);

  const acceptEssentialOnly = useCallback(() => {
    saveConsent({
      analytics: false,
      marketing: false
    });
  }, [saveConsent]);

  const acceptAll = useCallback(() => {
    saveConsent({
      analytics: true,
      marketing: true
    });
  }, [saveConsent]);

  const updateConsent = useCallback((newConsent) => {
    saveConsent(newConsent);
  }, [saveConsent]);

  const withdrawConsent = useCallback(() => {
    try {
      localStorage.removeItem(COOKIE_CONSENT_KEY);
      setConsentData(null);
      setShowBanner(true);

      console.log('[COOKIE_CONSENT] Consent withdrawn');
    } catch (error) {
      console.error('Error withdrawing consent:', error);
    }
  }, []);

  const hasConsent = useCallback((category) => {
    if (category === 'essential') return true; // Essential cookies always allowed
    return consentData?.consent?.[category] || false;
  }, [consentData]);

  const getConsentStatus = useCallback(() => {
    if (!consentData) return null;
    return consentData.consent;
  }, [consentData]);

  const value = {
    // State
    consentData,
    showBanner,
    loading,

    // Actions
    acceptEssentialOnly,
    acceptAll,
    updateConsent,
    withdrawConsent,

    // Utilities
    hasConsent,
    getConsentStatus
  };

  return (
    <CookieConsentContext.Provider value={value}>
      {children}
    </CookieConsentContext.Provider>
  );
};

export default CookieConsentContext;