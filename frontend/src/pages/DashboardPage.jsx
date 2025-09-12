import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import StatCard from '../components/StatCard';
import RemindersWidget from '../components/RemindersWidget';
import '../App.css';

const DashboardPage = () => {
    const { token } = useContext(AuthContext);
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const config = { headers: { 'Authorization': `Bearer ${token}` } };
                const [appsRes, statsRes] = await Promise.all([
                    axios.get('http://localhost:3000/api/applications?limit=5', config),
                    axios.get('http://localhost:3000/api/reports/dashboard', config)
                ]);
                setApplications(appsRes.data);
                setStats(statsRes.data);
            } catch (err) {
                setError('Failed to fetch dashboard data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        if (token) fetchData();
    }, [token]);

    const statusCounts = stats?.applicationsByStatus.reduce((acc, current) => {
        acc[current.status] = current.count;
        return acc;
    }, {});

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Welcome to the Dashboard!</h1>
            </header>
            
            {loading && <p>Loading dashboard...</p>}
            {error && <p className="error-message">{error}</p>}
            
            {!loading && stats && (
                <>
                    <div className="stats-grid">
                        <StatCard title="Σύνολο Αιτήσεων" value={stats.totalApplications} />
                        <StatCard title="Αμοιβές Μήνα" value={`${stats.commissionsThisMonth.toFixed(2)} €`} />
                        <StatCard title="Προς Καταχώρηση" value={statusCounts?.['Προς Καταχώρηση'] || 0} />
                        <StatCard title="Καταχωρήθηκε" value={statusCounts?.['Καταχωρήθηκε'] || 0} />
                    </div>
                    <RemindersWidget />
                    <main className="history-section">
                        <h2>Πρόσφατες Αιτήσεις</h2>
                        <table className="applications-table">
                            <thead>
                                <tr><th>ID</th><th>Πελάτης</th><th>Συνεργάτης</th><th>Status</th><th>Προμήθεια</th></tr>
                            </thead>
                            <tbody>
                                {applications.map(app => (
                                    <tr key={app.application_id}>
                                        <td><Link to={`/application/${app.application_id}`}>{app.application_id}</Link></td>
                                        <td>{app.customer_name}</td>
                                        <td>{app.associate_name || 'N/A'}</td>
                                        <td>{app.status}</td>
                                        <td>{app.total_commission ? parseFloat(app.total_commission).toFixed(2) + ' €' : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </main>
                </>
            )}
        </div>
    );
};

export default DashboardPage;