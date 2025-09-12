import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useContext(AuthContext);
    
    const [customer, setCustomer] = useState(null);
    const [log, setLog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ full_name: '', phone: '', address: '', notes: '' });

    // Form for new log entry
    const [newNote, setNewNote] = useState('');
    const [method, setMethod] = useState('phone');

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [customerRes, logRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/customers/${id}`, config),
                axios.get(`http://localhost:3000/api/customers/${id}/communications`, config)
            ]);
            setCustomer(customerRes.data);
            setFormData(customerRes.data);
            setLog(logRes.data);
        } catch (err) {
            setError('Failed to fetch customer data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id, token]);

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.put(`http://localhost:3000/api/customers/${id}`, formData, config);
            setCustomer(res.data);
            setIsEditing(false);
        } catch (err) {
            setError('Failed to update customer');
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to move this customer to the recycle bin?')) {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/customers/${id}`, config);
                navigate('/customers');
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete customer');
            }
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { note: newNote, method };
            await axios.post(`http://localhost:3000/api/customers/${id}/communications`, body, config);
            setNewNote('');
            setMethod('phone');
            fetchData();
        } catch (err) {
            console.error("Failed to add note", err);
        }
    };

    if (loading) return <div className="dashboard-container"><p>Loading customer data...</p></div>;
    if (error && !isEditing) return <div className="dashboard-container"><p className="error-message">{error}</p></div>;
    if (!customer) return <div className="dashboard-container"><p>Customer not found.</p></div>;
    
    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Καρτέλα Πελάτη: {customer.full_name} {customer.deleted_at && '(ANENEPΓΟΣ)'}</h1>
                <div>
                    {!isEditing && <button onClick={() => setIsEditing(true)} className="button-edit">Επεξεργασία</button>}
                    <Link to="/customers" className="button-new">Πίσω στο Πελατολόγιο</Link>
                </div>
            </header>
            <main>
                {isEditing ? (
                    <div className="form-container" style={{maxWidth: '100%', padding: 0}}>
                        <form onSubmit={handleUpdateSubmit}>
                            <div className="detail-grid">
                                <div className="form-group"><label>Όνομα</label><input type="text" name="full_name" value={formData.full_name} onChange={handleFormChange} /></div>
                                <div className="form-group"><label>ΑΦΜ</label><input type="text" name="afm" value={formData.afm} disabled /></div>
                                <div className="form-group"><label>Τηλέφωνο</label><input type="text" name="phone" value={formData.phone || ''} onChange={handleFormChange} /></div>
                                <div className="form-group"><label>Διεύθυνση</label><input type="text" name="address" value={formData.address || ''} onChange={handleFormChange} /></div>
                            </div>
                            <div className="admin-section">
                                <h3>Γενικές Σημειώσεις</h3>
                                <textarea name="notes" rows="4" style={{width: '100%'}} value={formData.notes || ''} onChange={handleFormChange}></textarea>
                            </div>
                            <div className="form-actions">
                                <button type="submit">Αποθήκευση</button>
                                <button type="button" className="button-secondary" onClick={() => setIsEditing(false)}>Ακύρωση</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <div className="detail-grid">
                            <div className="detail-item"><strong>ΑΦΜ:</strong> {customer.afm}</div>
                            <div className="detail-item"><strong>Τηλέφωνο:</strong> {customer.phone}</div>
                            <div className="detail-item"><strong>Διεύθυνση:</strong> {customer.address}</div>
                        </div>
                        <div className="admin-section">
                            <h3>Γενικές Σημειώσεις</h3>
                            <p style={{whiteSpace: 'pre-wrap'}}>{customer.notes || '-'}</p>
                        </div>
                    </>
                )}

                <div className="admin-section">
                    <h3>Ιστορικό Επικοινωνίας</h3>
                    <div className="form-container" style={{maxWidth: '100%', padding: '1rem 0'}}>
                        <form onSubmit={handleAddNote}>
                             <div className="form-group">
                                <textarea rows="3" placeholder="Προσθήκη νέας σημείωσης..." value={newNote} onChange={e => setNewNote(e.target.value)} required></textarea>
                             </div>
                            <div className="form-group inline-form">
                                <select value={method} onChange={e => setMethod(e.target.value)}>
                                    <option value="phone">Τηλέφωνο</option>
                                    <option value="email">Email/Viber</option>
                                    <option value="in-person">Φυσική Παρουσία</option>
                                </select>
                                <button type="submit">Προσθήκη</button>
                            </div>
                        </form>
                    </div>
                    <ul className="data-list">
                        {log.map(entry => (
                            <li key={entry.id}>
                                <div>
                                    <p>{entry.note}</p>
                                    <small>από {entry.user_name} μέσω {entry.method} στις {new Date(entry.created_at).toLocaleString('el-GR')}</small>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                 {!isEditing && <div className="danger-zone"><button onClick={handleDelete} className="button-delete">Διαγραφή Πελάτη</button></div>}
            </main>
        </div>
    );
};

export default CustomerDetailPage;