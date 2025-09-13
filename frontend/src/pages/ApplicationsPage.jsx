import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const ApplicationsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('unpaid'); // 'all', 'paid', 'unpaid'
    const [successMessage, setSuccessMessage] = useState('');
    const [error, setError] = useState('');

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

    const handleMarkAsPaid = async (applicationId) => {
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

    if (!user || (user.role !== 'TeamLeader' && user.role !== 'Admin')) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα.
                </div>
            </div>
        );
    }

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

            {loading ? (
                <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-gray-600">Φόρτωση αιτήσεων...</p>
                </div>
            ) : applications.length === 0 ? (
                <div className="text-center py-8">
                    <div className="bg-gray-100 rounded-lg p-8">
                        <p className="text-gray-500">Δεν βρέθηκαν αιτήσεις για τα επιλεγμένα κριτήρια.</p>
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
                                {applications.map((app) => (
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
                                                {!app.is_paid_by_company && (
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
        </div>
    );
};

export default ApplicationsPage;