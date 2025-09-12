import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

// Μικρό component για τη φόρμα, για να είναι πιο καθαρός ο κώδικας
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
        <div className="modal-backdrop">
            <div className="modal">
                <h2>{user.id ? 'Επεξεργασία Χρήστη' : 'Δημιουργία Νέου Χρήστη'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group"><label>Όνομα</label><input type="text" name="name" value={formData.name || ''} onChange={handleChange} required /></div>
                    <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email || ''} onChange={handleChange} required /></div>
                    {!user.id && <div className="form-group"><label>Αρχικός Κωδικός</label><input type="password" name="password" onChange={handleChange} required /></div>}
                    <div className="form-group"><label>Ρόλος</label><select name="role" value={formData.role || 'Associate'} onChange={handleChange}><option value="Associate">Associate</option><option value="TeamLeader">Team Leader</option><option value="Secretary">Secretary</option><option value="Admin">Admin</option></select></div>
                    <div className="form-group"><label>Προϊστάμενος (Ομαδάρχης)</label><select name="parent_user_id" value={formData.parent_user_id || ''} onChange={handleChange}><option value="">-- Κανένας --</option>{teamLeaders.map(tl => <option key={tl.id} value={tl.id}>{tl.name}</option>)}</select></div>
                    <div className="form-group inline-checkbox"><input type="checkbox" id="is_vat_liable" name="is_vat_liable" checked={formData.is_vat_liable || false} onChange={handleChange} /><label htmlFor="is_vat_liable">Υπόχρεος ΦΠΑ</label></div>
                    <div className="form-actions"><button type="submit">Αποθήκευση</button><button type="button" className="button-secondary" onClick={onCancel}>Ακύρωση</button></div>
                </form>
            </div>
        </div>
    );
};


const AdminUsersPage = () => {
    const { token } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [agreementDetails, setAgreementDetails] = useState(null);
    const [showAgreementModal, setShowAgreementModal] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:3000/api/users', config);
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
                await axios.put(`http://localhost:3000/api/users/${userData.id}`, userData, config);
            } else { // Create
                await axios.post('http://localhost:3000/api/users', userData, config);
            }
            setIsFormOpen(false);
            setEditingUser(null);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    const handleDeleteUser = async (userId) => {
        if(window.confirm('Are you sure you want to move this user to the recycle bin?')){
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/users/${userId}`, config);
                fetchData();
            } catch(err) {
                setError(err.response?.data?.message || 'Failed to delete user');
            }
        }
    };

    const openCreateForm = () => {
        setEditingUser({});
        setIsFormOpen(true);
    };

    const openEditForm = (user) => {
        setEditingUser(user);
        setIsFormOpen(true);
    };

    const viewAgreement = async (userId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(`http://localhost:3000/api/users/${userId}/agreement`, config);
            setAgreementDetails(res.data);
            setShowAgreementModal(true);
        } catch (err) {
            setError('Failed to fetch agreement details');
        }
    };

    const downloadAgreementPdf = async (userId, userName) => {
        try {
            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            };
            const res = await axios.get(`http://localhost:3000/api/users/${userId}/agreement/pdf`, config);
            
            // Create blob and download
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `agreement-${userName.replace(/\s+/g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError('Failed to download agreement PDF');
        }
    };

    if (loading) return <div className="dashboard-container"><p>Loading users...</p></div>;

    return (
        <div className="dashboard-container">
            {isFormOpen && <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => setIsFormOpen(false)} teamLeaders={teamLeaders} />}
            <header className="dashboard-header">
                <h1>Διαχείριση Χρηστών</h1>
                <div>
                    <button onClick={openCreateForm} className="button-new" style={{width: 'auto'}}>Νέος Χρήστης</button>
                    <Link to="/admin" className="button-new">Πίσω στο Admin Panel</Link>
                </div>
            </header>
            <main>
                {error && <p className='error-message'>{error}</p>}
                <table className="applications-table">
                    <thead>
                        <tr><th>Όνομα</th><th>Email</th><th>Ρόλος</th><th>Προϊστάμενος</th><th>Όροι</th><th>Ενέργειες</th></tr>
                    </thead>
                    <tbody>
                        {users.map(u => {
                            const parent = users.find(p => p.id === u.parent_user_id);
                            return (
                                <tr key={u.id}>
                                    <td>{u.name}</td>
                                    <td>{u.email}</td>
                                    <td>{u.role}</td>
                                    <td>{parent ? parent.name : '-'}</td>
                                    <td>
                                        {u.has_accepted_terms ? (
                                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                                <span style={{color: 'green', cursor: 'pointer'}} onClick={() => viewAgreement(u.id)}>
                                                    ✓ Αποδεκτοί
                                                </span>
                                                <button 
                                                    style={{
                                                        fontSize: '10px', 
                                                        padding: '2px 6px', 
                                                        backgroundColor: '#007bff', 
                                                        color: 'white', 
                                                        border: 'none', 
                                                        borderRadius: '3px',
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => downloadAgreementPdf(u.id, u.name)}
                                                    title="Κατεβάστε PDF Αποδοχής"
                                                >
                                                    PDF
                                                </button>
                                            </div>
                                        ) : (
                                            <span style={{color: 'red'}}>✗ Μη αποδεκτοί</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="action-buttons">
                                            <button onClick={() => openEditForm(u)} className="button-edit">Edit</button>
                                            <button onClick={() => handleDeleteUser(u.id)} className="button-delete">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </main>
            
            {showAgreementModal && agreementDetails && (
                <div className="modal-backdrop">
                    <div className="modal">
                        <h2>Στοιχεία Αποδοχής Όρων</h2>
                        <div style={{textAlign: 'left'}}>
                            <p><strong>Χρήστης:</strong> {agreementDetails.name} ({agreementDetails.email})</p>
                            <p><strong>Κατάσταση:</strong> {agreementDetails.has_accepted_terms ? 
                                <span style={{color: 'green'}}>Έχει αποδεχτεί τους όρους</span> : 
                                <span style={{color: 'red'}}>Δεν έχει αποδεχτεί τους όρους</span>
                            }</p>
                            {agreementDetails.accepted_at && (
                                <>
                                    <p><strong>Ημερομηνία Αποδοχής:</strong> {new Date(agreementDetails.accepted_at).toLocaleString('el-GR')}</p>
                                    <p><strong>Έκδοση Όρων:</strong> {agreementDetails.terms_version || 'N/A'}</p>
                                    <p><strong>IP Address:</strong> {agreementDetails.ip_address || 'N/A'}</p>
                                    <p><strong>User Agent:</strong> {agreementDetails.user_agent ? 
                                        <span style={{fontSize: '12px', wordBreak: 'break-all'}}>{agreementDetails.user_agent}</span> : 'N/A'
                                    }</p>
                                </>
                            )}
                        </div>
                        <div className="form-actions">
                            {agreementDetails.has_accepted_terms && (
                                <button 
                                    onClick={() => downloadAgreementPdf(agreementDetails.id, agreementDetails.name)} 
                                    className="button-edit"
                                    style={{marginRight: '10px'}}
                                >
                                    Κατεβάστε PDF
                                </button>
                            )}
                            <button onClick={() => setShowAgreementModal(false)} className="button-secondary">Κλείσιμο</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsersPage;