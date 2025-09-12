import React, { useContext, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const TermsPage = () => {
    const { userAcceptedTerms } = useContext(AuthContext);
    const [loading, setLoading] = useState(false);
    const [scrolledToBottom, setScrolledToBottom] = useState(false);

    const handleScroll = (e) => {
        const element = e.target;
        if (element.scrollTop + element.clientHeight >= element.scrollHeight - 5) {
            setScrolledToBottom(true);
        }
    };

    const handleAccept = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3000/api/users/accept-terms', {});
            // Παίρνουμε το νέο token από το backend και ενημερώνουμε το context
            userAcceptedTerms(res.data.token);
        } catch (err) {
            console.error("Failed to accept terms", err);
            alert("An error occurred. Please try again.");
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="form-container" style={{maxWidth: '700px'}}>
                <h2>Όροι Χρήσης & Πολιτική Προστασίας Δεδομένων (GDPR)</h2>
                <div 
                    style={{
                        textAlign: 'left', 
                        maxHeight: '400px', 
                        overflowY: 'auto', 
                        border: '1px solid #ccc', 
                        padding: '1.5rem',
                        marginBottom: '1rem',
                        fontSize: '14px',
                        lineHeight: '1.6'
                    }}
                    onScroll={handleScroll}
                >
                    <h3>1. ΑΠΟΔΟΧΗ ΟΡΩΝ</h3>
                    <p>Η χρήση της εφαρμογής Έρασμος συνιστά αποδοχή των παρόντων όρων χρήσης και της πολιτικής προστασίας δεδομένων.</p>
                    
                    <h3>2. ΧΡΗΣΗ ΤΗΣ ΠΛΑΤΦΟΡΜΑΣ</h3>
                    <p>Η πλατφόρμα προορίζεται για τη διαχείριση εργασιών, πελατών, και παρακολούθηση προμηθειών. Ο χρήστης αναλαμβάνει την ευθύνη για τη σωστή και νόμιμη χρήση.</p>

                    <h3>3. ΠΡΟΣΤΑΣΙΑ ΔΕΔΟΜΕΝΩΝ (GDPR)</h3>
                    <p><strong>Συλλογή Δεδομένων:</strong> Συλλέγουμε προσωπικά δεδομένα που είναι απαραίτητα για τη λειτουργία της πλατφόρμας:</p>
                    <ul>
                        <li>Στοιχεία χρήστη (όνομα, email, ρόλος)</li>
                        <li>Στοιχεία πελατών και εταιρειών</li>
                        <li>Οικονομικά στοιχεία (προμήθειες, πληρωμές)</li>
                        <li>Τεχνικά δεδομένα (IP address, user agent) για λόγους ασφαλείας</li>
                    </ul>
                    
                    <p><strong>Σκοπός Επεξεργασίας:</strong> Τα δεδομένα χρησιμοποιούνται για:</p>
                    <ul>
                        <li>Παροχή υπηρεσιών της πλατφόρμας</li>
                        <li>Υπολογισμό και καταβολή προμηθειών</li>
                        <li>Στατιστικά και αναφορές</li>
                        <li>Ασφάλεια και αποτροπή κατάχρησης</li>
                    </ul>

                    <p><strong>Νομική Βάση:</strong> Η επεξεργασία βασίζεται στη συναίνεση και το έννομο συμφέρον για την εκτέλεση συμβάσεων.</p>

                    <p><strong>Διατήρηση:</strong> Τα δεδομένα διατηρούνται όσο διάστημα είναι απαραίτητο για τους σκοπούς επεξεργασίας και σύμφωνα με τις νομικές υποχρεώσεις.</p>

                    <p><strong>Δικαιώματά σας:</strong> Έχετε δικαίωμα πρόσβασης, διόρθωσης, διαγραφής, περιορισμού επεξεργασίας, φορητότητας δεδομένων και εναντίωσης.</p>

                    <h3>4. ΑΣΦΑΛΕΙΑ</h3>
                    <p>Εφαρμόζουμε κατάλληλα τεχνικά και οργανωτικά μέτρα για την προστασία των δεδομένων σας.</p>

                    <h3>5. ΑΛΛΑΓΕΣ ΣΤΟΥΣ ΟΡΟΥΣ</h3>
                    <p>Διατηρούμε το δικαίωμα τροποποίησης των παρόντων όρων. Οι χρήστες θα ενημερώνονται για σημαντικές αλλαγές.</p>

                    <h3>6. ΕΠΙΚΟΙΝΩΝΙΑ</h3>
                    <p>Για οποιαδήποτε ερώτηση ή άσκηση των δικαιωμάτων σας, επικοινωνήστε με τον διαχειριστή της πλατφόρμας.</p>

                    <hr style={{margin: '1.5rem 0'}} />
                    <p style={{fontSize: '12px', color: '#666'}}>
                        Ημερομηνία τελευταίας ενημέρωσης: {new Date().toLocaleDateString('el-GR')}
                    </p>
                </div>
                
                <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'flex', alignItems: 'center', fontSize: '14px'}}>
                        <input 
                            type="checkbox" 
                            checked={scrolledToBottom} 
                            onChange={() => setScrolledToBottom(!scrolledToBottom)}
                            style={{marginRight: '0.5rem'}}
                        />
                        Έχω διαβάσει και συμφωνώ με τους όρους χρήσης και την πολιτική προστασίας δεδομένων
                    </label>
                </div>

                <button 
                    onClick={handleAccept} 
                    disabled={loading || !scrolledToBottom}
                    style={{
                        backgroundColor: scrolledToBottom ? '#007bff' : '#ccc',
                        cursor: scrolledToBottom ? 'pointer' : 'not-allowed'
                    }}
                >
                    {loading ? 'Επεξεργασία...' : 'Αποδέχομαι τους Όρους'}
                </button>
            </div>
        </div>
    );
};
export default TermsPage;