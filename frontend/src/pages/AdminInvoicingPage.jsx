import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const AdminInvoicingPage = () => {
    const { token } = useContext(AuthContext);
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTlId, setSelectedTlId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [message, setMessage] = useState('');
    const [generatedInvoice, setGeneratedInvoice] = useState(null);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [leadersRes, invoicesRes] = await Promise.all([
                axios.get('http://localhost:3000/api/users', config),
                axios.get('http://localhost:3000/api/admin-billing/invoices', config)
            ]);
            setTeamLeaders(leadersRes.data.filter(u => u.role === 'TeamLeader' || u.role === 'Admin'));
            setInvoices(invoicesRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const handleGenerate = async () => {
        setMessage('');
        setGeneratedInvoice(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { team_leader_id: parseInt(selectedTlId), startDate, endDate };
            const res = await axios.post('http://localhost:3000/api/admin-billing/invoices', body, config);
            setMessage('Η ταμειακή κατάσταση δημιουργήθηκε με επιτυχία!');
            setGeneratedInvoice(res.data);
            fetchData(); // Refresh invoices after generating a new one
        } catch (err) {
            setMessage(err.response?.data?.message || 'Σφάλμα κατά τη δημιουργία.');
        }
    };

    const handleDownloadPdf = (invoiceId) => {
        const url = `http://localhost:3000/api/admin-billing/invoices/${invoiceId}/pdf?token=${token}`;
        window.open(url, '_blank');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Χρέωση Ομαδαρχών</h1>
                <Link to="/admin" className="button-new">Πίσω στο Admin Panel</Link>
            </header>
            <main>
                <div className="admin-section">
                    <h3>Έκδοση Ταμειακής Κατάστασης</h3>
                    <div className="filters-grid">
                        <div className="form-group">
                            <label>Επιλογή Ομαδάρχη</label>
                            <select value={selectedTlId} onChange={e => setSelectedTlId(e.target.value)}>
                                <option value="">-- Διάλεξε Ομαδάρχη --</option>
                                {teamLeaders.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Από Ημερομηνία</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label>Έως Ημερομηνία</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                    </div>
                    <button onClick={handleGenerate} disabled={!selectedTlId || !startDate || !endDate}>Έκδοση</button>
                    {message && <p style={{textAlign: 'center', marginTop: '1rem'}}>{message}</p>}
                </div>

                {generatedInvoice && (
                    <div className="history-section">
                        <h3>Προεπισκόπηση Ταμειακής #{generatedInvoice.id}</h3>
                        <div className="detail-grid">
                            <div className="detail-item"><strong>Αιτήσεις:</strong> {generatedInvoice.application_count}</div>
                            <div className="detail-item"><strong>Βασική Χρέωση:</strong> {parseFloat(generatedInvoice.base_charge).toFixed(2)} €</div>
                            <div className="detail-item"><strong>Έκπτωση:</strong> {generatedInvoice.discount_applied}%</div>
                            <div className="detail-item"><strong>Καθαρό Ποσό:</strong> {parseFloat(generatedInvoice.subtotal).toFixed(2)} €</div>
                            <div className="detail-item"><strong>ΦΠΑ:</strong> {parseFloat(generatedInvoice.vat_amount).toFixed(2)} €</div>
                            <div className="detail-item"><strong>Συνολική Χρέωση:</strong> {parseFloat(generatedInvoice.total_charge).toFixed(2)} €</div>
                        </div>
                    </div>
                )}

                <div className="history-section">
                    <h3>Ιστορικό Χρεώσεων</h3>
                    {loading ? (
                        <p>Φόρτωση...</p>
                    ) : (
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Ομαδάρχης</th>
                                    <th>Περίοδος</th>
                                    <th>Αιτήσεις</th>
                                    <th>Σύνολο</th>
                                    <th>Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td>#{inv.id}</td>
                                        <td>{inv.team_leader_name}</td>
                                        <td>{new Date(inv.start_date).toLocaleDateString()} - {new Date(inv.end_date).toLocaleDateString()}</td>
                                        <td>{inv.application_count}</td>
                                        <td>{parseFloat(inv.total_charge).toFixed(2)} €</td>
                                        <td><button onClick={() => handleDownloadPdf(inv.id)} className="button-edit">PDF</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default AdminInvoicingPage;