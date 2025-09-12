import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const AdminRecycleBinPage = () => {
    const { token } = useContext(AuthContext);
    const [deletedCustomers, setDeletedCustomers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:3000/api/customers/deleted', config);
            setDeletedCustomers(res.data);
        } catch (err) {
            console.error("Failed to fetch deleted customers", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);
    
    const handleRestore = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`http://localhost:3000/api/customers/${id}/restore`, {}, config);
            fetchData(); // Ανανέωση λίστας
        } catch (err) {
            console.error("Failed to restore customer", err);
        }
    };

    const handlePermanentDelete = async (id, afm) => {
        const confirmation = prompt(`ΑΥΤΗ Η ΕΝΕΡΓΕΙΑ ΕΙΝΑΙ ΟΡΙΣΤΙΚΗ.\nΓια να διαγράψετε μόνιμα τον πελάτη με ΑΦΜ ${afm}, πληκτρολογήστε ξανά το ΑΦΜ του για επιβεβαίωση.`);
        if (confirmation === afm) {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/customers/${id}/permanent`, config);
                fetchData(); // Ανανέωση λίστας
            } catch (err) {
                console.error("Failed to permanently delete customer", err);
            }
        } else if (confirmation !== null) {
            alert("Το ΑΦΜ δεν ταιριάζει. Η διαγραφή ακυρώθηκε.");
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Κάδος Ανακύκλωσης Πελατών</h1>
                <Link to="/admin" className="button-new">Πίσω στο Admin Panel</Link>
            </header>
            <main>
                {loading ? <p>Loading...</p> : (
                    <table className="applications-table">
                        <thead>
                            <tr><th>Όνομα</th><th>ΑΦΜ</th><th>Διεγράφη στις</th><th>Ενέργειες</th></tr>
                        </thead>
                        <tbody>
                            {deletedCustomers.map(c => (
                                <tr key={c.id}>
                                    <td>{c.full_name}</td>
                                    <td>{c.afm}</td>
                                    <td>{new Date(c.deleted_at).toLocaleString('el-GR')}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => handleRestore(c.id)} className="button-edit">Επαναφορά</button>
                                            <button onClick={() => handlePermanentDelete(c.id, c.afm)} className="button-delete">Οριστική Διαγραφή</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </main>
        </div>
    );
};

export default AdminRecycleBinPage;