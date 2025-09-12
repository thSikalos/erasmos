import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const NotificationsPage = () => {
    const { token } = useContext(AuthContext);
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchDrafts = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:3000/api/notifications/drafts', config);
            setDrafts(res.data);
        } catch (err) {
            console.error("Failed to fetch drafts", err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => { fetchDrafts(); }, [token]);

    const handlePrepare = async () => {
        setMessage('Προετοιμασία μηνυμάτων, παρακαλώ περιμένετε...');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post('http://localhost:3000/api/notifications/prepare-summary', {}, config);
            setMessage('Τα προσχέδια μηνυμάτων ετοιμάστηκαν με επιτυχία!');
            fetchDrafts();
        } catch (err) {
            setMessage('Σφάλμα κατά την προετοιμασία των μηνυμάτων.');
        }
    };

    const handleSend = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(`http://localhost:3000/api/notifications/${id}/send`, {}, config);
            fetchDrafts();
        } catch (err) {
            console.error("Failed to send", err);
        }
    };
    
    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Ειδοποιήσεις</h1>
                <Link to="/dashboard" className="button-new">Πίσω στο Dashboard</Link>
            </header>
            <main>
                <div className="admin-section">
                    <h3>Μηνιαία Ενημέρωση Συνεργατών (Viber)</h3>
                    <p>Πατώντας το κουμπί, το σύστημα θα ετοιμάσει τα προσχέδια μηνυμάτων για τις αμοιβές του προηγούμενου μήνα.</p>
                    <button onClick={handlePrepare}>Προετοιμασία Μηνυμάτων</button>
                    {message && <p style={{textAlign: 'center', marginTop: '1rem'}}>{message}</p>}
                </div>

                <div className="history-section">
                    <h3>Προσχέδια προς Αποστολή</h3>
                    {loading ? <p>Loading drafts...</p> : (
                         <ul className="data-list">
                            {drafts.map(d => (
                                <li key={d.id}>
                                    <span>{d.message}</span>
                                    <div className="action-buttons">
                                        <button onClick={() => handleSend(d.id)} className="button-new">Αποστολή</button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </main>
        </div>
    );
};

export default NotificationsPage;