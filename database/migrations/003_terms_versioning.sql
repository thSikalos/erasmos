-- Terms Versioning & PDF Archival System
-- Run this after the previous step12 migration

-- 1. Create terms_versions table to store different versions of terms
CREATE TABLE terms_versions (
    id SERIAL PRIMARY KEY,
    version VARCHAR(10) NOT NULL UNIQUE, -- e.g., "1.0", "1.1", "2.0"
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Full terms content
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE -- Only one version should be active at a time
);

-- Insert current version of terms
INSERT INTO terms_versions (version, title, content, is_active) VALUES 
('1.0', 'Όροι Χρήσης & Πολιτική Προστασίας Δεδομένων (GDPR)', 
'1. ΑΠΟΔΟΧΗ ΟΡΩΝ
Η χρήση της εφαρμογής Έρασμος συνιστά αποδοχή των παρόντων όρων χρήσης και της πολιτικής προστασίας δεδομένων.

2. ΧΡΗΣΗ ΤΗΣ ΠΛΑΤΦΟΡΜΑΣ
Η πλατφόρμα προορίζεται για τη διαχείριση εργασιών, πελατών, και παρακολούθηση προμηθειών. Ο χρήστης αναλαμβάνει την ευθύνη για τη σωστή και νόμιμη χρήση.

3. ΠΡΟΣΤΑΣΙΑ ΔΕΔΟΜΕΝΩΝ (GDPR)
Συλλογή Δεδομένων: Συλλέγουμε προσωπικά δεδομένα που είναι απαραίτητα για τη λειτουργία της πλατφόρμας:
- Στοιχεία χρήστη (όνομα, email, ρόλος)
- Στοιχεία πελατών και εταιρειών
- Οικονομικά στοιχεία (προμήθειες, πληρωμές)
- Τεχνικά δεδομένα (IP address, user agent) για λόγους ασφαλείας

Σκοπός Επεξεργασίας: Τα δεδομένα χρησιμοποιούνται για:
- Παροχή υπηρεσιών της πλατφόρμας
- Υπολογισμό και καταβολή προμηθειών
- Στατιστικά και αναφορές
- Ασφάλεια και αποτροπή κατάχρησης

Νομική Βάση: Η επεξεργασία βασίζεται στη συναίνεση και το έννομο συμφέρον για την εκτέλεση συμβάσεων.

Διατήρηση: Τα δεδομένα διατηρούνται όσο διάστημα είναι απαραίτητο για τους σκοπούς επεξεργασίας και σύμφωνα με τις νομικές υποχρεώσεις.

Δικαιώματά σας: Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού επεξεργασίας, φορητότητας δεδομένων και εναντίωσης.

4. ΑΣΦΑΛΕΙΑ
Εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα για την προστασία των δεδομένων σας.

5. ΑΛΛΑΓΕΣ ΣΤΟΥΣ ΟΡΟΥΣ
Διατηρούμε το δικαίωμα τροποποίησης των παρόντων όρων. Οι χρήστες θα ενημερώνονται για σημαντικές αλλαγές.

6. ΕΠΙΚΟΙΝΩΝΙΑ
Για οποιαδήποτε ερώτηση ή άσκηση των δικαιωμάτων σας, επικοινωνήστε με τον διαχειριστή της πλατφόρμας.',
TRUE);

-- 2. Add terms_version_id to user_agreements table
ALTER TABLE user_agreements 
ADD COLUMN terms_version_id INTEGER REFERENCES terms_versions(id);

-- 3. Update existing agreements to use version 1.0
UPDATE user_agreements SET terms_version_id = 1 WHERE terms_version_id IS NULL;

-- 4. Make terms_version_id NOT NULL after the update
ALTER TABLE user_agreements 
ALTER COLUMN terms_version_id SET NOT NULL;

-- 5. Add index for better performance
CREATE INDEX idx_user_agreements_terms_version ON user_agreements(terms_version_id);

-- 6. Create view for easy agreement details with terms version
CREATE VIEW user_agreements_detailed AS
SELECT 
    ua.*,
    u.name as user_name,
    u.email as user_email,
    tv.version as terms_version,
    tv.title as terms_title,
    tv.content as terms_content
FROM user_agreements ua
JOIN users u ON ua.user_id = u.id
JOIN terms_versions tv ON ua.terms_version_id = tv.id;

COMMIT;