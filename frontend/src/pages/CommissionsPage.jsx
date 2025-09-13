import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const CommissionsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [team, setTeam] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [fields, setFields] = useState([]);
    const [commissions, setCommissions] = useState({});
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [teamRes, companiesRes, fieldsRes, commissionsRes] = await Promise.all([
                    axios.get(user.role === 'Admin' ? 'http://localhost:3000/api/users' : 'http://localhost:3000/api/users/my-team', config),
                    axios.get('http://localhost:3000/api/companies', config),
                    axios.get('http://localhost:3000/api/fields', config),
                    axios.get('http://localhost:3000/api/commissions', config)
                ]);
                
                setTeam(teamRes.data.filter(u => u.role === 'Associate'));
                setCompanies(companiesRes.data);
                setFields(fieldsRes.data.filter(f => f.is_commissionable));

                const commissionsMap = {};
                commissionsRes.data.company_commissions.forEach(c => {
                    commissionsMap[`${c.associate_id}-company-${c.company_id}`] = c.amount;
                });
                commissionsRes.data.field_commissions.forEach(c => {
                    commissionsMap[`${c.associate_id}-field-${c.field_id}`] = c.amount;
                });
                setCommissions(commissionsMap);

            } catch(err) {
                console.error("Failed to load data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token, user]);

    const handleCommissionChange = (key, amount) => {
        setCommissions(prev => ({ ...prev, [key]: amount }));
    };

    const handleSaveCommission = async (type, associateId, entityId) => {
        const key = `${associateId}-${type}-${entityId}`;
        const amount = commissions[key] || 0;
        setSuccessMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = { associate_id: associateId, amount: parseFloat(amount) };
            let url = 'http://localhost:3000/api/commissions/';

            if (type === 'company') {
                payload.company_id = entityId;
                url += 'company';
            } else {
                payload.field_id = entityId;
                url += 'field';
            }
            
            await axios.post(url, payload, config);
            setSuccessMessage('Η αμοιβή αποθηκεύτηκε!');
        } catch (error) {
            console.error("Failed to save commission", error);
            alert('Σφάλμα κατά την αποθήκευση.');
        }
    };
    
    if (loading) return (
        <div className="modern-commissions-container">
            <div className="modern-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση αμοιβών...</p>
            </div>
        </div>
    );

    const getTotalCommissions = (associateId) => {
        let total = 0;
        Object.keys(commissions).forEach(key => {
            if (key.startsWith(`${associateId}-`)) {
                total += parseFloat(commissions[key] || 0);
            }
        });
        return total.toFixed(2);
    };

    return (
        <div className="modern-commissions-container">
            <style>
                {`
                    .modern-commissions-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-commissions-container::before {
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
                        background: rgba(255, 255, 255, 0.95);
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
                        font-size: 2.2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 15px;
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

                    .success-message {
                        background: rgba(16, 185, 129, 0.1);
                        color: #065f46;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        backdrop-filter: blur(10px);
                        text-align: center;
                        font-weight: 600;
                        position: relative;
                        z-index: 10;
                    }

                    .commissions-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
                        gap: 25px;
                        position: relative;
                        z-index: 10;
                    }

                    .associate-card {
                        background: rgba(255, 255, 255, 0.95);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        transition: all 0.3s ease;
                    }

                    .associate-card::before {
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

                    .associate-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 35px 70px rgba(0, 0, 0, 0.2);
                    }

                    .card-content {
                        position: relative;
                        z-index: 2;
                    }

                    .associate-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid rgba(102, 126, 234, 0.1);
                    }

                    .associate-name {
                        font-size: 1.5rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .total-commission {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        padding: 8px 16px;
                        border-radius: 20px;
                        font-size: 0.9rem;
                        font-weight: 600;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .commission-section {
                        margin-bottom: 30px;
                    }

                    .section-title {
                        font-size: 1.2rem;
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .commission-item {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        margin-bottom: 15px;
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.7);
                        border-radius: 12px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }

                    .commission-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    }

                    .commission-label {
                        flex: 1;
                        font-weight: 600;
                        color: #374151;
                        min-width: 150px;
                    }

                    .commission-input {
                        flex: 1.5;
                        padding: 12px 18px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 8px;
                        font-size: 1.1rem;
                        background: rgba(255, 255, 255, 0.9);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        text-align: right;
                        min-width: 120px;
                    }

                    .commission-input:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                    }

                    .save-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        flex: 0 0 auto;
                        font-size: 0.9rem;
                        white-space: nowrap;
                    }

                    .save-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                    }

                    .section-divider {
                        margin: 25px 0;
                        padding: 20px;
                        background: rgba(102, 126, 234, 0.05);
                        border-radius: 12px;
                        border: 2px dashed rgba(102, 126, 234, 0.2);
                        text-align: center;
                        color: #667eea;
                        font-weight: 600;
                        backdrop-filter: blur(10px);
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

                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 10;
                    }

                    .stat-card {
                        background: rgba(255, 255, 255, 0.9);
                        backdrop-filter: blur(15px);
                        border-radius: 15px;
                        padding: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        transition: all 0.3s ease;
                    }

                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    }

                    .stat-icon {
                        font-size: 2.5rem;
                        margin-bottom: 15px;
                    }

                    .stat-number {
                        font-size: 1.8rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 8px;
                    }

                    .stat-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    @media (max-width: 768px) {
                        .modern-commissions-container {
                            padding: 15px;
                        }

                        .modern-header, .associate-card {
                            padding: 25px;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.8rem;
                        }

                        .commissions-grid {
                            grid-template-columns: 1fr;
                        }

                        .commission-item {
                            flex-direction: column;
                            gap: 10px;
                        }

                        .commission-input {
                            text-align: center;
                        }

                        .associate-header {
                            flex-direction: column;
                            gap: 15px;
                            text-align: center;
                        }

                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }
                    }

                    @media (max-width: 480px) {
                        .stats-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">
                        💰 Ορισμός Αμοιβών
                    </h1>
                    <Link to="/dashboard" className="modern-back-button">
                        ← Πίσω στο Dashboard
                    </Link>
                </div>
            </div>

            {successMessage && (
                <div className="success-message">
                    ✅ {successMessage}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-number">{team.length}</div>
                    <div className="stat-label">Συνεργάτες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-number">{companies.length}</div>
                    <div className="stat-label">Εταιρείες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-number">{fields.length}</div>
                    <div className="stat-label">Πεδία Αμοιβής</div>
                </div>
            </div>

            <div className="commissions-grid">
                {team.map(associate => (
                    <div key={associate.id} className="associate-card">
                        <div className="card-content">
                            <div className="associate-header">
                                <h3 className="associate-name">
                                    👤 {associate.name}
                                </h3>
                                <div className="total-commission">
                                    Σύνολο: €{getTotalCommissions(associate.id)}
                                </div>
                            </div>

                            <div className="commission-section">
                                <div className="section-title">
                                    🏢 Βασικές Αμοιβές Εταιρειών
                                </div>
                                {companies.map(company => {
                                    const key = `${associate.id}-company-${company.id}`;
                                    return (
                                        <div key={key} className="commission-item">
                                            <div className="commission-label">{company.name}</div>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className="commission-input"
                                                value={commissions[key] || ''} 
                                                onChange={e => handleCommissionChange(key, e.target.value)} 
                                                placeholder="0.00€"
                                            />
                                            <button 
                                                onClick={() => handleSaveCommission('company', associate.id, company.id)} 
                                                className="save-button"
                                            >
                                                💾 Αποθήκευση
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="section-divider">
                                🎯 Έξτρα Αμοιβές Πεδίων
                            </div>

                            <div className="commission-section">
                                <div className="section-title">
                                    📝 Αμοιβές Ειδικών Πεδίων
                                </div>
                                {fields.map(field => {
                                    const key = `${associate.id}-field-${field.id}`;
                                    return (
                                        <div key={key} className="commission-item">
                                            <div className="commission-label">{field.label}</div>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                className="commission-input"
                                                value={commissions[key] || ''} 
                                                onChange={e => handleCommissionChange(key, e.target.value)} 
                                                placeholder="0.00€"
                                            />
                                            <button 
                                                onClick={() => handleSaveCommission('field', associate.id, field.id)} 
                                                className="save-button"
                                            >
                                                💾 Αποθήκευση
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CommissionsPage;