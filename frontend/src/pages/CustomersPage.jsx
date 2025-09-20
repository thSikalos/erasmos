import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { apiUrl } from '../utils/api';
import SmartPagination from '../components/SmartPagination';
import { useSearchWithPagination } from '../hooks/usePagination';
import '../App.css';

const CustomersPage = () => {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
    const [newCustomerData, setNewCustomerData] = useState({
        afm: '',
        full_name: '',
        phone: '',
        address: '',
        email: '',
        notes: ''
    });
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState('');

    // Search function for customers
    const searchFunction = (customer, searchTerm) => {
        const searchLower = searchTerm.toLowerCase();
        return (
            customer.full_name?.toLowerCase().includes(searchLower) ||
            customer.phone?.toLowerCase().includes(searchLower) ||
            customer.afm?.toLowerCase().includes(searchLower) ||
            customer.email?.toLowerCase().includes(searchLower)
        );
    };

    // Use search with pagination hook
    const {
        searchTerm,
        handleSearchChange,
        currentItems: currentCustomers,
        currentPage,
        totalPages,
        totalItems,
        goToPage
    } = useSearchWithPagination(customers, searchFunction, 15);

    const fetchCustomers = async () => {
        if (!token) return;
        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };
            const res = await axios.get(apiUrl('/api/customers'), config);
            setCustomers(res.data);
        } catch (err) {
            console.error('Failed to fetch customers', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [token]);

    const handleNewCustomerChange = (field, value) => {
        setNewCustomerData(prev => ({
            ...prev,
            [field]: value
        }));
        if (modalError) setModalError('');
    };

    const handleCreateCustomer = async () => {
        if (!newCustomerData.afm.trim() || !newCustomerData.full_name.trim()) {
            setModalError('Το ΑΦΜ και το πλήρες όνομα είναι υποχρεωτικά');
            return;
        }

        setModalLoading(true);
        setModalError('');

        try {
            const config = {
                headers: { Authorization: `Bearer ${token}` }
            };

            await axios.post(apiUrl('/api/customers'), newCustomerData, config);

            // Refresh customers list
            await fetchCustomers();

            // Reset form and close modal
            setNewCustomerData({
                afm: '',
                full_name: '',
                phone: '',
                address: '',
                email: '',
                notes: ''
            });
            setShowNewCustomerModal(false);

        } catch (err) {
            if (err.response?.data?.message) {
                setModalError(err.response.data.message);
            } else {
                setModalError('Σφάλμα κατά τη δημιουργία του πελάτη');
            }
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setShowNewCustomerModal(false);
        setNewCustomerData({
            afm: '',
            full_name: '',
            phone: '',
            address: '',
            email: '',
            notes: ''
        });
        setModalError('');
    };

    if (loading) {
        return (
            <div className="modern-customers-page">
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
                    Φόρτωση πελατών...
                </div>
            </div>
        );
    }

    return (
        <div className="modern-customers-page">
            <style>
                {`
                    .modern-customers-page {
                        min-height: calc(100vh - 80px);
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-customers-page::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }
                    
                    .customers-header {
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
                    
                    .customers-header::before {
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
                    
                    .customers-icon {
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
                    
                    .new-app-button {
                        background: linear-gradient(135deg, #10b981, #059669);
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
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        position: relative;
                        z-index: 2;
                        overflow: hidden;
                    }
                    
                    .new-app-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }
                    
                    .new-app-button:hover::before {
                        left: 100%;
                    }
                    
                    .new-app-button:hover {
                        background: linear-gradient(135deg, #059669, #047857);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                        text-decoration: none;
                        color: white;
                    }
                    
                    .search-section {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 25px;
                        margin-bottom: 25px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .search-container {
                        position: relative;
                        max-width: 500px;
                    }
                    
                    .search-icon {
                        position: absolute;
                        left: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        color: #9ca3af;
                        font-size: 1.1rem;
                        pointer-events: none;
                    }
                    
                    .modern-search-input {
                        width: 100%;
                        padding: 15px 20px 15px 45px;
                        border: 2px solid #e5e7eb;
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                    }
                    
                    .modern-search-input:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                        transform: translateY(-2px);
                    }
                    
                    .modern-search-input::placeholder {
                        color: #9ca3af;
                    }
                    
                    .customers-content {
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
                    
                    .customers-count {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 0.85rem;
                        font-weight: 600;
                    }
                    
                    .modern-customers-table {
                        width: 100%;
                        border-collapse: collapse;
                        border-radius: 12px;
                        overflow: hidden;
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
                    }
                    
                    .modern-customers-table thead {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }
                    
                    .modern-customers-table th {
                        padding: 15px 20px;
                        color: white;
                        font-weight: 600;
                        text-align: left;
                        font-size: 0.9rem;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .modern-customers-table td {
                        padding: 15px 20px;
                        border-bottom: 1px solid #f3f4f6;
                        color: #374151;
                        font-size: 0.95rem;
                    }
                    
                    .modern-customers-table tbody tr {
                        background: rgba(255, 255, 255, 0.1);
                        transition: all 0.2s ease;
                        cursor: pointer;
                    }
                    
                    .modern-customers-table tbody tr:hover {
                        background: #f8fafc;
                        transform: scale(1.01);
                        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.15);
                    }
                    
                    .customer-name {
                        font-weight: 600;
                        color: #1f2937;
                    }
                    
                    .customer-afm {
                        font-family: 'Courier New', monospace;
                        background: rgba(102, 126, 234, 0.1);
                        padding: 4px 8px;
                        border-radius: 6px;
                        font-size: 0.9rem;
                        color: #667eea;
                        font-weight: 600;
                    }
                    
                    .customer-phone {
                        color: #059669;
                        font-weight: 500;
                    }
                    
                    .associate-name {
                        color: #6b7280;
                        font-style: italic;
                    }
                    
                    .no-customers {
                        text-align: center;
                        padding: 60px 20px;
                        color: #6b7280;
                    }
                    
                    .no-customers-icon {
                        font-size: 4rem;
                        margin-bottom: 20px;
                        opacity: 0.5;
                    }
                    
                    .no-customers h3 {
                        margin: 0 0 10px 0;
                        color: #374151;
                        font-size: 1.25rem;
                    }
                    
                    .no-customers p {
                        margin: 0;
                        font-size: 1rem;
                    }
                    
                    .results-info {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                        padding: 15px 20px;
                        background: rgba(102, 126, 234, 0.05);
                        border-radius: 10px;
                        border: 1px solid rgba(102, 126, 234, 0.1);
                    }
                    
                    .results-text {
                        color: #374151;
                        font-size: 0.9rem;
                    }
                    
                    .search-highlight {
                        background: rgba(102, 126, 234, 0.2);
                        color: #667eea;
                        font-weight: 600;
                        padding: 2px 4px;
                        border-radius: 4px;
                    }
                    
                    @media (max-width: 768px) {
                        .modern-customers-page {
                            padding: 15px;
                        }
                        
                        .customers-header {
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
                        
                        .modern-customers-table {
                            font-size: 0.85rem;
                        }
                        
                        .modern-customers-table th,
                        .modern-customers-table td {
                            padding: 10px 15px;
                        }
                        
                        .search-container {
                            max-width: 100%;
                        }
                    }
                    
                    @media (max-width: 480px) {
                        .modern-customers-table th:nth-child(3),
                        .modern-customers-table td:nth-child(3) {
                            display: none;
                        }

                        .customers-header {
                            padding: 20px;
                        }

                        .customers-content {
                            padding: 20px;
                        }
                    }

                    /* Modal Styles */
                    .modal-overlay {
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        z-index: 1000;
                        backdrop-filter: blur(5px);
                    }

                    .modal-content {
                        background: white;
                        border-radius: 20px;
                        max-width: 600px;
                        width: 90%;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .modal-header {
                        padding: 25px 30px 20px;
                        border-bottom: 1px solid #e5e7eb;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 20px 20px 0 0;
                    }

                    .modal-header h2 {
                        margin: 0;
                        color: white;
                        font-size: 1.5rem;
                        font-weight: 600;
                    }

                    .close-button {
                        background: none;
                        border: none;
                        color: white;
                        font-size: 1.5rem;
                        cursor: pointer;
                        padding: 5px;
                        line-height: 1;
                        transition: all 0.2s ease;
                        border-radius: 50%;
                        width: 35px;
                        height: 35px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .close-button:hover {
                        background: rgba(255, 255, 255, 0.2);
                        transform: scale(1.1);
                    }

                    .modal-body {
                        padding: 30px;
                    }

                    .form-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 20px;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                    }

                    .form-group.required label::after {
                        content: ' *';
                        color: #ef4444;
                    }

                    .form-group label {
                        font-weight: 600;
                        color: #374151;
                        margin-bottom: 8px;
                        font-size: 0.9rem;
                    }

                    .form-group input,
                    .form-group textarea {
                        padding: 12px 15px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        font-size: 0.95rem;
                        transition: all 0.2s ease;
                        background: white;
                    }

                    .form-group input:focus,
                    .form-group textarea:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    }

                    .form-group input:disabled,
                    .form-group textarea:disabled {
                        background: #f9fafb;
                        color: #6b7280;
                        cursor: not-allowed;
                    }

                    .error-message {
                        background: #fef2f2;
                        border: 1px solid #fecaca;
                        color: #dc2626;
                        padding: 12px 15px;
                        border-radius: 8px;
                        margin-bottom: 20px;
                        font-size: 0.9rem;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .modal-footer {
                        padding: 20px 30px 30px;
                        display: flex;
                        gap: 15px;
                        justify-content: flex-end;
                    }

                    .cancel-button,
                    .create-button {
                        padding: 12px 24px;
                        border: none;
                        border-radius: 8px;
                        font-weight: 600;
                        font-size: 0.95rem;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        min-width: 120px;
                    }

                    .cancel-button {
                        background: #f3f4f6;
                        color: #374151;
                        border: 1px solid #d1d5db;
                    }

                    .cancel-button:hover:not(:disabled) {
                        background: #e5e7eb;
                        transform: translateY(-1px);
                    }

                    .create-button {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }

                    .create-button:hover:not(:disabled) {
                        background: linear-gradient(135deg, #059669, #047857);
                        transform: translateY(-1px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }

                    .create-button:disabled {
                        background: #9ca3af;
                        cursor: not-allowed;
                        transform: none;
                        box-shadow: none;
                    }

                    @media (max-width: 768px) {
                        .modal-content {
                            width: 95%;
                            margin: 20px;
                        }

                        .form-row {
                            grid-template-columns: 1fr;
                            gap: 15px;
                        }

                        .modal-header,
                        .modal-body,
                        .modal-footer {
                            padding: 20px;
                        }

                        .modal-footer {
                            flex-direction: column;
                        }

                        .cancel-button,
                        .create-button {
                            width: 100%;
                        }
                    }
                `}
            </style>
            
            <div className="customers-header">
                <div className="header-content">
                    <div className="customers-icon">👥</div>
                    <div className="header-text">
                        <h1>Πελατολόγιο</h1>
                        <p>Διαχείριση και αναζήτηση πελατών</p>
                    </div>
                </div>
                <button onClick={() => setShowNewCustomerModal(true)} className="new-app-button">
                    👤 Νέος Πελάτης
                </button>
            </div>
            
            <div className="search-section">
                <div className="search-container">
                    <span className="search-icon">🔍</span>
                    <input 
                        type="text"
                        placeholder="Αναζήτηση με Όνομα ή ΑΦΜ..."
                        value={searchTerm}
                        onChange={e => handleSearchChange(e.target.value)}
                        className="modern-search-input"
                    />
                </div>
            </div>
            
            <div className="customers-content">
                <div className="content-header">
                    <h2 className="section-title">
                        👥 Λίστα Πελατών
                        <span className="customers-count">{totalItems}</span>
                    </h2>
                </div>
                
                {searchTerm && (
                    <div className="results-info">
                        <span className="results-text">
                            Αποτελέσματα για: <span className="search-highlight">"{searchTerm}"</span>
                        </span>
                        <span className="results-text">
                            {totalItems} πελάτες βρέθηκαν
                        </span>
                    </div>
                )}
                
                {totalItems > 0 ? (
                    <table className="modern-customers-table">
                        <thead>
                            <tr>
                                <th>👤 Όνομα</th>
                                <th>🆔 ΑΦΜ</th>
                                <th>📞 Τηλέφωνο</th>
                                <th>🤝 Συνεργάτης</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentCustomers.map(c => (
                                <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)}>
                                    <td className="customer-name">{c.full_name}</td>
                                    <td><span className="customer-afm">{c.afm}</span></td>
                                    <td className="customer-phone">{c.phone || 'Δεν έχει καταχωρηθεί'}</td>
                                    <td className="associate-name">{c.associate_name || 'Δεν έχει ανατεθεί'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="no-customers">
                        <div className="no-customers-icon">👥</div>
                        <h3>
                            {searchTerm ? 'Δεν βρέθηκαν πελάτες' : 'Δεν υπάρχουν πελάτες'}
                        </h3>
                        <p>
                            {searchTerm 
                                ? `Δεν βρέθηκαν πελάτες που να ταιριάζουν με "${searchTerm}"`
                                : 'Δημιουργήστε την πρώτη σας αίτηση για να προστεθούν πελάτες'
                            }
                        </p>
                    </div>
                )}

                {/* Smart Pagination */}
                <SmartPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={goToPage}
                    itemsPerPage={15}
                    totalItems={totalItems}
                    showInfo={true}
                />
            </div>

            {/* New Customer Modal */}
            {showNewCustomerModal && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>👤 Νέος Πελάτης</h2>
                            <button className="close-button" onClick={closeModal}>✕</button>
                        </div>

                        <div className="modal-body">
                            {modalError && (
                                <div className="error-message">
                                    ⚠️ {modalError}
                                </div>
                            )}

                            <div className="form-row">
                                <div className="form-group required">
                                    <label>ΑΦΜ *</label>
                                    <input
                                        type="text"
                                        value={newCustomerData.afm}
                                        onChange={e => handleNewCustomerChange('afm', e.target.value)}
                                        placeholder="Εισάγετε ΑΦΜ"
                                        disabled={modalLoading}
                                    />
                                </div>
                                <div className="form-group required">
                                    <label>Πλήρες Όνομα *</label>
                                    <input
                                        type="text"
                                        value={newCustomerData.full_name}
                                        onChange={e => handleNewCustomerChange('full_name', e.target.value)}
                                        placeholder="Εισάγετε πλήρες όνομα"
                                        disabled={modalLoading}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Τηλέφωνο</label>
                                    <input
                                        type="text"
                                        value={newCustomerData.phone}
                                        onChange={e => handleNewCustomerChange('phone', e.target.value)}
                                        placeholder="Εισάγετε τηλέφωνο"
                                        disabled={modalLoading}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input
                                        type="email"
                                        value={newCustomerData.email}
                                        onChange={e => handleNewCustomerChange('email', e.target.value)}
                                        placeholder="Εισάγετε email"
                                        disabled={modalLoading}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Διεύθυνση</label>
                                <input
                                    type="text"
                                    value={newCustomerData.address}
                                    onChange={e => handleNewCustomerChange('address', e.target.value)}
                                    placeholder="Εισάγετε διεύθυνση"
                                    disabled={modalLoading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Σημειώσεις</label>
                                <textarea
                                    value={newCustomerData.notes}
                                    onChange={e => handleNewCustomerChange('notes', e.target.value)}
                                    placeholder="Προαιρετικές σημειώσεις"
                                    rows="3"
                                    disabled={modalLoading}
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                className="cancel-button"
                                onClick={closeModal}
                                disabled={modalLoading}
                            >
                                Ακύρωση
                            </button>
                            <button
                                className="create-button"
                                onClick={handleCreateCustomer}
                                disabled={modalLoading || !newCustomerData.afm.trim() || !newCustomerData.full_name.trim()}
                            >
                                {modalLoading ? 'Δημιουργία...' : 'Δημιουργία Πελάτη'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;