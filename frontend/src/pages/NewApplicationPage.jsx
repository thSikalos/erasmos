import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const NewApplicationPage = () => {
    const { token, user } = useContext(AuthContext); // Παίρνουμε τον χρήστη από το context
    const navigate = useNavigate();
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [customerStatus, setCustomerStatus] = useState('idle');

    // Form data
    const [afm, setAfm] = useState('');
    const [customerDetails, setCustomerDetails] = useState({ id: null, full_name: '', phone: '', address: '' });
    const [selectedCompanyId, setSelectedCompanyId] = useState('');
    const [fieldValues, setFieldValues] = useState({});
    const [contractEndDate, setContractEndDate] = useState('');
    
    const isTeamLeaderOrAdmin = user?.role === 'TeamLeader' || user?.role === 'Admin';
    const isTopLevelLeader = isTeamLeaderOrAdmin && user?.parent_user_id === null;

    const [isPersonal, setIsPersonal] = useState(isTopLevelLeader);

    useEffect(() => {
        setIsPersonal((user?.role === 'TeamLeader' && user?.parent_user_id === null) || user?.role === 'Admin');
    }, [user]);

    useEffect(() => {
        const fetchCompanies = async () => { 
            if (!token) return; 
            try { 
                const config = { headers: { Authorization: `Bearer ${token}` } }; 
                const companiesRes = await axios.get('http://localhost:3000/api/companies', config); 
                setCompanies(companiesRes.data); 
            } catch (error) { 
                setError('Failed to load companies.'); 
            } finally { 
                setLoading(false); 
            } 
        };
        fetchCompanies();
    }, [token]);

    const handleAfmCheck = async () => { 
        if (!afm) return; 
        setCustomerStatus('checking'); 
        setError(''); 
        try { 
            const config = { headers: { Authorization: `Bearer ${token}` } }; 
            const res = await axios.get(`http://localhost:3000/api/customers/afm/${afm}`, config); 
            setCustomerDetails(res.data); 
            setCustomerStatus('found'); 
        } catch (err) { 
            if (err.response && err.response.status === 404) { 
                setCustomerDetails({ id: null, afm: afm, full_name: '', phone: '', address: '' }); 
                setCustomerStatus('notFound'); 
            } else { 
                setError('Error checking AFM.'); 
                setCustomerStatus('idle'); 
            } 
        } 
    };

    const handleFieldChange = (fieldId, value) => { 
        setFieldValues(prev => ({ ...prev, [fieldId]: value })); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (customerStatus === 'idle' || customerStatus === 'checking') {
            setError('Please check the customer AFM first.');
            return;
        }
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const applicationData = {
                company_id: parseInt(selectedCompanyId),
                field_values: fieldValues,
                contract_end_date: contractEndDate || null,
                customerDetails: customerDetails,
                is_personal: isPersonal
            };
            await axios.post('http://localhost:3000/api/applications', applicationData, config);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Could not create application.');
        }
    };
    
    const selectedCompany = companies.find(c => c.id == selectedCompanyId);
    if (loading) return <div className="form-container"><p>Loading form...</p></div>;

    return (
        <div className="form-container">
            <Link to="/dashboard">&larr; Back to Dashboard</Link>
            <h2>Δημιουργία Νέας Αίτησης</h2>
            <form onSubmit={handleSubmit}>
                {isTeamLeaderOrAdmin && (
                    <div className="form-group" style={{
                        backgroundColor: isPersonal ? '#e8f5e8' : '#f8f9fa', 
                        padding: '1.5rem', 
                        borderRadius: '8px',
                        border: isPersonal ? '2px solid #28a745' : '1px solid #dee2e6'
                    }}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem'}}>
                            <input 
                                type="checkbox"
                                id="is_personal"
                                checked={isPersonal}
                                onChange={e => setIsPersonal(e.target.checked)}
                                style={{transform: 'scale(1.2)'}}
                            />
                            <label htmlFor="is_personal" style={{fontSize: '16px', fontWeight: 'bold', margin: 0}}>
                                {isPersonal ? '👤 Προσωπική Αίτηση' : '👥 Αίτηση Συνεργάτη'}
                            </label>
                        </div>
                        <div style={{fontSize: '13px', color: '#666', marginLeft: '2rem'}}>
                            {isPersonal ? 
                                '✅ Η αίτηση θα καταχωρηθεί απευθείας χωρίς έγκριση και θα χρεωθεί με προσωπικό τιμολόγιο.' :
                                '⏳ Η αίτηση θα περιμένει έγκριση και θα χρεωθεί με τιμολόγιο ομάδας.'
                            }
                        </div>
                        {isTopLevelLeader && !isPersonal && (
                            <div style={{
                                marginTop: '0.5rem', 
                                padding: '0.5rem', 
                                backgroundColor: '#fff3cd', 
                                borderRadius: '4px',
                                fontSize: '12px',
                                color: '#856404'
                            }}>
                                💡 Ως κύριος ομαδάρχης, μπορείτε να επιλέξετε "Προσωπική Αίτηση" για άμεση καταχώρηση.
                            </div>
                        )}
                    </div>
                )}
                <h3>Στοιχεία Πελάτη</h3>
                <div className="form-group inline-form">
                    <input type="text" placeholder="ΑΦΜ Πελάτη" value={afm} onChange={e => setAfm(e.target.value)} required />
                    <button type="button" onClick={handleAfmCheck} disabled={customerStatus === 'checking' || !afm}>
                        {customerStatus === 'checking' ? 'Έλεγχος...' : 'Έλεγχος ΑΦΜ'}
                    </button>
                </div>
                {customerStatus === 'found' && <p className="success-message">Ο πελάτης βρέθηκε!</p>}
                {customerStatus === 'notFound' && <p>Δεν βρέθηκε πελάτης. Συμπληρώστε τα στοιχεία του.</p>}
                
                <div className="form-group">
                    <label>Ονοματεπώνυμο</label>
                    <input type="text" value={customerDetails.full_name} onChange={e => setCustomerDetails({...customerDetails, full_name: e.target.value})} disabled={customerStatus === 'found'} required />
                </div>
                <div className="form-group">
                    <label>Τηλέφωνο</label>
                    <input type="text" value={customerDetails.phone || ''} onChange={e => setCustomerDetails({...customerDetails, phone: e.target.value})} disabled={customerStatus === 'found'} />
                </div>
                 <div className="form-group">
                    <label>Διεύθυνση</label>
                    <input type="text" value={customerDetails.address || ''} onChange={e => setCustomerDetails({...customerDetails, address: e.target.value})} disabled={customerStatus === 'found'} />
                </div>

                <hr style={{margin: '2rem 0'}} />
                <h3>Στοιχεία Αίτησης</h3>
                <div className="form-group">
                    <label>Επιλογή Εταιρείας</label>
                    <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} required>
                        <option value="" disabled>-- Διάλεξε εταιρεία --</option>
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
                            <input type="checkbox" onChange={e => handleFieldChange(field.id, e.target.checked)} />
                        ) : (
                            <input type={field.type} onChange={e => handleFieldChange(field.id, e.target.value)} required />
                        )}
                    </div>
                ))}
                
                {error && <p className="error-message">{error}</p>}
                <button type="submit">Δημιουργία Αίτησης</button>
            </form>
        </div>
    );
};

export default NewApplicationPage;