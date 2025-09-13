import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ApplicationsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unpaid'); // 'all', 'paid', 'unpaid'
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');
    const [showCommissionDialog, setShowCommissionDialog] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);
    const [commissionableFields, setCommissionableFields] = useState([]);

    const fetchApplications = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `http://localhost:3000/api/applications/team-applications?paid_status=${filter}`, 
                config
            );
            setApplications(response.data);
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
        // First check if this application has commissionable fields
        const fields = await fetchCommissionableFields(applicationId);
        const app = applications.find(a => a.id === applicationId);
        
        if (fields.length > 0) {
            // Show dialog for field-by-field payment selection
            setSelectedApplication(app);
            setCommissionableFields(fields);
            setShowCommissionDialog(true);
        } else {
            // No commissionable fields, proceed with simple payment
            await markApplicationAsPaid(applicationId);
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

    const formatCurrency = (amount) => {
        return `€${parseFloat(amount || 0).toFixed(2)}`;
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('el-GR');
    };

    if (!user) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Παρακαλώ συνδεθείτε για να δείτε τις αιτήσεις.
                </div>
            </div>
        );
    }

    const canMarkAsPaid = user.role === 'TeamLeader' || user.role === 'Admin';

    // Filter applications based on search term
    const filteredApplications = applications.filter(app => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            app.id.toString().includes(searchLower) ||
            app.customer_name.toLowerCase().includes(searchLower) ||
            app.customer_phone.toLowerCase().includes(searchLower) ||
            app.associate_name.toLowerCase().includes(searchLower) ||
            app.company_name.toLowerCase().includes(searchLower)
        );
    });

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Αιτήσεων</h1>
            </div>

            {successMessage && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                    {successMessage}
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {error}
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-200 rounded-lg p-1 mb-6">
                <button
                    onClick={() => setFilter('unpaid')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        filter === 'unpaid'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Μη Πληρωμένες
                </button>
                <button
                    onClick={() => setFilter('paid')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        filter === 'paid'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Πληρωμένες
                </button>
                <button
                    onClick={() => setFilter('all')}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                        filter === 'all'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    Όλες
                </button>
            </div>

            {/* Search Input */}
            <div className="mb-6">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Αναζήτηση αιτήσεων (ID, πελάτης, συνεργάτης, εταιρία, τηλέφωνο)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Φόρτωση αιτήσεων...</p>
                </div>
            ) : filteredApplications.length === 0 ? (
                <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-lg p-8">
                        <p className="text-gray-500">
                            {searchTerm 
                                ? `Δεν βρέθηκαν αιτήσεις που να ταιριάζουν με "${searchTerm}"`
                                : 'Δεν βρέθηκαν αιτήσεις για τα επιλεγμένα κριτήρια.'
                            }
                        </p>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Πελάτης
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Συνεργάτης
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Εταιρία
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Αμοιβή
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Κατάσταση Πληρωμής
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ημερομηνία
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ενέργειες
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredApplications.map((app) => (
                                    <tr key={app.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{app.id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div>
                                                <div className="font-medium">{app.customer_name}</div>
                                                <div className="text-gray-500">{app.customer_phone}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {app.associate_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {app.company_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {formatCurrency(app.total_commission)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                app.is_paid_by_company
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {app.is_paid_by_company ? 'Πληρωμένη' : 'Μη Πληρωμένη'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(app.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <Link
                                                    to={`/application/${app.id}`}
                                                    className="text-blue-600 hover:text-blue-900 transition-colors"
                                                >
                                                    Προβολή
                                                </Link>
                                                {!app.is_paid_by_company && canMarkAsPaid && (
                                                    <button
                                                        onClick={() => handleMarkAsPaid(app.id)}
                                                        className="text-green-600 hover:text-green-900 transition-colors"
                                                    >
                                                        Μάρκανση ως Πληρωμένη
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3 flex-1">
                        <h3 className="text-sm font-medium text-blue-800">Πληροφορίες</h3>
                        <div className="mt-2 text-sm text-blue-700">
                            <p>• Μαρκάρετε τις αιτήσεις ως "Πληρωμένες από την εταιρία" όταν έχει γίνει η πληρωμή</p>
                            <p>• Οι πληρωμένες αιτήσεις θα είναι διαθέσιμες για δημιουργία ταμειακών καταστάσεων</p>
                            <p>• Μόνο οι αιτήσεις με κατάσταση "Καταχωρήθηκε" εμφανίζονται εδώ</p>
                        </div>
                    </div>
                </div>
            </div>

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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-2xl shadow-lg rounded-md bg-white">
                <div className="mt-3">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-gray-900">
                            Επιλογή Πληρωμής για Αίτηση #{application?.id}
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-4">
                            Αυτή η αίτηση έχει πεδία που δίνουν αμοιβή. Επιλέξτε ποια πεδία έχουν πληρωθεί:
                        </p>

                        <div className="space-y-3">
                            {commissionableFields.map(field => (
                                <div key={field.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id={`field-${field.id}`}
                                            checked={fieldPayments[field.id] || false}
                                            onChange={() => handleFieldToggle(field.id)}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label htmlFor={`field-${field.id}`} className="ml-3 block text-sm font-medium text-gray-700">
                                            {field.label}
                                        </label>
                                    </div>
                                    <div className="text-sm text-gray-900 font-medium">
                                        €{parseFloat(field.commission_amount).toFixed(2)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <div className="flex justify-between items-center">
                                <span className="text-base font-medium text-gray-900">
                                    Συνολική Αμοιβή Προς Πληρωμή:
                                </span>
                                <span className="text-lg font-bold text-green-600">
                                    €{calculateTotalCommission().toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">Σημαντικό</h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p>Μόνο τα επιλεγμένα πεδία θα μαρκαριστούν ως πληρωμένα. Τα μη επιλεγμένα πεδία θα παραμείνουν απλήρωτα για μελλοντική επεξεργασία.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex space-x-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                        >
                            Ακύρωση
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                            Επιβεβαίωση Πληρωμής
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationsPage;