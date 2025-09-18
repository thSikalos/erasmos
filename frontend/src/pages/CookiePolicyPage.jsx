import React from 'react';
import { useCookieConsent } from '../context/CookieConsentContext';

const CookiePolicyPage = () => {
  const { getConsentStatus, withdrawConsent } = useCookieConsent();
  const consentStatus = getConsentStatus();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Πολιτική Cookies
              </h1>
              <p className="text-gray-600">
                Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')}
              </p>
            </div>

            {/* Current Consent Status */}
            {consentStatus && (
              <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">Τρέχουσα Κατάσταση Συναίνεσης</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p>✓ Απαραίτητα Cookies: Ενεργοποιημένα</p>
                  <p>{consentStatus.analytics ? '✓' : '✗'} Analytics Cookies: {consentStatus.analytics ? 'Ενεργοποιημένα' : 'Απενεργοποιημένα'}</p>
                  <p>{consentStatus.marketing ? '✓' : '✗'} Marketing Cookies: {consentStatus.marketing ? 'Ενεργοποιημένα' : 'Απενεργοποιημένα'}</p>
                </div>
                <button
                  onClick={withdrawConsent}
                  className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  Αλλαγή Προτιμήσεων
                </button>
              </div>
            )}

            {/* Content */}
            <div className="prose prose-gray max-w-none">

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Τι είναι τα Cookies</h2>
                <p className="text-gray-700 mb-4">
                  Τα cookies είναι μικρά αρχεία κειμένου που αποθηκεύονται στη συσκευή σας
                  (υπολογιστή, tablet, smartphone) όταν επισκέπτεστε μια ιστοσελίδα.
                  Χρησιμοποιούνται για να βελτιώσουν την εμπειρία σας και να παρέχουν
                  εξατομικευμένες υπηρεσίες.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Τύποι Cookies που Χρησιμοποιούμε</h2>

                <div className="space-y-6">
                  {/* Essential Cookies */}
                  <div className="border border-green-200 rounded-lg p-4 bg-green-50">
                    <h3 className="text-xl font-medium text-green-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                      Απαραίτητα Cookies (Essential)
                    </h3>
                    <p className="text-green-800 mb-3">
                      <strong>Κατάσταση:</strong> Πάντα ενεργοποιημένα - Δεν απαιτείται συναίνεση
                    </p>
                    <p className="text-gray-700 mb-3">
                      Αυτά τα cookies είναι απαραίτητα για τη βασική λειτουργία της ιστοσελίδας και δεν μπορούν να απενεργοποιηθούν.
                    </p>

                    <div className="bg-white rounded p-3 mt-3">
                      <h4 className="font-medium text-gray-900 mb-2">Τι αποθηκεύουμε:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li><strong>JWT Authentication Token:</strong> Για τη διατήρηση της σύνδεσής σας</li>
                        <li><strong>Session Data:</strong> Για την ασφάλεια και τη λειτουργικότητα</li>
                        <li><strong>Cookie Preferences:</strong> Για τη διατήρηση των επιλογών σας για cookies</li>
                      </ul>

                      <h4 className="font-medium text-gray-900 mb-2 mt-4">Διάρκεια:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Authentication Token: Έως τη λήξη της συνεδρίας (24 ώρες)</li>
                        <li>Cookie Preferences: 1 έτος</li>
                      </ul>

                      <h4 className="font-medium text-gray-900 mb-2 mt-4">Νομική Βάση:</h4>
                      <p className="text-sm text-gray-700">
                        Νόμιμο συμφέρον - Απαραίτητα για την παροχή των υπηρεσιών που ζητήσατε
                      </p>
                    </div>
                  </div>

                  {/* Analytics Cookies */}
                  <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
                    <h3 className="text-xl font-medium text-blue-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                      Analytics Cookies (Προαιρετικά)
                    </h3>
                    <p className="text-blue-800 mb-3">
                      <strong>Κατάσταση:</strong> {consentStatus?.analytics ? 'Ενεργοποιημένα' : 'Απενεργοποιημένα'} - Απαιτείται συναίνεση
                    </p>
                    <p className="text-gray-700 mb-3">
                      Μας βοηθούν να κατανοήσουμε πώς οι επισκέπτες χρησιμοποιούν την ιστοσελίδα,
                      ώστε να μπορούμε να τη βελτιώσουμε.
                    </p>

                    <div className="bg-white rounded p-3 mt-3">
                      <h4 className="font-medium text-gray-900 mb-2">Τι θα συλλέγουμε (εάν συναινέσετε):</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Σελίδες που επισκέπτεστε και χρόνος παραμονής</li>
                        <li>Τρόπος πλοήγησης και αλληλεπίδρασης με τη σελίδα</li>
                        <li>Τεχνικές πληροφορίες (φυλλομετρητής, συσκευή, ανάλυση)</li>
                        <li>Ανώνυμα στατιστικά για τη βελτίωση των υπηρεσιών</li>
                      </ul>

                      <h4 className="font-medium text-gray-900 mb-2 mt-4">Πάροχοι τρίτων:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Google Analytics (εάν ενεργοποιηθεί στο μέλλον)</li>
                        <li>Άλλα analytics tools που μπορεί να προστεθούν</li>
                      </ul>

                      <h4 className="font-medium text-gray-900 mb-2 mt-4">Νομική Βάση:</h4>
                      <p className="text-sm text-gray-700">
                        Συναίνεση - Μπορείτε να αποσύρετε τη συναίνεσή σας οποτεδήποτε
                      </p>
                    </div>
                  </div>

                  {/* Marketing Cookies */}
                  <div className="border border-purple-200 rounded-lg p-4 bg-purple-50">
                    <h3 className="text-xl font-medium text-purple-900 mb-3 flex items-center">
                      <span className="w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                      Marketing Cookies (Προαιρετικά)
                    </h3>
                    <p className="text-purple-800 mb-3">
                      <strong>Κατάσταση:</strong> {consentStatus?.marketing ? 'Ενεργοποιημένα' : 'Απενεργοποιημένα'} - Απαιτείται συναίνεση
                    </p>
                    <p className="text-gray-700 mb-3">
                      Χρησιμοποιούνται για την παροχή στοχευμένων διαφημίσεων και την παρακολούθηση
                      της αποτελεσματικότητας των διαφημιστικών καμπανιών.
                    </p>

                    <div className="bg-white rounded p-3 mt-3">
                      <h4 className="font-medium text-gray-900 mb-2">Τι θα συλλέγουμε (εάν συναινέσετε):</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Δεδομένα για εξατομικευμένες διαφημίσεις</li>
                        <li>Tracking εργιμότητας διαφημιστικών καμπανιών</li>
                        <li>Retargeting pixels για remarketing</li>
                        <li>Conversion tracking</li>
                      </ul>

                      <h4 className="font-medium text-gray-900 mb-2 mt-4">Πάροχοι τρίτων:</h4>
                      <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                        <li>Facebook Pixel (εάν ενεργοποιηθεί στο μέλλον)</li>
                        <li>Google Ads (εάν ενεργοποιηθεί στο μέλλον)</li>
                        <li>Άλλες διαφημιστικές πλατφόρμες</li>
                      </ul>

                      <h4 className="font-medium text-gray-900 mb-2 mt-4">Νομική Βάση:</h4>
                      <p className="text-sm text-gray-700">
                        Συναίνεση - Μπορείτε να αποσύρετε τη συναίνεσή σας οποτεδήποτε
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Διαχείριση Cookies</h2>

                <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 Ρυθμίσεις Πλατφόρμας</h3>
                <p className="text-gray-700 mb-4">
                  Μπορείτε να διαχειριστείτε τις προτιμήσεις σας για cookies:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Από τις ρυθμίσεις του λογαριασμού σας</li>
                  <li>Κάνοντας κλικ στο κουμπί "Αλλαγή Προτιμήσεων" παραπάνω</li>
                  <li>Επικοινωνώντας μαζί μας στο privacy@erasmos.gr</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">3.2 Ρυθμίσεις Φυλλομετρητή</h3>
                <p className="text-gray-700 mb-4">
                  Μπορείτε επίσης να διαχειριστείτε τα cookies μέσω των ρυθμίσεων του φυλλομετρητή σας:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li><strong>Chrome:</strong> Ρυθμίσεις → Απόρρητο και ασφάλεια → Cookies</li>
                    <li><strong>Firefox:</strong> Ρυθμίσεις → Απόρρητο και Ασφάλεια</li>
                    <li><strong>Safari:</strong> Προτιμήσεις → Απόρρητο</li>
                    <li><strong>Edge:</strong> Ρυθμίσεις → Cookies και δικαιώματα ιστότοπου</li>
                  </ul>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm text-yellow-800">
                    <strong>Σημείωση:</strong> Η απενεργοποίηση των απαραίτητων cookies μπορεί να επηρεάσει
                    τη λειτουργικότητα της πλατφόρμας και μπορεί να μην μπορέσετε να χρησιμοποιήσετε
                    ορισμένες υπηρεσίες.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Cookies Τρίτων</h2>
                <p className="text-gray-700 mb-4">
                  Κάποια cookies ενδέχεται να τοποθετηθούν από τρίτους παρόχους υπηρεσιών.
                  Αυτά τα cookies διέπονται από τις δικές τους πολιτικές απορρήτου:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Google Analytics - <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Πολιτική Απορρήτου</a></li>
                  <li>Facebook - <a href="https://www.facebook.com/privacy/explanation" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">Πολιτική Απορρήτου</a></li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Τα Δικαιώματά σας</h2>
                <p className="text-gray-700 mb-4">Σύμφωνα με το GDPR, έχετε τα ακόλουθα δικαιώματα:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li><strong>Πρόσβαση:</strong> Δικαίωμα ενημέρωσης για τα cookies που χρησιμοποιούμε</li>
                  <li><strong>Συναίνεση:</strong> Δικαίωμα παροχής ή άρνησης συναίνεσης</li>
                  <li><strong>Απόσυρση:</strong> Δικαίωμα απόσυρσης συναίνεσης οποτεδήποτε</li>
                  <li><strong>Αντίρρηση:</strong> Δικαίωμα αντίρρησης στη χρήση cookies marketing</li>
                  <li><strong>Διαγραφή:</strong> Δικαίωμα διαγραφής δεδομένων από cookies</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Επικοινωνία</h2>
                <p className="text-gray-700 mb-4">
                  Για ερωτήσεις σχετικά με τη χρήση cookies ή για την άσκηση των δικαιωμάτων σας:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> privacy@erasmos.gr<br />
                    <strong>Ταχυδρομική διεύθυνση:</strong> [Διεύθυνση]<br />
                    <strong>Τηλέφωνο:</strong> [Τηλέφωνο]
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Ενημερώσεις</h2>
                <p className="text-gray-700">
                  Αυτή η πολιτική cookies μπορεί να ενημερωθεί περιστασιακά για να αντικατοπτρίζει
                  αλλαγές στις πρακτικές μας ή για άλλους λειτουργικούς, νομικούς ή κανονιστικούς λόγους.
                  Θα σας ενημερώσουμε για τυχόν σημαντικές αλλαγές.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicyPage;