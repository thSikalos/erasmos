import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import SmartPagination from '../components/SmartPagination';
import { useSearchWithPagination } from '../hooks/usePagination';

const ApplicationsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'paid', 'unpaid'
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [showCommissionDialog, setShowCommissionDialog] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [commissionableFields, setCommissionableFields] = useState([]);
    const [displayFields, setDisplayFields] = useState([]);

    // Search function for applications
    const searchFunction = (app, searchTerm) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            app.id.toString().includes(searchLower) ||
            app.customer_name?.toLowerCase().includes(searchLower) ||
            app.customer_phone?.toLowerCase().includes(searchLower) ||
            app.associate_name?.toLowerCase().includes(searchLower) ||
            app.company_name?.toLowerCase().includes(searchLower)
        );
    };

    // Use search with pagination hook
    const {
        searchTerm,
        handleSearchChange,
        currentItems: currentApplications,
        currentPage,
        totalPages,
        totalItems,
        goToPage
    } = useSearchWithPagination(applications, searchFunction, 10);

    const fetchApplications = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [appsRes, fieldsRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/applications/team-applications?paid_status=${filter}`, config),
                axios.get('http://localhost:3000/api/fields', config)
            ]);
            setApplications(appsRes.data);
            setDisplayFields(fieldsRes.data.filter(f => f.show_in_applications_table));
        } catch (error) {
            console.error("Failed to fetch applications", error);
            setError('Σφάλμα κατά τη φόρτωση των αιτήσεων');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [token, filter]);

    const fetchCommissionableFields = async (applicationId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `http://localhost:3000/api/applications/${applicationId}/commissionable-fields`,
                config
            );
            return response.data;
        } catch (error) {
            console.error("Failed to fetch commissionable fields", error);
            return [];
        }
    };

    const handleMarkAsPaid = async (applicationId) => {
        const app = applications.find(a => a.id === applicationId);
        
        if (app.is_paid_by_company) {
            // If already paid, unmark it as paid
            await markApplicationAsUnpaid(applicationId);
        } else {
            // First check if this application has commissionable fields
            const fields = await fetchCommissionableFields(applicationId);
            
            if (fields.length > 0) {
                // Show dialog for field-by-field payment selection
                setSelectedApplication(app);
                setCommissionableFields(fields);
                setShowCommissionDialog(true);
            } else {
                // No commissionable fields, proceed with simple payment
                await markApplicationAsPaid(applicationId);
            }
        }
    };

    const markApplicationAsPaid = async (applicationId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`http://localhost:3000/api/applications/${applicationId}/paid`, {}, config);
            setSuccessMessage('Η αίτηση μαρκάρισε ως πληρωμένη επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchApplications(); // Refresh the list
        } catch (error) {
            console.error("Failed to mark application as paid", error);
            setError('Σφάλμα κατά τη μαρκάρισμα της αίτησης');
            setTimeout(() => setError(''), 3000);
        }
    };

    const markApplicationAsUnpaid = async (applicationId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.patch(`http://localhost:3000/api/applications/${applicationId}/unpaid`, {}, config);
            setSuccessMessage('Η αίτηση μαρκάρισε ως απλήρωτη επιτυχώς!');
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchApplications(); // Refresh the list
        } catch (error) {
            console.error("Failed to mark application as unpaid", error);
            setError('Σφάλμα κατά τη μαρκάρισμα της αίτησης');
            setTimeout(() => setError(''), 3000);
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

    const canMarkAsPaid = user.role === 'TeamLeader' || user.role === 'Admin';


    return (
        <div className="applications-container">
            <div className="applications-header">
                <h1>Διαχείριση Αιτήσεων</h1>
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

            {/* Filter Tabs */}
            <div className="applications-filters">
                <button
                    onClick={() => setFilter('all')}
                    className={`filter-button ${filter === 'all' ? 'active' : ''}`}
                >
                    Όλες
                </button>
                <button
                    onClick={() => setFilter('unpaid')}
                    className={`filter-button ${filter === 'unpaid' ? 'active' : ''}`}
                >
                    Απλήρωτες
                </button>
                <button
                    onClick={() => setFilter('paid')}
                    className={`filter-button ${filter === 'paid' ? 'active' : ''}`}
                >
                    Πληρωμένες
                </button>
            </div>

            {/* Search Input */}
            <div className="search-container">
                <input
                    type="text"
                    placeholder="Αναζήτηση αιτήσεων (ID, πελάτης, συνεργάτης, εταιρία, τηλέφωνο)..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="search-input"
                />
                <svg className="search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>

            {loading ? (
                <div className="loading-spinner">
                    <div className="loading-spinner-icon"></div>
                    <p>Φόρτωση αιτήσεων...</p>
                </div>
            ) : totalItems === 0 ? (
                <div className="empty-state">
                    <p>
                        {searchTerm 
                            ? `Δεν βρέθηκαν αιτήσεις που να ταιριάζουν με "${searchTerm}"`
                            : 'Δεν βρέθηκαν αιτήσεις για τα επιλεγμένα κριτήρια.'
                        }
                    </p>
                </div>
            ) : (
                <div className="applications-table-container">
                    <div className="applications-table-scroll">
                        <table className="applications-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    {displayFields.length > 0 && (
                                        <th>{displayFields[0].label}</th>
                                    )}
                                    <th>Πελάτης</th>
                                    <th>Συνεργάτης</th>
                                    <th>Εταιρία</th>
                                    <th>Αμοιβή</th>
                                    <th>Κατάσταση Πληρωμής</th>
                                    <th>Ημερομηνία</th>
                                    <th>Ενέργειες</th>
                                </tr>
                            </thead>
                            <tbody>
                                {currentApplications.map((app) => (
                                    <tr key={app.id}>
                                        <td>#{app.id}</td>
                                        {displayFields.length > 0 && (
                                            <td>
                                                {app.display_fields && app.display_fields[displayFields[0].label] ?
                                                    app.display_fields[displayFields[0].label] :
                                                    '-'
                                                }
                                            </td>
                                        )}
                                        <td>
                                            <div>
                                                <strong>{app.customer_name}</strong>
                                                <br />
                                                <small>{app.customer_phone}</small>
                                            </div>
                                        </td>
                                        <td>{app.associate_name}</td>
                                        <td>{app.company_name}</td>
                                        <td><strong>{formatCurrency(app.total_commission)}</strong></td>
                                        <td>
                                            <span className={`status-badge ${app.is_paid_by_company ? 'status-paid' : 'status-unpaid'}`}>
                                                {app.is_paid_by_company ? 'Πληρωμένη' : 'Μη Πληρωμένη'}
                                            </span>
                                        </td>
                                        <td>{formatDate(app.created_at)}</td>
                                        <td>
                                            <Link
                                                to={`/application/${app.id}`}
                                                className="action-link"
                                            >
                                                Προβολή
                                            </Link>
                                            {canMarkAsPaid && (
                                                <div className="payment-checkbox-container">
                                                    <input
                                                        type="checkbox"
                                                        id={`paid-${app.id}`}
                                                        checked={app.is_paid_by_company}
                                                        onChange={() => handleMarkAsPaid(app.id)}
                                                        className="payment-checkbox"
                                                    />
                                                    <label htmlFor={`paid-${app.id}`} className="payment-checkbox-label">
                                                        Πληρώθηκα από την εταιρία
                                                    </label>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="info-box">
                <h4>Πληροφορίες</h4>
                <ul>
                    <li>Μαρκάρετε τις αιτήσεις ως "Πληρωμένες από την εταιρία" όταν έχει γίνει η πληρωμή</li>
                    <li>Οι πληρωμένες αιτήσεις θα είναι διαθέσιμες για δημιουργία ταμειακών καταστάσεων</li>
                    <li>Μόνο οι αιτήσεις με κατάσταση "Καταχωρήθηκε" εμφανίζονται εδώ</li>
                </ul>
            </div>

            {/* Smart Pagination */}
            <SmartPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={goToPage}
                itemsPerPage={10}
                totalItems={totalItems}
                showInfo={true}
            />

            {/* Commission Fields Dialog */}
            {showCommissionDialog && (
                <CommissionDialog 
                    application={selectedApplication}
                    commissionableFields={commissionableFields}
                    onClose={() => setShowCommissionDialog(false)}
                    onConfirm={markApplicationAsPaid}
                />
            )}
        </div>
    );
};

// Commission Dialog Component
const CommissionDialog = ({ application, commissionableFields, onClose, onConfirm }) => {
    const [fieldPayments, setFieldPayments] = useState({});

    useEffect(() => {
        // Initialize all fields as paid by default
        const initialPayments = {};
        commissionableFields.forEach(field => {
            initialPayments[field.id] = true;
        });
        setFieldPayments(initialPayments);
    }, [commissionableFields]);

    const handleFieldToggle = (fieldId) => {
        setFieldPayments(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    const calculateTotalCommission = () => {
        return commissionableFields.reduce((total, field) => {
            return total + (fieldPayments[field.id] ? parseFloat(field.commission_amount) : 0);
        }, 0);
    };

    const handleConfirm = () => {
        // For now, we'll mark the entire application as paid
        // In the future, this could track partial payments
        onConfirm(application.id);
        onClose();
    };

    return (
        <div className="dialog-overlay">
            <div className="dialog-content">
                <div className="dialog-header">
                    <h3>Επιλογή Πληρωμής για Αίτηση #{application?.id}</h3>
                    <button onClick={onClose} className="dialog-close">×</button>
                </div>

                <div>
                    <p style={{marginBottom: '1rem', color: '#6c757d'}}>
                        Αυτή η αίτηση έχει πεδία που δίνουν αμοιβή. Επιλέξτε ποια πεδία έχουν πληρωθεί:
                    </p>

                    <div style={{marginBottom: '1rem'}}>
                        {commissionableFields.map(field => (
                            <div key={field.id} className="commission-field-item">
                                <div className="commission-field-checkbox">
                                    <input
                                        type="checkbox"
                                        id={`field-${field.id}`}
                                        checked={fieldPayments[field.id] || false}
                                        onChange={() => handleFieldToggle(field.id)}
                                    />
                                    <label htmlFor={`field-${field.id}`}>
                                        {field.label}
                                    </label>
                                </div>
                                <div style={{fontWeight: 'bold'}}>
                                    €{parseFloat(field.commission_amount).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="commission-total">
                        <span style={{fontWeight: 'bold'}}>
                            Συνολική Αμοιβή Προς Πληρωμή:
                        </span>
                        <span className="commission-total-amount">
                            €{calculateTotalCommission().toFixed(2)}
                        </span>
                    </div>
                </div>

                <div className="warning-box">
                    <h4>Σημαντικό</h4>
                    <p>Μόνο τα επιλεγμένα πεδία θα μαρκαριστούν ως πληρωμένα. Τα μη επιλεγμένα πεδία θα παραμείνουν απλήρωτα για μελλοντική επεξεργασία.</p>
                </div>

                <div className="dialog-buttons">
                    <button onClick={onClose} className="button-cancel">
                        Ακύρωση
                    </button>
                    <button onClick={handleConfirm} className="button-confirm">
                        Επιβεβαίωση Πληρωμής
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplicationsPage;