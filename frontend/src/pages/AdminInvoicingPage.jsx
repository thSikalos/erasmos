import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';

const AdminInvoicingPage = () => {
    const { token } = useContext(AuthContext);
    const [teamLeaders, setTeamLeaders] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTlId, setSelectedTlId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [message, setMessage] = useState('');
    const [generatedInvoice, setGeneratedInvoice] = useState(null);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [leadersRes, invoicesRes] = await Promise.all([
                axios.get(apiUrl('/api/users'), config),
                axios.get(apiUrl('/api/admin-billing/invoices'), config)
            ]);
            setTeamLeaders(leadersRes.data.filter(u => u.role === 'TeamLeader' || u.role === 'Admin'));
            setInvoices(invoicesRes.data);
        } catch (err) {
            console.error("Failed to fetch data", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [token]);

    const handleGenerate = async () => {
        setMessage('');
        setGeneratedInvoice(null);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { team_leader_id: parseInt(selectedTlId), startDate, endDate };
            const res = await axios.post(apiUrl('/api/admin-billing/invoices'), body, config);
            setMessage('Η ταμειακή κατάσταση δημιουργήθηκε με επιτυχία!');
            setGeneratedInvoice(res.data);
            fetchData(); // Refresh invoices after generating a new one
        } catch (err) {
            setMessage(err.response?.data?.message || 'Σφάλμα κατά τη δημιουργία.');
        }
    };

    const handleDownloadPdf = (invoiceId) => {
        const url = `${apiUrl('/api/admin-billing/invoices/')}${invoiceId}/pdf?token=${token}`;
        window.open(url, '_blank');
    };

    const handleDownloadExcel = (invoiceId) => {
        const url = `${apiUrl('/api/admin-billing/invoices/')}${invoiceId}/excel?token=${token}`;
        window.open(url, '_blank');
    };

    return (
        <div className="modern-admin-invoicing-container">
            <style>
                {`
                    .modern-admin-invoicing-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-admin-invoicing-container::before {
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

                    .header-content {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        position: relative;
                        z-index: 2;
                        flex-wrap: wrap;
                        gap: 15px;
                    }

                    .header-title {
                        font-size: 2.2rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin: 0;
                        display: flex;
                        align-items: center;
                        gap: 15px;
                    }

                    .modern-back-button {
                        padding: 12px 24px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        text-decoration: none;
                        border-radius: 12px;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                    }

                    .modern-back-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .modern-back-button:hover::before {
                        left: 100%;
                    }

                    .modern-back-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
                        color: white;
                        text-decoration: none;
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

                    .generate-button {
                        width: 100%;
                        padding: 16px 20px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 12px;
                        font-size: 1.1rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                        margin-top: 10px;
                    }

                    .generate-button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .generate-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .generate-button:hover::before {
                        left: 100%;
                    }

                    .generate-button:not(:disabled):hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
                    }

                    .status-message {
                        text-align: center;
                        margin-top: 20px;
                        padding: 15px 20px;
                        border-radius: 12px;
                        font-weight: 600;
                        backdrop-filter: blur(10px);
                    }

                    .status-message.success {
                        background: rgba(16, 185, 129, 0.1);
                        color: #065f46;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                    }

                    .status-message.error {
                        background: rgba(239, 68, 68, 0.1);
                        color: #dc2626;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                    }

                    .detail-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 25px;
                    }

                    .detail-item {
                        background: rgba(255, 255, 255, 0.7);
                        padding: 20px;
                        border-radius: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                    }

                    .detail-item:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 8px 25px rgba(102, 126, 234, 0.15);
                    }

                    .detail-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 600;
                        margin-bottom: 8px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .detail-value {
                        color: #374151;
                        font-size: 1.2rem;
                        font-weight: 700;
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

                    .pdf-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                        font-size: 0.9rem;
                    }

                    .pdf-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                    }

                    .excel-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #16a085, #0f7864);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(22, 160, 133, 0.3);
                        font-size: 0.9rem;
                    }
                    .excel-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(22, 160, 133, 0.4);
                    }

                    .loading-state {
                        text-align: center;
                        padding: 40px;
                        color: #6b7280;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 32px;
                        height: 32px;
                        border: 3px solid rgba(102, 126, 234, 0.3);
                        border-top: 3px solid #667eea;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-right: 10px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    @media (max-width: 768px) {
                        .modern-admin-invoicing-container {
                            padding: 15px;
                        }

                        .modern-header, .modern-card {
                            padding: 25px;
                        }

                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }

                        .header-title {
                            font-size: 1.8rem;
                        }

                        .filters-grid {
                            grid-template-columns: 1fr;
                        }

                        .detail-grid {
                            grid-template-columns: 1fr;
                        }

                        .applications-table {
                            font-size: 0.9rem;
                        }

                        .applications-table th,
                        .applications-table td {
                            padding: 10px;
                        }
                    }
                `}
            </style>

            <div className="modern-header">
                <div className="header-content">
                    <h1 className="header-title">
                        🧾 Χρέωση Ομαδαρχών
                    </h1>
                    <Link to="/admin" className="modern-back-button">
                        ← Πίσω στο Admin Panel
                    </Link>
                </div>
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">📋 Έκδοση Ταμειακής Κατάστασης</h3>
                    </div>
                    
                    <div className="filters-grid">
                        <div className="modern-form-group">
                            <label>👤 Επιλογή Ομαδάρχη</label>
                            <select 
                                className="modern-select"
                                value={selectedTlId} 
                                onChange={e => setSelectedTlId(e.target.value)}
                            >
                                <option value="">-- Διάλεξε Ομαδάρχη --</option>
                                {teamLeaders.map(tl => (
                                    <option key={tl.id} value={tl.id}>{tl.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="modern-form-group">
                            <label>📅 Από Ημερομηνία</label>
                            <input 
                                type="date" 
                                className="modern-input"
                                value={startDate} 
                                onChange={e => setStartDate(e.target.value)} 
                            />
                        </div>
                        <div className="modern-form-group">
                            <label>📅 Έως Ημερομηνία</label>
                            <input 
                                type="date" 
                                className="modern-input"
                                value={endDate} 
                                onChange={e => setEndDate(e.target.value)} 
                            />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleGenerate} 
                        disabled={!selectedTlId || !startDate || !endDate}
                        className="generate-button"
                    >
                        🚀 Έκδοση Ταμειακής
                    </button>
                    
                    {message && (
                        <div className={`status-message ${message.includes('επιτυχία') ? 'success' : 'error'}`}>
                            {message.includes('επιτυχία') && '✅ '}
                            {message.includes('Σφάλμα') && '❌ '}
                            {message}
                        </div>
                    )}
                </div>
            </div>

            {generatedInvoice && (
                <div className="modern-card">
                    <div className="card-content">
                        <div className="card-header">
                            <h3 className="card-title">📊 Προεπισκόπηση Ταμειακής #{generatedInvoice.id}</h3>
                        </div>
                        
                        <div className="detail-grid">
                            <div className="detail-item">
                                <div className="detail-label">📋 Αιτήσεις</div>
                                <div className="detail-value">{generatedInvoice.application_count}</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">💰 Βασική Χρέωση</div>
                                <div className="detail-value">{parseFloat(generatedInvoice.base_charge).toFixed(2)} €</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">🏷️ Έκπτωση</div>
                                <div className="detail-value">{generatedInvoice.discount_applied}%</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">📊 Καθαρό Ποσό</div>
                                <div className="detail-value">{parseFloat(generatedInvoice.subtotal).toFixed(2)} €</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">🧾 ΦΠΑ</div>
                                <div className="detail-value">{parseFloat(generatedInvoice.vat_amount).toFixed(2)} €</div>
                            </div>
                            <div className="detail-item">
                                <div className="detail-label">💳 Συνολική Χρέωση</div>
                                <div className="detail-value">{parseFloat(generatedInvoice.total_charge).toFixed(2)} €</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">📊 Ιστορικό Χρεώσεων</h3>
                    </div>
                    
                    {loading ? (
                        <div className="loading-state">
                            <div className="loading-spinner"></div>
                            Φόρτωση χρεώσεων...
                        </div>
                    ) : (
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Ομαδάρχης</th>
                                    <th>Περίοδος</th>
                                    <th>Αιτήσεις</th>
                                    <th>Σύνολο</th>
                                    <th>Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.map(inv => (
                                    <tr key={inv.id}>
                                        <td><strong>#{inv.id}</strong></td>
                                        <td>{inv.team_leader_name}</td>
                                        <td>
                                            {new Date(inv.start_date).toLocaleDateString('el-GR')} - {new Date(inv.end_date).toLocaleDateString('el-GR')}
                                        </td>
                                        <td>{inv.application_count}</td>
                                        <td><strong>{parseFloat(inv.total_charge).toFixed(2)} €</strong></td>
                                        <td>
                                            <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                <button
                                                    onClick={() => handleDownloadPdf(inv.id)}
                                                    className="pdf-button"
                                                >
                                                    📄 PDF
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadExcel(inv.id)}
                                                    className="excel-button"
                                                >
                                                    📊 Excel
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminInvoicingPage;