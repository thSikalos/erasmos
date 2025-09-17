import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';
import '../App.css';

const AdminFieldsPage = () => {
    const { token } = useContext(AuthContext);
    const { showDeleteConfirm, showSuccessToast, showErrorToast } = useNotifications();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [currentFieldId, setCurrentFieldId] = useState(null);
    const [label, setLabel] = useState('');
    const [type, setType] = useState('text');
    const [isCommissionable, setIsCommissionable] = useState(false);
    const [showInTable, setShowInTable] = useState(false);

    const fetchData = async () => {
        if (!token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl('/api/fields'), config);
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
        setShowInTable(false);
    };

    const handleEditClick = (field) => {
        setIsEditing(true);
        setCurrentFieldId(field.id);
        setLabel(field.label);
        setType(field.type);
        setIsCommissionable(field.is_commissionable);
        setShowInTable(field.show_in_applications_table || false);
    };

    const handleDeleteClick = async (fieldId) => {
        const field = fields.find(f => f.id === fieldId);
        showDeleteConfirm(`το πεδίο "${field?.label || 'Unknown'}"`, async () => {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(apiUrl(`/api/fields/${fieldId}`), config);
                showSuccessToast('Επιτυχία', 'Το πεδίο διαγράφηκε επιτυχώς!');
                fetchData();
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to delete field';
                setError(errorMessage);
                showErrorToast('Σφάλμα', errorMessage);
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const fieldData = { 
            label, 
            type, 
            is_commissionable: isCommissionable,
            show_in_applications_table: showInTable 
        };

        try {
            if (isEditing) {
                await axios.put(apiUrl(`/api/fields/${currentFieldId}`), fieldData, config);
            } else {
                await axios.post(apiUrl('/api/fields'), fieldData, config);
            }
            resetForm();
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };

    return (
        <div>
            <style>{`
                .admin-fields-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-fields-container::before {
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
                    background: rgba(255, 255, 255, 0.15);
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
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
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

                .form-group-modern select option {
                    background: #4a5568;
                    color: white;
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

                .fields-list {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .fields-list::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .fields-list:hover::before {
                    left: 100%;
                }

                .field-item {
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

                .field-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }

                .field-info {
                    color: white;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .field-type-badge {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .commission-badge {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
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
                    .fields-list {
                        padding: 1.5rem;
                    }

                    .field-item {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: flex-start;
                    }

                    .action-buttons {
                        width: 100%;
                        justify-content: flex-end;
                    }
                }
            `}</style>

            <div className="admin-fields-container">
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">📝 Βιβλιοθήκη Πεδίων</h1>
                        <Link to="/admin" className="back-link">
                            ← Πίσω στο Admin Panel
                        </Link>
                    </div>
                </header>

                <main className="main-content">
                    <div className="form-card">
                        <h2 className="card-title">
                            {isEditing ? '✏️ Επεξεργασία Πεδίου' : '➕ Δημιουργία Νέου Πεδίου'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group-modern">
                                <label>🏷️ Ετικέτα Πεδίου</label>
                                <input 
                                    type="text" 
                                    value={label} 
                                    onChange={e => setLabel(e.target.value)} 
                                    required 
                                    placeholder="π.χ. Όνομα Πελάτη"
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>🎯 Τύπος Πεδίου</label>
                                <select value={type} onChange={e => setType(e.target.value)}>
                                    <option value="text">📝 Κείμενο</option>
                                    <option value="number">🔢 Αριθμός</option>
                                    <option value="date">📅 Ημερομηνία</option>
                                    <option value="checkbox">☑️ Checkbox</option>
                                </select>
                            </div>
                            <div className="checkbox-group-modern">
                                <input 
                                    type="checkbox" 
                                    id="is_commissionable" 
                                    checked={isCommissionable} 
                                    onChange={e => setIsCommissionable(e.target.checked)} 
                                />
                                <label htmlFor="is_commissionable">💰 Δέχεται Αμοιβή;</label>
                            </div>
                            <div className="checkbox-group-modern">
                                <input 
                                    type="checkbox" 
                                    id="show_in_applications_table" 
                                    checked={showInTable} 
                                    onChange={e => setShowInTable(e.target.checked)} 
                                />
                                <label htmlFor="show_in_applications_table">📋 Εμφάνιση στον Πίνακα Αιτήσεων;</label>
                            </div>
                            <div className="form-actions-modern">
                                <button type="submit" className="save-button">
                                    {isEditing ? '💾 Αποθήκευση Αλλαγών' : '➕ Δημιουργία Πεδίου'}
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

                    <div className="fields-list">
                        <h2 className="card-title">📋 Υπάρχοντα Πεδία</h2>
                        {loading ? (
                            <div className="loading-container">
                                <div>
                                    <div className="loading-spinner"></div>
                                    <div className="loading-text">Φόρτωση πεδίων...</div>
                                </div>
                            </div>
                        ) : fields.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📝</div>
                                <div className="empty-state-text">Δεν υπάρχουν πεδία ακόμα</div>
                            </div>
                        ) : (
                            fields.map(field => (
                                <div key={field.id} className="field-item">
                                    <div className="field-info">
                                        <span style={{ fontWeight: '600' }}>{field.label}</span>
                                        <span className="field-type-badge">{field.type}</span>
                                        {field.is_commissionable && (
                                            <span className="commission-badge">💰 Αμοιβή</span>
                                        )}
                                    </div>
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditClick(field)} className="edit-button">
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(field.id)} className="delete-button">
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

export default AdminFieldsPage;