import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

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
            const remindersRes = await axios.get('http://localhost:3000/api/reminders', config);
            setReminders(remindersRes.data);
            // Παίρνουμε την ομάδα ΚΑΙ τον ομαδάρχη (αν υπάρχει)
            const usersToAssign = [];
            if (user.role === 'TeamLeader' || user.role === 'Admin') {
                const teamRes = await axios.get('http://localhost:3000/api/users/my-team', config);
                usersToAssign.push(...teamRes.data);
            }
            if (user.parent_user_id) {
                const leaderRes = await axios.get(`http://localhost:3000/api/users/${user.parent_user_id}`, config);
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
            await axios.post('http://localhost:3000/api/reminders', body, config);
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
            await axios.patch(`http://localhost:3000/api/reminders/${id}/complete`, {}, config);
            fetchData();
        } catch (err) {
            console.error("Failed to complete reminder", err);
        }
    };

    const pendingReminders = reminders.filter(r => r.status === 'pending');
    const completedReminders = reminders.filter(r => r.status === 'completed').slice(0, 5); // Δείχνουμε τις 5 πιο πρόσφατες

    return (
        <div className="admin-section">
            <h3>Υπενθυμίσεις</h3>
            <form onSubmit={handleCreate} className="inline-form" style={{flexWrap: 'wrap', marginBottom: '2rem'}}>
                <input type="text" placeholder="Τίτλος..." value={title} onChange={e => setTitle(e.target.value)} required style={{flexBasis: '100%'}}/>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
                <select value={assigneeId} onChange={e => setAssigneeId(e.target.value)}>
                    <option value={user.id}>Για εμένα</option>
                    {teamAndLeader.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button type="submit">Προσθήκη</button>
            </form>
           
            <h4>Ενεργές</h4>
            <ul className="data-list">
                {pendingReminders.length > 0 ? pendingReminders.map(r => (
                    <li key={r.id}>
                        <div>
                            <span>{r.title} (έως {new Date(r.due_date).toLocaleDateString('el-GR')})</span>
                            <br />
                            <small>Από: {r.creator_name} / Προς: {r.assignee_name}</small>
                        </div>
                        <button onClick={() => handleComplete(r.id)} className="button-new" style={{width: 'auto'}}>Ολοκληρώθηκε</button>
                    </li>
                )) : <li>Δεν υπάρχουν ενεργές υπενθυμίσεις.</li>}
            </ul>
            <h4 style={{marginTop: '2rem'}}>Πρόσφατα Ολοκληρωμένες</h4>
             <ul className="data-list completed-list">
                {completedReminders.length > 0 ? completedReminders.map(r => (
                    <li key={r.id}>
                        <div>
                            <span>{r.title}</span>
                            <br />
                            <small>Ολοκληρώθηκε στις {new Date(r.due_date).toLocaleDateString('el-GR')}</small>
                        </div>
                    </li>
                )) : <li>Δεν υπάρχουν πρόσφατα ολοκληρωμένες υπενθυμίσεις.</li>}
            </ul>
        </div>
    );
};

export default RemindersWidget;