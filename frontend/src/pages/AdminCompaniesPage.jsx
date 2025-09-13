import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import '../App.css';

const AdminCompaniesPage = () => {
    const { token } = useContext(AuthContext);
    const { showDeleteConfirm, showSuccessToast, showErrorToast } = useNotifications();
    const [companies, setCompanies] = useState([]);
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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
        const company = companies.find(c => c.id === companyId);
        showDeleteConfirm(`την εταιρεία "${company?.name || 'Unknown'}"`, async () => {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/companies/${companyId}`, config);
                showSuccessToast('Επιτυχία', 'Η εταιρεία διαγράφηκε επιτυχώς!');
                fetchData();
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to delete company';
                setError(errorMessage);
                showErrorToast('Σφάλμα', errorMessage);
            }
        });
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
    
    if (loading) {
        return (
            <div className="admin-companies-container">
                <div className="loading-container">
                    <div>
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Φόρτωση εταιρειών...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <style>{`
                .admin-companies-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-companies-container::before {
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
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }

                .form-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .form-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .form-card:hover::before {
                    left: 100%;
                }

                .card-title {
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
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

                .form-group-modern input {
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

                .form-group-modern input:focus {
                    outline: none;
                    border-color: rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
                }

                .fields-selection {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    padding: 1rem;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    max-height: 200px;
                    overflow-y: auto;
                }

                .field-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                    padding: 8px;
                    border-radius: 8px;
                    transition: all 0.3s ease;
                }

                .field-checkbox:hover {
                    background: rgba(255, 255, 255, 0.1);
                }

                .field-checkbox input[type="checkbox"] {
                    width: 18px;
                    height: 18px;
                    accent-color: #10b981;
                }

                .field-checkbox label {
                    color: white;
                    font-weight: 500;
                    margin: 0;
                    cursor: pointer;
                    flex: 1;
                }

                .form-actions-modern {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 2rem;
                }

                .save-button {
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

                .save-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .cancel-button {
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

                .cancel-button:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                .error-message-modern {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-top: 1rem;
                    font-weight: 500;
                }

                .companies-list {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .companies-list::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .companies-list:hover::before {
                    left: 100%;
                }

                .statistics-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 15px;
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
                    font-size: 2rem;
                    font-weight: 700;
                    color: white;
                    margin-bottom: 0.5rem;
                }

                .stat-label {
                    color: rgba(255, 255, 255, 0.8);
                    font-size: 0.8rem;
                    font-weight: 500;
                }

                .company-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                .company-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }

                .company-info {
                    color: white;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .company-name {
                    font-weight: 600;
                    font-size: 1.1rem;
                }

                .fields-count-badge {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 8px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .edit-button {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.8rem;
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
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.8rem;
                }

                .delete-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
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

                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .empty-state-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state-text {
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

                    .main-content {
                        grid-template-columns: 1fr;
                        padding: 1rem;
                    }

                    .form-card,
                    .companies-list {
                        padding: 1.5rem;
                    }

                    .company-item {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: flex-start;
                    }

                    .action-buttons {
                        width: 100%;
                        justify-content: flex-end;
                    }

                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="admin-companies-container">
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">🏢 Διαχείριση Εταιρειών</h1>
                        <Link to="/admin" className="back-link">
                            ← Πίσω στο Admin Panel
                        </Link>
                    </div>
                </header>

                <main className="main-content">
                    <div className="form-card">
                        <h2 className="card-title">
                            {isEditing ? '✏️ Επεξεργασία Εταιρείας' : '➕ Δημιουργία Νέας Εταιρείας'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group-modern">
                                <label>🏷️ Όνομα Εταιρείας</label>
                                <input 
                                    type="text" 
                                    value={companyName} 
                                    onChange={e => setCompanyName(e.target.value)} 
                                    required 
                                    placeholder="π.χ. Εταιρεία XYZ Α.Ε."
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>📝 Επιλογή Πεδίων Φόρμας</label>
                                <div className="fields-selection">
                                    {fields.map(field => (
                                        <div key={field.id} className="field-checkbox">
                                            <input 
                                                type="checkbox" 
                                                id={`field-${field.id}`} 
                                                onChange={() => handleFieldSelection(field.id)} 
                                                checked={selectedFieldIds.has(field.id)} 
                                            />
                                            <label htmlFor={`field-${field.id}`}>
                                                {field.label}
                                                {field.is_commissionable && <span style={{color: '#f59e0b', marginLeft: '8px'}}>💰</span>}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="form-actions-modern">
                                <button type="submit" className="save-button">
                                    {isEditing ? '💾 Αποθήκευση Αλλαγών' : '➕ Δημιουργία Εταιρείας'}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={resetForm} className="cancel-button">
                                        ❌ Ακύρωση
                                    </button>
                                )}
                            </div>
                            {error && <div className="error-message-modern">❌ {error}</div>}
                        </form>
                    </div>

                    <div className="companies-list">
                        <h2 className="card-title">🏢 Υπάρχουσες Εταιρείες</h2>
                        
                        <div className="statistics-grid">
                            <div className="stat-card">
                                <div className="stat-number">{companies.length}</div>
                                <div className="stat-label">Συνολικές Εταιρείες</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">
                                    {companies.reduce((total, c) => total + c.fields.length, 0)}
                                </div>
                                <div className="stat-label">Συνολικά Πεδία</div>
                            </div>
                        </div>

                        {companies.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🏢</div>
                                <div className="empty-state-text">Δεν υπάρχουν εταιρείες ακόμα</div>
                            </div>
                        ) : (
                            companies.map(company => (
                                <div key={company.id} className="company-item">
                                    <div className="company-info">
                                        <span className="company-name">{company.name}</span>
                                        <span className="fields-count-badge">
                                            {company.fields.length} πεδία
                                        </span>
                                    </div>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditClick(company)} className="edit-button">
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(company.id)} className="delete-button">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminCompaniesPage;