import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const AdminCompaniesPage = () => {
    const { token } = useContext(AuthContext);
    const [companies, setCompanies] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [currentCompanyId, setCurrentCompanyId] = useState(null);
    const [companyName, setCompanyName] = useState('');
    const [selectedFieldIds, setSelectedFieldIds] = useState(new Set());

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [companiesRes, fieldsRes] = await Promise.all([
                axios.get('http://localhost:3000/api/companies', config),
                axios.get('http://localhost:3000/api/fields', config)
            ]);
            setCompanies(companiesRes.data);
            setFields(fieldsRes.data);
        } catch (err) {
            setError('Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);
    
    const resetForm = () => {
        setIsEditing(false);
        setCurrentCompanyId(null);
        setCompanyName('');
        setSelectedFieldIds(new Set());
    };

    const handleEditClick = (company) => {
        setIsEditing(true);
        setCurrentCompanyId(company.id);
        setCompanyName(company.name);
        setSelectedFieldIds(new Set(company.fields.map(f => f.id)));
    };

    const handleDeleteClick = async (companyId) => {
        if (window.confirm('Are you sure you want to delete this company? This cannot be undone.')) {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/companies/${companyId}`, config);
                fetchData();
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to delete company');
            }
        }
    };

    const handleFieldSelection = (fieldId) => {
        const newSelection = new Set(selectedFieldIds);
        if (newSelection.has(fieldId)) newSelection.delete(fieldId);
        else newSelection.add(fieldId);
        setSelectedFieldIds(newSelection);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const companyData = { name: companyName, field_ids: Array.from(selectedFieldIds) };
        try {
            if (isEditing) {
                await axios.put(`http://localhost:3000/api/companies/${currentCompanyId}`, companyData, config);
            } else {
                await axios.post('http://localhost:3000/api/companies', companyData, config);
            }
            resetForm();
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };
    
    if (loading) return <div className="dashboard-container"><p>Loading...</p></div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Διαχείριση Εταιρειών</h1>
                <Link to="/admin" className="button-new">Πίσω στο Admin Panel</Link>
            </header>
            <main>
                <div className="form-container" style={{maxWidth: '100%'}}>
                    <h3>{isEditing ? 'Επεξεργασία Εταιρείας' : 'Δημιουργία Νέας Εταιρείας'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Όνομα Εταιρείας</label>
                            <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Επιλογή Πεδίων Φόρμας</label>
                            <div className="checkbox-group">
                                {fields.map(field => (
                                    <div key={field.id} className="inline-checkbox">
                                        <input type="checkbox" id={`field-${field.id}`} onChange={() => handleFieldSelection(field.id)} checked={selectedFieldIds.has(field.id)} />
                                        <label htmlFor={`field-${field.id}`}>{field.label}</label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="form-actions">
                            <button type="submit">{isEditing ? 'Αποθήκευση Αλλαγών' : 'Δημιουργία Εταιρείας'}</button>
                            {isEditing && <button type="button" onClick={resetForm} className="button-secondary">Ακύρωση</button>}
                        </div>
                        {error && <p className="error-message">{error}</p>}
                    </form>
                </div>

                <div className="history-section">
                    <h3>Υπάρχουσες Εταιρείες</h3>
                    <ul className="data-list">
                        {companies.map(c => (
                            <li key={c.id}>
                                <span>{c.name} <small>({c.fields.length} πεδία)</small></span>
                                <div className="action-buttons">
                                    <button onClick={() => handleEditClick(c)} className="button-edit">Edit</button>
                                    <button onClick={() => handleDeleteClick(c.id)} className="button-delete">Delete</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
};

export default AdminCompaniesPage;