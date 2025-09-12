import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const AdminFieldsPage = () => {
    const { token } = useContext(AuthContext);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // State for the form (Create & Edit)
    const [isEditing, setIsEditing] = useState(false);
    const [currentFieldId, setCurrentFieldId] = useState(null);
    const [label, setLabel] = useState('');
    const [type, setType] = useState('text');
    const [isCommissionable, setIsCommissionable] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get('http://localhost:3000/api/fields', config);
            setFields(res.data);
        } catch (err) {
            setError('Failed to fetch fields');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const resetForm = () => {
        setIsEditing(false);
        setCurrentFieldId(null);
        setLabel('');
        setType('text');
        setIsCommissionable(false);
    };

    const handleEditClick = (field) => {
        setIsEditing(true);
        setCurrentFieldId(field.id);
        setLabel(field.label);
        setType(field.type);
        setIsCommissionable(field.is_commissionable);
    };

    const handleDeleteClick = async (fieldId) => {
        if (window.confirm('Are you sure you want to delete this field?')) {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/fields/${fieldId}`, config);
                fetchData();
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete field');
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const fieldData = { label, type, is_commissionable: isCommissionable };

        try {
            if (isEditing) {
                // Update logic
                await axios.put(`http://localhost:3000/api/fields/${currentFieldId}`, fieldData, config);
            } else {
                // Create logic
                await axios.post('http://localhost:3000/api/fields', fieldData, config);
            }
            resetForm();
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Βιβλιοθήκη Πεδίων</h1>
                <Link to="/admin" className="button-new">Πίσω στο Admin Panel</Link>
            </header>
            <main>
                <div className="form-container" style={{maxWidth: '100%'}}>
                    <h3>{isEditing ? 'Επεξεργασία Πεδίου' : 'Δημιουργία Νέου Πεδίου'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Ετικέτα Πεδίου</label>
                            <input type="text" value={label} onChange={e => setLabel(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Τύπος Πεδίου</label>
                            <select value={type} onChange={e => setType(e.target.value)}>
                                <option value="text">Κείμενο</option>
                                <option value="number">Αριθμός</option>
                                <option value="date">Ημερομηνία</option>
                                <option value="checkbox">Checkbox</option>
                            </select>
                        </div>
                        <div className="form-group inline-checkbox">
                            <input type="checkbox" id="is_commissionable" checked={isCommissionable} onChange={e => setIsCommissionable(e.target.checked)} />
                            <label htmlFor="is_commissionable">Δέχεται Αμοιβή;</label>
                        </div>
                        <div className="form-actions">
                            <button type="submit">{isEditing ? 'Αποθήκευση Αλλαγών' : 'Δημιουργία Πεδίου'}</button>
                            {isEditing && <button type="button" onClick={resetForm} className="button-secondary">Ακύρωση</button>}
                        </div>
                        {error && <p className="error-message">{error}</p>}
                    </form>
                </div>
                <div className="history-section">
                    <h3>Υπάρχοντα Πεδία</h3>
                    {loading ? <p>Loading...</p> : (
                        <ul className="data-list">
                            {fields.map(f => (
                                <li key={f.id}>
                                    <span>{f.label} ({f.type}) {f.is_commissionable && '💰'}</span>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditClick(f)} className="button-edit">Edit</button>
                                        <button onClick={() => handleDeleteClick(f.id)} className="button-delete">Delete</button>
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

export default AdminFieldsPage;