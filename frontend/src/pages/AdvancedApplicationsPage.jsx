import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const AdvancedApplicationsPage = () => {
    const { token, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [displayableFields, setDisplayableFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [currentPage, setCurrentPage] = useState(1);
    const applicationsPerPage = 10;

    // Fetch applications data
    const fetchApplications = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [appsResponse, fieldsResponse] = await Promise.all([
                axios.get(`http://localhost:3000/api/applications/team-applications?paid_status=all`, config),
                axios.get('http://localhost:3000/api/applications/displayable-fields', config)
            ]);
            
            setApplications(appsResponse.data);
            setDisplayableFields(fieldsResponse.data);
        } catch (error) {
            console.error("Failed to fetch applications", error);
            setError('Σφάλμα κατά τη φόρτωση των αιτήσεων');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [token]);

    // Toggle row expansion
    const toggleRowExpansion = (applicationId) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(applicationId)) {
            newExpanded.delete(applicationId);
        } else {
            newExpanded.add(applicationId);
        }
        setExpandedRows(newExpanded);
    };

    // Handle field payment status update
    const handleFieldPaymentUpdate = async (applicationId, fieldId, isPaid) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(
                `http://localhost:3000/api/applications/${applicationId}/fields/${fieldId}/payment`,
                { isPaid },
                config
            );
            
            setSuccessMessage('Κατάσταση πληρωμής ενημερώθηκε επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchApplications(); // Refresh data
        } catch (error) {
            console.error("Failed to update field payment", error);
            setError('Σφάλμα κατά την ενημέρωση της πληρωμής');
            setTimeout(() => setError(''), 3000);
        }
    };

    // Handle field clawback creation
    const handleFieldClawback = async (applicationId, fieldId) => {
        const percentage = prompt('Εισάγετε το ποσοστό clawback σε δωδεκατημόρια (1-12):', '12');
        if (!percentage || isNaN(percentage) || percentage < 1 || percentage > 12) {
            if (percentage !== null) alert('Παρακαλώ εισάγετε έναν αριθμό από 1 έως 12.');
            return;
        }
        
        const reason = prompt('Εισάγετε τον λόγο για το clawback:');
        if (!reason) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(
                `http://localhost:3000/api/applications/${applicationId}/fields/${fieldId}/clawback`,
                { percentage: parseFloat(percentage), reason },
                config
            );
            
            setSuccessMessage('Clawback δημιουργήθηκε επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchApplications(); // Refresh data
        } catch (error) {
            console.error("Failed to create field clawback", error);
            setError(error.response?.data?.message || 'Σφάλμα κατά τη δημιουργία του clawback');
            setTimeout(() => setError(''), 3000);
        }
    };

    // Handle simple application payment toggle
    const handleSimplePaymentToggle = async (applicationId, currentStatus) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const endpoint = currentStatus ? 'unpaid' : 'paid';
            await axios.patch(`http://localhost:3000/api/applications/${applicationId}/${endpoint}`, {}, config);
            
            setSuccessMessage('Κατάσταση πληρωμής ενημερώθηκε επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchApplications(); // Refresh data
        } catch (error) {
            console.error("Failed to update payment status", error);
            setError('Σφάλμα κατά την ενημέρωση της πληρωμής');
            setTimeout(() => setError(''), 3000);
        }
    };

    // Filter applications based on search term
    const filteredApplications = applications.filter(app => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            app.id.toString().includes(searchLower) ||
            app.customer_name.toLowerCase().includes(searchLower) ||
            app.customer_phone.toLowerCase().includes(searchLower) ||
            app.associate_name.toLowerCase().includes(searchLower) ||
            app.company_name.toLowerCase().includes(searchLower) ||
            Object.values(app.display_fields || {}).some(value => 
                value && value.toString().toLowerCase().includes(searchLower)
            )
        );
    });

    // Pagination calculations
    const totalPages = Math.ceil(filteredApplications.length / applicationsPerPage);
    const indexOfLastApplication = currentPage * applicationsPerPage;
    const indexOfFirstApplication = indexOfLastApplication - applicationsPerPage;
    const currentApplications = filteredApplications.slice(indexOfFirstApplication, indexOfLastApplication);

    // Reset to first page when search changes
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    // Handle page change
    const handlePageChange = (page) => {
        setCurrentPage(page);
        setExpandedRows(new Set()); // Close expanded rows when changing page
    };

    // Determine payment status display
    const getPaymentStatusDisplay = (app) => {
        if (app.commissionable_fields && app.commissionable_fields.length > 0) {
            switch (app.payment_status) {
                case 'fully_paid':
                    return { text: 'Πληρωμένη', class: 'status-paid' };
                case 'partially_paid':
                    return { text: 'Μερικώς Πληρωμένη', class: 'status-partial' };
                default:
                    return { text: 'Απλήρωτη', class: 'status-unpaid' };
            }
        } else {
            return app.is_paid_by_company 
                ? { text: 'Πληρωμένη', class: 'status-paid' }
                : { text: 'Απλήρωτη', class: 'status-unpaid' };
        }
    };

    const formatCurrency = (amount) => {
        return `€${parseFloat(amount || 0).toFixed(2)}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('el-GR');
    };

    if (!user) {
        return (
            <div className="applications-container">
                <div className="error-message">
                    Παρακαλώ συνδεθείτε για να δείτε τις αιτήσεις.
                </div>
            </div>
        );
    }

    const canManagePayments = user.role === 'TeamLeader' || user.role === 'Admin';

    return (
        <div className="modern-applications-page">
            <style>
                {`
                    .modern-applications-page {
                        min-height: calc(100vh - 80px);
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-applications-page::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }
                    
                    .applications-header {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border-radius: 20px;
                        padding: 30px;
                        margin-bottom: 30px;
                        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        flex-wrap: wrap;
                        gap: 20px;
                    }
                    
                    .applications-header::before {
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
                    
                    .applications-icon {
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
                    
                    .applications-header h1 {
                        font-size: 2rem;
                        font-weight: 700;
                        color: white;
                        text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                        margin: 0 0 5px 0;
                    }
                    
                    .applications-header p {
                        color: rgba(255, 255, 255, 0.8);
                        margin: 0;
                        font-size: 1rem;
                    }
                `}
            </style>
            
            <div className="applications-header">
                <div className="header-content">
                    <div className="applications-icon">📋</div>
                    <div className="header-text">
                        <h1>Διαχείριση Αιτήσεων</h1>
                        <p>Σύνθετη διαχείριση πληρωμών και αμοιβών</p>
                    </div>
                </div>
            </div>

            {successMessage && (
                <div className="success-message">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="error-message">
                    {error}
                </div>
            )}


            {/* Search Input */}
            <div className="search-section">
                <style>
                    {`
                        .search-section {
                            background: rgba(255, 255, 255, 0.15);
                            backdrop-filter: blur(20px);
                            border-radius: 20px;
                            padding: 25px;
                            margin-bottom: 25px;
                            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                        }
                        
                        .search-container {
                            position: relative;
                        }
                        
                        .search-input {
                            width: 100%;
                            padding: 15px 50px 15px 20px;
                            border: 2px solid #e5e7eb;
                            border-radius: 15px;
                            font-size: 1rem;
                            background: rgba(255, 255, 255, 0.15);
                            backdrop-filter: blur(10px);
                            transition: all 0.3s ease;
                            box-sizing: border-box;
                        }
                        
                        .search-input:focus {
                            outline: none;
                            border-color: #667eea;
                            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                            background: rgba(255, 255, 255, 1);
                            transform: translateY(-2px);
                        }
                        
                        .search-icon {
                            position: absolute;
                            right: 15px;
                            top: 50%;
                            transform: translateY(-50%);
                            width: 20px;
                            height: 20px;
                            color: #667eea;
                        }
                    `}
                </style>
                
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="🔍 Αναζήτηση αιτήσεων (ID, πελάτης, συνεργάτης, εταιρία, τηλέφωνο, πεδία)..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-input"
                    />
                    <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="loading-spinner-icon"></div>
                    <p>Φόρτωση αιτήσεων...</p>
                </div>
            ) : filteredApplications.length === 0 ? (
                <div className="empty-state">
                    <p>
                        {searchTerm 
                            ? `Δεν βρέθηκαν αιτήσεις που να ταιριάζουν με "${searchTerm}"`
                            : 'Δεν βρέθηκαν αιτήσεις για τα επιλεγμένα κριτήρια.'
                        }
                    </p>
                </div>
            ) : (
                <div className="applications-content">
                    <style>
                        {`
                            .applications-content {
                                background: rgba(255, 255, 255, 0.15);
                                backdrop-filter: blur(10px);
                                border-radius: 20px;
                                padding: 30px;
                                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                max-width: 1400px;
                                margin: 0 auto 25px auto;
                            }
                            
                            .applications-table-scroll {
                                overflow-x: auto;
                                border-radius: 12px;
                                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                            }
                            
                            .modern-applications-table {
                                width: 100%;
                                min-width: 800px;
                                border-collapse: collapse;
                                border-radius: 12px;
                                overflow: hidden;
                            }
                            
                            .modern-applications-table thead {
                                background: linear-gradient(135deg, #667eea, #764ba2);
                            }
                            
                            .modern-applications-table th {
                                padding: 15px 20px;
                                color: white;
                                font-weight: 600;
                                text-align: left;
                                font-size: 0.9rem;
                                text-transform: uppercase;
                                letter-spacing: 0.5px;
                            }
                            
                            .modern-applications-table th:nth-child(2) {
                                width: 80px;
                            }
                            
                            .modern-applications-table td:nth-child(2) {
                                width: 80px;
                                font-size: 0.85rem;
                                font-weight: 600;
                                color: #667eea;
                            }
                            
                            .modern-applications-table td {
                                padding: 15px 20px;
                                border-bottom: 1px solid #f3f4f6;
                                color: #374151;
                                font-size: 0.95rem;
                            }
                            
                            .modern-applications-table tbody tr {
                                background: rgba(255, 255, 255, 0.1);
                                transition: all 0.2s ease;
                                cursor: pointer;
                            }
                            
                            .modern-applications-table tbody tr:hover {
                                background: #f8fafc;
                                transform: scale(1.005);
                                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                            }
                            
                            .payment-checkbox-container {
                                display: flex;
                                align-items: center;
                                gap: 8px;
                                background: rgba(102, 126, 234, 0.05);
                                padding: 8px 12px;
                                border-radius: 10px;
                                border: 1px solid rgba(102, 126, 234, 0.1);
                                transition: all 0.3s ease;
                            }
                            
                            .payment-checkbox-container:hover {
                                background: rgba(102, 126, 234, 0.1);
                                border-color: rgba(102, 126, 234, 0.2);
                            }
                            
                            .payment-checkbox {
                                width: 18px;
                                height: 18px;
                                cursor: pointer;
                                accent-color: #667eea;
                            }
                            
                            .payment-checkbox-label {
                                font-size: 0.85rem;
                                font-weight: 500;
                                color: #374151;
                                cursor: pointer;
                                margin: 0;
                            }
                            
                            .expand-button {
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                border: none;
                                border-radius: 8px;
                                width: 30px;
                                height: 30px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                cursor: pointer;
                                font-size: 0.8rem;
                                transition: all 0.3s ease;
                                box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
                            }
                            
                            .expand-button:hover {
                                transform: scale(1.1);
                                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                            }
                            
                            .expand-button.expanded {
                                transform: rotate(180deg);
                                background: linear-gradient(135deg, #10b981, #059669);
                            }
                            
                            .customer-name {
                                font-weight: 600;
                                color: #1f2937;
                            }
                            
                            .customer-phone {
                                color: #059669;
                                font-weight: 500;
                                font-size: 0.85rem;
                            }
                            
                            .company-name {
                                color: #667eea;
                                font-weight: 500;
                            }
                            
                            .associate-name {
                                color: #6b7280;
                            }
                            
                            .commission-amount {
                                color: #10b981;
                                font-weight: 700;
                                font-size: 1.05rem;
                            }
                            
                            .expanded-row {
                                background: #f8fafc !important;
                            }
                            
                            .expanded-row:hover {
                                transform: none !important;
                            }
                            
                            .field-payments-container {
                                padding: 20px;
                                background: rgba(102, 126, 234, 0.05);
                                border-radius: 12px;
                                margin: 10px 0;
                            }
                            
                            .field-payments-container h4 {
                                color: #667eea;
                                margin: 0 0 15px 0;
                                font-size: 1.1rem;
                                font-weight: 600;
                            }
                            
                            .field-payments-grid {
                                display: grid;
                                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                                gap: 15px;
                            }
                            
                            .field-payment-item {
                                background: rgba(255, 255, 255, 0.1);
                                padding: 15px;
                                border-radius: 10px;
                                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
                                border: 1px solid #e5e7eb;
                            }
                            
                            .field-payment-info {
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                margin-bottom: 10px;
                            }
                            
                            .field-label {
                                font-weight: 600;
                                color: #374151;
                            }
                            
                            .field-commission {
                                color: #10b981;
                                font-weight: 700;
                            }
                            
                            .clawback-button {
                                background: linear-gradient(135deg, #ef4444, #dc2626);
                                color: white;
                                border: none;
                                padding: 6px 12px;
                                border-radius: 6px;
                                font-size: 0.8rem;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                margin-top: 8px;
                            }
                            
                            .clawback-button:hover {
                                transform: translateY(-1px);
                                box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                            }
                            
                            .clawback-indicator {
                                color: #ef4444;
                                font-size: 0.85rem;
                                font-weight: 600;
                                margin-top: 8px;
                                display: block;
                            }
                        `}
                    </style>
                    
                    <div className="applications-table-scroll">
                        <table className="modern-applications-table">
                            <thead>
                                <tr>
                                    <th></th> {/* Expand column */}
                                    <th>ID</th>
                                    <th>Πελάτης</th>
                                    <th>Συνεργάτης</th>
                                    <th>Εταιρία</th>
                                    {/* Dynamic columns for displayable fields */}
                                    {displayableFields.map(field => (
                                        <th key={field.id}>{field.label}</th>
                                    ))}
                                    <th>Αμοιβή</th>
                                    <th>Κατάσταση Πληρωμής</th>
                                    <th>Πληρωμή</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentApplications.map((app) => {
                                    const paymentStatus = getPaymentStatusDisplay(app);
                                    const hasCommissionableFields = app.commissionable_fields && app.commissionable_fields.length > 0;
                                    const isExpanded = expandedRows.has(app.id);
                                    
                                    return (
                                        <React.Fragment key={app.id}>
                                            {/* Main Row */}
                                            <tr 
                                                className="application-row"
                                                onClick={() => navigate(`/application/${app.id}`)}
                                            >
                                                <td>
                                                    {hasCommissionableFields && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleRowExpansion(app.id);
                                                            }}
                                                            className={`expand-button ${isExpanded ? 'expanded' : ''}`}
                                                        >
                                                            ▼
                                                        </button>
                                                    )}
                                                </td>
                                                <td>#{app.id}</td>
                                                <td>
                                                    <div>
                                                        <div className="customer-name">{app.customer_name}</div>
                                                        <div className="customer-phone">{app.customer_phone}</div>
                                                    </div>
                                                </td>
                                                <td className="associate-name">{app.associate_name}</td>
                                                <td className="company-name">{app.company_name}</td>
                                                {/* Dynamic field values */}
                                                {displayableFields.map(field => (
                                                    <td key={field.id}>
                                                        {app.display_fields?.[field.label] || '-'}
                                                    </td>
                                                ))}
                                                <td className="commission-amount">{formatCurrency(app.total_commission)}</td>
                                                <td>
                                                    <span className={`status-badge ${paymentStatus.class}`}>
                                                        {paymentStatus.text}
                                                    </span>
                                                </td>
                                                <td onClick={(e) => e.stopPropagation()}>
                                                    {canManagePayments && (
                                                        <div className="payment-checkbox-container">
                                                            <input
                                                                type="checkbox"
                                                                id={`paid-${app.id}`}
                                                                checked={app.is_paid_by_company}
                                                                onChange={() => handleSimplePaymentToggle(app.id, app.is_paid_by_company)}
                                                                className="payment-checkbox"
                                                            />
                                                            <label htmlFor={`paid-${app.id}`} className="payment-checkbox-label">
                                                                Πληρώθηκα από την εταιρία
                                                            </label>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                            
                                            {/* Expanded Row for Commissionable Fields */}
                                            {hasCommissionableFields && isExpanded && (
                                                <tr className="expanded-row">
                                                    <td colSpan={displayableFields.length + 8}>
                                                        <div className="field-payments-container">
                                                            <h4>Πεδία με Αμοιβή</h4>
                                                            <div className="field-payments-grid">
                                                                {app.commissionable_fields.map((field) => (
                                                                    <div key={field.field_id} className="field-payment-item">
                                                                        <div className="field-payment-info">
                                                                            <span className="field-label">{field.field_label}</span>
                                                                            <span className="field-commission">{formatCurrency(field.commission_amount || 0)}</span>
                                                                        </div>
                                                                        {canManagePayments && (
                                                                            <div className="field-payment-controls">
                                                                                <div className="payment-checkbox-container">
                                                                                    <input
                                                                                        type="checkbox"
                                                                                        id={`field-paid-${app.id}-${field.field_id}`}
                                                                                        checked={field.is_paid}
                                                                                        onChange={(e) => handleFieldPaymentUpdate(
                                                                                            app.id, 
                                                                                            field.field_id, 
                                                                                            e.target.checked
                                                                                        )}
                                                                                        className="payment-checkbox"
                                                                                        disabled={field.is_in_statement}
                                                                                    />
                                                                                    <label 
                                                                                        htmlFor={`field-paid-${app.id}-${field.field_id}`} 
                                                                                        className="payment-checkbox-label"
                                                                                    >
                                                                                        Πληρώθηκα από την εταιρία
                                                                                    </label>
                                                                                </div>
                                                                                {field.is_paid && field.is_in_statement && !field.has_clawback && (
                                                                                    <div className="clawback-checkbox-container">
                                                                                        <button
                                                                                            onClick={() => handleFieldClawback(app.id, field.field_id)}
                                                                                            className="clawback-button"
                                                                                        >
                                                                                            + Clawback
                                                                                        </button>
                                                                                    </div>
                                                                                )}
                                                                                {field.has_clawback && (
                                                                                    <span className="clawback-indicator">
                                                                                        ⚠️ Έχει Clawback
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination */}
            {filteredApplications.length > 0 && (
                <div className="pagination-section">
                    <style>
                        {`
                            .pagination-section {
                                background: rgba(255, 255, 255, 0.15);
                                backdrop-filter: blur(10px);
                                border-radius: 20px;
                                padding: 25px;
                                margin: 25px auto;
                                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                max-width: 1400px;
                            }
                            
                            .pagination-info {
                                text-align: center;
                                color: #6b7280;
                                margin-bottom: 20px;
                                font-size: 0.95rem;
                            }
                            
                            .pagination {
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                gap: 8px;
                                flex-wrap: wrap;
                            }
                            
                            .pagination-button {
                                background: rgba(255, 255, 255, 0.15);
                                color: #667eea;
                                border: 2px solid #e5e7eb;
                                padding: 10px 16px;
                                border-radius: 10px;
                                font-weight: 600;
                                font-size: 0.9rem;
                                cursor: pointer;
                                transition: all 0.3s ease;
                                min-width: 45px;
                            }
                            
                            .pagination-button:hover:not(:disabled) {
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                border-color: #667eea;
                                transform: translateY(-2px);
                                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                            }
                            
                            .pagination-button.active {
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                border-color: #667eea;
                                box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                            }
                            
                            .pagination-button:disabled {
                                opacity: 0.4;
                                cursor: not-allowed;
                            }
                        `}
                    </style>
                    
                    <div className="pagination-info">
                        📄 Εμφάνιση {indexOfFirstApplication + 1} - {Math.min(indexOfLastApplication, filteredApplications.length)} από {filteredApplications.length} αιτήσεις
                    </div>
                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="pagination-button"
                            >
                                ⬅️ Προηγούμενη
                            </button>
                            
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => handlePageChange(page)}
                                    className={`pagination-button ${currentPage === page ? 'active' : ''}`}
                                >
                                    {page}
                                </button>
                            ))}
                            
                            <button 
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="pagination-button"
                            >
                                Επόμενη ➡️
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className="info-section">
                <style>
                    {`
                        .info-section {
                            background: rgba(255, 255, 255, 0.15);
                            backdrop-filter: blur(10px);
                            border-radius: 20px;
                            padding: 30px;
                            margin: 25px auto;
                            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                            border: 1px solid rgba(255, 255, 255, 0.2);
                            max-width: 1400px;
                        }
                        
                        .info-section h4 {
                            color: #667eea;
                            font-size: 1.3rem;
                            font-weight: 700;
                            margin: 0 0 20px 0;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                        }
                        
                        .info-section ul {
                            list-style: none;
                            padding: 0;
                            margin: 0;
                            display: grid;
                            gap: 12px;
                        }
                        
                        .info-section li {
                            background: rgba(102, 126, 234, 0.05);
                            padding: 12px 16px;
                            border-radius: 10px;
                            color: #374151;
                            font-size: 0.95rem;
                            border-left: 4px solid #667eea;
                            position: relative;
                        }
                        
                        .info-section li::before {
                            content: '✓';
                            color: #10b981;
                            font-weight: bold;
                            margin-right: 8px;
                        }
                        
                        @media (max-width: 768px) {
                            .pagination {
                                gap: 4px;
                            }
                            
                            .pagination-button {
                                padding: 8px 12px;
                                font-size: 0.8rem;
                                min-width: 35px;
                            }
                        }
                    `}
                </style>
                
                <h4>📊 Πληροφορίες</h4>
                <ul>
                    <li>Εμφανίζονται {applicationsPerPage} αιτήσεις ανά σελίδα για καλύτερη απόδοση</li>
                    <li>Κάνε κλικ σε οποιαδήποτε γραμμή για να δεις λεπτομέρειες</li>
                    <li>Η αναζήτηση γίνεται σε όλες τις αιτήσεις, όχι μόνο στη τρέχουσα σελίδα</li>
                    <li>Μαρκάρετε τις αιτήσεις ως "Πληρωμένες από την εταιρία" όταν έχει γίνει η πληρωμή</li>
                    <li>Για αιτήσεις με πεδία αμοιβής, μπορείτε να διαχειριστείτε κάθε πεδίο ξεχωριστά</li>
                    <li>Τα clawbacks μπορούν να δημιουργηθούν μόνο για πληρωμένα πεδία που είναι σε statements</li>
                </ul>
            </div>
        </div>
    );
};

export default AdvancedApplicationsPage;