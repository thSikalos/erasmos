import React from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';
import { Link } from 'react-router-dom';

const CookieConsentBanner = () => {
  const { showBanner, acceptEssentialOnly, loading } = useCookieConsent();

  // Don't render if loading or banner shouldn't be shown
  if (loading || !showBanner) {
    return null;
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50"
      role="banner"
      aria-label="Cookie consent banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">

          {/* Message */}
          <div className="flex-1">
            <div className="text-sm text-gray-700">
              <p className="font-medium mb-1">
                Χρήση Cookies
              </p>
              <p>
                Χρησιμοποιούμε απαραίτητα cookies για τη λειτουργία της πλατφόρμας και την ασφάλεια της σύνδεσής σας.
                Αυτά τα cookies είναι απαραίτητα για την παροχή των υπηρεσιών μας.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Link
              to="/cookie-policy"
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Περισσότερες Πληροφορίες
            </Link>

            <button
              onClick={acceptEssentialOnly}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Αποδοχή
            </button>
          </div>
        </div>

        {/* Compliance notice */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Αυτή η ιστοσελίδα συμμορφώνεται με τον Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR) και τις οδηγίες της Ελληνικής Αρχής Προστασίας Δεδομένων Προσωπικού Χαρακτήρα.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;