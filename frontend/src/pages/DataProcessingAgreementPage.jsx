import React from 'react';

const DataProcessingAgreementPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Συμφωνία Επεξεργασίας Δεδομένων (DPA)
              </h1>
              <p className="text-gray-600">
                Data Processing Agreement σύμφωνα με το GDPR
              </p>
              <p className="text-gray-600">
                Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-gray max-w-none">

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Ορισμοί και Μέρη</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-blue-900 mb-3">📋 Μέρη της Συμφωνίας</h3>

                  <div className="space-y-4 text-blue-800">
                    <div>
                      <p><strong>🏢 ΥΠΕΥΘΥΝΟΣ ΕΠΕΞΕΡΓΑΣΙΑΣ (Data Controller):</strong></p>
                      <p className="ml-4">Ο ΧΡΗΣΤΗΣ της πλατφόρμας Erasmos</p>
                      <p className="ml-4 text-sm">Καθορίζει τους σκοπούς και τα μέσα επεξεργασίας των προσωπικών δεδομένων</p>
                    </div>

                    <div>
                      <p><strong>⚙️ ΕΚΤΕΛΩΝ ΕΠΕΞΕΡΓΑΣΙΑ (Data Processor):</strong></p>
                      <p className="ml-4">Σίκαλος Θεολόγης του Κωνσταντίνου (ΑΦΜ: 149419728)</p>
                      <p className="ml-4">Διεύθυνση: Παύλου Μελά 10, Σέρρες, 62122</p>
                      <p className="ml-4 text-sm">Επεξεργάζεται δεδομένα για λογαριασμό του Υπευθύνου Επεξεργασίας</p>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Ορισμοί:</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>"GDPR":</strong> Γενικός Κανονισμός Προστασίας Δεδομένων (EU) 2016/679</li>
                  <li><strong>"Προσωπικά Δεδομένα":</strong> Όπως ορίζονται στο άρθρο 4(1) του GDPR</li>
                  <li><strong>"Επεξεργασία":</strong> Όπως ορίζεται στο άρθρο 4(2) του GDPR</li>
                  <li><strong>"Υποκείμενο Δεδομένων":</strong> Όπως ορίζεται στο άρθρο 4(1) του GDPR</li>
                  <li><strong>"Παραβίαση Δεδομένων":</strong> Όπως ορίζεται στο άρθρο 4(12) του GDPR</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Αντικείμενο και Διάρκεια</h2>
                <p className="text-gray-700 mb-4">
                  Η παρούσα συμφωνία διέπει την επεξεργασία προσωπικών δεδομένων από τον
                  Εκτελούντα Επεξεργασία για λογαριασμό του Υπευθύνου Επεξεργασίας μέσω
                  της πλατφόρμας Erasmos.
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>Διάρκεια:</strong> Η συμφωνία ισχύει όσο διαρκεί η χρήση της υπηρεσίας
                  και για επιπλέον 7 έτη για σκοπούς φορολογικής συμμόρφωσης.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Κατηγορίες Δεδομένων και Σκοποί Επεξεργασίας</h2>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Κατηγορίες Προσωπικών Δεδομένων:</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Στοιχεία ταυτότητας (ονοματεπώνυμο, ΑΦΜ, αριθμός ταυτότητας)</li>
                  <li>Στοιχεία επικοινωνίας (διεύθυνση, τηλέφωνο, email)</li>
                  <li>Οικονομικά στοιχεία (εισόδημα, περιουσιακά στοιχεία)</li>
                  <li>Επαγγελματικά στοιχεία</li>
                  <li>Οικογενειακά στοιχεία</li>
                  <li>Επισυναπτόμενα έγγραφα και αρχεία</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Κατηγορίες Υποκειμένων:</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Πελάτες του Υπευθύνου Επεξεργασίας</li>
                  <li>Μέλη οικογένειας πελατών</li>
                  <li>Εγγυητές και συνυπογράφοντες</li>
                </ul>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Σκοποί Επεξεργασίας:</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Δημιουργία και διαχείριση αιτήσεων</li>
                  <li>Παραγωγή PDF εγγράφων</li>
                  <li>Αποθήκευση και οργάνωση δεδομένων</li>
                  <li>Παρακολούθηση προόδου αιτήσεων</li>
                  <li>Τεχνική υποστήριξη υπηρεσίας</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Υποχρεώσεις Εκτελούντος Επεξεργασία</h2>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-green-900 mb-3">🔒 Τεχνικά και Οργανωτικά Μέτρα</h3>

                  <div className="space-y-3 text-green-800">
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Κρυπτογράφηση:</strong> Δεδομένα σε μεταφορά (TLS) και σε ανάπαυση (AES-256)</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Έλεγχος Πρόσβασης:</strong> Αυθεντικοποίηση, εξουσιοδότηση, audit logs</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Αντίγραφα Ασφαλείας:</strong> Τακτικά αντίγραφα με κρυπτογράφηση</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Παρακολούθηση:</strong> Συνεχής παρακολούθηση για security incidents</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Εκπαίδευση:</strong> Τακτική εκπαίδευση προσωπικού σε GDPR</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Γενικές Υποχρεώσεις:</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Επεξεργασία μόνο σύμφωνα με οδηγίες του Υπευθύνου</li>
                  <li>Διασφάλιση εμπιστευτικότητας</li>
                  <li>Υποστήριξη δικαιωμάτων υποκειμένων δεδομένων</li>
                  <li>Συνεργασία σε audits και επιθεωρήσεις</li>
                  <li>Διαγραφή ή επιστροφή δεδομένων μετά τη λήξη</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Υπο-εκτελούντες Επεξεργασία</h2>
                <p className="text-gray-700 mb-4">
                  Ο Εκτελών Επεξεργασία μπορεί να χρησιμοποιεί τρίτους υπηρεσιών (υπο-εκτελούντες)
                  μόνο με την προηγούμενη συγκατάθεση του Υπευθύνου Επεξεργασίας.
                </p>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Εγκεκριμένοι Υπο-εκτελούντες:</h3>
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    <li>Hosting providers (για cloud infrastructure)</li>
                    <li>Email service providers (για notifications)</li>
                    <li>Backup service providers (για data redundancy)</li>
                    <li>Security monitoring services</li>
                  </ul>
                </div>

                <p className="text-gray-700 mb-4">
                  Όλοι οι υπο-εκτελούντες δεσμεύονται από ισοδύναμες υποχρεώσεις προστασίας δεδομένων.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Παραβιάσεις Δεδομένων</h2>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-red-900 mb-3">🚨 Διαδικασία Αντιμετώπισης</h3>

                  <div className="space-y-3 text-red-800">
                    <p><strong>Ειδοποίηση:</strong> Ο Εκτελών θα ειδοποιήσει τον Υπεύθυνο εντός 24 ωρών από την ανακάλυψη παραβίασης</p>
                    <p><strong>Πληροφορίες:</strong> Η ειδοποίηση θα περιλαμβάνει όλες τις διαθέσιμες πληροφορίες</p>
                    <p><strong>Συνεργασία:</strong> Συνεργασία για αντιμετώπιση και μείωση επιπτώσεων</p>
                    <p><strong>Τεκμηρίωση:</strong> Διατήρηση αρχείου όλων των παραβιάσεων</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Δικαιώματα Υποκειμένων Δεδομένων</h2>
                <p className="text-gray-700 mb-4">
                  Ο Εκτελών θα υποστηρίξει τον Υπεύθυνο στην εκπλήρωση των υποχρεώσεών του
                  σχετικά με τα δικαιώματα των υποκειμένων δεδομένων:
                </p>

                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li><strong>Δικαίωμα πρόσβασης</strong> (άρθρο 15 GDPR)</li>
                  <li><strong>Δικαίωμα διόρθωσης</strong> (άρθρο 16 GDPR)</li>
                  <li><strong>Δικαίωμα διαγραφής</strong> (άρθρο 17 GDPR)</li>
                  <li><strong>Δικαίωμα περιορισμού επεξεργασίας</strong> (άρθρο 18 GDPR)</li>
                  <li><strong>Δικαίωμα φορητότητας</strong> (άρθρο 20 GDPR)</li>
                  <li><strong>Δικαίωμα αντίρρησης</strong> (άρθρο 21 GDPR)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Διεθνείς Μεταφορές</h2>
                <p className="text-gray-700 mb-4">
                  Τα δεδομένα επεξεργάζονται εντός της Ευρωπαϊκής Ένωσης. Τυχόν μεταφορές
                  εκτός ΕΕ θα γίνονται μόνο με κατάλληλες εγγυήσεις σύμφωνα με το GDPR.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Audits και Επιθεωρήσεις</h2>
                <p className="text-gray-700 mb-4">
                  Ο Υπεύθυνος Επεξεργασίας έχει το δικαίωμα να διενεργεί audits για τη
                  συμμόρφωση με την παρούσα συμφωνία. Ο Εκτελών θα παρέχει όλη την
                  απαραίτητη συνεργασία.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Διάρκεια και Λήξη</h2>
                <p className="text-gray-700 mb-4">
                  Η συμφωνία ισχύει όσο διαρκεί η κύρια σύμβαση υπηρεσιών. Μετά τη λήξη:
                </p>

                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Διαγραφή ή επιστροφή όλων των προσωπικών δεδομένων</li>
                  <li>Διαγραφή αντιγράφων (εκτός από νομικές υποχρεώσεις)</li>
                  <li>Βεβαίωση ολοκλήρωσης διαγραφής</li>
                  <li>Διατήρηση logs για 7 έτη (φορολογικοί λόγοι)</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Ευθύνη και Αποζημιώσεις</h2>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-yellow-900 mb-3">⚠️ Κατανομή Ευθυνών</h3>

                  <div className="space-y-3 text-yellow-800">
                    <p><strong>Υπεύθυνος Επεξεργασίας:</strong> Υπεύθυνος για νομιμότητα επεξεργασίας, συναινέσεις, ενημέρωση υποκειμένων</p>
                    <p><strong>Εκτελών Επεξεργασίας:</strong> Υπεύθυνος για τεχνική ασφάλεια, συμμόρφωση με οδηγίες, ειδοποίηση παραβιάσεων</p>
                    <p><strong>Περιορισμός:</strong> Η ευθύνη του Εκτελούντος περιορίζεται σε περιπτώσεις δόλου ή βαριάς αμέλειας</p>
                  </div>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Τροποποιήσεις και Εφαρμοστέο Δίκαιο</h2>
                <p className="text-gray-700 mb-4">
                  Τροποποιήσεις της συμφωνίας γίνονται εγγράφως. Εφαρμοστέο δίκαιο το ελληνικό
                  και το ενωσιακό δίκαιο. Αρμόδια δικαστήρια αυτά των Σερρών.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Επικοινωνία</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Για θέματα προστασίας δεδομένων:</strong><br />
                    Email: dpo@erasmos.gr<br />
                    Διεύθυνση: Παύλου Μελά 10, Σέρρες, 62122<br />
                    Τηλέφωνο: [Τηλέφωνο επικοινωνίας]
                  </p>
                </div>
              </section>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
                <p className="text-blue-800 text-center font-medium">
                  📋 Η παρούσα συμφωνία συμπληρώνει τους Όρους Χρήσης και την Πολιτική Απορρήτου.
                  Η αποδοχή της συνεπάγεται συμμόρφωση με όλες τις διατάξεις του GDPR.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataProcessingAgreementPage;