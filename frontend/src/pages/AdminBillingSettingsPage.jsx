import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const AdminBillingSettingsPage = () => {
    const { token } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('general');
    
    // General settings
    const [baseCharge, setBaseCharge] = useState('');
    const [tiers, setTiers] = useState(
        Array(5).fill({ application_target: '', discount_percentage: '' })
    );
    
    // Team settings
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [customCharges, setCustomCharges] = useState({});
    
    // Personal billing settings
    const [personalBilling, setPersonalBilling] = useState({});
    
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [settingsRes, usersRes] = await Promise.all([
                    axios.get('http://localhost:3000/api/admin-billing/settings', config),
                    axios.get('http://localhost:3000/api/users', config)
                ]);
                
                // General settings
                setBaseCharge(settingsRes.data.settings.base_charge_per_application || '');

                // Discount tiers
                if (settingsRes.data.tiers.length > 0) {
                    const fetchedTiers = settingsRes.data.tiers;
                    const filledTiers = Array(5).fill(null).map((_, index) => fetchedTiers[index] || { application_target: '', discount_percentage: '' });
                    setTiers(filledTiers);
                }

                // Team leaders
                const leaders = usersRes.data.filter(u => u.role === 'TeamLeader' || u.role === 'Admin');
                setTeamLeaders(leaders);
                
                // Custom charges for team apps
                setCustomCharges(settingsRes.data.custom_charges || {});
                
                // Personal billing settings
                setPersonalBilling(settingsRes.data.personal_billing || {});
                
            } catch (err) {
                console.error("Failed to fetch settings", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [token]);

    const handleTierChange = (index, field, value) => {
        const newTiers = [...tiers];
        newTiers[index][field] = value;
        setTiers(newTiers);
    };

    const handleCustomChargeChange = (leaderId, value) => {
        setCustomCharges(prev => ({ ...prev, [leaderId]: value }));
    };

    const handlePersonalBillingChange = (leaderId, field, value) => {
        setPersonalBilling(prev => ({
            ...prev,
            [leaderId]: {
                ...prev[leaderId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const payload = {
                base_charge_per_application: parseFloat(baseCharge),
                tiers: tiers.filter(t => t.application_target && t.discount_percentage),
                custom_charges: customCharges,
                personal_billing: personalBilling
            };
            await axios.post('http://localhost:3000/api/admin-billing/settings', payload, config);
            setMessage('🎉 Οι ρυθμίσεις αποθηκεύτηκαν με επιτυχία!');
            setTimeout(() => setMessage(''), 3000);
        } catch (err) {
            setMessage('❌ Σφάλμα κατά την αποθήκευση.');
            console.error(err);
        }
    };

    const TabButton = ({ id, label, isActive, onClick }) => (
        <button
            type="button"
            className={`tab-button ${isActive ? 'active' : ''}`}
            onClick={() => onClick(id)}
            style={{
                padding: '12px 24px',
                marginRight: '8px',
                border: '2px solid #007bff',
                backgroundColor: isActive ? '#007bff' : 'white',
                color: isActive ? 'white' : '#007bff',
                borderRadius: '8px 8px 0 0',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'all 0.3s ease'
            }}
        >
            {label}
        </button>
    );

    if (loading) return <div className="dashboard-container"><p>Loading settings...</p></div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>💰 Ρυθμίσεις Χρέωσης - Προηγμένο Σύστημα</h1>
                <Link to="/admin" className="button-new">Πίσω στο Admin</Link>
            </header>
            <main>
                {/* Tab Navigation */}
                <div style={{marginBottom: '2rem', borderBottom: '1px solid #ddd'}}>
                    <TabButton 
                        id="general" 
                        label="🏢 Γενικές Ρυθμίσεις" 
                        isActive={activeTab === 'general'} 
                        onClick={setActiveTab} 
                    />
                    <TabButton 
                        id="team" 
                        label="👥 Χρέωση Ομάδων" 
                        isActive={activeTab === 'team'} 
                        onClick={setActiveTab} 
                    />
                    <TabButton 
                        id="personal" 
                        label="👤 Προσωπικές Αιτήσεις" 
                        isActive={activeTab === 'personal'} 
                        onClick={setActiveTab} 
                    />
                </div>

                <form onSubmit={handleSubmit} className="form-container" style={{maxWidth: '100%'}}>
                    
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <div>
                            <h3>🏢 Βασικές Ρυθμίσεις</h3>
                            <div className="form-group">
                                <label>Βασική Χρέωση ανά Αίτηση (€)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={baseCharge} 
                                    onChange={e => setBaseCharge(e.target.value)} 
                                    required 
                                    style={{fontSize: '16px', padding: '10px'}}
                                />
                                <small>Αυτή είναι η προεπιλεγμένη τιμή που θα χρησιμοποιείται όταν δεν υπάρχει προσωπική ρύθμιση.</small>
                            </div>

                            <hr style={{margin: '2rem 0'}}/>
                            
                            <h3>📊 Κλίμακα Εκπτώσεων Όγκου</h3>
                            <p><em>Οι εκπτώσεις εφαρμόζονται μόνο στις αιτήσεις των συνεργατών, όχι στις προσωπικές.</em></p>
                            {tiers.map((tier, index) => (
                                <div key={index} className="inline-form" style={{marginBottom: '1rem'}}>
                                    <input 
                                        type="number" 
                                        placeholder={`Στόχος Αιτήσεων ${index + 1}`} 
                                        value={tier.application_target} 
                                        onChange={e => handleTierChange(index, 'application_target', e.target.value)} 
                                        style={{marginRight: '10px'}}
                                    />
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        placeholder={`Ποσοστό Έκπτωσης % ${index + 1}`} 
                                        value={tier.discount_percentage} 
                                        onChange={e => handleTierChange(index, 'discount_percentage', e.target.value)} 
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Team Applications Tab */}
                    {activeTab === 'team' && (
                        <div>
                            <h3>👥 Χρέωση Αιτήσεων Συνεργατών</h3>
                            <p><em>Προσαρμόστε τη χρέωση ανά ομαδάρχη για τις αιτήσεις της ομάδας του.</em></p>
                            
                            <div style={{display: 'grid', gap: '1rem'}}>
                                {teamLeaders.map(tl => (
                                    <div key={tl.id} className="form-group" style={{
                                        border: '1px solid #e0e0e0', 
                                        padding: '15px', 
                                        borderRadius: '8px',
                                        backgroundColor: '#f8f9fa'
                                    }}>
                                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                            <div>
                                                <strong>{tl.name}</strong>
                                                <div style={{fontSize: '12px', color: '#666'}}>{tl.email}</div>
                                            </div>
                                            <div style={{display: 'flex', gap: '10px'}}>
                                                <div>
                                                    <label style={{fontSize: '12px', display: 'block'}}>Χρέωση Ομάδας (€)</label>
                                                    <input 
                                                        type="number" 
                                                        step="0.01" 
                                                        value={customCharges[tl.id] || ''}
                                                        onChange={e => handleCustomChargeChange(tl.id, e.target.value)}
                                                        placeholder={`Default: ${baseCharge} €`}
                                                        style={{width: '120px'}}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Personal Applications Tab */}
                    {activeTab === 'personal' && (
                        <div>
                            <h3>👤 Χρέωση Προσωπικών Αιτήσεων</h3>
                            <p><em>Ρυθμίστε διαφορετικές τιμές για τις προσωπικές αιτήσεις κάθε ομαδάρχη.</em></p>
                            
                            <div style={{display: 'grid', gap: '1rem'}}>
                                {teamLeaders.map(tl => (
                                    <div key={tl.id} className="form-group" style={{
                                        border: '2px solid #17a2b8', 
                                        padding: '20px', 
                                        borderRadius: '12px',
                                        backgroundColor: '#f0f8ff'
                                    }}>
                                        <div style={{marginBottom: '15px'}}>
                                            <strong style={{fontSize: '16px'}}>{tl.name}</strong>
                                            <div style={{fontSize: '12px', color: '#666'}}>{tl.email}</div>
                                        </div>
                                        
                                        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
                                            <div>
                                                <label style={{fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>
                                                    💼 Προσωπικές Αιτήσεις (€)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={personalBilling[tl.id]?.personal_app_charge || ''}
                                                    onChange={e => handlePersonalBillingChange(tl.id, 'personal_app_charge', e.target.value)}
                                                    placeholder={`Default: ${baseCharge} €`}
                                                    style={{width: '100%', padding: '8px'}}
                                                />
                                                <small style={{color: '#17a2b8'}}>Χρέωση για προσωπικές αιτήσεις του ομαδάρχη</small>
                                            </div>
                                            
                                            <div>
                                                <label style={{fontSize: '13px', fontWeight: 'bold', display: 'block', marginBottom: '5px'}}>
                                                    👥 Override Ομάδας (€)
                                                </label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={personalBilling[tl.id]?.team_app_charge_override || ''}
                                                    onChange={e => handlePersonalBillingChange(tl.id, 'team_app_charge_override', e.target.value)}
                                                    placeholder={`Current: ${customCharges[tl.id] || baseCharge} €`}
                                                    style={{width: '100%', padding: '8px'}}
                                                />
                                                <small style={{color: '#666'}}>Προαιρετικό: Αντικαταστήστε τη χρέωση ομάδας</small>
                                            </div>
                                        </div>

                                        <div style={{marginTop: '10px', padding: '10px', backgroundColor: '#e7f3ff', borderRadius: '6px', fontSize: '12px'}}>
                                            <strong>Τρέχουσες Τιμές:</strong><br/>
                                            Ομάδα: {customCharges[tl.id] || baseCharge}€ | 
                                            Προσωπικές: {personalBilling[tl.id]?.personal_app_charge || baseCharge}€
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{marginTop: '2rem', textAlign: 'center'}}>
                        <button type="submit" style={{
                            padding: '15px 30px',
                            fontSize: '16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                            💾 Αποθήκευση Όλων των Ρυθμίσεων
                        </button>
                    </div>

                    {message && (
                        <div style={{
                            marginTop: '1rem', 
                            textAlign:'center', 
                            padding: '10px',
                            borderRadius: '6px',
                            backgroundColor: message.includes('❌') ? '#f8d7da' : '#d4edda',
                            color: message.includes('❌') ? '#721c24' : '#155724',
                            fontWeight: 'bold'
                        }}>
                            {message}
                        </div>
                    )}
                </form>
            </main>
        </div>
    );
};

export default AdminBillingSettingsPage;