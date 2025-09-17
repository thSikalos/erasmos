import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import ChartComponent from '../components/ChartComponent';

const ReportingPage = () => {
    const { token, user } = useContext(AuthContext);
    const [stats, setStats] = useState({ total_applications: 0, total_commission: 0 });
    const [details, setDetails] = useState([]);
    const [chartData, setChartData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [team, setTeam] = useState([]);
    const [companies, setCompanies] = useState([]);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        associateId: '',
        companyId: ''
    });

    useEffect(() => {
        const fetchFilterData = async () => {
            if (!token) return;
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                const [teamRes, companiesRes] = await Promise.all([
                    axios.get(user.role === 'Admin' || user.role === 'TeamLeader' ? apiUrl('/api/users') : apiUrl('/api/users/my-team'), config),
                    axios.get(apiUrl('/api/companies'), config)
                ]);
                setTeam(teamRes.data.filter(u => u.role === 'Associate'));
                setCompanies(companiesRes.data);
            } catch (err) {
                console.error("Failed to load filter data", err);
            }
        };
        fetchFilterData();
    }, [token, user]);
    
    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleApplyFilters = async () => {
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                params: filters
            };
            const [detailsRes, chartsRes] = await Promise.all([
                axios.get(apiUrl('/api/reports/detailed'), config),
                axios.get(apiUrl('/api/reports/charts'), config)
            ]);
            setStats(detailsRes.data.summary);
            setDetails(detailsRes.data.details);
            setChartData(chartsRes.data);
        } catch (err) {
            console.error("Failed to fetch report", err);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const queryParams = new URLSearchParams({
            token: token,
            ...filters
        }).toString();
        const url = apiUrl(`/api/reports/detailed/export?${queryParams}`);
        window.open(url, '_blank');
    };

    const handleExportPdf = () => {
        const queryParams = new URLSearchParams({
            token: token,
            ...filters
        }).toString();
        const url = apiUrl(`/api/reports/detailed/export/pdf?${queryParams}`);
        window.open(url, '_blank');
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            'Προς Καταχώρηση': { emoji: '⏳', class: 'pending' },
            'Καταχωρήθηκε': { emoji: '✅', class: 'approved' },
            'Εκκρεμότητα': { emoji: '🚨', class: 'needs-action' }
        };
        const statusInfo = statusMap[status] || { emoji: '📋', class: 'default' };
        return `${statusInfo.emoji} ${status}`;
    };

    return (
        <div className="modern-reporting-container">
            <style>
                {`
                    .modern-reporting-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-reporting-container::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }

                    .modern-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                        text-align: center;
                    }

                    .modern-header::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }

                    @keyframes shimmer {
                        0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
                        50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
                    }

                    .header-title {
                        font-size: 2.5rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        position: relative;
                        z-index: 2;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 15px;
                    }

                    .modern-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                        position: relative;
                        overflow: hidden;
                        z-index: 10;
                    }

                    .modern-card::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                    }

                    .card-content {
                        position: relative;
                        z-index: 2;
                    }

                    .card-header {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 25px;
                        padding-bottom: 15px;
                        border-bottom: 2px solid rgba(102, 126, 234, 0.1);
                    }

                    .card-title {
                        font-size: 1.4rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                    }

                    .filters-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                        margin-bottom: 25px;
                    }

                    .modern-form-group {
                        margin-bottom: 20px;
                    }

                    .modern-form-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #374151;
                        font-weight: 600;
                        font-size: 0.95rem;
                    }

                    .modern-input, .modern-select {
                        width: 100%;
                        padding: 15px 20px;
                        border: 2px solid rgba(102, 126, 234, 0.1);
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                    }

                    .modern-input:focus, .modern-select:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                        transform: translateY(-2px);
                    }

                    .apply-filters-button {
                        width: 100%;
                        padding: 16px 20px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                        margin-top: 10px;
                    }

                    .apply-filters-button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .apply-filters-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .apply-filters-button:hover::before {
                        left: 100%;
                    }

                    .apply-filters-button:not(:disabled):hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                    }

                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 25px;
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 10;
                    }

                    .stat-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(15px);
                        border-radius: 20px;
                        padding: 30px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .stat-card::before {
                        content: '';
                        position: absolute;
                        top: -50%;
                        left: -50%;
                        width: 200%;
                        height: 200%;
                        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
                        transform: rotate(45deg);
                        animation: shimmer 4s ease-in-out infinite;
                        opacity: 0;
                        transition: opacity 0.3s ease;
                    }

                    .stat-card:hover::before {
                        opacity: 1;
                    }

                    .stat-card:hover {
                        transform: translateY(-8px);
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.2);
                    }

                    .stat-icon {
                        font-size: 3rem;
                        margin-bottom: 15px;
                        position: relative;
                        z-index: 2;
                    }

                    .stat-number {
                        font-size: 2.5rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 8px;
                        position: relative;
                        z-index: 2;
                    }

                    .stat-label {
                        color: #6b7280;
                        font-size: 1rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        position: relative;
                        z-index: 2;
                    }

                    .chart-container {
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        border-radius: 15px;
                        padding: 25px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        margin-bottom: 25px;
                    }

                    .results-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        flex-wrap: wrap;
                        gap: 15px;
                    }

                    .export-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }

                    .export-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .export-button:hover::before {
                        left: 100%;
                    }

                    .export-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
                    }

                    .pdf-export-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }

                    .pdf-export-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .pdf-export-button:hover::before {
                        left: 100%;
                    }

                    .pdf-export-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
                    }

                    .applications-table {
                        width: 100%;
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        border-radius: 15px;
                        overflow: hidden;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                    }

                    .applications-table thead {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                    }

                    .applications-table th,
                    .applications-table td {
                        padding: 15px;
                        text-align: left;
                        border-bottom: 1px solid rgba(102, 126, 234, 0.1);
                    }

                    .applications-table th {
                        font-weight: 600;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .applications-table tbody tr {
                        transition: all 0.3s ease;
                    }

                    .applications-table tbody tr:hover {
                        background: rgba(102, 126, 234, 0.05);
                        transform: translateY(-1px);
                    }

                    .applications-table tbody tr:last-child td {
                        border-bottom: none;
                    }

                    .status-badge {
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 0.8rem;
                        font-weight: 600;
                        color: white;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .empty-state {
                        text-align: center;
                        padding: 50px;
                        color: #6b7280;
                    }

                    .empty-icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                        opacity: 0.5;
                    }

                    @media (max-width: 768px) {
                        .modern-reporting-container {
                            padding: 15px;
                        }

                        .modern-header, .modern-card {
                            padding: 25px;
                        }

                        .header-title {
                            font-size: 2rem;
                        }

                        .filters-grid {
                            grid-template-columns: 1fr;
                        }

                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
                        }

                        .results-header {
                            flex-direction: column;
                            text-align: center;
                        }

                        .applications-table {
                            font-size: 0.9rem;
                        }

                        .applications-table th,
                        .applications-table td {
                            padding: 10px;
                        }
                    }

                    @media (max-width: 480px) {
                        .stats-grid {
                            grid-template-columns: 1fr;
                        }

                        .applications-table {
                            font-size: 0.8rem;
                        }

                        .applications-table th,
                        .applications-table td {
                            padding: 8px;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <h1 className="header-title">
                    📊 Αναφορές & Στατιστικά
                </h1>
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">🔍 Φίλτρα Αναφοράς</h3>
                    </div>
                    
                    <div className="filters-grid">
                        <div className="modern-form-group">
                            <label>📅 Από</label>
                            <input 
                                type="date" 
                                name="startDate" 
                                className="modern-input"
                                value={filters.startDate} 
                                onChange={handleFilterChange} 
                            />
                        </div>
                        <div className="modern-form-group">
                            <label>📅 Έως</label>
                            <input 
                                type="date" 
                                name="endDate" 
                                className="modern-input"
                                value={filters.endDate} 
                                onChange={handleFilterChange} 
                            />
                        </div>
                        <div className="modern-form-group">
                            <label>👤 Συνεργάτης</label>
                            <select 
                                name="associateId" 
                                className="modern-select"
                                value={filters.associateId} 
                                onChange={handleFilterChange}
                            >
                                <option value="">Όλοι</option>
                                {team.map(member => (
                                    <option key={member.id} value={member.id}>{member.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="modern-form-group">
                            <label>🏢 Εταιρεία</label>
                            <select 
                                name="companyId" 
                                className="modern-select"
                                value={filters.companyId} 
                                onChange={handleFilterChange}
                            >
                                <option value="">Όλες</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleApplyFilters} 
                        disabled={loading}
                        className="apply-filters-button"
                    >
                        {loading ? '⏳ Φόρτωση...' : '🚀 Εφαρμογή Φίλτρων'}
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-number">{stats.total_applications}</div>
                    <div className="stat-label">Σύνολο Αιτήσεων</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-number">{parseFloat(stats.total_commission || 0).toFixed(2)}€</div>
                    <div className="stat-label">Σύνολο Αμοιβών</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-number">{team.length}</div>
                    <div className="stat-label">Συνεργάτες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">🏢</div>
                    <div className="stat-number">{companies.length}</div>
                    <div className="stat-label">Εταιρείες</div>
                </div>
            </div>

            {chartData && (
                <div className="modern-card">
                    <div className="card-content">
                        <div className="card-header">
                            <h3 className="card-title">📈 Οπτικοποιήσεις</h3>
                        </div>
                        <div className="chart-container">
                            <ChartComponent chartData={chartData} />
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-card">
                <div className="card-content">
                    <div className="results-header">
                        <h3 className="card-title">📋 Αναλυτικά Αποτελέσματα</h3>
                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                            <button onClick={handleExport} className="export-button">
                                📊 Εξαγωγή σε Excel
                            </button>
                            <button onClick={handleExportPdf} className="pdf-export-button">
                                📄 Εξαγωγή σε PDF
                            </button>
                        </div>
                    </div>
                    
                    {details.length > 0 ? (
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Ημερομηνία</th>
                                    <th>Συνεργάτης</th>
                                    <th>Πελάτης</th>
                                    <th>Εταιρεία</th>
                                    <th>Status</th>
                                    <th>Αμοιβή</th>
                                </tr>
                            </thead>
                            <tbody>
                                {details.map(app => (
                                    <tr key={app.id}>
                                        <td><strong>#{app.id}</strong></td>
                                        <td>{new Date(app.created_at).toLocaleDateString('el-GR')}</td>
                                        <td>{app.associate_name}</td>
                                        <td>{app.customer_name}</td>
                                        <td>{app.company_name}</td>
                                        <td>
                                            <span className="status-badge">
                                                {getStatusBadge(app.status)}
                                            </span>
                                        </td>
                                        <td><strong>{parseFloat(app.total_commission || 0).toFixed(2)} €</strong></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📊</div>
                            <p>Δεν βρέθηκαν αποτελέσματα</p>
                            <p style={{fontSize: '0.9rem', opacity: '0.7'}}>
                                Εφαρμόστε φίλτρα για να δείτε αναλυτικά αποτελέσματα
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportingPage;