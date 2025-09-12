import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import ChartComponent from '../components/ChartComponent';
import '../App.css';

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
                    axios.get(user.role === 'Admin' || user.role === 'TeamLeader' ? 'http://localhost:3000/api/users' : 'http://localhost:3000/api/users/my-team', config),
                    axios.get('http://localhost:3000/api/companies', config)
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
                axios.get('http://localhost:3000/api/reports/detailed', config),
                axios.get('http://localhost:3000/api/reports/charts', config)
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
        const url = `http://localhost:3000/api/reports/detailed/export?${queryParams}`;
        window.open(url, '_blank');
    };

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Αναφορές & Στατιστικά</h1>
            </header>
            <main>
                <div className="admin-section">
                    <h3>Φίλτρα Αναφοράς</h3>
                    <div className="filters-grid">
                        <div className="form-group">
                            <label>Από</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        </div>
                        <div className="form-group">
                            <label>Έως</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        </div>
                        <div className="form-group">
                            <label>Συνεργάτης</label>
                            <select name="associateId" value={filters.associateId} onChange={handleFilterChange}>
                                <option value="">Όλοι</option>
                                {team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Εταιρεία</label>
                            <select name="companyId" value={filters.companyId} onChange={handleFilterChange}>
                                <option value="">Όλες</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleApplyFilters} disabled={loading}>{loading ? 'Φόρτωση...' : 'Εφαρμογή Φίλτρων'}</button>
                </div>
                {chartData && (
                    <div className="admin-section">
                        <h3>Οπτικοποιήσεις</h3>
                        <ChartComponent chartData={chartData} />
                    </div>
                )}
                <div className="stats-grid">
                    <div className="stat-card"><h4>Σύνολο Αιτήσεων</h4><p>{stats.total_applications}</p></div>
                    <div className="stat-card"><h4>Σύνολο Αμοιβών</h4><p>{parseFloat(stats.total_commission).toFixed(2)} €</p></div>
                </div>
                <div className="history-section">
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <h2>Αναλυτικά Αποτελέσματα</h2>
                        <button onClick={handleExport} className="button-new" style={{width: 'auto'}}>Εξαγωγή σε Excel</button>
                    </div>
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
                                   <td>{app.id}</td>
                                   <td>{new Date(app.created_at).toLocaleString('el-GR')}</td>
                                   <td>{app.associate_name}</td>
                                   <td>{app.customer_name}</td>
                                   <td>{app.company_name}</td>
                                   <td>{app.status}</td>
                                   <td>{parseFloat(app.total_commission).toFixed(2)} €</td>
                               </tr>
                           ))}
                        </tbody>
                    </table>
                </div>
            </main>
        </div>
    );
};

export default ReportingPage;