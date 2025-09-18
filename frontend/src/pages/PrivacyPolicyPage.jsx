import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Πολιτική Απορρήτου
              </h1>
              <p className="text-gray-600">
                Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Γενικές Πληροφορίες</h2>
                <p className="text-gray-700 mb-4">
                  Η παρούσα Πολιτική Απορρήτου περιγράφει τον τρόπο με τον οποίο η πλατφόρμα Erasmos
                  συλλέγει, χρησιμοποιεί και προστατεύει τα προσωπικά σας δεδομένα σύμφωνα με τον
                  Γενικό Κανονισμό Προστασίας Δεδομένων (GDPR) και την ελληνική νομοθεσία.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Υπεύθυνος Επεξεργασίας</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Επωνυμία:</strong> [Όνομα Εταιρείας]<br />
                    <strong>Διεύθυνση:</strong> [Διεύθυνση]<br />
                    <strong>Email:</strong> privacy@erasmos.gr<br />
                    <strong>Τηλέφωνο:</strong> [Τηλέφωνο]
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Δεδομένα που Συλλέγουμε</h2>

                <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 Δεδομένα Λογαριασμού</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Όνομα και επώνυμο</li>
                  <li>Διεύθυνση email</li>
                  <li>Κωδικός πρόσβασης (κρυπτογραφημένος)</li>
                  <li>Ρόλος χρήστη (agent, admin κ.λπ.)</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">3.2 Δεδομένα Αιτήσεων</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Στοιχεία πελατών (όνομα, διεύθυνση, τηλέφωνο)</li>
                  <li>Οικονομικά στοιχεία (εισόδημα, περιουσιακά στοιχεία)</li>
                  <li>Επαγγελματικά στοιχεία</li>
                  <li>Επισυναπτόμενα έγγραφα και αρχεία</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">3.3 Τεχνικά Δεδομένα</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Διεύθυνση IP</li>
                  <li>Στοιχεία φυλλομετρητή (User-Agent)</li>
                  <li>Πληροφορίες συσκευής και λειτουργικού συστήματος</li>
                  <li>Ημερομηνία και ώρα πρόσβασης</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Σκοπός Επεξεργασίας</h2>
                <p className="text-gray-700 mb-4">Επεξεργαζόμαστε τα δεδομένα σας για τους ακόλουθους σκοπούς:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Παροχή υπηρεσιών διαχείρισης αιτήσεων</li>
                  <li>Δημιουργία και επεξεργασία PDF εγγράφων</li>
                  <li>Επικοινωνία με πελάτες και χρήστες</li>
                  <li>Τεχνική υποστήριξη και βελτίωση υπηρεσιών</li>
                  <li>Συμμόρφωση με νομικές υποχρεώσεις</li>
                  <li>Ασφάλεια και προστασία της πλατφόρμας</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Νομική Βάση Επεξεργασίας</h2>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li><strong>Συναίνεση:</strong> Για προαιρετικές λειτουργίες και επικοινωνία</li>
                  <li><strong>Εκτέλεση σύμβασης:</strong> Για παροχή υπηρεσιών</li>
                  <li><strong>Νόμιμο συμφέρον:</strong> Για ασφάλεια και βελτίωση υπηρεσιών</li>
                  <li><strong>Νομική υποχρέωση:</strong> Για συμμόρφωση με νομοθεσία</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Διατήρηση Δεδομένων</h2>
                <p className="text-gray-700 mb-4">
                  Διατηρούμε τα δεδομένα σας για όσο διάστημα είναι απαραίτητο για την εκπλήρωση
                  των σκοπών που περιγράφονται σε αυτή την πολιτική ή όπως απαιτείται από τη νομοθεσία.
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li><strong>Δεδομένα λογαριασμού:</strong> Έως τη διαγραφή του λογαριασμού</li>
                  <li><strong>Δεδομένα αιτήσεων:</strong> 7 έτη (φορολογικές υποχρεώσεις)</li>
                  <li><strong>Logs ασφαλείας:</strong> 1 έτος</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Τα Δικαιώματά σας</h2>
                <p className="text-gray-700 mb-4">Σύμφωνα με το GDPR, έχετε τα ακόλουθα δικαιώματα:</p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li><strong>Πρόσβαση:</strong> Ενημέρωση για τα δεδομένα που επεξεργαζόμαστε</li>
                  <li><strong>Διόρθωση:</strong> Επιδιόρθωση ανακριβών δεδομένων</li>
                  <li><strong>Διαγραφή:</strong> Αίτημα διαγραφής δεδομένων</li>
                  <li><strong>Περιορισμός:</strong> Περιορισμός επεξεργασίας</li>
                  <li><strong>Φορητότητα:</strong> Λήψη δεδομένων σε δομημένη μορφή</li>
                  <li><strong>Αντίρρηση:</strong> Αντίρρηση στην επεξεργασία</li>
                  <li><strong>Απόσυρση συναίνεσης:</strong> Όπου η επεξεργασία βασίζεται σε συναίνεση</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Ασφάλεια Δεδομένων</h2>
                <p className="text-gray-700 mb-4">
                  Εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα για την προστασία των
                  δεδομένων σας, συμπεριλαμβανομένων:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Κρυπτογράφηση δεδομένων σε μεταφορά και αποθήκευση</li>
                  <li>Έλεγχος πρόσβασης και αυθεντικοποίηση</li>
                  <li>Τακτικά αντίγραφα ασφαλείας</li>
                  <li>Παρακολούθηση και καταγραφή δραστηριοτήτων</li>
                  <li>Εκπαίδευση προσωπικού σε θέματα προστασίας δεδομένων</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Cookies και Tracking</h2>
                <p className="text-gray-700 mb-4">
                  Για λεπτομερείς πληροφορίες σχετικά με τη χρήση cookies, παρακαλούμε
                  ανατρέξτε στην {' '}
                  <a href="/cookie-policy" className="text-blue-600 hover:text-blue-800 underline">
                    Πολιτική Cookies
                  </a>.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Επικοινωνία</h2>
                <p className="text-gray-700 mb-4">
                  Για οποιαδήποτε ερώτηση σχετικά με αυτή την Πολιτική Απορρήτου ή για την άσκηση
                  των δικαιωμάτων σας, μπορείτε να επικοινωνήσετε μαζί μας:
                </p>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Email:</strong> privacy@erasmos.gr<br />
                    <strong>Ταχυδρομική διεύθυνση:</strong> [Διεύθυνση]<br />
                    <strong>Τηλέφωνο:</strong> [Τηλέφωνο]
                  </p>
                </div>
                <p className="text-gray-700 mt-4">
                  Έχετε επίσης το δικαίωμα να υποβάλετε καταγγελία στην Αρχή Προστασίας
                  Δεδομένων Προσωπικού Χαρακτήρα (www.dpa.gr).
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Τροποποιήσεις</h2>
                <p className="text-gray-700">
                  Διατηρούμε το δικαίωμα να τροποποιήσουμε αυτή την Πολιτική Απορρήτου.
                  Οποιεσδήποτε αλλαγές θα δημοσιεύονται σε αυτή τη σελίδα και θα ενημερώνουμε
                  τους χρήστες για σημαντικές αλλαγές μέσω email ή ειδοποίησης στην πλατφόρμα.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;