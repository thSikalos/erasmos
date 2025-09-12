import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

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

    if (loading) return <div className="form-container"><p>Loading application for editing...</p></div>;
    if (error) return <div className="form-container"><p className="error-message">{error}</p></div>;

    return (
        <div className="form-container">
            <Link to={`/application/${id}`}>&larr; Πίσω στην Αίτηση</Link>
            <h2>Επεξεργασία Αίτησης #{id} για τον Πελάτη: {customerName}</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Επιλογή Εταιρείας</label>
                    <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} required>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="form-group">
                    <label>Ημερομηνία Λήξης Συμβολαίου</label>
                    <input type="date" value={contractEndDate} onChange={(e) => setContractEndDate(e.target.value)} />
                </div>
                {selectedCompany && selectedCompany.fields.map(field => (
                    <div className="form-group" key={field.id}>
                        <label>{field.label}</label>
                        {field.type === 'checkbox' ? (
                            <input type="checkbox" checked={fieldValues[field.id] === 'true'} onChange={e => handleFieldChange(field.id, e.target.checked)} />
                        ) : (
                            <input type={field.type} value={fieldValues[field.id] || ''} onChange={e => handleFieldChange(field.id, e.target.value)} required />
                        )}
                    </div>
                ))}
                <hr style={{margin: '2rem 0'}}/>
                <div className="form-group">
                    <label>Σχόλιο προς Ομαδάρχη (για την αλλαγή)</label>
                    <textarea rows="4" value={comment} onChange={e => setComment(e.target.value)} placeholder="π.χ. Διορθώθηκε ο αριθμός παροχής."></textarea>
                </div>
                {error && <p className="error-message">{error}</p>}
                <button type="submit">Αποθήκευση & Επανυποβολή</button>
            </form>
        </div>
    );
};

export default EditApplicationPage;