import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const EditApplicationPage = () => {
    const { id } = useParams();
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
   
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    // Form data
    const [customerName, setCustomerName] = useState('');
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [fieldValues, setFieldValues] = useState({});
    const [contractEndDate, setContractEndDate] = useState('');
    const [comment, setComment] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [appRes, companiesRes] = await Promise.all([
                    axios.get(`http://localhost:3000/api/applications/${id}`, config),
                    axios.get('http://localhost:3000/api/companies', config)
                ]);
               
                const appData = appRes.data;
                setCompanies(companiesRes.data);
               
                // Προ-συμπληρώνουμε τη φόρμα
                setCustomerName(appData.customer_name);
                setSelectedCompanyId(appData.company_id);
                setContractEndDate(appData.contract_end_date ? new Date(appData.contract_end_date).toISOString().split('T')[0] : '');
               
                const initialFieldValues = {};
                appData.fields.forEach(field => {
                    // Το backend στέλνει field_id μέσα στο object της αίτησης
                    initialFieldValues[field.field_id || field.id] = field.value;
                });
                setFieldValues(initialFieldValues);
            } catch (err) {
                setError('Failed to load application data.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id, token]);

    const handleFieldChange = (fieldId, value) => {
        setFieldValues(prev => ({ ...prev, [fieldId]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const applicationData = {
                company_id: parseInt(selectedCompanyId),
                field_values: fieldValues,
                contract_end_date: contractEndDate || null,
                comment: comment
            };
            await axios.put(`http://localhost:3000/api/applications/${id}`, applicationData, config);
            navigate(`/application/${id}`);
        } catch (err) {
            setError(err.response?.data?.message || 'Could not update application.');
        }
    };

    const selectedCompany = companies.find(c => c.id == selectedCompanyId);

    if (loading) return (
        <div className="modern-edit-application-container">
            <div className="modern-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση αίτησης για επεξεργασία...</p>
            </div>
        </div>
    );
    
    if (error) return (
        <div className="modern-edit-application-container">
            <div className="modern-error">❌ {error}</div>
        </div>
    );

    return (
        <div className="modern-edit-application-container">
            <style>
                {`
                    .modern-edit-application-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-edit-application-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }

                    .modern-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                    }

                    .modern-header::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }

                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }

                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        position: relative;
                        z-index: 2;
                        flex-wrap: wrap;
                        gap: 15px;
                    }

                    .header-title {
                        font-size: 1.8rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                    }

                    .modern-back-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }

                    .modern-back-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modern-back-button:hover::before {
                        left: 100%;
                    }

                    .modern-back-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                        color: white;
                        text-decoration: none;
                    }

                    .modern-form-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 40px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                    }

                    .modern-form-card::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }

                    .form-content {
                        position: relative;
                        z-index: 2;
                    }

                    .modern-form-group {
                        margin-bottom: 25px;
                    }

                    .modern-form-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #374151;
                        font-weight: 600;
                        font-size: 0.95rem;
                    }

                    .modern-input, .modern-select, .modern-textarea {
                        width: 100%;
                        padding: 15px 20px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                    }

                    .modern-input:focus, .modern-select:focus, .modern-textarea:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                        transform: translateY(-2px);
                    }

                    .modern-textarea {
                        resize: vertical;
                        min-height: 100px;
                    }

                    .modern-checkbox-wrapper {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        padding: 15px 20px;
                        background: rgba(248, 250, 252, 0.8);
                        backdrop-filter: blur(10px);
                        border-radius: 12px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        transition: all 0.3s ease;
                    }

                    .modern-checkbox-wrapper:hover {
                        border-color: rgba(102, 126, 234, 0.2);
                        background: rgba(248, 250, 252, 1);
                    }

                    .modern-checkbox {
                        width: 20px;
                        height: 20px;
                        border-radius: 4px;
                        cursor: pointer;
                    }

                    .section-divider {
                        margin: 40px 0;
                        padding: 25px;
                        background: rgba(102, 126, 234, 0.05);
                        border-radius: 15px;
                        border: 2px dashed rgba(102, 126, 234, 0.2);
                        text-align: center;
                        color: #667eea;
                        font-weight: 600;
                        backdrop-filter: blur(10px);
                    }

                    .modern-submit-button {
                        width: 100%;
                        padding: 16px 20px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                        margin-top: 20px;
                    }

                    .modern-submit-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modern-submit-button:hover::before {
                        left: 100%;
                    }

                    .modern-submit-button:hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }

                    .modern-error {
                        background: rgba(239, 68, 68, 0.1);
                        color: #dc2626;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin-top: 15px;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        backdrop-filter: blur(10px);
                        text-align: center;
                        font-weight: 600;
                    }

                    .modern-loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 50vh;
                        color: white;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    @media (max-width: 768px) {
                        .modern-edit-application-container {
                            padding: 15px;
                        }

                        .modern-header, .modern-form-card {
                            padding: 25px;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.5rem;
                        }

                        .modern-input, .modern-select, .modern-textarea {
                            padding: 12px 16px;
                        }

                        .modern-submit-button {
                            padding: 14px 18px;
                            font-size: 1rem;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">✏️ Επεξεργασία Αίτησης #{id} για τον Πελάτη: {customerName}</h1>
                    <Link to={`/application/${id}`} className="modern-back-button">
                        ← Πίσω στην Αίτηση
                    </Link>
                </div>
            </div>

            <div className="modern-form-card">
                <div className="form-content">
                    <form onSubmit={handleSubmit}>
                        <div className="modern-form-group">
                            <label>🏢 Επιλογή Εταιρείας</label>
                            <select 
                                className="modern-select"
                                value={selectedCompanyId} 
                                onChange={e => setSelectedCompanyId(e.target.value)} 
                                required
                            >
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="modern-form-group">
                            <label>📅 Ημερομηνία Λήξης Συμβολαίου</label>
                            <input 
                                type="date" 
                                className="modern-input"
                                value={contractEndDate} 
                                onChange={(e) => setContractEndDate(e.target.value)} 
                            />
                        </div>

                        {selectedCompany && selectedCompany.fields.map(field => (
                            <div className="modern-form-group" key={field.id}>
                                <label>📝 {field.label}</label>
                                {field.type === 'checkbox' ? (
                                    <div className="modern-checkbox-wrapper">
                                        <input 
                                            type="checkbox" 
                                            className="modern-checkbox"
                                            checked={fieldValues[field.id] === 'true'} 
                                            onChange={e => handleFieldChange(field.id, e.target.checked)} 
                                        />
                                        <span>Ναι</span>
                                    </div>
                                ) : (
                                    <input 
                                        type={field.type} 
                                        className="modern-input"
                                        value={fieldValues[field.id] || ''} 
                                        onChange={e => handleFieldChange(field.id, e.target.value)} 
                                        required 
                                    />
                                )}
                            </div>
                        ))}

                        <div className="section-divider">
                            💬 Σχόλιο για την Αλλαγή
                        </div>

                        <div className="modern-form-group">
                            <label>💭 Σχόλιο προς Ομαδάρχη (για την αλλαγή)</label>
                            <textarea 
                                className="modern-textarea"
                                rows="4" 
                                value={comment} 
                                onChange={e => setComment(e.target.value)} 
                                placeholder="π.χ. Διορθώθηκε ο αριθμός παροχής..."
                            />
                        </div>

                        {error && <div className="modern-error">❌ {error}</div>}

                        <button type="submit" className="modern-submit-button">
                            💾 Αποθήκευση & Επανυποβολή
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditApplicationPage;