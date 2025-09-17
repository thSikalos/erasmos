import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';
import '../App.css';

const UserForm = ({ user, onSave, onCancel, teamLeaders }) => {
    const [formData, setFormData] = useState(user);

    useEffect(() => {
        setFormData(user);
    }, [user]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-backdrop-modern">
            <div className="modal-modern">
                <div className="modal-header">
                    <h2>{user.id ? '✏️ Επεξεργασία Χρήστη' : '👤 Δημιουργία Νέου Χρήστη'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group-modern">
                        <label>👤 Όνομα</label>
                        <input type="text" name="name" value={formData.name || ''} onChange={handleChange} required />
                    </div>
                    <div className="form-group-modern">
                        <label>📧 Email</label>
                        <input type="email" name="email" value={formData.email || ''} onChange={handleChange} required />
                    </div>
                    {!user.id && (
                        <div className="form-group-modern">
                            <label>🔒 Αρχικός Κωδικός</label>
                            <input type="password" name="password" onChange={handleChange} required />
                        </div>
                    )}
                    <div className="form-group-modern">
                        <label>🎭 Ρόλος</label>
                        <select name="role" value={formData.role || 'Associate'} onChange={handleChange}>
                            <option value="Associate">Associate</option>
                            <option value="TeamLeader">Team Leader</option>
                            <option value="Secretary">Secretary</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>
                    <div className="form-group-modern">
                        <label>👨‍💼 Προϊστάμενος (Ομαδάρχης)</label>
                        <select name="parent_user_id" value={formData.parent_user_id || ''} onChange={handleChange}>
                            <option value="">-- Κανένας --</option>
                            {teamLeaders.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}
                        </select>
                    </div>
                    <div className="checkbox-group-modern">
                        <input type="checkbox" id="is_vat_liable" name="is_vat_liable" checked={formData.is_vat_liable || false} onChange={handleChange} />
                        <label htmlFor="is_vat_liable">💰 Υπόχρεος ΦΠΑ</label>
                    </div>
                    <div className="modal-actions">
                        <button type="submit" className="save-button-modern">💾 Αποθήκευση</button>
                        <button type="button" className="cancel-button-modern" onClick={onCancel}>❌ Ακύρωση</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const AdminUsersPage = () => {
    const { token } = useContext(AuthContext);
    const { showDeleteConfirm, showSuccessToast, showErrorToast } = useNotifications();
    const [users, setUsers] = useState([]);
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl('/api/users'), config);
            setUsers(res.data);
            setTeamLeaders(res.data.filter(u => u.role === 'TeamLeader' || u.role === 'Admin'));
        } catch (err) {
            setError('Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const handleSaveUser = async (userData) => {
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (userData.id) { // Update
                await axios.put(apiUrl(`/api/users/${userData.id}`), userData, config);
            } else { // Create
                await axios.post(apiUrl('/api/users'), userData, config);
            }
            setIsFormOpen(false);
            setEditingUser(null);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    const handleDeleteUser = async (userId) => {
        const user = users.find(u => u.id === userId);
        showDeleteConfirm(`τον χρήστη "${user?.name || 'Unknown'}" (θα μεταφερθεί στον κάδο ανακύκλωσης)`, async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(apiUrl(`/api/users/${userId}`), config);
                showSuccessToast('Επιτυχία', 'Ο χρήστης μεταφέρθηκε στον κάδο ανακύκλωσης!');
                fetchData();
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to delete user';
                setError(errorMessage);
                showErrorToast('Σφάλμα', errorMessage);
            }
        });
    };

    const openCreateForm = () => {
        setEditingUser({});
        setIsFormOpen(true);
    };

    const openEditForm = (user) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };


    if (loading) {
        return (
            <div className="admin-users-container">
                <div className="loading-container">
                    <div>
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Φόρτωση χρηστών...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <style>{`
                .admin-users-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-users-container::before {
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

                .header-actions {
                    display: flex;
                    gap: 1rem;
                    align-items: center;
                }

                .create-user-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    padding: 12px 24px;
                    border: none;
                    border-radius: 25px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    text-decoration: none;
                }

                .create-user-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
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

                .error-message-modern {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-bottom: 1.5rem;
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

                .role-badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .role-admin {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                }

                .role-teamleader {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                }

                .role-secretary {
                    background: linear-gradient(135deg, #8b5cf6, #7c3aed);
                    color: white;
                }

                .role-associate {
                    background: linear-gradient(135deg, #06b6d4, #0891b2);
                    color: white;
                }


                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }

                .edit-button {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.85rem;
                    min-width: 80px;
                }

                .edit-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
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
                    min-width: 80px;
                }

                .delete-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                }

                .modal-backdrop-modern {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(10px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                    padding: 1rem;
                }

                .modal-modern {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(30px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 0;
                    max-width: 600px;
                    width: 100%;
                    max-height: 80vh;
                    overflow-y: auto;
                    position: relative;
                }

                .modal-header {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 1.5rem 2rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 20px 20px 0 0;
                }

                .modal-header h2 {
                    margin: 0;
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .modal-form {
                    padding: 2rem;
                }

                .form-group-modern {
                    margin-bottom: 1.5rem;
                }

                .form-group-modern label {
                    display: block;
                    color: white;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }

                .form-group-modern input,
                .form-group-modern select {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                .form-group-modern input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }

                .form-group-modern input:focus,
                .form-group-modern select:focus {
                    outline: none;
                    border-color: rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
                }

                .checkbox-group-modern {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 1.5rem;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .checkbox-group-modern input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    accent-color: #10b981;
                }

                .checkbox-group-modern label {
                    color: white;
                    font-weight: 500;
                    margin: 0;
                    cursor: pointer;
                }

                .modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 2rem;
                    padding-top: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .save-button-modern {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .save-button-modern:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .cancel-button-modern {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .cancel-button-modern:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
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

                    .header-actions {
                        flex-direction: column;
                        width: 100%;
                    }

                    .create-user-button,
                    .back-link {
                        width: 100%;
                        justify-content: center;
                    }

                    .main-content {
                        padding: 1rem;
                    }

                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }

                    .modern-table {
                        font-size: 0.8rem;
                    }

                    .modern-table th,
                    .modern-table td {
                        padding: 1rem 0.5rem;
                    }

                    .action-buttons {
                        flex-direction: column;
                    }

                    .edit-button,
                    .delete-button {
                        min-width: auto;
                        width: 100%;
                    }

                    .modal-modern {
                        margin: 1rem;
                        max-height: 90vh;
                    }

                    .modal-form {
                        padding: 1.5rem;
                    }

                    .modal-actions {
                        flex-direction: column;
                    }

                    .save-button-modern,
                    .cancel-button-modern {
                        width: 100%;
                    }
                }
            `}</style>

            <div className="admin-users-container">
                {isFormOpen && <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setIsFormOpen(false)} teamLeaders={teamLeaders} />}
                
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">👥 Διαχείριση Χρηστών</h1>
                        <div className="header-actions">
                            <button onClick={openCreateForm} className="create-user-button">
                                ➕ Νέος Χρήστης
                            </button>
                            <Link to="/admin" className="back-link">
                                ← Πίσω στο Admin Panel
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="main-content">
                    <div className="statistics-grid">
                        <div className="stat-card">
                            <div className="stat-number">{users.length}</div>
                            <div className="stat-label">Συνολικοί Χρήστες</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{users.filter(u => u.role === 'Admin').length}</div>
                            <div className="stat-label">Διαχειριστές</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{users.filter(u => u.role === 'TeamLeader').length}</div>
                            <div className="stat-label">Ομαδάρχες</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{users.filter(u => u.role === 'Associate').length}</div>
                            <div className="stat-label">Συνεργάτες</div>
                        </div>
                    </div>

                    {error && <div className="error-message-modern">❌ {error}</div>}
                    
                    <div className="table-container">
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>👤 Όνομα</th>
                                    <th>📧 Email</th>
                                    <th>🎭 Ρόλος</th>
                                    <th>👨‍💼 Προϊστάμενος</th>
                                    <th>⚙️ Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(u => {
                                    const parent = users.find(p => p.id === u.parent_user_id);
                                    return (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: '600' }}>{u.name}</td>
                                            <td>{u.email}</td>
                                            <td>
                                                <span className={`role-badge role-${u.role.toLowerCase()}`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>{parent ? parent.name : '-'}</td>
                                            <td>
                                                <div className="action-buttons">
                                                    <button onClick={() => openEditForm(u)} className="edit-button">
                                                        ✏️ Edit
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(u.id)} className="delete-button">
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>
                
            </div>
        </div>
    );
};

export default AdminUsersPage;