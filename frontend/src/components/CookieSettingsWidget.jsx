import React, { useState } from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { Link } from 'react-router-dom';

const CookieSettingsWidget = () => {
  const { getConsentStatus, updateConsent, withdrawConsent } = useCookieConsent();
  const [isExpanded, setIsExpanded] = useState(false);

  const consentStatus = getConsentStatus();

  const handleToggleCategory = (category, value) => {
    const newConsent = {
      analytics: consentStatus?.analytics || false,
      marketing: consentStatus?.marketing || false,
      [category]: value
    };
    updateConsent(newConsent);
  };

  if (!consentStatus) {
    return (
      <div className="applications-section">
        <div className="section-header">
          <h2 className="section-title">🍪 Προτιμήσεις Cookies</h2>
        </div>
        <div className="cookie-settings-content">
          <p className="text-white/80 mb-4">
            Δεν έχετε αποδεχθεί cookies ακόμα. Κάντε κλικ παρακάτω για να ρυθμίσετε τις προτιμήσεις σας.
          </p>
          <button
            onClick={withdrawConsent}
            className="cookie-settings-button primary"
          >
            Ρύθμιση Προτιμήσεων
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="applications-section">
      <style>
        {`
          .cookie-settings-content {
            color: rgba(255, 255, 255, 0.9);
          }

          .cookie-category {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 15px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.2s ease;
          }

          .cookie-category:hover {
            background: rgba(255, 255, 255, 0.15);
            border-color: rgba(255, 255, 255, 0.2);
          }

          .category-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
          }

          .category-title {
            font-size: 1.1rem;
            font-weight: 600;
            color: white;
            margin: 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .category-description {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
            margin: 10px 0 0 0;
            line-height: 1.4;
          }

          .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 26px;
          }

          .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.3);
            transition: 0.3s;
            border-radius: 26px;
          }

          .toggle-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          input:checked + .toggle-slider {
            background: linear-gradient(135deg, #10b981, #059669);
          }

          input:checked + .toggle-slider:before {
            transform: translateX(24px);
          }

          input:disabled + .toggle-slider {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .status-indicator {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .status-enabled {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
          }

          .status-disabled {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
          }

          .status-required {
            background: rgba(59, 130, 246, 0.2);
            color: #3b82f6;
          }

          .cookie-settings-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            flex-wrap: wrap;
          }

          .cookie-settings-button {
            padding: 10px 16px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 6px;
          }

          .cookie-settings-button.primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
          }

          .cookie-settings-button.primary:hover {
            background: linear-gradient(135deg, #5a67d8, #6b46c1);
            transform: translateY(-1px);
          }

          .cookie-settings-button.secondary {
            background: rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }

          .cookie-settings-button.secondary:hover {
            background: rgba(255, 255, 255, 0.2);
            border-color: rgba(255, 255, 255, 0.3);
          }

          .expand-toggle {
            background: none;
            border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer;
            font-size: 0.85rem;
            padding: 5px 10px;
            border-radius: 6px;
            margin-top: 10px;
            transition: all 0.2s ease;
          }

          .expand-toggle:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
          }

          .consent-info {
            background: rgba(59, 130, 246, 0.1);
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 0.85rem;
            color: rgba(255, 255, 255, 0.8);
          }
        `}
      </style>

      <div className="section-header">
        <h2 className="section-title">🍪 Προτιμήσεις Cookies</h2>
      </div>

      <div className="cookie-settings-content">
        <div className="consent-info">
          💡 Μπορείτε να αλλάξετε τις προτιμήσεις σας οποτεδήποτε. Οι αλλαγές θα εφαρμοστούν άμεσα.
        </div>

        {/* Essential Cookies */}
        <div className="cookie-category">
          <div className="category-header">
            <h3 className="category-title">
              🔒 Απαραίτητα Cookies
              <span className="status-indicator status-required">
                ● Πάντα ενεργά
              </span>
            </h3>
            <div className="toggle-switch">
              <input type="checkbox" checked disabled />
              <span className="toggle-slider"></span>
            </div>
          </div>
          <p className="category-description">
            Απαραίτητα για τη λειτουργία της πλατφόρμας. Περιλαμβάνουν authentication,
            ασφάλεια και διατήρηση της συνεδρίας σας.
          </p>
        </div>

        {/* Analytics Cookies */}
        <div className="cookie-category">
          <div className="category-header">
            <h3 className="category-title">
              📊 Analytics Cookies
              <span className={`status-indicator ${consentStatus.analytics ? 'status-enabled' : 'status-disabled'}`}>
                ● {consentStatus.analytics ? 'Ενεργό' : 'Ανενεργό'}
              </span>
            </h3>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={consentStatus.analytics}
                onChange={(e) => handleToggleCategory('analytics', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </div>
          </div>
          <p className="category-description">
            Μας βοηθούν να κατανοήσουμε πώς χρησιμοποιείτε την πλατφόρμα για να τη βελτιώσουμε.
            Δεν περιέχουν προσωπικές πληροφορίες.
          </p>
          {isExpanded && (
            <div style={{marginTop: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)'}}>
              • Στατιστικά χρήσης σελίδων<br/>
              • Χρόνος παραμονής και πλοήγηση<br/>
              • Τεχνικές πληροφορίες συσκευής
            </div>
          )}
        </div>

        {/* Marketing Cookies */}
        <div className="cookie-category">
          <div className="category-header">
            <h3 className="category-title">
              🎯 Marketing Cookies
              <span className={`status-indicator ${consentStatus.marketing ? 'status-enabled' : 'status-disabled'}`}>
                ● {consentStatus.marketing ? 'Ενεργό' : 'Ανενεργό'}
              </span>
            </h3>
            <div className="toggle-switch">
              <input
                type="checkbox"
                checked={consentStatus.marketing}
                onChange={(e) => handleToggleCategory('marketing', e.target.checked)}
              />
              <span className="toggle-slider"></span>
            </div>
          </div>
          <p className="category-description">
            Χρησιμοποιούνται για εξατομικευμένες διαφημίσεις και marketing campaigns.
            Προαιρετικά και μπορείτε να τα απενεργοποιήσετε.
          </p>
          {isExpanded && (
            <div style={{marginTop: '10px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)'}}>
              • Retargeting και remarketing<br/>
              • Conversion tracking<br/>
              • Διαφημιστικές προτιμήσεις
            </div>
          )}
        </div>

        <button
          className="expand-toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '🔼 Λιγότερες λεπτομέρειες' : '🔽 Περισσότερες λεπτομέρειες'}
        </button>

        <div className="cookie-settings-actions">
          <button
            onClick={withdrawConsent}
            className="cookie-settings-button primary"
          >
            🔄 Επαναφορά Προτιμήσεων
          </button>

          <Link to="/cookie-policy" className="cookie-settings-button secondary">
            📄 Πολιτική Cookies
          </Link>

          <Link to="/privacy-policy" className="cookie-settings-button secondary">
            🔒 Πολιτική Απορρήτου
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CookieSettingsWidget;