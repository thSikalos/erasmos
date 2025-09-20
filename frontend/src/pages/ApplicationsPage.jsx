import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import ClawbackModal from '../components/ClawbackModal';
import { apiUrl } from '../utils/api';

const ApplicationsPage = () => {
    const { token, user } = useContext(AuthContext);
    const { showConfirmModal } = useNotifications();
    const navigate = useNavigate();
    const [applications, setApplications] = useState([]);
    const [pendingApplications, setPendingApplications] = useState([]);
    const [onHoldApplications, setOnHoldApplications] = useState([]);
    const [registeredApplications, setRegisteredApplications] = useState([]);
    const [draftApplications, setDraftApplications] = useState([]);
    const [displayableFields, setDisplayableFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Clawback modal state
    const [clawbackModalOpen, setClawbackModalOpen] = useState(false);
    const [clawbackData, setClawbackData] = useState({
        applicationId: null,
        fieldId: null,
        fieldLabel: '',
        commissionAmount: 0
    });
    const [clawbackLoading, setClawbackLoading] = useState(false);

    // Centralized toast notification function
    const sendCentralizedToast = async (type, title, message, duration = 5000) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(apiUrl('/api/notifications/toast'), {
                type,
                title,
                message,
                duration
            }, config);
        } catch (error) {
            console.error('Failed to send centralized toast:', error);
        }
    };

    // Search function for applications
    const searchFunction = (app, searchTerm) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            app.id.toString().includes(searchLower) ||
            app.customer_name?.toLowerCase().includes(searchLower) ||
            app.customer_phone?.toLowerCase().includes(searchLower) ||
            app.associate_name?.toLowerCase().includes(searchLower) ||
            app.company_name?.toLowerCase().includes(searchLower) ||
            Object.values(app.display_fields || {}).some(value =>
                value && value.toString().toLowerCase().includes(searchLower)
            )
        );
    };

    // Search functionality
    const [searchTerm, setSearchTerm] = useState('');

    // Filter applications based on search term
    const getFilteredApplications = (appList) => {
        if (!searchTerm) return appList;
        return appList.filter(app => searchFunction(app, searchTerm));
    };

    const filteredPendingApplications = getFilteredApplications(pendingApplications);
    const filteredOnHoldApplications = getFilteredApplications(onHoldApplications);
    const filteredRegisteredApplications = getFilteredApplications(registeredApplications);
    const filteredDraftApplications = getFilteredApplications(draftApplications);

    const handleSearchChange = (value) => {
        setSearchTerm(value);
        setExpandedRows(new Set()); // Close expanded rows when searching
    };

    // Fetch applications data
    const fetchApplications = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [pendingResponse, onHoldResponse, registeredResponse, draftsResponse, fieldsResponse] = await Promise.all([
                axios.get(apiUrl(`/api/applications/team-applications?paid_status=all&status_filter=${encodeURIComponent('Προς Καταχώρηση')}`), config),
                axios.get(apiUrl(`/api/applications/team-applications?paid_status=all&status_filter=${encodeURIComponent('Εκκρεμότητα')}`), config),
                axios.get(apiUrl(`/api/applications/team-applications?paid_status=all&status_filter=${encodeURIComponent('Καταχωρήθηκε')}`), config),
                axios.get(apiUrl('/api/applications/drafts'), config),
                axios.get(apiUrl('/api/applications/displayable-fields'), config)
            ]);

            setPendingApplications(pendingResponse.data);
            setOnHoldApplications(onHoldResponse.data);
            setRegisteredApplications(registeredResponse.data);
            setDraftApplications(draftsResponse.data);

            // Combine all applications for the search functionality
            const allApplications = [...pendingResponse.data, ...onHoldResponse.data, ...registeredResponse.data, ...draftsResponse.data];
            setApplications(allApplications);
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
                apiUrl(`/api/applications/${applicationId}/fields/${fieldId}/payment`),
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

    // Handle field clawback creation - Open modal
    const handleFieldClawback = async (applicationId, fieldId) => {
        // Find the field data to populate modal
        const application = applications.find(app => app.id === applicationId);
        if (!application) return;

        let fieldData = null;
        let fieldLabel = 'Unknown Field';
        let commissionAmount = 0;

        // Search in commissionable_fields for field info
        if (application.commissionable_fields) {
            fieldData = application.commissionable_fields.find(f => f.field_id === fieldId);
            if (fieldData) {
                fieldLabel = fieldData.field_label;
                commissionAmount = fieldData.commission_amount || 0;
            }
        }

        setClawbackData({
            applicationId,
            fieldId,
            fieldLabel,
            commissionAmount
        });
        setClawbackModalOpen(true);
    };

    // Handle clawback modal confirm
    const handleClawbackConfirm = async ({ percentage, reason }) => {
        setClawbackLoading(true);

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.post(
                apiUrl(`/api/applications/${clawbackData.applicationId}/fields/${clawbackData.fieldId}/clawback`),
                { percentage, reason },
                config
            );

            setSuccessMessage('Clawback δημιουργήθηκε επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            setClawbackModalOpen(false);
            fetchApplications(); // Refresh data
        } catch (error) {
            console.error("Failed to create field clawback", error);
            const errorMessage = error.response?.data?.message || 'Σφάλμα κατά τη δημιουργία του clawback';
            await sendCentralizedToast('system_error', '❌ Σφάλμα Clawback', errorMessage);
        } finally {
            setClawbackLoading(false);
        }
    };

    // Handle clawback modal close
    const handleClawbackClose = () => {
        if (!clawbackLoading) {
            setClawbackModalOpen(false);
            setClawbackData({
                applicationId: null,
                fieldId: null,
                fieldLabel: '',
                commissionAmount: 0
            });
        }
    };

    // Draft Applications Functions
    const handleEditDraft = (draftId) => {
        navigate(`/application/new?draftId=${draftId}`);
    };

    const handleDeleteDraft = async (draftId) => {
        showConfirmModal({
            title: 'Διαγραφή Προσωρινής Αίτησης',
            message: 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την προσωρινή αίτηση;',
            onConfirm: async () => {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.delete(apiUrl(`/api/applications/drafts/${draftId}`), config);

                    setSuccessMessage('Προσωρινή αίτηση διαγράφηκε επιτυχώς!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                    fetchApplications(); // Refresh data
                } catch (error) {
                    console.error("Failed to delete draft application", error);
                    setError('Σφάλμα κατά τη διαγραφή της προσωρινής αίτησης');
                    setTimeout(() => setError(''), 3000);
                }
            },
            type: 'danger',
            confirmText: 'Διαγραφή',
            cancelText: 'Ακύρωση'
        });
    };

    const handlePromoteDraft = async (draftId) => {
        showConfirmModal({
            title: 'Υποβολή Προσωρινής Αίτησης',
            message: 'Θέλετε να υποβάλετε αυτή την προσωρινή αίτηση; Θα μετατραπεί σε κανονική αίτηση.',
            onConfirm: async () => {
                try {
                    const config = { headers: { Authorization: `Bearer ${token}` } };
                    await axios.post(apiUrl(`/api/applications/drafts/${draftId}/promote`), {}, config);

                    setSuccessMessage('Η προσωρινή αίτηση υποβλήθηκε επιτυχώς!');
                    setTimeout(() => setSuccessMessage(''), 3000);
                    fetchApplications(); // Refresh data
                } catch (error) {
                    console.error("Failed to promote draft application", error);
                    const errorMessage = error.response?.data?.message || 'Σφάλμα κατά την υποβολή της προσωρινής αίτησης';
                    setError(errorMessage);
                    setTimeout(() => setError(''), 5000);
                }
            },
            type: 'warning',
            confirmText: 'Υποβολή',
            cancelText: 'Ακύρωση'
        });
    };

    // Handle simple application payment toggle
    const handleSimplePaymentToggle = async (applicationId, currentStatus) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const endpoint = currentStatus ? 'unpaid' : 'paid';
            await axios.patch(apiUrl(`/api/applications/${applicationId}/${endpoint}`), {}, config);
            
            setSuccessMessage('Κατάσταση πληρωμής ενημερώθηκε επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchApplications(); // Refresh data
        } catch (error) {
            console.error("Failed to update payment status", error);
            setError('Σφάλμα κατά την ενημέρωση της πληρωμής');
            setTimeout(() => setError(''), 3000);
        }
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

    // Helper function to render draft applications table
    const renderDraftApplicationTable = (tableApplications, tableName, statusClass) => {
        if (tableApplications.length === 0) {
            return (
                <div className={`applications-content ${statusClass}`}>
                    <div className="table-header">
                        <h3>{tableName}</h3>
                    </div>
                    <div className="empty-table-message">
                        <p>Δεν υπάρχουν προσωρινές αιτήσεις.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={`applications-content ${statusClass}`}>
                <div className="table-header">
                    <h3>{tableName}</h3>
                </div>
                <div className="applications-table-scroll">
                    <table className="modern-applications-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Πελάτης</th>
                                <th>Εταιρία</th>
                                <th>Ημερομηνία</th>
                                <th>Ενέργειες</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableApplications.map((draft) => (
                                <tr key={draft.id} className="application-row draft-row">
                                    <td>#{draft.id}</td>
                                    <td>
                                        <div>
                                            <div className="customer-name">{draft.customer_name}</div>
                                            <div className="customer-phone">{draft.customer_phone}</div>
                                        </div>
                                    </td>
                                    <td className="company-name">{draft.company_name}</td>
                                    <td>
                                        {new Date(draft.updated_at || draft.created_at).toLocaleDateString('el-GR')}
                                    </td>
                                    <td>
                                        <div className="draft-actions">
                                            <button
                                                className="btn-edit-draft"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleEditDraft(draft.id);
                                                }}
                                                title="Επεξεργασία"
                                            >
                                                ✏️ Επεξεργασία
                                            </button>
                                            <button
                                                className="btn-promote-draft"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handlePromoteDraft(draft.id);
                                                }}
                                                title="Υποβολή Αίτησης"
                                            >
                                                🚀 Υποβολή
                                            </button>
                                            <button
                                                className="btn-delete-draft"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteDraft(draft.id);
                                                }}
                                                title="Διαγραφή"
                                            >
                                                🗑️ Διαγραφή
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // Helper function to render a table for specific applications
    const renderApplicationTable = (tableApplications, tableName, statusClass) => {
        if (tableApplications.length === 0) {
            return (
                <div className={`applications-content ${statusClass}`}>
                    <div className="table-header">
                        <h3>{tableName}</h3>
                    </div>
                    <div className="empty-table-message">
                        <p>Δεν υπάρχουν αιτήσεις με αυτό το στάτους.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={`applications-content ${statusClass}`}>
                <div className="table-header">
                    <h3>{tableName}</h3>
                </div>
                <div className="applications-table-scroll">
                    <table className="modern-applications-table">
                        <thead>
                            <tr>
                                <th></th>
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
                            {tableApplications.map((app) => {
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
        );
    };

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
                        onChange={(e) => handleSearchChange(e.target.value)}
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
            ) : (filteredPendingApplications.length === 0 && filteredOnHoldApplications.length === 0 && filteredRegisteredApplications.length === 0 && filteredDraftApplications.length === 0) ? (
                <div className="empty-state">
                    <p>
                        {searchTerm
                            ? `Δεν βρέθηκαν αιτήσεις που να ταιριάζουν με "${searchTerm}"`
                            : 'Δεν βρέθηκαν αιτήσεις για τα επιλεγμένα κριτήρια.'
                        }
                    </p>
                </div>
            ) : (
                <div className="multiple-tables-container">
                    <style>
                        {`
                            .multiple-tables-container {
                                display: flex;
                                flex-direction: column;
                                gap: 30px;
                            }

                            .applications-content {
                                background: rgba(255, 255, 255, 0.15);
                                backdrop-filter: blur(10px);
                                border-radius: 20px;
                                padding: 30px;
                                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                                border: 1px solid rgba(255, 255, 255, 0.2);
                                max-width: 1400px;
                                margin: 0 auto;
                            }

                            .applications-content.pending-status {
                                border-top: 4px solid #3b82f6;
                            }

                            .applications-content.onhold-status {
                                border-top: 4px solid #eab308;
                            }

                            .applications-content.registered-status {
                                border-top: 4px solid #10b981;
                            }

                            .table-header {
                                background: rgba(255, 255, 255, 0.1);
                                border-radius: 12px;
                                padding: 20px;
                                margin-bottom: 20px;
                                border-left: 4px solid;
                            }

                            .pending-status .table-header {
                                border-left-color: #3b82f6;
                                background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05));
                            }

                            .onhold-status .table-header {
                                border-left-color: #eab308;
                                background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05));
                            }

                            .registered-status .table-header {
                                border-left-color: #10b981;
                                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
                            }

                            .table-header h3 {
                                margin: 0;
                                font-size: 1.4rem;
                                font-weight: 700;
                                color: white;
                                text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
                            }

                            .pending-status .table-header h3 {
                                color: #3b82f6;
                            }

                            .onhold-status .table-header h3 {
                                color: #eab308;
                            }

                            .registered-status .table-header h3 {
                                color: #10b981;
                            }

                            .empty-table-message {
                                text-align: center;
                                padding: 40px 20px;
                                color: rgba(255, 255, 255, 0.7);
                                font-style: italic;
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

                            .pending-status .modern-applications-table thead {
                                background: linear-gradient(135deg, #3b82f6, #2563eb);
                            }

                            .onhold-status .modern-applications-table thead {
                                background: linear-gradient(135deg, #eab308, #ca8a04);
                            }

                            .registered-status .modern-applications-table thead {
                                background: linear-gradient(135deg, #10b981, #059669);
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

                            /* Draft Applications Styling */
                            .applications-content.draft-status {
                                border-top: 4px solid #6c757d;
                            }

                            .draft-status .table-header {
                                border-left-color: #6c757d;
                                background: linear-gradient(135deg, rgba(108, 117, 125, 0.1), rgba(108, 117, 125, 0.05));
                            }

                            .draft-status .table-header h3 {
                                color: #6c757d;
                            }

                            .draft-status .modern-applications-table thead {
                                background: linear-gradient(135deg, #6c757d, #5a6268);
                            }

                            .draft-row {
                                background: rgba(108, 117, 125, 0.05) !important;
                                border-left: 3px solid #6c757d;
                            }

                            .draft-row:hover {
                                background: rgba(108, 117, 125, 0.1) !important;
                                cursor: default;
                            }

                            .draft-actions {
                                display: flex;
                                gap: 8px;
                                flex-wrap: wrap;
                            }

                            .btn-edit-draft,
                            .btn-promote-draft,
                            .btn-delete-draft {
                                padding: 6px 12px;
                                border: none;
                                border-radius: 6px;
                                font-size: 0.8rem;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s ease;
                                display: flex;
                                align-items: center;
                                gap: 4px;
                            }

                            .btn-edit-draft {
                                background: linear-gradient(135deg, #007bff, #0056b3);
                                color: white;
                            }

                            .btn-edit-draft:hover {
                                transform: translateY(-1px);
                                box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
                            }

                            .btn-promote-draft {
                                background: linear-gradient(135deg, #28a745, #1e7e34);
                                color: white;
                            }

                            .btn-promote-draft:hover {
                                transform: translateY(-1px);
                                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                            }

                            .btn-delete-draft {
                                background: linear-gradient(135deg, #dc3545, #bd2130);
                                color: white;
                            }

                            .btn-delete-draft:hover {
                                transform: translateY(-1px);
                                box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
                            }

                            @media (max-width: 768px) {
                                .draft-actions {
                                    flex-direction: column;
                                    align-items: stretch;
                                }

                                .btn-edit-draft,
                                .btn-promote-draft,
                                .btn-delete-draft {
                                    width: 100%;
                                    justify-content: center;
                                }
                            }
                        `}
                    </style>

                    {/* Pending Applications Table */}
                    {renderApplicationTable(filteredPendingApplications, "Προς Καταχώρηση", "pending-status")}

                    {/* On Hold Applications Table */}
                    {renderApplicationTable(filteredOnHoldApplications, "Εκκρεμότητα", "onhold-status")}

                    {/* Registered Applications Table */}
                    {renderApplicationTable(filteredRegisteredApplications, "Καταχωρήθηκε", "registered-status")}

                    {/* Draft Applications Table */}
                    {renderDraftApplicationTable(filteredDraftApplications, "Προσωρινά Αποθηκευμένες", "draft-status")}
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
                    <li>Εμφανίζονται 10 αιτήσεις ανά σελίδα για καλύτερη απόδοση</li>
                    <li>Κάνε κλικ σε οποιαδήποτε γραμμή για να δεις λεπτομέρειες</li>
                    <li>Η αναζήτηση γίνεται σε όλες τις αιτήσεις, όχι μόνο στη τρέχουσα σελίδα</li>
                    <li>Μαρκάρετε τις αιτήσεις ως "Πληρωμένες από την εταιρία" όταν έχει γίνει η πληρωμή</li>
                    <li>Για αιτήσεις με πεδία αμοιβής, μπορείτε να διαχειριστείτε κάθε πεδίο ξεχωριστά</li>
                    <li>Τα clawbacks μπορούν να δημιουργηθούν μόνο για πληρωμένα πεδία που είναι σε statements</li>
                </ul>
            </div>

            {/* Clawback Modal */}
            <ClawbackModal
                isOpen={clawbackModalOpen}
                onClose={handleClawbackClose}
                onConfirm={handleClawbackConfirm}
                applicationId={clawbackData.applicationId}
                fieldId={clawbackData.fieldId}
                fieldLabel={clawbackData.fieldLabel}
                commissionAmount={clawbackData.commissionAmount}
                loading={clawbackLoading}
            />
        </div>
    );
};

export default ApplicationsPage;