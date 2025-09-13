import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const PaymentsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [team, setTeam] = useState([]);
    const [applications, setApplications] = useState([]);
    const [statements, setStatements] = useState([]);
    const [selectedAssociateId, setSelectedAssociateId] = useState('');
    const [selectedAppIds, setSelectedAppIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [paymentError, setPaymentError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [editingStatement, setEditingStatement] = useState(null);
    const [displayFields, setDisplayFields] = useState([]);

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [teamRes, appsRes, statementsRes, fieldsRes] = await Promise.all([
                axios.get(user.role === 'Admin' ? 'http://localhost:3000/api/users' : 'http://localhost:3000/api/users/my-team', config),
                axios.get('http://localhost:3000/api/applications', config),
                axios.get('http://localhost:3000/api/payments/statements', config),
                axios.get('http://localhost:3000/api/fields', config),
            ]);
            setTeam(teamRes.data.filter(u => u.role === 'Associate'));
            setApplications(appsRes.data);
            setStatements(statementsRes.data);
            setDisplayFields(fieldsRes.data.filter(f => f.show_in_applications_table));
        } catch (error) {
            console.error("Failed to fetch payment data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [token, user]);

    const handleAppSelection = (appId) => {
        const newSelection = new Set(selectedAppIds);
        if (newSelection.has(appId)) {
            newSelection.delete(appId);
        } else {
            newSelection.add(appId);
        }
        setSelectedAppIds(newSelection);
    };
    
    const paidApplicationIds = useMemo(() => {
        const ids = new Set();
        statements.forEach(st => {
            if (st.application_ids) {
                st.application_ids.forEach(appId => ids.add(appId));
            }
        });
        return ids;
    }, [statements]);

    const payableApps = useMemo(() => {
        if (!selectedAssociateId) return [];
        const selectedAssociate = team.find(t => t.id == selectedAssociateId);
        return applications.filter(app => 
            app.associate_name === selectedAssociate?.name &&
            app.is_paid_by_company &&
            app.status === 'Καταχωρήθηκε' &&
            !paidApplicationIds.has(app.application_id)
        );
    }, [selectedAssociateId, applications, team, paidApplicationIds]);

    const handleCreateStatement = async () => {
        if (selectedAppIds.size === 0) return;
        setPaymentError('');
        setSuccessMessage('');
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            if (editingStatement) {
                await axios.put(`http://localhost:3000/api/payments/statements/${editingStatement}`, {
                    application_ids: Array.from(selectedAppIds)
                }, config);
                setSuccessMessage(`Statement #${editingStatement} updated successfully!`);
                setEditingStatement(null);
            } else {
                const response = await axios.post('http://localhost:3000/api/payments/statements', {
                    recipient_id: parseInt(selectedAssociateId),
                    application_ids: Array.from(selectedAppIds)
                }, config);
                setSuccessMessage(`Statement #${response.data.statementId} created successfully!`);
            }
            setSelectedAppIds(new Set());
            fetchData();
        } catch (error) {
            console.error("Failed to create/update statement", error);
            setPaymentError(error.response?.data?.message || 'An unknown error occurred.');
        }
    };

    const handleDownloadPdf = (statementId) => {
        const url = `http://localhost:3000/api/payments/statements/${statementId}/pdf?token=${token}`;
        window.open(url, '_blank');
    };

    if (loading) return (
        <div className="modern-payments-container">
            <div className="modern-loading">
                <div className="loading-spinner"></div>
                <p>Φόρτωση πληρωμών...</p>
            </div>
        </div>
    );

    const selectedTotal = payableApps
        .filter(app => selectedAppIds.has(app.application_id))
        .reduce((sum, app) => sum + (app.total_commission ? parseFloat(app.total_commission) : 0), 0);

    const getStatusBadge = (paymentStatus) => {
        const statusMap = {
            'draft': { emoji: '📝', class: 'draft', text: 'Draft' },
            'paid': { emoji: '✅', class: 'paid', text: 'Paid' }
        };
        const statusInfo = statusMap[paymentStatus] || { emoji: '📋', class: 'default', text: paymentStatus };
        return `${statusInfo.emoji} ${statusInfo.text}`;
    };

    const handleDeleteStatement = async (statementId) => {
        if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την ταμειακή κατάσταση;')) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`http://localhost:3000/api/payments/statements/${statementId}`, config);
            setSuccessMessage('Η ταμειακή κατάσταση διαγράφηκε επιτυχώς!');
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Failed to delete statement", error);
            setPaymentError('Σφάλμα κατά τη διαγραφή της ταμειακής κατάστασης');
        }
    };

    const handleMarkAsPaid = async (statementId) => {
        if (!window.confirm('Είστε σίγουροι ότι θέλετε να μαρκάρετε αυτή την ταμειακή ως πληρωμένη;')) {
            return;
        }

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`http://localhost:3000/api/payments/statements/${statementId}/mark-paid`, {}, config);
            setSuccessMessage('Η ταμειακή κατάσταση μαρκαρίστηκε ως πληρωμένη!');
            fetchData(); // Refresh data
        } catch (error) {
            console.error("Failed to mark as paid", error);
            setPaymentError('Σφάλμα κατά το μαρκάρισμα ως πληρωμένη');
        }
    };

    const handleEditStatement = async (statementId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`http://localhost:3000/api/payments/statements/${statementId}`, config);
            const statement = response.data;

            // Set the editing state
            setEditingStatement(statementId);
            setSelectedAssociateId(statement.recipient_id.toString());
            setSelectedAppIds(new Set(statement.application_ids));

            // Scroll to the form
            document.getElementById('payment-form').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error("Failed to load statement for editing", error);
            setPaymentError('Σφάλμα κατά τη φόρτωση της ταμειακής για επεξεργασία');
        }
    };

    const cancelEdit = () => {
        setEditingStatement(null);
        setSelectedAppIds(new Set());
        setSelectedAssociateId('');
    };

    return (
        <div className="modern-payments-container">
            <style>
                {`
                    .modern-payments-container {
                        min-height: 100vh;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow-x: hidden;
                    }

                    .modern-payments-container::before {
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

                    .modern-form-group {
                        margin-bottom: 25px;
                    }

                    .modern-form-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #374151;
                        font-weight: 600;
                        font-size: 0.95rem;
                    }

                    .modern-select {
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

                    .modern-select:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                        transform: translateY(-2px);
                    }

                    .applications-table {
                        width: 100%;
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        border-radius: 15px;
                        overflow: hidden;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        margin-bottom: 25px;
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

                    .modern-checkbox {
                        width: 20px;
                        height: 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        transform: scale(1.2);
                    }

                    .payment-summary {
                        background: rgba(255, 255, 255, 0.8);
                        backdrop-filter: blur(10px);
                        padding: 25px;
                        border-radius: 15px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                        margin-top: 25px;
                        text-align: center;
                    }

                    .total-amount {
                        font-size: 1.8rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 20px;
                    }

                    .create-statement-button {
                        padding: 16px 32px;
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
                    }

                    .create-statement-button:disabled {
                        opacity: 0.7;
                        cursor: not-allowed;
                        transform: none !important;
                    }

                    .create-statement-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }

                    .create-statement-button:hover::before {
                        left: 100%;
                    }

                    .create-statement-button:not(:disabled):hover {
                        transform: translateY(-3px);
                        box-shadow: 0 8px 25px rgba(16, 185, 129, 0.4);
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

                    .mark-paid-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        font-size: 0.9rem;
                    }

                    .mark-paid-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }

                    .delete-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                        font-size: 0.9rem;
                    }

                    .delete-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
                    }

                    .edit-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #3b82f6, #2563eb);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
                        font-size: 0.9rem;
                    }

                    .edit-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
                    }

                    .cancel-edit-button {
                        padding: 8px 16px;
                        background: linear-gradient(135deg, #6b7280, #4b5563);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                        font-size: 0.9rem;
                    }

                    .cancel-edit-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
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

                    .error-message {
                        background: rgba(239, 68, 68, 0.1);
                        color: #dc2626;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin-top: 15px;
                        border: 1px solid rgba(239, 68, 68, 0.3);
                        backdrop-filter: blur(10px);
                        text-align: center;
                        font-weight: 600;
                    }

                    .success-message {
                        background: rgba(16, 185, 129, 0.1);
                        color: #065f46;
                        padding: 15px 20px;
                        border-radius: 12px;
                        margin-top: 15px;
                        border: 1px solid rgba(16, 185, 129, 0.3);
                        backdrop-filter: blur(10px);
                        text-align: center;
                        font-weight: 600;
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

                    .modern-loading {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 50vh;
                        color: white;
                    }

                    .loading-spinner {
                        display: inline-block;
                        width: 40px;
                        height: 40px;
                        border: 4px solid rgba(255, 255, 255, 0.3);
                        border-top: 4px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    }

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                        position: relative;
                        z-index: 10;
                    }

                    .stat-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(15px);
                        border-radius: 15px;
                        padding: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
                        text-align: center;
                        transition: all 0.3s ease;
                    }

                    .stat-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    }

                    .stat-icon {
                        font-size: 2.5rem;
                        margin-bottom: 15px;
                    }

                    .stat-number {
                        font-size: 1.8rem;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 8px;
                    }

                    .stat-label {
                        color: #6b7280;
                        font-size: 0.9rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    @media (max-width: 768px) {
                        .modern-payments-container {
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

                        .applications-table {
                            font-size: 0.9rem;
                        }

                        .applications-table th,
                        .applications-table td {
                            padding: 10px;
                        }

                        .stats-grid {
                            grid-template-columns: repeat(2, 1fr);
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
                <div className="header-content">
                    <h1 className="header-title">
                        💳 Πληρωμές
                    </h1>
                    <Link to="/dashboard" className="modern-back-button">
                        ← Πίσω στο Dashboard
                    </Link>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-number">{team.length}</div>
                    <div className="stat-label">Συνεργάτες</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-number">{statements.length}</div>
                    <div className="stat-label">Ταμειακές</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-number">
                        {statements.reduce((sum, st) => sum + parseFloat(st.total_amount || 0), 0).toFixed(2)}€
                    </div>
                    <div className="stat-label">Σύνολο</div>
                </div>
            </div>

            <div className="modern-card" id="payment-form">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">
                            {editingStatement ? '✏️ Επεξεργασία Ταμειακής' : '💰 Δημιουργία Νέας Ταμειακής'}
                        </h3>
                        {editingStatement && (
                            <button onClick={cancelEdit} className="cancel-edit-button">
                                ❌ Ακύρωση
                            </button>
                        )}
                    </div>
                    
                    <div className="modern-form-group">
                        <label>👤 Επιλογή Συνεργάτη</label>
                        <select 
                            className="modern-select"
                            value={selectedAssociateId} 
                            onChange={e => {setSelectedAssociateId(e.target.value); setSelectedAppIds(new Set());}}
                        >
                            <option value="">-- Διάλεξε Συνεργάτη --</option>
                            {team.map(member => (
                                <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {selectedAssociateId && (
                        <>
                            <div className="card-header">
                                <h4 className="card-title">📝 Πληρωτέες Αιτήσεις</h4>
                            </div>
                            
                            {payableApps.length > 0 ? (
                                <table className="applications-table">
                                    <thead>
                                        <tr>
                                            <th>Επιλογή</th>
                                            <th>{displayFields.length > 0 ? displayFields[0].label : 'Αίτηση'}</th>
                                            <th>Πελάτης</th>
                                            <th>Αμοιβή</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {payableApps.map(app => (
                                            <tr key={app.application_id}>
                                                <td>
                                                    <input 
                                                        type="checkbox" 
                                                        className="modern-checkbox"
                                                        onChange={() => handleAppSelection(app.application_id)} 
                                                        checked={selectedAppIds.has(app.application_id)} 
                                                    />
                                                </td>
                                                <td>
                                                    {app.fields && displayFields.length > 0 ? (
                                                        (() => {
                                                            const field = app.fields.find(f => f.label === displayFields[0].label);
                                                            return field ? field.value : `#${app.application_id}`;
                                                        })()
                                                    ) : `#${app.application_id}`}
                                                </td>
                                                <td>{app.customer_name}</td>
                                                <td>
                                                    <strong>
                                                        {app.total_commission ? parseFloat(app.total_commission).toFixed(2) : '0.00'} €
                                                    </strong>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="empty-state">
                                    <div className="empty-icon">📭</div>
                                    <p>Δεν βρέθηκαν πληρωτέες αιτήσεις για αυτόν τον συνεργάτη.</p>
                                </div>
                            )}
                            
                            <div className="payment-summary">
                                <div className="total-amount">
                                    💰 Σύνολο Επιλεγμένων: {selectedTotal.toFixed(2)} €
                                </div>
                                <button
                                    onClick={handleCreateStatement}
                                    disabled={selectedAppIds.size === 0}
                                    className="create-statement-button"
                                >
                                    {editingStatement ? '✏️ Ενημέρωση Ταμειακής' : '📄 Δημιουργία Ταμειακής'}
                                </button>
                                {paymentError && <div className="error-message">❌ {paymentError}</div>}
                                {successMessage && <div className="success-message">✅ {successMessage}</div>}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="modern-card">
                <div className="card-content">
                    <div className="card-header">
                        <h3 className="card-title">📊 Ιστορικό Ταμειακών</h3>
                    </div>
                    
                    {statements.length > 0 ? (
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Παραλήπτης</th>
                                    <th>Ποσό</th>
                                    <th>Status</th>
                                    <th>Ημερομηνία</th>
                                    <th>Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statements.map(st => (
                                    <tr key={st.id}>
                                        <td><strong>#{st.id}</strong></td>
                                        <td>{st.recipient_name}</td>
                                        <td><strong>{parseFloat(st.total_amount).toFixed(2)} €</strong></td>
                                        <td>
                                            <span className="status-badge">
                                                {getStatusBadge(st.payment_status)}
                                            </span>
                                            {st.paid_date && (
                                                <div style={{fontSize: '0.8rem', color: '#666', marginTop: '2px'}}>
                                                    Πληρώθηκε: {new Date(st.paid_date).toLocaleDateString('el-GR')}
                                                </div>
                                            )}
                                        </td>
                                        <td>{new Date(st.created_at).toLocaleDateString('el-GR')}</td>
                                        <td>
                                            <div style={{display: 'flex', gap: '5px', flexWrap: 'wrap'}}>
                                                <button
                                                    onClick={() => handleDownloadPdf(st.id)}
                                                    className="pdf-button"
                                                >
                                                    📄 PDF
                                                </button>
                                                {st.payment_status === 'draft' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleEditStatement(st.id)}
                                                            className="edit-button"
                                                        >
                                                            ✏️ Επεξεργασία
                                                        </button>
                                                        <button
                                                            onClick={() => handleMarkAsPaid(st.id)}
                                                            className="mark-paid-button"
                                                        >
                                                            ✅ Πληρώθηκε
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteStatement(st.id)}
                                                            className="delete-button"
                                                        >
                                                            🗑️ Διαγραφή
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">📋</div>
                            <p>Δεν βρέθηκαν ταμειακές καταστάσεις.</p>
                            <p style={{fontSize: '0.9rem', opacity: '0.7'}}>
                                Δημιουργήστε την πρώτη ταμειακή κατάσταση επιλέγοντας συνεργάτη και αιτήσεις
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PaymentsPage;