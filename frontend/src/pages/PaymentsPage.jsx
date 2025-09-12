import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const PaymentsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [team, setTeam] = useState([]);
    const [applications, setApplications] = useState([]);
    const [statements, setStatements] = useState([]);
    const [selectedAssociateId, setSelectedAssociateId] = useState('');
    const [selectedAppIds, setSelectedAppIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [paymentError, setPaymentError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [teamRes, appsRes, statementsRes] = await Promise.all([
                axios.get(user.role === 'Admin' ? 'http://localhost:3000/api/users' : 'http://localhost:3000/api/users/my-team', config),
                axios.get('http://localhost:3000/api/applications', config),
                axios.get('http://localhost:3000/api/payments/statements', config),
            ]);
            setTeam(teamRes.data.filter(u => u.role === 'Associate'));
            setApplications(appsRes.data);
            setStatements(statementsRes.data);
        } catch (error) {
            console.error("Failed to fetch payment data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token, user]);

    const handleAppSelection = (appId) => {
        const newSelection = new Set(selectedAppIds);
        if (newSelection.has(appId)) {
            newSelection.delete(appId);
        } else {
            newSelection.add(appId);
        }
        setSelectedAppIds(newSelection);
    };
    
    const paidApplicationIds = useMemo(() => {
        const ids = new Set();
        statements.forEach(st => {
            if (st.application_ids) {
                st.application_ids.forEach(appId => ids.add(appId));
            }
        });
        return ids;
    }, [statements]);

    const payableApps = useMemo(() => {
        if (!selectedAssociateId) return [];
        const selectedAssociate = team.find(t => t.id == selectedAssociateId);
        return applications.filter(app => 
            app.associate_name === selectedAssociate?.name &&
            app.is_paid_by_company &&
            app.status === 'Καταχωρήθηκε' &&
            !paidApplicationIds.has(app.application_id)
        );
    }, [selectedAssociateId, applications, team, paidApplicationIds]);

    const handleCreateStatement = async () => {
        if (selectedAppIds.size === 0) return;
        setPaymentError('');
        setSuccessMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.post('http://localhost:3000/api/payments/statements', {
                recipient_id: parseInt(selectedAssociateId),
                application_ids: Array.from(selectedAppIds)
            }, config);
            setSuccessMessage(`Statement #${response.data.statementId} created successfully!`);
            setSelectedAppIds(new Set());
            fetchData();
        } catch (error) {
            console.error("Failed to create statement", error);
            setPaymentError(error.response?.data?.message || 'An unknown error occurred.');
        }
    };

    const handleDownloadPdf = (statementId) => {
        const url = `http://localhost:3000/api/payments/statements/${statementId}/pdf?token=${token}`;
        window.open(url, '_blank');
    };

    if (loading) return <div className="dashboard-container"><p>Loading...</p></div>;

    const selectedTotal = payableApps
        .filter(app => selectedAppIds.has(app.application_id))
        .reduce((sum, app) => sum + (app.total_commission ? parseFloat(app.total_commission) : 0), 0);

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Πληρωμές</h1>
                <Link to="/dashboard" className="button-new">Πίσω στο Dashboard</Link>
            </header>
            <main>
                <div className="payment-section">
                    <h3>Δημιουργία Νέας Ταμειακής</h3>
                    <div className="form-group">
                        <label>Επιλογή Συνεργάτη</label>
                        <select value={selectedAssociateId} onChange={e => {setSelectedAssociateId(e.target.value); setSelectedAppIds(new Set());}}>
                            <option value="">-- Διάλεξε Συνεργάτη --</option>
                            {team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                        </select>
                    </div>
                    {selectedAssociateId && (
                        <>
                            <h4>Πληρωτέες Αιτήσεις</h4>
                            <table className="applications-table">
                                <tbody>
                                    {payableApps.length > 0 ? payableApps.map(app => (
                                        <tr key={app.application_id}>
                                            <td><input type="checkbox" onChange={() => handleAppSelection(app.application_id)} checked={selectedAppIds.has(app.application_id)} /></td>
                                            <td>#{app.application_id}</td>
                                            <td>{app.customer_name}</td>
                                            <td>{app.total_commission ? parseFloat(app.total_commission).toFixed(2) : '0.00'} €</td>
                                        </tr>
                                    )) : <tr><td colSpan="4">Δεν βρέθηκαν πληρωτέες αιτήσεις για αυτόν τον συνεργάτη.</td></tr>}
                                </tbody>
                            </table>
                            <div className="payment-summary">
                                <h4>Σύνολο Επιλεγμένων: {selectedTotal.toFixed(2)} €</h4>
                                <button onClick={handleCreateStatement} disabled={selectedAppIds.size === 0}>Δημιουργία Ταμειακής</button>
                                {paymentError && <p className="error-message">{paymentError}</p>}
                                {successMessage && <p className="success-message">{successMessage}</p>}
                            </div>
                        </>
                    )}
                </div>

                <div className="history-section">
                    <h3>Ιστορικό Ταμειακών</h3>
                    <table className="applications-table">
                        <thead>
                            <tr><th>ID</th><th>Παραλήπτης</th><th>Ποσό</th><th>Status</th><th>Ημερομηνία</th><th>Ενέργειες</th></tr>
                        </thead>
                        <tbody>
                            {statements.length > 0 ? statements.map(st => (
                                <tr key={st.id}>
                                    <td>{st.id}</td>
                                    <td>{st.recipient_name}</td>
                                    <td>{parseFloat(st.total_amount).toFixed(2)} €</td>
                                    <td>{st.status}</td>
                                    <td>{new Date(st.created_at).toLocaleDateString('el-GR')}</td>
                                    <td>
                                        <button onClick={() => handleDownloadPdf(st.id)} className="button-edit">PDF</button>
                                    </td>
                                </tr>
                            )) : <tr><td colSpan="6">Δεν βρέθηκαν ταμειακές καταστάσεις.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default PaymentsPage;