import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import '../App.css';

const AdminRecycleBinPage = () => {
    const { token } = useContext(AuthContext);
    const { showErrorToast } = useNotifications();
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
            fetchData();
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
                fetchData();
            } catch (err) {
                console.error("Failed to permanently delete customer", err);
            }
        } else if (confirmation !== null) {
            showErrorToast("Σφάλμα", "Το ΑΦΜ δεν ταιριάζει. Η διαγραφή ακυρώθηκε.");
        }
    };

    return (
        <div>
            <style>{`
                .admin-recycle-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-recycle-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: 
                        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
                    pointer-events: none;
                }

                .modern-header {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 2rem 0;
                    position: relative;
                    z-index: 10;
                }

                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-title {
                    background: linear-gradient(135deg, #ffffff, #f8f9ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin: 0;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }

                .back-link {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .back-link:hover {
                    background: rgba(255, 255, 255, 0.25);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                .main-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                    position: relative;
                    z-index: 5;
                }

                .statistics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 1.5rem;
                    text-align: center;
                    position: relative;
                    overflow: hidden;
                }

                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .stat-card:hover::before {
                    left: 100%;
                }

                .stat-number {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .stat-label {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 0.9rem;
                    font-weight: 500;
                }

                .table-container {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    overflow: hidden;
                    position: relative;
                }

                .table-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent);
                    transition: left 1s;
                }

                .table-container:hover::before {
                    left: 100%;
                }

                .modern-table {
                    width: 100%;
                    border-collapse: collapse;
                    background: transparent;
                }

                .modern-table thead {
                    background: rgba(255, 255, 255, 0.1);
                }

                .modern-table th {
                    padding: 1.5rem 1rem;
                    text-align: left;
                    font-weight: 600;
                    color: white;
                    border-bottom: 2px solid rgba(255, 255, 255, 0.1);
                    background: rgba(255, 255, 255, 0.05);
                }

                .modern-table td {
                    padding: 1.5rem 1rem;
                    color: rgba(255, 255, 255, 0.9);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.3s ease;
                }

                .modern-table tbody tr {
                    transition: all 0.3s ease;
                }

                .modern-table tbody tr:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: scale(1.01);
                }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .restore-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.85rem;
                    min-width: 100px;
                }

                .restore-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .delete-button {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.85rem;
                    min-width: 120px;
                }

                .delete-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                    color: white;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                .loading-text {
                    font-size: 1.1rem;
                    font-weight: 500;
                }

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: rgba(255, 255, 255, 0.8);
                }

                .empty-state-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: white;
                }

                .empty-state-text {
                    font-size: 1rem;
                    opacity: 0.8;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        gap: 1rem;
                        text-align: center;
                    }

                    .header-title {
                        font-size: 1.8rem;
                    }

                    .main-content {
                        padding: 1rem;
                    }

                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }

                    .modern-table {
                        font-size: 0.9rem;
                    }

                    .modern-table th,
                    .modern-table td {
                        padding: 1rem 0.5rem;
                    }

                    .action-buttons {
                        flex-direction: column;
                    }

                    .restore-button,
                    .delete-button {
                        min-width: auto;
                        width: 100%;
                    }
                }
            `}</style>

            <div className="admin-recycle-container">
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">🗑️ Κάδος Ανακύκλωσης</h1>
                        <Link to="/admin" className="back-link">
                            ← Πίσω στο Admin Panel
                        </Link>
                    </div>
                </header>

                <main className="main-content">
                    <div className="statistics-grid">
                        <div className="stat-card">
                            <div className="stat-number">{deletedCustomers.length}</div>
                            <div className="stat-label">Διαγραμμένοι Πελάτες</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                {deletedCustomers.filter(c => {
                                    const deletedDate = new Date(c.deleted_at);
                                    const lastWeek = new Date();
                                    lastWeek.setDate(lastWeek.getDate() - 7);
                                    return deletedDate >= lastWeek;
                                }).length}
                            </div>
                            <div className="stat-label">Τελευταία 7 ημέρες</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                {deletedCustomers.filter(c => {
                                    const deletedDate = new Date(c.deleted_at);
                                    const lastMonth = new Date();
                                    lastMonth.setMonth(lastMonth.getMonth() - 1);
                                    return deletedDate >= lastMonth;
                                }).length}
                            </div>
                            <div className="stat-label">Τελευταίος μήνας</div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="loading-container">
                            <div>
                                <div className="loading-spinner"></div>
                                <div className="loading-text">Φόρτωση διαγραμμένων πελατών...</div>
                            </div>
                        </div>
                    ) : deletedCustomers.length === 0 ? (
                        <div className="table-container">
                            <div className="empty-state">
                                <div className="empty-state-icon">🎉</div>
                                <div className="empty-state-title">Κανένας διαγραμμένος πελάτης</div>
                                <div className="empty-state-text">Ο κάδος ανακύκλωσης είναι άδειος!</div>
                            </div>
                        </div>
                    ) : (
                        <div className="table-container">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>👤 Όνομα Πελάτη</th>
                                        <th>🏢 ΑΦΜ</th>
                                        <th>📅 Ημερομηνία Διαγραφής</th>
                                        <th>⚙️ Ενέργειες</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {deletedCustomers.map(customer => (
                                        <tr key={customer.id}>
                                            <td style={{ fontWeight: '600' }}>{customer.full_name}</td>
                                            <td>{customer.afm}</td>
                                            <td>{new Date(customer.deleted_at).toLocaleString('el-GR')}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button 
                                                        onClick={() => handleRestore(customer.id)} 
                                                        className="restore-button"
                                                        title="Επαναφορά πελάτη"
                                                    >
                                                        ↩️ Επαναφορά
                                                    </button>
                                                    <button 
                                                        onClick={() => handlePermanentDelete(customer.id, customer.afm)} 
                                                        className="delete-button"
                                                        title="Οριστική διαγραφή"
                                                    >
                                                        🗑️ Οριστική Διαγραφή
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminRecycleBinPage;