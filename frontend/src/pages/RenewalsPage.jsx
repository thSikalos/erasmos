import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const RenewalsPage = () => {
    const { token } = useContext(AuthContext);
    const [renewals, setRenewals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        const fetchRenewals = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const config = { 
                    headers: { Authorization: `Bearer ${token}` },
                    params: { // Στέλνουμε τα φίλτρα στο backend
                        startDate: filters.startDate || undefined,
                        endDate: filters.endDate || undefined
                    }
                };
                const res = await axios.get('http://localhost:3000/api/applications/renewals', config);
                setRenewals(res.data);
            } catch (err) {
                console.error("Failed to fetch renewals", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRenewals();
    }, [token, filters]);

    const handleExport = () => {
        const queryParams = new URLSearchParams({
            token: token,
            startDate: filters.startDate || '',
            endDate: filters.endDate || ''
        }).toString();
        
        const url = `http://localhost:3000/api/applications/renewals/export?${queryParams}`;
        window.open(url, '_blank');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Ανανεώσεις Συμβολαίων</h1>
                <Link to="/dashboard" className="button-new">Πίσω στο Dashboard</Link>
            </header>
            <main>
                <div className="admin-section">
                    <h3>Φίλτρα</h3>
                    <div className="filters-grid">
                        <div className="form-group">
                            <label>Από Ημερομηνία</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters({...filters, startDate: e.target.value})} />
                        </div>
                        <div className="form-group">
                            <label>Έως Ημερομηνία</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters({...filters, endDate: e.target.value})} />
                        </div>
                    </div>
                </div>

                <div className="history-section">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>Αποτελέσματα</h2>
                        <button onClick={handleExport} className="button-new" style={{width: 'auto'}}>Εξαγωγή σε Excel</button>
                    </div>
                    {loading ? <p>Loading...</p> : (
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>Πελάτης</th>
                                    <th>Τηλέφωνο</th>
                                    <th>Εταιρεία</th>
                                    <th>Συνεργάτης</th>
                                    <th>Λήγει στις</th>
                                </tr>
                            </thead>
                            <tbody>
                                {renewals.length > 0 ? renewals.map(r => (
                                    <tr key={r.application_id}>
                                        <td>{r.customer_name}</td>
                                        <td>{r.customer_phone}</td>
                                        <td>{r.company_name}</td>
                                        <td>{r.associate_name}</td>
                                        <td>{new Date(r.contract_end_date).toLocaleDateString('el-GR')}</td>
                                    </tr>
                                )) : <tr><td colSpan="5">Δεν βρέθηκαν συμβόλαια για το επιλεγμένο διάστημα.</td></tr>}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default RenewalsPage;