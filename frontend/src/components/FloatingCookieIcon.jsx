import React, { useState } from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { Link } from 'react-router-dom';

const FloatingCookieIcon = () => {
  const {
    getConsentStatus,
    updateConsent,
    acceptAll,
    acceptEssentialOnly,
    showBanner,
    loading
  } = useCookieConsent();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const consentStatus = getConsentStatus();

  // Don't show if loading or banner is showing (to avoid overlap)
  if (loading || showBanner) {
    return null;
  }

  // Determine icon status color
  const getStatusColor = () => {
    if (!consentStatus) return '#ef4444'; // Red - no consent
    if (consentStatus.analytics && consentStatus.marketing) return '#10b981'; // Green - all accepted
    return '#f59e0b'; // Yellow - partial consent
  };

  const getStatusText = () => {
    if (!consentStatus) return 'Δεν έχετε ρυθμίσει προτιμήσεις cookies';
    if (consentStatus.analytics && consentStatus.marketing) return 'Όλα τα cookies ενεργοποιημένα';
    if (!consentStatus.analytics && !consentStatus.marketing) return 'Μόνο απαραίτητα cookies';
    return 'Μερικά cookies ενεργοποιημένα';
  };

  const handleToggleCategory = (category, value) => {
    const newConsent = {
      analytics: consentStatus?.analytics || false,
      marketing: consentStatus?.marketing || false,
      [category]: value
    };
    updateConsent(newConsent);
  };

  const handleAcceptAll = () => {
    acceptAll();
    setIsModalOpen(false);
  };

  const handleEssentialOnly = () => {
    acceptEssentialOnly();
    setIsModalOpen(false);
  };

  return (
    <>
      <style>
        {`
          .floating-cookie-icon {
            position: fixed;
            bottom: 120px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 1000;
            border: 3px solid;
            font-size: 24px;
          }

          .floating-cookie-icon:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 25px rgba(0, 0, 0, 0.2);
          }

          .cookie-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .cookie-modal {
            background: white;
            border-radius: 16px;
            max-width: 480px;
            width: 100%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            position: relative;
          }

          .cookie-modal-header {
            padding: 24px 24px 16px 24px;
            border-bottom: 1px solid #e5e7eb;
            position: relative;
          }

          .cookie-modal-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0;
            padding-right: 40px;
          }

          .cookie-modal-close {
            position: absolute;
            top: 20px;
            right: 20px;
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #6b7280;
            padding: 4px;
            border-radius: 4px;
            transition: all 0.2s ease;
          }

          .cookie-modal-close:hover {
            background: #f3f4f6;
            color: #374151;
          }

          .cookie-modal-content {
            padding: 24px;
          }

          .cookie-status-indicator {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 16px;
            background: #f9fafb;
            border-radius: 12px;
            margin-bottom: 24px;
            border-left: 4px solid;
          }

          .cookie-category-quick {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 12px;
            transition: all 0.2s ease;
          }

          .cookie-category-quick:hover {
            background: #f1f5f9;
            border-color: #cbd5e1;
          }

          .category-quick-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
          }

          .category-quick-title {
            font-weight: 600;
            color: #374151;
            margin: 0;
            font-size: 0.95rem;
          }

          .category-quick-description {
            font-size: 0.85rem;
            color: #6b7280;
            margin: 0;
            line-height: 1.4;
          }

          .quick-toggle {
            position: relative;
            display: inline-block;
            width: 44px;
            height: 24px;
          }

          .quick-toggle input {
            opacity: 0;
            width: 0;
            height: 0;
          }

          .quick-toggle-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #d1d5db;
            transition: 0.3s;
            border-radius: 24px;
          }

          .quick-toggle-slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.3s;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          }

          input:checked + .quick-toggle-slider {
            background-color: #10b981;
          }

          input:checked + .quick-toggle-slider:before {
            transform: translateX(20px);
          }

          input:disabled + .quick-toggle-slider {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .cookie-modal-actions {
            display: flex;
            gap: 12px;
            margin-top: 24px;
            flex-wrap: wrap;
          }

          .cookie-modal-button {
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: all 0.2s ease;
            font-size: 0.9rem;
            flex: 1;
            min-width: 0;
          }

          .cookie-modal-button.primary {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
          }

          .cookie-modal-button.primary:hover {
            background: linear-gradient(135deg, #5a67d8, #6b46c1);
            transform: translateY(-1px);
          }

          .cookie-modal-button.secondary {
            background: #f3f4f6;
            color: #374151;
            border: 1px solid #d1d5db;
          }

          .cookie-modal-button.secondary:hover {
            background: #e5e7eb;
            border-color: #9ca3af;
          }

          .cookie-modal-link {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #667eea;
            text-decoration: none;
            font-size: 0.9rem;
            font-weight: 500;
            padding: 8px 0;
            transition: color 0.2s ease;
          }

          .cookie-modal-link:hover {
            color: #5a67d8;
            text-decoration: underline;
          }

          .modal-links {
            display: flex;
            gap: 20px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            flex-wrap: wrap;
          }

          @media (max-width: 640px) {
            .floating-cookie-icon {
              bottom: 80px;
              right: 16px;
              width: 48px;
              height: 48px;
              font-size: 20px;
            }

            .cookie-modal-actions {
              flex-direction: column;
            }

            .cookie-modal-button {
              flex: none;
            }

            .modal-links {
              flex-direction: column;
              gap: 8px;
            }
          }
        `}
      </style>

      {/* Floating Cookie Icon */}
      <div
        className="floating-cookie-icon"
        style={{ borderColor: getStatusColor() }}
        onClick={() => setIsModalOpen(true)}
        title={getStatusText()}
      >
        🍪
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="cookie-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="cookie-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cookie-modal-header">
              <h2 className="cookie-modal-title">🍪 Προτιμήσεις Cookies</h2>
              <button
                className="cookie-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="cookie-modal-content">
              {/* Status Indicator */}
              <div
                className="cookie-status-indicator"
                style={{ borderLeftColor: getStatusColor() }}
              >
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: getStatusColor()
                }}></div>
                <span style={{ color: '#374151', fontWeight: '500' }}>
                  {getStatusText()}
                </span>
              </div>

              {/* Essential Cookies */}
              <div className="cookie-category-quick">
                <div className="category-quick-header">
                  <h3 className="category-quick-title">🔒 Απαραίτητα Cookies</h3>
                  <div className="quick-toggle">
                    <input type="checkbox" checked disabled />
                    <span className="quick-toggle-slider"></span>
                  </div>
                </div>
                <p className="category-quick-description">
                  Απαραίτητα για τη λειτουργία της πλατφόρμας. Πάντα ενεργά.
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="cookie-category-quick">
                <div className="category-quick-header">
                  <h3 className="category-quick-title">📊 Analytics Cookies</h3>
                  <div className="quick-toggle">
                    <input
                      type="checkbox"
                      checked={consentStatus?.analytics || false}
                      onChange={(e) => handleToggleCategory('analytics', e.target.checked)}
                    />
                    <span className="quick-toggle-slider"></span>
                  </div>
                </div>
                <p className="category-quick-description">
                  Βοηθούν στη βελτίωση της πλατφόρμας μέσω ανάλυσης χρήσης.
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="cookie-category-quick">
                <div className="category-quick-header">
                  <h3 className="category-quick-title">🎯 Marketing Cookies</h3>
                  <div className="quick-toggle">
                    <input
                      type="checkbox"
                      checked={consentStatus?.marketing || false}
                      onChange={(e) => handleToggleCategory('marketing', e.target.checked)}
                    />
                    <span className="quick-toggle-slider"></span>
                  </div>
                </div>
                <p className="category-quick-description">
                  Χρησιμοποιούνται για εξατομικευμένες διαφημίσεις.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="cookie-modal-actions">
                <button
                  className="cookie-modal-button secondary"
                  onClick={handleEssentialOnly}
                >
                  Μόνο Απαραίτητα
                </button>
                <button
                  className="cookie-modal-button primary"
                  onClick={handleAcceptAll}
                >
                  Αποδοχή Όλων
                </button>
              </div>

              {/* Links */}
              <div className="modal-links">
                <Link to="/profile" className="cookie-modal-link" onClick={() => setIsModalOpen(false)}>
                  ⚙️ Λεπτομερείς Ρυθμίσεις
                </Link>
                <Link to="/cookie-policy" className="cookie-modal-link" onClick={() => setIsModalOpen(false)}>
                  📄 Πολιτική Cookies
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FloatingCookieIcon;