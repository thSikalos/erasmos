import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import StatCard from '../components/StatCard';
import RemindersWidget from '../components/RemindersWidget';
import BonusProgressWidget from '../components/BonusProgressWidget';
import MobileTest from '../components/MobileTest';
import ResponsiveTable from '../components/ResponsiveTable';
import '../App.css';

const DashboardPage = () => {
    const { token, user } = useContext(AuthContext);
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
                    axios.get(apiUrl('/api/applications?limit=5'), config),
                    axios.get(apiUrl('/api/reports/dashboard'), config)
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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Καλημέρα';
        if (hour < 18) return 'Καλησπέρα';
        return 'Καληνύχτα';
    };

    if (loading) {
        return (
            <div className="modern-dashboard">
                <style>
                    {`
                        .loading-spinner {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 50vh;
                            font-size: 1.2rem;
                            color: #6b7280;
                        }
                        .spinner {
                            border: 3px solid #f3f4f6;
                            border-top: 3px solid #3b82f6;
                            border-radius: 50%;
                            width: 40px;
                            height: 40px;
                            animation: spin 1s linear infinite;
                            margin-right: 15px;
                        }
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    Φόρτωση δεδομένων...
                </div>
            </div>
        );
    }

    return (
        <div className="modern-dashboard">
            {/* <MobileTest /> */}
            <style>
                {`
                    .modern-dashboard {
                        min-height: calc(100vh - 80px);
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-dashboard::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }
                    
                    .dashboard-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .dashboard-header::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 3s ease-in-out infinite;
                    }
                    
                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }
                    
                    .welcome-title {
                        font-size: 2.5rem;
                        font-weight: 700;
                        color: white;
                        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                        margin-bottom: 10px;
                        position: relative;
                        z-index: 2;
                    }
                    
                    .welcome-subtitle {
                        font-size: 1.1rem;
                        color: rgba(255, 255, 255, 0.8);
                        margin-bottom: 20px;
                        position: relative;
                        z-index: 2;
                    }
                    
                    .user-info {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        position: relative;
                        z-index: 2;
                    }
                    
                    .user-avatar {
                        width: 50px;
                        height: 50px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: white;
                        font-size: 1.5rem;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }
                    
                    .user-details h3 {
                        margin: 0;
                        font-size: 1.2rem;
                        color: white;
                        font-weight: 600;
                        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                    }

                    .user-details p {
                        margin: 5px 0 0 0;
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 0.95rem;
                    }
                    
                    .dashboard-content {
                        display: grid;
                        gap: 30px;
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    
                    .stats-section {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    
                    .modern-stat-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 25px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-stat-card::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }
                    
                    .modern-stat-card:hover {
                        transform: translateY(-5px);
                        background: rgba(255, 255, 255, 0.2);
                        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
                    }
                    
                    .stat-icon {
                        width: 60px;
                        height: 60px;
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.8rem;
                        margin-bottom: 15px;
                        color: white;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                    }
                    
                    .stat-title {
                        font-size: 0.9rem;
                        color: rgba(255, 255, 255, 0.7);
                        margin-bottom: 10px;
                        font-weight: 500;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .stat-value {
                        font-size: 2rem;
                        font-weight: 700;
                        color: white;
                        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                        margin-bottom: 5px;
                    }
                    
                    .stat-change {
                        font-size: 0.85rem;
                        color: #4ade80;
                        font-weight: 500;
                        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                    }
                    
                    .applications-section {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .section-header {
                        display: flex;
                        align-items: center;
                        justify-content: between;
                        margin-bottom: 25px;
                    }
                    
                    .section-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: white;
                        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
                        margin: 0;
                    }
                    
                    .modern-table {
                        width: 100%;
                        border-collapse: collapse;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    }
                    
                    .modern-table thead {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }
                    
                    .modern-table th {
                        padding: 15px 20px;
                        color: white;
                        font-weight: 600;
                        text-align: left;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .modern-table td {
                        padding: 15px 20px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                        color: rgba(255, 255, 255, 0.9);
                        font-size: 0.95rem;
                    }
                    
                    .modern-table tbody tr {
                        background: rgba(255, 255, 255, 0.1);
                        transition: all 0.2s ease;
                        cursor: pointer;
                    }
                    
                    .modern-table tbody tr:hover {
                        background: rgba(255, 255, 255, 0.2);
                        transform: scale(1.01);
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    }
                    
                    .app-id-badge {
                        color: white;
                        font-weight: 600;
                        padding: 5px 10px;
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.2);
                        display: inline-block;
                    }
                    
                    .status-badge {
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 500;
                        text-align: center;
                        display: inline-block;
                        min-width: 100px;
                    }
                    
                    .status-pending {
                        background: #fef3c7;
                        color: #d69e2e;
                    }
                    
                    .status-completed {
                        background: #d1fae5;
                        color: #10b981;
                    }
                    
                    .commission-amount {
                        font-weight: 600;
                        color: #10b981;
                    }
                    
                    .error-message {
                        background: #fee2e2;
                        color: #dc2626;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin-bottom: 20px;
                        border-left: 4px solid #dc2626;
                    }
                    
                    @media (max-width: 768px) {
                        .modern-dashboard {
                            padding: 15px;
                        }
                        
                        .welcome-title {
                            font-size: 2rem;
                        }
                        
                        .stats-section {
                            grid-template-columns: 1fr;
                        }
                        
                        .modern-table {
                            font-size: 0.85rem;
                        }
                        
                        .modern-table th,
                        .modern-table td {
                            padding: 10px 15px;
                        }
                    }
                `}
            </style>
            
            <div className="dashboard-header">
                <h1 className="welcome-title">{getGreeting()}, {user?.name || 'Χρήστη'}!</h1>
                <p className="welcome-subtitle">Καλώς ήρθες στο dashboard σου. Εδώ μπορείς να παρακολουθείς την πρόοδό σου.</p>
                <div className="user-info">
                    <div className="user-avatar">
                        {(user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="user-details">
                        <h3>{user?.name || 'Χρήστης'}</h3>
                        <p>{user?.email} • {user?.role}</p>
                    </div>
                </div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            
            {stats && (
                <div className="dashboard-content">
                    <div className="stats-section">
                        <div className="modern-stat-card">
                            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #667eea, #764ba2)'}}>
                                📊
                            </div>
                            <div className="stat-title">Σύνολο Αιτήσεων</div>
                            <div className="stat-value">{stats.totalApplications}</div>
                            <div className="stat-change">Συνολικά στο σύστημα</div>
                        </div>
                        
                        <div className="modern-stat-card">
                            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #10b981, #059669)'}}>
                                💰
                            </div>
                            <div className="stat-title">Αμοιβές Μήνα</div>
                            <div className="stat-value">{stats.commissionsThisMonth.toFixed(2)} €</div>
                            <div className="stat-change">Τρέχον μήνα</div>
                        </div>
                        
                        <div className="modern-stat-card">
                            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
                                ⏳
                            </div>
                            <div className="stat-title">Προς Καταχώρηση</div>
                            <div className="stat-value">{statusCounts?.['Προς Καταχώρηση'] || 0}</div>
                            <div className="stat-change">Εκκρεμείς αιτήσεις</div>
                        </div>
                        
                        <div className="modern-stat-card">
                            <div className="stat-icon" style={{background: 'linear-gradient(135deg, #06b6d4, #0891b2)'}}>
                                ✅
                            </div>
                            <div className="stat-title">Καταχωρήθηκε</div>
                            <div className="stat-value">{statusCounts?.['Καταχωρήθηκε'] || 0}</div>
                            <div className="stat-change">Ολοκληρωμένες</div>
                        </div>
                    </div>
                    
                    <div className="applications-section">
                        <div className="section-header">
                            <h2 className="section-title">Πρόσφατες Αιτήσεις</h2>
                        </div>
                        
                        <table className="modern-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Πελάτης</th>
                                    <th>Συνεργάτης</th>
                                    <th>Status</th>
                                    <th>Προμήθεια</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map(app => (
                                    <tr key={app.application_id} onClick={() => window.location.href = `/application/${app.application_id}`}>
                                        <td>
                                            <span className="app-id-badge">
                                                #{app.application_id}
                                            </span>
                                        </td>
                                        <td>{app.customer_name}</td>
                                        <td>{app.associate_name || 'N/A'}</td>
                                        <td>
                                            <span className={`status-badge ${
                                                app.status === 'Καταχωρήθηκε' ? 'status-completed' : 'status-pending'
                                            }`}>
                                                {app.status}
                                            </span>
                                        </td>
                                        <td className="commission-amount">
                                            {app.total_commission ? parseFloat(app.total_commission).toFixed(2) + ' €' : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Test ResponsiveTable - Hidden
                    <div className="applications-section">
                        <div className="section-header">
                            <h2 className="section-title">📱 Mobile Test Table</h2>
                        </div>
                        <ResponsiveTable
                            data={[
                                { id: 1, name: 'Δοκιμή 1', status: 'Ενεργό', amount: '€100' },
                                { id: 2, name: 'Δοκιμή 2', status: 'Περιμένει', amount: '€200' },
                                { id: 3, name: 'Δοκιμή 3', status: 'Ολοκληρώθηκε', amount: '€300' }
                            ]}
                            columns={[
                                { key: 'id', header: 'ID' },
                                { key: 'name', header: 'Όνομα' },
                                { key: 'status', header: 'Κατάσταση' },
                                { key: 'amount', header: 'Ποσό' }
                            ]}
                            emptyMessage="Δεν υπάρχουν δεδομένα για δοκιμή"
                            emptyIcon="🧪"
                        />
                    </div>
                    */}

                    <BonusProgressWidget />
                    <RemindersWidget />
                </div>
            )}
        </div>
    );
};

export default DashboardPage;