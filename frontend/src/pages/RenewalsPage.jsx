import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import '../App.css';

const RenewalsPage = () => {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [renewals, setRenewals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ startDate: '', endDate: '' });

    useEffect(() => {
        const fetchRenewals = async () => {
            if (!token) return;
            setLoading(true);
            try {
                const params = {};
                if (filters.startDate && filters.startDate.trim() !== '') {
                    params.startDate = filters.startDate;
                }
                if (filters.endDate && filters.endDate.trim() !== '') {
                    params.endDate = filters.endDate;
                }
                
                const config = { 
                    headers: { Authorization: `Bearer ${token}` },
                    params: params
                };
                console.log('Renewals request params:', params);
                const res = await axios.get(apiUrl('/api/applications/renewals'), config);
                setRenewals(res.data);
            } catch (err) {
                console.error("Failed to fetch renewals", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRenewals();
    }, [token, filters]);

    const handleExport = () => {
        const params = { token: token };
        if (filters.startDate && filters.startDate.trim() !== '') {
            params.startDate = filters.startDate;
        }
        if (filters.endDate && filters.endDate.trim() !== '') {
            params.endDate = filters.endDate;
        }
        
        const queryParams = new URLSearchParams(params).toString();
        const url = apiUrl(`/api/applications/renewals/export?${queryParams}`);
        window.open(url, '_blank');
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '' });
    };

    const getExpiryStatus = (contractEndDate) => {
        const today = new Date();
        const endDate = new Date(contractEndDate);
        const diffTime = endDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return { status: 'expired', text: 'Έληξε', days: Math.abs(diffDays) };
        if (diffDays <= 30) return { status: 'urgent', text: 'Επείγον', days: diffDays };
        if (diffDays <= 60) return { status: 'soon', text: 'Σύντομα', days: diffDays };
        return { status: 'normal', text: 'Κανονικά', days: diffDays };
    };

    if (loading) {
        return (
            <div className="modern-renewals-page">
                <style>
                    {`
                        .loading-container {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 50vh;
                            font-size: 1.2rem;
                            color: #6b7280;
                        }
                        .spinner {
                            border: 3px solid #f3f4f6;
                            border-top: 3px solid #667eea;
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
                <div className="loading-container">
                    <div className="spinner"></div>
                    Φόρτωση ανανεώσεων...
                </div>
            </div>
        );
    }

    return (
        <div className="modern-renewals-page">
            <style>
                {`
                    .modern-renewals-page {
                        min-height: calc(100vh - 80px);
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-renewals-page::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }
                    
                    .renewals-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 20px;
                    }
                    
                    .renewals-header::before {
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
                    
                    .header-content {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        position: relative;
                        z-index: 2;
                    }
                    
                    .renewals-icon {
                        width: 60px;
                        height: 60px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        border-radius: 15px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.8rem;
                        color: white;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }
                    
                    .header-text h1 {
                        font-size: 2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0 0 5px 0;
                    }
                    
                    .header-text p {
                        color: #6b7280;
                        margin: 0;
                        font-size: 1rem;
                    }
                    
                    .back-button {
                        background: linear-gradient(135deg, #6b7280, #4b5563);
                        color: white;
                        text-decoration: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 0.95rem;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        z-index: 2;
                        overflow: hidden;
                    }
                    
                    .back-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }
                    
                    .back-button:hover::before {
                        left: 100%;
                    }
                    
                    .back-button:hover {
                        background: linear-gradient(135deg, #4b5563, #374151);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
                        text-decoration: none;
                        color: white;
                    }
                    
                    .filters-section {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 25px;
                        margin-bottom: 25px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .filters-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    
                    .filters-title {
                        font-size: 1.25rem;
                        font-weight: 600;
                        color: #1f2937;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .clear-filters-btn {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        font-size: 0.85rem;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    
                    .clear-filters-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                    }
                    
                    .filters-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                    }
                    
                    .filter-group {
                        position: relative;
                    }
                    
                    .filter-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #374151;
                        font-weight: 600;
                        font-size: 0.95rem;
                    }
                    
                    .modern-date-input {
                        width: 100%;
                        padding: 12px 16px;
                        border: 2px solid #e5e7eb;
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                    }
                    
                    .modern-date-input:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                        transform: translateY(-2px);
                    }
                    
                    .renewals-content {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    
                    .content-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        flex-wrap: wrap;
                        gap: 15px;
                    }
                    
                    .section-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: #1f2937;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .renewals-count {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 600;
                    }
                    
                    .export-button {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 0.95rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        display: flex;
                        align-items: center;
                        gap: 8px;
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
                        background: linear-gradient(135deg, #059669, #047857);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }
                    
                    .modern-renewals-table {
                        width: 100%;
                        border-collapse: collapse;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    }
                    
                    .modern-renewals-table thead {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }
                    
                    .modern-renewals-table th {
                        padding: 15px 20px;
                        color: white;
                        font-weight: 600;
                        text-align: left;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .modern-renewals-table td {
                        padding: 15px 20px;
                        border-bottom: 1px solid #f3f4f6;
                        color: #374151;
                        font-size: 0.95rem;
                    }
                    
                    .modern-renewals-table tbody tr {
                        background: rgba(255, 255, 255, 0.1);
                        transition: all 0.2s ease;
                    }
                    
                    .modern-renewals-table tbody tr {
                        cursor: pointer;
                    }
                    
                    .modern-renewals-table tbody tr:hover {
                        background: #f8fafc;
                        transform: scale(1.01);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                    }
                    
                    .customer-name {
                        font-weight: 600;
                        color: #1f2937;
                    }
                    
                    .customer-phone {
                        color: #059669;
                        font-weight: 500;
                    }
                    
                    .company-name {
                        color: #667eea;
                        font-weight: 500;
                    }
                    
                    .associate-name {
                        color: #6b7280;
                        font-style: italic;
                    }
                    
                    .expiry-status {
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 600;
                        text-align: center;
                        display: inline-flex;
                        align-items: center;
                        gap: 4px;
                        min-width: 100px;
                        justify-content: center;
                    }
                    
                    .expiry-status.expired {
                        background: #fee2e2;
                        color: #dc2626;
                    }
                    
                    .expiry-status.urgent {
                        background: #fed7aa;
                        color: #ea580c;
                    }
                    
                    .expiry-status.soon {
                        background: #fef3c7;
                        color: #d97706;
                    }
                    
                    .expiry-status.normal {
                        background: #d1fae5;
                        color: #10b981;
                    }
                    
                    .days-info {
                        font-size: 0.75rem;
                        opacity: 0.8;
                        display: block;
                        margin-top: 2px;
                    }
                    
                    .no-renewals {
                        text-align: center;
                        padding: 60px 20px;
                        color: #6b7280;
                    }
                    
                    .no-renewals-icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                        opacity: 0.5;
                    }
                    
                    .no-renewals h3 {
                        margin: 0 0 10px 0;
                        color: #374151;
                        font-size: 1.25rem;
                    }
                    
                    .no-renewals p {
                        margin: 0;
                        font-size: 1rem;
                    }
                    
                    .filter-info {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding: 15px 20px;
                        background: rgba(102, 126, 234, 0.05);
                        border-radius: 10px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                    }
                    
                    .filter-text {
                        color: #374151;
                        font-size: 0.9rem;
                    }
                    
                    .date-highlight {
                        background: rgba(102, 126, 234, 0.2);
                        color: #667eea;
                        font-weight: 600;
                        padding: 2px 6px;
                        border-radius: 4px;
                    }
                    
                    @media (max-width: 768px) {
                        .modern-renewals-page {
                            padding: 15px;
                        }
                        
                        .renewals-header {
                            flex-direction: column;
                            text-align: center;
                        }
                        
                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }
                        
                        .header-text h1 {
                            font-size: 1.75rem;
                        }
                        
                        .filters-grid {
                            grid-template-columns: 1fr;
                        }
                        
                        .content-header {
                            flex-direction: column;
                            align-items: flex-start;
                        }
                        
                        .modern-renewals-table {
                            font-size: 0.85rem;
                        }
                        
                        .modern-renewals-table th,
                        .modern-renewals-table td {
                            padding: 10px 15px;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .modern-renewals-table th:nth-child(2),
                        .modern-renewals-table td:nth-child(2),
                        .modern-renewals-table th:nth-child(4),
                        .modern-renewals-table td:nth-child(4) {
                            display: none;
                        }
                        
                        .renewals-header {
                            padding: 20px;
                        }
                        
                        .renewals-content {
                            padding: 20px;
                        }
                    }
                `}
            </style>
            
            <div className="renewals-header">
                <div className="header-content">
                    <div className="renewals-icon">🔄</div>
                    <div className="header-text">
                        <h1>Ανανεώσεις Συμβολαίων</h1>
                        <p>Παρακολούθηση και διαχείριση ανανεώσεων</p>
                    </div>
                </div>
                <Link to="/dashboard" className="back-button">
                    ⬅️ Πίσω στο Dashboard
                </Link>
            </div>
            
            <div className="filters-section">
                <div className="filters-header">
                    <h3 className="filters-title">
                        🔍 Φίλτρα Αναζήτησης
                    </h3>
                    {(filters.startDate || filters.endDate) && (
                        <button onClick={clearFilters} className="clear-filters-btn">
                            🗑️ Καθαρισμός
                        </button>
                    )}
                </div>
                
                <div className="filters-grid">
                    <div className="filter-group">
                        <label htmlFor="startDate">📅 Από Ημερομηνία</label>
                        <input 
                            id="startDate"
                            type="date" 
                            value={filters.startDate} 
                            onChange={e => setFilters({...filters, startDate: e.target.value})}
                            className="modern-date-input"
                        />
                    </div>
                    <div className="filter-group">
                        <label htmlFor="endDate">📅 Έως Ημερομηνία</label>
                        <input 
                            id="endDate"
                            type="date" 
                            value={filters.endDate} 
                            onChange={e => setFilters({...filters, endDate: e.target.value})}
                            className="modern-date-input"
                        />
                    </div>
                </div>
            </div>
            
            <div className="renewals-content">
                <div className="content-header">
                    <h2 className="section-title">
                        📋 Αποτελέσματα
                        <span className="renewals-count">{renewals.length}</span>
                    </h2>
                    <button onClick={handleExport} className="export-button">
                        📊 Εξαγωγή σε Excel
                    </button>
                </div>
                
                {(filters.startDate || filters.endDate) && (
                    <div className="filter-info">
                        <span className="filter-text">
                            Φίλτρο: 
                            {filters.startDate && <span className="date-highlight">{new Date(filters.startDate).toLocaleDateString('el-GR')}</span>}
                            {filters.startDate && filters.endDate && ' έως '}
                            {filters.endDate && <span className="date-highlight">{new Date(filters.endDate).toLocaleDateString('el-GR')}</span>}
                        </span>
                        <span className="filter-text">
                            {renewals.length} συμβόλαια βρέθηκαν
                        </span>
                    </div>
                )}
                
                {renewals.length > 0 ? (
                    <table className="modern-renewals-table">
                        <thead>
                            <tr>
                                <th>👤 Πελάτης</th>
                                <th>📞 Τηλέφωνο</th>
                                <th>🏢 Εταιρεία</th>
                                <th>🤝 Συνεργάτης</th>
                                <th>⏰ Λήξη Συμβολαίου</th>
                            </tr>
                        </thead>
                        <tbody>
                            {renewals.map(r => {
                                const expiryInfo = getExpiryStatus(r.contract_end_date);
                                return (
                                    <tr key={r.application_id} onClick={() => navigate(`/application/${r.application_id}`)}>
                                        <td className="customer-name">{r.customer_name}</td>
                                        <td className="customer-phone">{r.customer_phone || 'Δεν έχει καταχωρηθεί'}</td>
                                        <td className="company-name">{r.company_name}</td>
                                        <td className="associate-name">{r.associate_name || 'Δεν έχει ανατεθεί'}</td>
                                        <td>
                                            <div className={`expiry-status ${expiryInfo.status}`}>
                                                {expiryInfo.status === 'expired' && '❌'}
                                                {expiryInfo.status === 'urgent' && '🚨'}
                                                {expiryInfo.status === 'soon' && '⚠️'}
                                                {expiryInfo.status === 'normal' && '✅'}
                                                {new Date(r.contract_end_date).toLocaleDateString('el-GR')}
                                                <span className="days-info">
                                                    {expiryInfo.status === 'expired' 
                                                        ? `Έληξε πριν ${expiryInfo.days} ημέρες`
                                                        : `${expiryInfo.days} ημέρες`
                                                    }
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-renewals">
                        <div className="no-renewals-icon">🔄</div>
                        <h3>Δεν βρέθηκαν συμβόλαια</h3>
                        <p>
                            {(filters.startDate || filters.endDate)
                                ? 'Δεν βρέθηκαν συμβόλαια για το επιλεγμένο διάστημα'
                                : 'Δεν υπάρχουν συμβόλαια προς ανανέωση αυτή τη στιγμή'
                            }
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RenewalsPage;