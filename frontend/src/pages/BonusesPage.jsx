import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import '../App.css';

const BonusesPage = () => {
    const { token } = useContext(AuthContext);
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    const [targetUserId, setTargetUserId] = useState('');
    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [targetCount, setTargetCount] = useState('');
    const [bonusAmount, setBonusAmount] = useState('');

    useEffect(() => {
        const fetchTeam = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const res = await axios.get(apiUrl('/api/users/my-team'), config);
                setTeam(res.data);
            } catch (err) {
                console.error("Failed to fetch team", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTeam();
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSuccessMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const bonusData = {
                target_user_id: parseInt(targetUserId),
                name,
                start_date: startDate,
                end_date: endDate,
                application_count_target: parseInt(targetCount),
                bonus_amount_per_application: parseFloat(bonusAmount)
            };
            await axios.post(apiUrl('/api/bonuses'), bonusData, config);
            
            setSuccessMessage('🎉 Το bonus δημιουργήθηκε με επιτυχία!');
            setName('');
            setTargetUserId('');
            setStartDate('');
            setEndDate('');
            setTargetCount('');
            setBonusAmount('');
            
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error("Failed to create bonus", error);
        }
    };

    if (loading) {
        return (
            <div className="bonuses-container">
                <div className="loading-container">
                    <div>
                        <div className="loading-spinner"></div>
                        <div className="loading-text">Φόρτωση ομάδας...</div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <style>{`
                .bonuses-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .bonuses-container::before {
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

                .form-actions-modern {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 2rem;
                }

                .create-button {
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

                .create-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .success-message-modern {
                    background: rgba(16, 185, 129, 0.2);
                    border: 1px solid rgba(16, 185, 129, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-top: 1rem;
                    font-weight: 500;
                    text-align: center;
                }

                .bonuses-list {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .bonuses-list::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .bonuses-list:hover::before {
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

                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .empty-state-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: white;
                }

                .empty-state-text {
                    font-size: 1rem;
                    opacity: 0.8;
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
                        grid-template-columns: 1fr;
                        padding: 1rem;
                    }

                    .form-card,
                    .bonuses-list {
                        padding: 1.5rem;
                    }

                    .statistics-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="bonuses-container">
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">🎁 Διαχείριση Bonuses</h1>
                        <Link to="/dashboard" className="back-link">
                            ← Πίσω στο Dashboard
                        </Link>
                    </div>
                </header>

                <main className="main-content">
                    <div className="form-card">
                        <h2 className="card-title">✨ Δημιουργία Νέου Bonus</h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group-modern">
                                <label>👤 Στόχος Συνεργάτη</label>
                                <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required>
                                    <option value="">-- Επιλέξτε Συνεργάτη --</option>
                                    {team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group-modern">
                                <label>🏷️ Όνομα Bonus</label>
                                <input 
                                    type="text" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    required 
                                    placeholder="π.χ. Bonus Φεβρουαρίου"
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>📅 Ημερομηνία Έναρξης</label>
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={e => setStartDate(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>📅 Ημερομηνία Λήξης</label>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={e => setEndDate(e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>🎯 Στόχος Αιτήσεων</label>
                                <input 
                                    type="number" 
                                    value={targetCount} 
                                    onChange={e => setTargetCount(e.target.value)} 
                                    required 
                                    placeholder="π.χ. 50"
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>💰 Ποσό Bonus ανά Αίτηση (€)</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    value={bonusAmount} 
                                    onChange={e => setBonusAmount(e.target.value)} 
                                    required 
                                    placeholder="π.χ. 5.00"
                                />
                            </div>
                            <div className="form-actions-modern">
                                <button type="submit" className="create-button">
                                    🎁 Δημιουργία Bonus
                                </button>
                            </div>
                            {successMessage && <div className="success-message-modern">{successMessage}</div>}
                        </form>
                    </div>

                    <div className="bonuses-list">
                        <h2 className="card-title">📋 Υπάρχοντα Bonuses</h2>
                        
                        <div className="statistics-grid">
                            <div className="stat-card">
                                <div className="stat-number">{team.length}</div>
                                <div className="stat-label">Μέλη Ομάδας</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-number">0</div>
                                <div className="stat-label">Ενεργά Bonuses</div>
                            </div>
                        </div>

                        <div className="empty-state">
                            <div className="empty-state-icon">🎁</div>
                            <div className="empty-state-title">Κανένα bonus ακόμα</div>
                            <div className="empty-state-text">Δημιουργήστε το πρώτο bonus για την ομάδα σας!</div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default BonusesPage;