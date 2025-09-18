import React from 'react';

const TermsOfServicePage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-8">

            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Όροι Χρήσης Υπηρεσίας
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
                  Η παρούσα συμφωνία ("Όροι Χρήσης") διέπει τη χρήση της πλατφόρμας Erasmos,
                  που παρέχεται από τον <strong>Σίκαλο Θεολόγη του Κωνσταντίνου</strong>
                  (ΑΦΜ: 149419728), με έδρα την Παύλου Μελά 10, Σέρρες, 62122 ("Πάροχος", "εμείς", "μας").
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-red-800 font-medium">
                    ⚠️ <strong>ΣΗΜΑΝΤΙΚΗ ΕΙΔΟΠΟΙΗΣΗ:</strong> Διαβάστε προσεκτικά αυτούς τους όρους.
                    Η χρήση της υπηρεσίας συνεπάγεται πλήρη αποδοχή όλων των όρων.
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Ορισμοί</h2>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
                  <li><strong>"Υπηρεσία":</strong> Η πλατφόρμα Erasmos και όλες οι σχετικές λειτουργίες</li>
                  <li><strong>"Χρήστης":</strong> Κάθε φυσικό ή νομικό πρόσωπο που χρησιμοποιεί την υπηρεσία</li>
                  <li><strong>"Περιεχόμενο Χρήστη":</strong> Όλα τα δεδομένα, αρχεία και πληροφορίες που εισάγει ο χρήστης</li>
                  <li><strong>"Προσωπικά Δεδομένα":</strong> Δεδομένα που αφορούν αναγνωρισμένα ή αναγνωρίσιμα φυσικά πρόσωπα</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Αποδοχή Όρων</h2>
                <p className="text-gray-700 mb-4">
                  Η πρόσβαση και χρήση της υπηρεσίας συνεπάγεται την αποδοχή αυτών των όρων.
                  Εάν δεν συμφωνείτε με οποιονδήποτε όρο, παρακαλούμε μην χρησιμοποιείτε την υπηρεσία.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Περιγραφή Υπηρεσίας</h2>
                <p className="text-gray-700 mb-4">
                  Η πλατφόρμα Erasmos παρέχει λογισμικό διαχείρισης αιτήσεων και εγγράφων.
                  Η υπηρεσία επιτρέπει στους χρήστες να:
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Δημιουργούν και διαχειρίζονται αιτήσεις</li>
                  <li>Αποθηκεύουν και επεξεργάζονται προσωπικά δεδομένα</li>
                  <li>Δημιουργούν PDF έγγραφα</li>
                  <li>Παρακολουθούν την πρόοδο αιτήσεων</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Υποχρεώσεις και Δηλώσεις Χρήστη</h2>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-blue-900 mb-3">🔒 Κρίσιμες Δηλώσεις Συμμόρφωσης</h3>
                  <p className="text-blue-800 mb-4">Ο χρήστης δηλώνει και εγγυάται ότι:</p>

                  <div className="space-y-3 text-blue-800">
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Νόμιμη Συλλογή:</strong> Έχει συλλέξει νόμιμα όλα τα προσωπικά δεδομένα που εισάγει στην πλατφόρμα</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>GDPR Compliance:</strong> Έχει λάβει όλες τις απαραίτητες συναινέσεις από τα υποκείμενα των δεδομένων</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Ενημέρωση:</strong> Έχει ενημερώσει πλήρως τους πελάτες του σύμφωνα με το GDPR</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Δικαιοδοσία:</strong> Έχει την εξουσιοδότηση να επεξεργάζεται τα δεδομένα που εισάγει</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-green-600 font-bold">✓</span>
                      <span><strong>Ακρίβεια:</strong> Όλα τα στοιχεία που εισάγει είναι ακριβή και ενημερωμένα</span>
                    </div>
                  </div>
                </div>

                <h3 className="text-xl font-medium text-gray-900 mb-3">Επιπλέον Υποχρεώσεις:</h3>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Να διατηρεί την εμπιστευτικότητα των στοιχείων πρόσβασης</li>
                  <li>Να χρησιμοποιεί την υπηρεσία μόνο για νόμιμους σκοπούς</li>
                  <li>Να μην παραβιάζει δικαιώματα τρίτων</li>
                  <li>Να ενημερώνει άμεσα για τυχόν security incidents</li>
                  <li>Να συμμορφώνεται με την ελληνική και ευρωπαϊκή νομοθεσία</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Αποποίηση Ευθύνης</h2>

                <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-red-900 mb-3">⚠️ Περιορισμός Ευθύνης</h3>

                  <div className="space-y-4 text-red-800">
                    <p><strong>Η ΥΠΗΡΕΣΙΑ ΠΑΡΕΧΕΤΑΙ "ΩΣ ΕΧΕΙ" ΧΩΡΙΣ ΚΑΜΙΑ ΕΓΓΥΗΣΗ.</strong></p>

                    <p><strong>Ο ΠΑΡΟΧΟΣ ΔΕΝ ΦΕΡΕΙ ΚΑΜΙΑ ΕΥΘΥΝΗ ΓΙΑ:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Παραβιάσεις GDPR από χρήστες</li>
                      <li>Μη νόμιμη συλλογή προσωπικών δεδομένων</li>
                      <li>Ανακρίβειες στο περιεχόμενο χρηστών</li>
                      <li>Απώλεια ή κλοπή δεδομένων</li>
                      <li>Διακοπές υπηρεσίας</li>
                      <li>Ζημίες σε τρίτους</li>
                      <li>Νομικές συνέπειες από χρήση της υπηρεσίας</li>
                    </ul>
                  </div>
                </div>

                <p className="text-gray-700 mb-4">
                  Ο χρήστης αναλαμβάνει την πλήρη ευθύνη για τη χρήση της υπηρεσίας και
                  αναλαμβάνει να αποζημιώσει τον πάροχο για τυχόν ζημίες που μπορεί να προκύψουν.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Διαθεσιμότητα Υπηρεσίας</h2>
                <p className="text-gray-700 mb-4">
                  Δεν εγγυόμαστε την αδιάλειπτη λειτουργία της υπηρεσίας. Μπορούμε να
                  διακόψουμε προσωρινά την υπηρεσία για συντήρηση ή τεχνικούς λόγους.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Οικονομικοί Όροι</h2>
                <p className="text-gray-700 mb-4">
                  Η χρήση της υπηρεσίας διέπεται από τους οικονομικούς όρους που ισχύουν κατά
                  την εγγραφή. Οι χρεώσεις και οι όροι πληρωμής μπορεί να αλλάξουν με προηγούμενη ειδοποίηση.
                </p>
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  <li>Οι τιμές είναι σε ευρώ και περιλαμβάνουν ΦΠΑ</li>
                  <li>Η πληρωμή γίνεται προκαταβολικά</li>
                  <li>Δεν υπάρχουν επιστροφές για μερική χρήση</li>
                  <li>Καθυστερημένες πληρωμές μπορεί να οδηγήσουν σε διακοπή υπηρεσίας</li>
                </ul>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Πνευματική Ιδιοκτησία</h2>
                <p className="text-gray-700 mb-4">
                  Όλα τα δικαιώματα πνευματικής ιδιοκτησίας της πλατφόρμας ανήκουν στον πάροχο.
                  Ο χρήστης διατηρεί τα δικαιώματά του επί του περιεχομένου που εισάγει.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Καταγγελία Συμφωνίας</h2>
                <p className="text-gray-700 mb-4">
                  Η συμφωνία μπορεί να καταγγελθεί από οποιοδήποτε μέρος με προηγούμενη ειδοποίηση.
                  Μετά την καταγγελία, τα δεδομένα του χρήστη θα διατηρηθούν σύμφωνα με τις
                  νομικές υποχρεώσεις μας.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Τροποποιήσεις Όρων</h2>
                <p className="text-gray-700 mb-4">
                  Διατηρούμε το δικαίωμα να τροποποιήσουμε αυτούς τους όρους. Οι χρήστες θα
                  ενημερώνονται για σημαντικές αλλαγές και θα πρέπει να αποδεχθούν τους νέους όρους.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Εφαρμοστέο Δίκαιο και Δικαιοδοσία</h2>
                <p className="text-gray-700 mb-4">
                  Η παρούσα συμφωνία διέπεται από το ελληνικό δίκαιο. Για τυχόν διαφορές
                  αρμόδια είναι τα δικαστήρια των Σερρών.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Επικοινωνία</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">
                    <strong>Πάροχος Υπηρεσίας:</strong><br />
                    Σίκαλος Θεολόγης του Κωνσταντίνου<br />
                    ΑΦΜ: 149419728<br />
                    Διεύθυνση: Παύλου Μελά 10, Σέρρες, 62122<br />
                    Email: legal@erasmos.gr
                  </p>
                </div>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Τελικές Διατάξεις</h2>
                <p className="text-gray-700 mb-4">
                  Εάν κάποια διάταξη αυτών των όρων κριθεί άκυρη, οι υπόλοιπες διατάξεις
                  παραμένουν σε ισχύ. Η παράλειψη επιβολής οποιουδήποτε όρου δεν συνιστά
                  παραίτηση από τα δικαιώματά μας.
                </p>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-6">
                  <p className="text-green-800 text-center font-medium">
                    📄 Με την αποδοχή αυτών των όρων αναγνωρίζετε ότι τους έχετε διαβάσει,
                    τους κατανοείτε και συμφωνείτε να δεσμευτείτε από αυτούς.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;