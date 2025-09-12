import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

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
    
    if (loading) return <div className="dashboard-container"><p>Loading...</p></div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header"><h1>Ορισμός Αμοιβών</h1><Link to="/dashboard" className="button-new">Πίσω στο Dashboard</Link></header>
            <main>
                {successMessage && <p className="success-message">{successMessage}</p>}
                <div className="commissions-grid">
                    {team.map(associate => (
                        <div key={associate.id} className="admin-section">
                            <h3>{associate.name}</h3>
                            <h4>Βασικές Αμοιβές</h4>
                            {companies.map(company => {
                                const key = `${associate.id}-company-${company.id}`;
                                return (
                                <div key={key} className="form-group inline-form">
                                    <label style={{ flex: 1 }}>{company.name}</label>
                                    <input type="number" step="0.01" style={{ flex: 1 }} value={commissions[key] || ''} onChange={e => handleCommissionChange(key, e.target.value)} placeholder="0.00"/>
                                    <button onClick={() => handleSaveCommission('company', associate.id, company.id)} className="button-edit" style={{ flex: 0.5 }}>Save</button>
                                </div>
                            )})}
                            <hr style={{margin: '2rem 0'}}/>
                            <h4>Έξτρα Αμοιβές Πεδίων</h4>
                             {fields.map(field => {
                                 const key = `${associate.id}-field-${field.id}`;
                                 return (
                                <div key={key} className="form-group inline-form">
                                    <label style={{ flex: 1 }}>{field.label}</label>
                                    <input type="number" step="0.01" style={{ flex: 1 }} value={commissions[key] || ''} onChange={e => handleCommissionChange(key, e.target.value)} placeholder="0.00"/>
                                    <button onClick={() => handleSaveCommission('field', associate.id, field.id)} className="button-edit" style={{ flex: 0.5 }}>Save</button>
                                </div>
                            )})}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default CommissionsPage;