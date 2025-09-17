import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const RemindersWidget = () => {
    const { token, user } = useContext(AuthContext);
    const [reminders, setReminders] = useState([]);
    const [teamAndLeader, setTeamAndLeader] = useState([]);
    const [title, setTitle] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [dueDate, setDueDate] = useState('');

    const fetchData = async () => {
        if (!token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
           
            // Παίρνουμε τις υπενθυμίσεις
            const remindersRes = await axios.get(apiUrl('/api/reminders'), config);
            setReminders(remindersRes.data);
            // Παίρνουμε την ομάδα ΚΑΙ τον ομαδάρχη (αν υπάρχει)
            const usersToAssign = [];
            if (user.role === 'TeamLeader' || user.role === 'Admin') {
                const teamRes = await axios.get(apiUrl('/api/users/my-team'), config);
                usersToAssign.push(...teamRes.data);
            }
            if (user.parent_user_id) {
                const leaderRes = await axios.get(apiUrl(`/api/users/${user.parent_user_id}`), config);
                usersToAssign.push(leaderRes.data);
            }
            setTeamAndLeader(usersToAssign);
            // Προεπιλέγουμε τον εαυτό μας στο dropdown
            setAssigneeId(user.id);
        } catch (err) {
            console.error("Failed to fetch reminder data", err);
        }
    };

    useEffect(() => { fetchData(); }, [token, user]);

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { assignee_id: parseInt(assigneeId), title, due_date: dueDate };
            await axios.post(apiUrl('/api/reminders'), body, config);
            setTitle('');
            setAssigneeId(user.id);
            setDueDate('');
            fetchData();
        } catch (err) {
            console.error("Failed to create reminder", err);
        }
    };

    const handleComplete = async (id) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(apiUrl(`/api/reminders/${id}/complete`), {}, config);
            fetchData();
        } catch (err) {
            console.error("Failed to complete reminder", err);
        }
    };

    const pendingReminders = reminders.filter(r => r.status === 'pending');
    const completedReminders = reminders.filter(r => r.status === 'completed').slice(0, 5); // Δείχνουμε τις 5 πιο πρόσφατες

    return (
        <div className="modern-reminders-widget">
            <style>
                {`
                    .modern-reminders-widget {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        margin-top: 30px;
                    }
                    
                    .reminders-header {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        margin-bottom: 25px;
                    }
                    
                    .reminders-icon {
                        width: 50px;
                        height: 50px;
                        background: linear-gradient(135deg, #8b5cf6, #a855f7);
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.5rem;
                        color: white;
                        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                    }
                    
                    .reminders-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: white;
                        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                        margin: 0;
                    }
                    
                    .modern-reminder-form {
                        display: grid;
                        grid-template-columns: 1fr auto auto auto;
                        gap: 15px;
                        margin-bottom: 30px;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .modern-reminder-form input,
                    .modern-reminder-form select {
                        padding: 10px 15px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        font-size: 0.95rem;
                        background: rgba(255, 255, 255, 0.2);
                        color: white;
                        transition: all 0.2s ease;
                    }

                    .modern-reminder-form input::placeholder {
                        color: rgba(255, 255, 255, 0.7);
                    }
                    
                    .modern-reminder-form input:focus,
                    .modern-reminder-form select:focus {
                        outline: none;
                        border-color: rgba(255, 255, 255, 0.5);
                        background: rgba(255, 255, 255, 0.25);
                        box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
                    }
                    
                    .add-reminder-btn {
                        padding: 10px 20px;
                        background: linear-gradient(135deg, #8b5cf6, #a855f7);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        white-space: nowrap;
                    }
                    
                    .add-reminder-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
                    }
                    
                    .reminders-section {
                        margin-bottom: 25px;
                    }
                    
                    .section-subtitle {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: rgba(255, 255, 255, 0.9);
                        margin-bottom: 15px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .reminder-list {
                        list-style: none;
                        padding: 0;
                        margin: 0;
                        display: grid;
                        gap: 10px;
                    }
                    
                    .reminder-item {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 15px 20px;
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                    }
                    
                    .reminder-item:hover {
                        transform: translateY(-2px);
                        background: rgba(255, 255, 255, 0.2);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
                        border-color: rgba(255, 255, 255, 0.4);
                    }
                    
                    .reminder-content {
                        flex: 1;
                    }
                    
                    .reminder-title {
                        font-weight: 600;
                        color: white;
                        margin-bottom: 5px;
                        font-size: 1rem;
                    }
                    
                    .reminder-date {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.9rem;
                    }
                    
                    .reminder-meta {
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 0.85rem;
                        margin-top: 3px;
                    }
                    
                    .complete-btn {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-size: 0.85rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        white-space: nowrap;
                    }
                    
                    .complete-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    }
                    
                    .no-reminders {
                        text-align: center;
                        color: rgba(255, 255, 255, 0.7);
                        font-style: italic;
                        padding: 20px;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        border: 1px dashed rgba(255, 255, 255, 0.3);
                    }
                    
                    .completed-reminder-item {
                        opacity: 0.7;
                        background: rgba(255, 255, 255, 0.05);
                    }
                    
                    @media (max-width: 768px) {
                        .modern-reminder-form {
                            grid-template-columns: 1fr;
                            gap: 10px;
                        }
                        
                        .reminder-item {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 10px;
                        }
                        
                        .complete-btn {
                            align-self: flex-end;
                        }
                    }
                `}
            </style>
            
            <div className="reminders-header">
                <div className="reminders-icon">🔔</div>
                <h3 className="reminders-title">Υπενθυμίσεις</h3>
            </div>
            
            <form onSubmit={handleCreate} className="modern-reminder-form">
                <input 
                    type="text" 
                    placeholder="Τίτλος υπενθύμισης..." 
                    value={title} 
                    onChange={e => setTitle(e.target.value)} 
                    required 
                />
                <input 
                    type="date" 
                    value={dueDate} 
                    onChange={e => setDueDate(e.target.value)} 
                    required 
                />
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                    <option value={user.id}>Για εμένα</option>
                    {teamAndLeader.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button type="submit" className="add-reminder-btn">
                    ➕ Προσθήκη
                </button>
            </form>
            
            <div className="reminders-section">
                <h4 className="section-subtitle">
                    ⏰ Ενεργές Υπενθυμίσεις
                </h4>
                <ul className="reminder-list">
                    {pendingReminders.length > 0 ? pendingReminders.map(r => (
                        <li key={r.id} className="reminder-item">
                            <div className="reminder-content">
                                <div className="reminder-title">{r.title}</div>
                                <div className="reminder-date">
                                    📅 Έως: {new Date(r.due_date).toLocaleDateString('el-GR')}
                                </div>
                                <div className="reminder-meta">
                                    👤 Από: {r.creator_name} • Προς: {r.assignee_name}
                                </div>
                            </div>
                            <button 
                                onClick={() => handleComplete(r.id)} 
                                className="complete-btn"
                            >
                                ✓ Ολοκληρώθηκε
                            </button>
                        </li>
                    )) : (
                        <li className="no-reminders">
                            ✨ Δεν υπάρχουν ενεργές υπενθυμίσεις
                        </li>
                    )}
                </ul>
            </div>
            
            <div className="reminders-section">
                <h4 className="section-subtitle">
                    ✅ Πρόσφατα Ολοκληρωμένες
                </h4>
                <ul className="reminder-list">
                    {completedReminders.length > 0 ? completedReminders.map(r => (
                        <li key={r.id} className="reminder-item completed-reminder-item">
                            <div className="reminder-content">
                                <div className="reminder-title">{r.title}</div>
                                <div className="reminder-date">
                                    ✅ Ολοκληρώθηκε: {new Date(r.due_date).toLocaleDateString('el-GR')}
                                </div>
                            </div>
                        </li>
                    )) : (
                        <li className="no-reminders">
                            📝 Δεν υπάρχουν πρόσφατα ολοκληρωμένες υπενθυμίσεις
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
};

export default RemindersWidget;