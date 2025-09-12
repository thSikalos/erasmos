import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../App.css';

const BonusesPage = () => {
    const { token } = useContext(AuthContext);
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');

    // Form state
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
                const res = await axios.get('http://localhost:3000/api/users/my-team', config);
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
            await axios.post('http://localhost:3000/api/bonuses', bonusData, config);
            
            setSuccessMessage('Bonus created successfully!');
            // Καθαρίζουμε τη φόρμα
            setName('');
            setTargetUserId('');
            setStartDate('');
            setEndDate('');
            setTargetCount('');
            setBonusAmount('');
        } catch (error) {
            console.error("Failed to create bonus", error);
        }
    };

    if (loading) return <div className="dashboard-container"><p>Loading...</p></div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Manage Bonuses</h1>
                <Link to="/dashboard" className="button-new">Back to Dashboard</Link>
            </header>
            <main>
                <div className="form-container" style={{maxWidth: '600px', margin: '2rem auto'}}>
                    <h2>Create New Bonus</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label>Target Associate</label>
                            <select value={targetUserId} onChange={e => setTargetUserId(e.target.value)} required>
                                <option value="">-- Choose Associate --</option>
                                {team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                            </select>
                        </div>
                         <div className="form-group">
                            <label>Bonus Name</label>
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Start Date</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>End Date</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Application Count Target</label>
                            <input type="number" value={targetCount} onChange={e => setTargetCount(e.target.value)} required />
                        </div>
                        <div className="form-group">
                            <label>Bonus Amount per Application (€)</label>
                            <input type="number" step="0.01" value={bonusAmount} onChange={e => setBonusAmount(e.target.value)} required />
                        </div>
                        <button type="submit">Create Bonus</button>
                        {successMessage && <p className="success-message">{successMessage}</p>}
                    </form>
                </div>
                
                <div className="history-section">
                    <h2>Existing Bonuses</h2>
                    {/* Εδώ θα εμφανίζαμε τα bonus που έχουμε ήδη φτιάξει */}
                    <p>No bonuses to display yet.</p> 
                </div>
            </main>
        </div>
    );
};

export default BonusesPage;