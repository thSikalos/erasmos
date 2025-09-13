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

    if (loading) {
        return (
            <div className="admin-billing-container">
                <div className="loading-container">
                    <div>
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Φόρτωση ρυθμίσεων...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <style>{`
                .admin-billing-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-billing-container::before {
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
                }

                .tabs-navigation {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 2rem;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    padding: 1rem;
                    border-radius: 15px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .tab-button {
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.8);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .tab-button.active {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border-color: rgba(16, 185, 129, 0.3);
                    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                }

                .tab-button:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                .tab-content {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .tab-content::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .tab-content:hover::before {
                    left: 100%;
                }

                .section-title {
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

                .form-group-modern small {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.8rem;
                    margin-top: 0.5rem;
                    display: block;
                }

                .tier-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .team-leader-card {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 15px;
                    padding: 1.5rem;
                    margin-bottom: 1rem;
                    transition: all 0.3s ease;
                }

                .team-leader-card:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }

                .leader-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }

                .leader-info h4 {
                    color: white;
                    font-size: 1.1rem;
                    font-weight: 600;
                    margin: 0 0 0.25rem 0;
                }

                .leader-info .email {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.9rem;
                }

                .leader-fields {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 1rem;
                }

                .leader-fields input {
                    padding: 10px 12px;
                    font-size: 0.9rem;
                }

                .leader-fields label {
                    font-size: 0.8rem;
                    margin-bottom: 0.25rem;
                }

                .current-prices {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 8px;
                    padding: 0.75rem;
                    font-size: 0.8rem;
                    color: rgba(255, 255, 255, 0.8);
                    margin-top: 0.75rem;
                }

                .submit-section {
                    text-align: center;
                    margin-top: 2rem;
                    padding-top: 2rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                }

                .submit-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 15px 40px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 1rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin: 0 auto;
                }

                .submit-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .success-message {
                    background: rgba(16, 185, 129, 0.2);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-top: 1rem;
                    font-weight: 500;
                    text-align: center;
                }

                .error-message {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-top: 1rem;
                    font-weight: 500;
                    text-align: center;
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
                        padding: 1rem;
                    }

                    .tabs-navigation {
                        flex-direction: column;
                    }

                    .tab-content {
                        padding: 1.5rem;
                    }

                    .tier-row {
                        grid-template-columns: 1fr;
                    }

                    .leader-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }

                    .leader-fields {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="admin-billing-container">
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">💰 Ρυθμίσεις Χρέωσης</h1>
                        <Link to="/admin" className="back-link">
                            ← Πίσω στο Admin
                        </Link>
                    </div>
                </header>

                <main className="main-content">
                    <div className="tabs-navigation">
                        <button 
                            type="button"
                            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
                            onClick={() => setActiveTab('general')}
                        >
                            🏢 Γενικές Ρυθμίσεις
                        </button>
                        <button 
                            type="button"
                            className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
                            onClick={() => setActiveTab('team')}
                        >
                            👥 Χρέωση Ομάδων
                        </button>
                        <button 
                            type="button"
                            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
                            onClick={() => setActiveTab('personal')}
                        >
                            👤 Προσωπικές Αιτήσεις
                        </button>
                    </div>

                <form onSubmit={handleSubmit}>
                    
                    {/* General Settings Tab */}
                    {activeTab === 'general' && (
                        <div className="tab-content">
                            <h3 className="section-title">🏢 Βασικές Ρυθμίσεις</h3>
                            <div className="form-group-modern">
                                <label>💰 Βασική Χρέωση ανά Αίτηση (€)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={baseCharge} 
                                    onChange={e => setBaseCharge(e.target.value)} 
                                    required 
                                    placeholder="π.χ. 15.50"
                                />
                                <small>Αυτή είναι η προεπιλεγμένη τιμή που θα χρησιμοποιείται όταν δεν υπάρχει προσωπική ρύθμιση.</small>
                            </div>

                            <hr style={{margin: '2rem 0', border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.1)'}}/>
                            
                            <h3 className="section-title">📊 Κλίμακα Εκπτώσεων Όγκου</h3>
                            <p style={{color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem'}}>
                                <em>Οι εκπτώσεις εφαρμόζονται μόνο στις αιτήσεις των συνεργατών, όχι στις προσωπικές.</em>
                            </p>
                            {tiers.map((tier, index) => (
                                <div key={index} className="tier-row">
                                    <div className="form-group-modern">
                                        <label>🎯 Στόχος Αιτήσεων {index + 1}</label>
                                        <input 
                                            type="number" 
                                            placeholder={`π.χ. ${(index + 1) * 10}`} 
                                            value={tier.application_target} 
                                            onChange={e => handleTierChange(index, 'application_target', e.target.value)} 
                                        />
                                    </div>
                                    <div className="form-group-modern">
                                        <label>💸 Ποσοστό Έκπτωσης {index + 1} (%)</label>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            placeholder={`π.χ. ${(index + 1) * 2}`} 
                                            value={tier.discount_percentage} 
                                            onChange={e => handleTierChange(index, 'discount_percentage', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Team Applications Tab */}
                    {activeTab === 'team' && (
                        <div className="tab-content">
                            <h3 className="section-title">👥 Χρέωση Αιτήσεων Συνεργατών</h3>
                            <p style={{color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem'}}>
                                <em>Προσαρμόστε τη χρέωση ανά ομαδάρχη για τις αιτήσεις της ομάδας του.</em>
                            </p>
                            
                            <div style={{display: 'grid', gap: '1rem'}}>
                                {teamLeaders.map(tl => (
                                    <div key={tl.id} className="team-leader-card">
                                        <div className="leader-header">
                                            <div className="leader-info">
                                                <h4>👨‍💼 {tl.name}</h4>
                                                <div className="email">📧 {tl.email}</div>
                                            </div>
                                        </div>
                                        <div className="leader-fields">
                                            <div className="form-group-modern">
                                                <label>💰 Χρέωση Ομάδας (€)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={customCharges[tl.id] || ''}
                                                    onChange={e => handleCustomChargeChange(tl.id, e.target.value)}
                                                    placeholder={`Προεπιλογή: ${baseCharge} €`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Personal Applications Tab */}
                    {activeTab === 'personal' && (
                        <div className="tab-content">
                            <h3 className="section-title">👤 Χρέωση Προσωπικών Αιτήσεων</h3>
                            <p style={{color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1.5rem'}}>
                                <em>Ρυθμίστε διαφορετικές τιμές για τις προσωπικές αιτήσεις κάθε ομαδάρχη.</em>
                            </p>
                            
                            <div style={{display: 'grid', gap: '1rem'}}>
                                {teamLeaders.map(tl => (
                                    <div key={tl.id} className="team-leader-card">
                                        <div className="leader-header">
                                            <div className="leader-info">
                                                <h4>👨‍💼 {tl.name}</h4>
                                                <div className="email">📧 {tl.email}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="leader-fields">
                                            <div className="form-group-modern">
                                                <label>💼 Προσωπικές Αιτήσεις (€)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={personalBilling[tl.id]?.personal_app_charge || ''}
                                                    onChange={e => handlePersonalBillingChange(tl.id, 'personal_app_charge', e.target.value)}
                                                    placeholder={`Προεπιλογή: ${baseCharge} €`}
                                                />
                                                <small>Χρέωση για προσωπικές αιτήσεις του ομαδάρχη</small>
                                            </div>
                                            
                                            <div className="form-group-modern">
                                                <label>👥 Override Ομάδας (€)</label>
                                                <input 
                                                    type="number" 
                                                    step="0.01" 
                                                    value={personalBilling[tl.id]?.team_app_charge_override || ''}
                                                    onChange={e => handlePersonalBillingChange(tl.id, 'team_app_charge_override', e.target.value)}
                                                    placeholder={`Τρέχον: ${customCharges[tl.id] || baseCharge} €`}
                                                />
                                                <small>Προαιρετικό: Αντικαταστήστε τη χρέωση ομάδας</small>
                                            </div>
                                        </div>

                                        <div className="current-prices">
                                            <strong>💰 Τρέχουσες Τιμές:</strong><br/>
                                            Ομάδα: {customCharges[tl.id] || baseCharge}€ | 
                                            Προσωπικές: {personalBilling[tl.id]?.personal_app_charge || baseCharge}€
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="submit-section">
                        <button type="submit" className="submit-button">
                            💾 Αποθήκευση Όλων των Ρυθμίσεων
                        </button>
                    </div>

                    {message && (
                        <div className={message.includes('❌') ? 'error-message' : 'success-message'}>
                            {message}
                        </div>
                    )}
                </form>
                </main>
            </div>
        </div>
    );
};

export default AdminBillingSettingsPage;