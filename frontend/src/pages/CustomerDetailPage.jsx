import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import '../App.css';

const CustomerDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token } = useContext(AuthContext);
    const { showDeleteConfirm, showSuccessToast, showErrorToast } = useNotifications();

    const [customer, setCustomer] = useState(null);
    const [log, setLog] = useState([]);
    const [applications, setApplications] = useState([]);
    const [showAllApplications, setShowAllApplications] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({ full_name: '', phone: '', address: '', notes: '', phones: [], emails: [] });

    const [newNote, setNewNote] = useState('');
    const [method, setMethod] = useState('phone');

    const fetchData = async () => {
        if (!token) return;
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const [customerRes, logRes, applicationsRes] = await Promise.all([
                axios.get(`http://localhost:3000/api/customers/${id}`, config),
                axios.get(`http://localhost:3000/api/customers/${id}/communications`, config),
                axios.get(`http://localhost:3000/api/customers/${id}/applications`, config)
            ]);
            setCustomer(customerRes.data);
            setFormData({
                ...customerRes.data,
                phones: customerRes.data.phone ? [customerRes.data.phone] : [''],
                emails: customerRes.data.email ? [customerRes.data.email] : ['']
            });
            setLog(logRes.data);
            setApplications(applicationsRes.data);
        } catch (err) {
            setError('Failed to fetch customer data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [id, token]);

    const handleFormChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePhoneChange = (index, value) => {
        const newPhones = [...formData.phones];
        newPhones[index] = value;
        setFormData({ ...formData, phones: newPhones });
    };

    const handleEmailChange = (index, value) => {
        const newEmails = [...formData.emails];
        newEmails[index] = value;
        setFormData({ ...formData, emails: newEmails });
    };

    const addPhone = () => {
        setFormData({ ...formData, phones: [...formData.phones, ''] });
    };

    const removePhone = (index) => {
        const newPhones = formData.phones.filter((_, i) => i !== index);
        setFormData({ ...formData, phones: newPhones.length > 0 ? newPhones : [''] });
    };

    const addEmail = () => {
        setFormData({ ...formData, emails: [...formData.emails, ''] });
    };

    const removeEmail = (index) => {
        const newEmails = formData.emails.filter((_, i) => i !== index);
        setFormData({ ...formData, emails: newEmails.length > 0 ? newEmails : [''] });
    };

    const handleUpdateSubmit = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const submitData = {
                ...formData,
                phone: formData.phones.filter(p => p.trim()).join(', '),
                email: formData.emails.filter(e => e.trim()).join(', ')
            };
            const res = await axios.put(`http://localhost:3000/api/customers/${id}`, submitData, config);
            setCustomer(res.data);
            setIsEditing(false);
        } catch (err) {
            setError('Failed to update customer');
        }
    };

    const handleDelete = async () => {
        showDeleteConfirm(`τον πελάτη "${customer?.full_name || 'Unknown'}"`, async () => {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(`http://localhost:3000/api/customers/${id}`, config);
                showSuccessToast('Επιτυχία', 'Ο πελάτης μετακινήθηκε στον κάδο ανακύκλωσης');
                navigate('/customers');
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Αποτυχία διαγραφής πελάτη';
                setError(errorMessage);
                showErrorToast('Σφάλμα', errorMessage);
            }
        });
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const body = { note: newNote, method };
            await axios.post(`http://localhost:3000/api/customers/${id}/communications`, body, config);
            setNewNote('');
            setMethod('phone');
            fetchData();
        } catch (err) {
            console.error("Failed to add note", err);
        }
    };

    const getMethodIcon = (method) => {
        switch(method) {
            case 'phone': return '📞';
            case 'email': return '📧';
            case 'in-person': return '🤝';
            default: return '💬';
        }
    };

    const getMethodLabel = (method) => {
        switch(method) {
            case 'phone': return 'Τηλέφωνο';
            case 'email': return 'Email';
            case 'in-person': return 'Φυσική Παρουσία';
            default: return method;
        }
    };

    if (loading) {
        return (
            <div className="modern-customer-detail">
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
                    Φόρτωση δεδομένων πελάτη...
                </div>
            </div>
        );
    }

    if (error && !isEditing) {
        return (
            <div className="modern-customer-detail">
                <div className="error-container">
                    <div className="error-message">❌ {error}</div>
                </div>
            </div>
        );
    }

    if (!customer) {
        return (
            <div className="modern-customer-detail">
                <div className="error-container">
                    <div className="error-message">👤 Ο πελάτης δεν βρέθηκε</div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="modern-customer-detail">
            <style>
                {`
                    .modern-customer-detail {
                        min-height: calc(100vh - 80px);
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        padding: 20px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .modern-customer-detail::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: linear-gradient(45deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
                        pointer-events: none;
                    }
                    
                    .customer-header {
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
                    
                    .customer-header::before {
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
                    
                    .customer-avatar {
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
                        font-weight: bold;
                    }
                    
                    .header-text h1 {
                        font-size: 1.8rem;
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
                    
                    .inactive-badge {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        margin-left: 10px;
                    }
                    
                    .action-buttons {
                        display: flex;
                        gap: 10px;
                        position: relative;
                        z-index: 2;
                        flex-wrap: wrap;
                    }
                    
                    .edit-button, .back-button {
                        padding: 12px 20px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 0.95rem;
                        text-decoration: none;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                        border: none;
                        cursor: pointer;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .edit-button {
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.3);
                    }
                    
                    .back-button {
                        background: linear-gradient(135deg, #6b7280, #4b5563);
                        color: white;
                        box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                    }
                    
                    .edit-button::before, .back-button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                        transition: all 0.5s ease;
                    }
                    
                    .edit-button:hover::before, .back-button:hover::before {
                        left: 100%;
                    }
                    
                    .edit-button:hover {
                        background: linear-gradient(135deg, #d97706, #b45309);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(245, 158, 11, 0.4);
                    }
                    
                    .back-button:hover {
                        background: linear-gradient(135deg, #4b5563, #374151);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
                        text-decoration: none;
                        color: white;
                    }
                    
                    .customer-content {
                        display: grid;
                        gap: 25px;
                        max-width: 1400px;
                        margin: 0 auto;
                    }
                    
                    .customer-info-section, .notes-section, .communication-section {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .section-title {
                        font-size: 1.5rem;
                        font-weight: 600;
                        color: #1f2937;
                        margin: 0 0 20px 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    
                    .info-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                    }
                    
                    .info-item {
                        background: rgba(243, 244, 246, 0.5);
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid rgba(229, 231, 235, 0.5);
                    }
                    
                    .info-label {
                        font-size: 0.85rem;
                        font-weight: 600;
                        color: #6b7280;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        margin-bottom: 8px;
                    }
                    
                    .info-value {
                        font-size: 1.1rem;
                        font-weight: 600;
                        color: #1f2937;
                    }
                    
                    .afm-value {
                        font-family: 'Courier New', monospace;
                        background: rgba(102, 126, 234, 0.1);
                        padding: 4px 8px;
                        border-radius: 6px;
                        color: #667eea;
                    }
                    
                    .edit-form {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .form-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                        gap: 20px;
                        margin-bottom: 25px;
                    }
                    
                    .form-group {
                        position: relative;
                    }
                    
                    .form-group label {
                        display: block;
                        margin-bottom: 8px;
                        color: #374151;
                        font-weight: 600;
                        font-size: 0.95rem;
                    }
                    
                    .modern-input, .modern-textarea {
                        width: 100%;
                        padding: 12px 16px;
                        border: 2px solid #e5e7eb;
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        box-sizing: border-box;
                        font-family: inherit;
                    }
                    
                    .modern-input:focus, .modern-textarea:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                        background: rgba(255, 255, 255, 1);
                        transform: translateY(-2px);
                    }
                    
                    .modern-input:disabled {
                        background: rgba(243, 244, 246, 0.5);
                        color: #6b7280;
                        cursor: not-allowed;
                    }

                    .dynamic-field-container {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        margin-bottom: 10px;
                    }

                    .dynamic-field-container:last-child {
                        margin-bottom: 0;
                    }

                    .dynamic-field-container .modern-input {
                        flex: 1;
                        margin: 0;
                    }

                    .field-actions {
                        display: flex;
                        gap: 5px;
                        flex-shrink: 0;
                    }

                    .add-field-button, .remove-field-button {
                        width: 32px;
                        height: 32px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 14px;
                        transition: all 0.2s ease;
                    }

                    .add-field-button {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                    }

                    .add-field-button:hover {
                        background: linear-gradient(135deg, #059669, #047857);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                    }

                    .remove-field-button {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                    }

                    .remove-field-button:hover {
                        background: linear-gradient(135deg, #dc2626, #b91c1c);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
                    }
                    
                    .form-actions {
                        display: flex;
                        gap: 15px;
                        justify-content: flex-end;
                        margin-top: 25px;
                    }
                    
                    .save-button, .cancel-button {
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 600;
                        font-size: 0.95rem;
                        border: none;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .save-button {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
                    }
                    
                    .cancel-button {
                        background: linear-gradient(135deg, #6b7280, #4b5563);
                        color: white;
                        box-shadow: 0 4px 15px rgba(107, 114, 128, 0.3);
                    }
                    
                    .save-button:hover {
                        background: linear-gradient(135deg, #059669, #047857);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
                    }
                    
                    .cancel-button:hover {
                        background: linear-gradient(135deg, #4b5563, #374151);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(107, 114, 128, 0.4);
                    }
                    
                    .notes-content {
                        background: rgba(249, 250, 251, 0.5);
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid rgba(229, 231, 235, 0.5);
                        white-space: pre-wrap;
                        font-size: 1rem;
                        line-height: 1.6;
                        color: #374151;
                        min-height: 60px;
                    }
                    
                    .add-note-form {
                        background: rgba(243, 244, 246, 0.3);
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid rgba(229, 231, 235, 0.5);
                        margin-bottom: 25px;
                    }
                    
                    .note-form-row {
                        display: grid;
                        grid-template-columns: 1fr auto auto;
                        gap: 15px;
                        align-items: end;
                    }
                    
                    .modern-select {
                        padding: 12px 16px;
                        border: 2px solid #e5e7eb;
                        border-radius: 12px;
                        font-size: 1rem;
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        transition: all 0.3s ease;
                        cursor: pointer;
                    }
                    
                    .modern-select:focus {
                        outline: none;
                        border-color: #667eea;
                        box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
                    }
                    
                    .add-note-button {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        white-space: nowrap;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                    }
                    
                    .add-note-button:hover {
                        background: linear-gradient(135deg, #5b21b6, #6d28d9);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                    }
                    
                    .communication-log {
                        display: grid;
                        gap: 15px;
                    }
                    
                    .log-entry {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 20px;
                        border-radius: 12px;
                        border: 1px solid #e5e7eb;
                        transition: all 0.2s ease;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
                    }
                    
                    .log-entry:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                        border-color: #667eea;
                    }
                    
                    .log-content {
                        font-size: 1rem;
                        color: #374151;
                        line-height: 1.6;
                        margin-bottom: 10px;
                    }
                    
                    .log-meta {
                        display: flex;
                        align-items: center;
                        gap: 15px;
                        font-size: 0.85rem;
                        color: #6b7280;
                        flex-wrap: wrap;
                    }
                    
                    .method-badge {
                        background: rgba(102, 126, 234, 0.1);
                        color: #667eea;
                        padding: 4px 8px;
                        border-radius: 20px;
                        font-weight: 500;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }
                    
                    .user-info {
                        font-weight: 500;
                    }
                    
                    .date-info {
                        color: #9ca3af;
                    }
                    
                    .no-logs {
                        text-align: center;
                        padding: 40px 20px;
                        color: #6b7280;
                        font-style: italic;
                    }
                    
                    .danger-zone {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(239, 68, 68, 0.2);
                        margin-top: 25px;
                    }
                    
                    .delete-button {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                        border: none;
                        padding: 12px 20px;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                    }
                    
                    .delete-button:hover {
                        background: linear-gradient(135deg, #dc2626, #b91c1c);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                    }
                    
                    .error-container {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 50vh;
                    }
                    
                    .error-message {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        color: #dc2626;
                        padding: 20px 30px;
                        border-radius: 12px;
                        border: 1px solid rgba(239, 68, 68, 0.2);
                        font-size: 1.1rem;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                    }
                    
                    @media (max-width: 768px) {
                        .modern-customer-detail {
                            padding: 15px;
                        }
                        
                        .customer-header {
                            flex-direction: column;
                            text-align: center;
                        }
                        
                        .header-content {
                            flex-direction: column;
                            text-align: center;
                        }
                        
                        .action-buttons {
                            justify-content: center;
                        }
                        
                        .info-grid {
                            grid-template-columns: 1fr;
                        }
                        
                        .form-grid {
                            grid-template-columns: 1fr;
                        }
                        
                        .note-form-row {
                            grid-template-columns: 1fr;
                            gap: 10px;
                        }
                        
                        .form-actions {
                            flex-direction: column;
                            align-items: stretch;
                        }
                    }
                    
                    .applications-section {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(10px);
                        border-radius: 20px;
                        padding: 30px;
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    .applications-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                        gap: 20px;
                        margin-top: 20px;
                    }
                    
                    .application-card {
                        background: rgba(255, 255, 255, 0.15);
                        backdrop-filter: blur(20px);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        border-radius: 15px;
                        padding: 25px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.08);
                        transition: all 0.3s ease;
                        cursor: pointer;
                        position: relative;
                    }
                    
                    .application-card::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        right: 0;
                        height: 4px;
                        background: linear-gradient(135deg, #667eea, #764ba2);
                    }
                    
                    .application-card:hover {
                        transform: translateY(-5px);
                        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
                        border-color: #667eea;
                    }
                    
                    .app-header {
                        display: flex;
                        justify-content: flex-end;
                        align-items: center;
                        margin-bottom: 20px;
                        padding-bottom: 15px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    }
                    
                    
                    .status-badge {
                        padding: 4px 12px;
                        border-radius: 20px;
                        font-size: 0.75rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    
                    .status-active {
                        background: linear-gradient(135deg, #10b981, #059669);
                        color: white;
                    }
                    
                    .status-pending {
                        background: linear-gradient(135deg, #f59e0b, #d97706);
                        color: white;
                    }
                    
                    .status-inactive, .status-cancelled {
                        background: linear-gradient(135deg, #ef4444, #dc2626);
                        color: white;
                    }
                    
                    .status-completed {
                        background: linear-gradient(135deg, #6b7280, #4b5563);
                        color: white;
                    }
                    
                    .app-details {
                        display: grid;
                        gap: 12px;
                    }
                    
                    .app-detail {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 8px 0;
                    }
                    
                    .detail-label {
                        font-size: 0.9rem;
                        color: #6b7280;
                        font-weight: 500;
                    }
                    
                    .detail-value {
                        font-size: 0.95rem;
                        color: #1f2937;
                        font-weight: 600;
                    }
                    
                    .no-applications {
                        text-align: center;
                        padding: 40px 20px;
                        color: #6b7280;
                        font-style: italic;
                        background: rgba(243, 244, 246, 0.5);
                        border-radius: 12px;
                        border: 2px dashed #d1d5db;
                        margin-top: 20px;
                    }
                    
                    .applications-count {
                        font-size: 0.9rem;
                        color: #6b7280;
                        font-weight: 500;
                        margin-left: 8px;
                    }
                    
                    .show-more-container {
                        display: flex;
                        justify-content: center;
                        margin-top: 20px;
                    }
                    
                    .show-more-button {
                        background: linear-gradient(135deg, #667eea, #764ba2);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.95rem;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .show-more-button:hover {
                        background: linear-gradient(135deg, #5b21b6, #6d28d9);
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
                    }
                `}
            </style>
            
            <div className="customer-header">
                <div className="header-content">
                    <div className="customer-avatar">
                        {customer.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="header-text">
                        <h1>
                            👤 {customer.full_name}
                            {customer.deleted_at && <span className="inactive-badge">ΑΝΕΝΕΡΓΟΣ</span>}
                        </h1>
                        <p>Καρτέλα Πελάτη</p>
                    </div>
                </div>
                <div className="action-buttons">
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="edit-button">
                            ✏️ Επεξεργασία
                        </button>
                    )}
                    <Link to="/customers" className="back-button">
                        ⬅️ Πίσω στο Πελατολόγιο
                    </Link>
                </div>
            </div>

            <div className="customer-content">
                {isEditing ? (
                    <div className="edit-form">
                        <h2 className="section-title">✏️ Επεξεργασία Πελάτη</h2>
                        <form onSubmit={handleUpdateSubmit}>
                            <div className="form-grid">
                                <div className="form-group">
                                    <label htmlFor="full_name">👤 Όνομα</label>
                                    <input
                                        id="full_name"
                                        type="text"
                                        name="full_name"
                                        value={formData.full_name}
                                        onChange={handleFormChange}
                                        className="modern-input"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="afm">🆔 ΑΦΜ</label>
                                    <input
                                        id="afm"
                                        type="text"
                                        name="afm"
                                        value={formData.afm}
                                        className="modern-input"
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label>📞 Τηλέφωνα</label>
                                    {formData.phones.map((phone, index) => (
                                        <div key={index} className="dynamic-field-container">
                                            <input
                                                type="text"
                                                value={phone}
                                                onChange={(e) => handlePhoneChange(index, e.target.value)}
                                                className="modern-input"
                                                placeholder={`Τηλέφωνο ${index + 1}`}
                                            />
                                            <div className="field-actions">
                                                {formData.phones.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhone(index)}
                                                        className="remove-field-button"
                                                        title="Αφαίρεση τηλεφώνου"
                                                    >
                                                        ❌
                                                    </button>
                                                )}
                                                {index === formData.phones.length - 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={addPhone}
                                                        className="add-field-button"
                                                        title="Προσθήκη τηλεφώνου"
                                                    >
                                                        ➕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="form-group">
                                    <label htmlFor="address">🏠 Διεύθυνση</label>
                                    <input
                                        id="address"
                                        type="text"
                                        name="address"
                                        value={formData.address || ''}
                                        onChange={handleFormChange}
                                        className="modern-input"
                                        placeholder="Εισάγετε διεύθυνση"
                                    />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label>📧 Emails</label>
                                {formData.emails.map((email, index) => (
                                    <div key={index} className="dynamic-field-container">
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => handleEmailChange(index, e.target.value)}
                                            className="modern-input"
                                            placeholder={`Email ${index + 1}`}
                                        />
                                        <div className="field-actions">
                                            {formData.emails.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeEmail(index)}
                                                    className="remove-field-button"
                                                    title="Αφαίρεση email"
                                                >
                                                    ❌
                                                </button>
                                            )}
                                            {index === formData.emails.length - 1 && (
                                                <button
                                                    type="button"
                                                    onClick={addEmail}
                                                    className="add-field-button"
                                                    title="Προσθήκη email"
                                                >
                                                    ➕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="form-group">
                                <label htmlFor="notes">📝 Γενικές Σημειώσεις</label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows="4"
                                    value={formData.notes || ''}
                                    onChange={handleFormChange}
                                    className="modern-textarea"
                                    placeholder="Προσθέστε γενικές σημειώσεις για τον πελάτη..."
                                />
                            </div>
                            
                            <div className="form-actions">
                                <button type="submit" className="save-button">
                                    💾 Αποθήκευση
                                </button>
                                <button 
                                    type="button" 
                                    className="cancel-button" 
                                    onClick={() => setIsEditing(false)}
                                >
                                    ❌ Ακύρωση
                                </button>
                            </div>
                        </form>
                    </div>
                ) : (
                    <>
                        <div className="customer-info-section">
                            <h2 className="section-title">📋 Στοιχεία Πελάτη</h2>
                            <div className="info-grid">
                                <div className="info-item">
                                    <div className="info-label">🆔 ΑΦΜ</div>
                                    <div className="info-value afm-value">{customer.afm}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">📞 Τηλέφωνο</div>
                                    <div className="info-value">{customer.phone || 'Δεν έχει καταχωρηθεί'}</div>
                                </div>
                                <div className="info-item">
                                    <div className="info-label">🏠 Διεύθυνση</div>
                                    <div className="info-value">{customer.address || 'Δεν έχει καταχωρηθεί'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="notes-section">
                            <h2 className="section-title">📝 Γενικές Σημειώσεις</h2>
                            <div className="notes-content">
                                {customer.notes || 'Δεν υπάρχουν σημειώσεις για αυτόν τον πελάτη.'}
                            </div>
                        </div>

                        <div className="applications-section">
                            <h2 className="section-title">
                                🏢 Προϊόντα/Αιτήσεις Πελάτη 
                                {applications.length > 0 && (
                                    <span className="applications-count">({applications.length})</span>
                                )}
                            </h2>
                            {applications.length > 0 ? (
                                <>
                                    <div className="applications-grid">
                                        {(showAllApplications ? applications : applications.slice(0, 4)).map(app => {
                                            console.log('Application data:', app);
                                            return (
                                                <div
                                                    key={app.application_id}
                                                    className="application-card"
                                                    onClick={() => navigate(`/application/${app.application_id}`)}
                                                >
                                                    <div className="app-header">
                                                    <span className={`status-badge status-${app.status.toLowerCase().replace(' ', '-')}`}>
                                                        {app.status}
                                                    </span>
                                                </div>
                                                <div className="app-details">
                                                    <div className="app-detail">
                                                        <span className="detail-label">🏢 Εταιρεία:</span>
                                                        <span className="detail-value">{app.company_name || 'ΧΩΡΙΣ ΕΤΑΙΡΕΙΑ'}</span>
                                                    </div>
                                                    <div className="app-detail">
                                                        <span className="detail-label">💰 Αμοιβή:</span>
                                                        <span className="detail-value">€{app.total_commission}</span>
                                                    </div>
                                                    <div className="app-detail">
                                                        <span className="detail-label">📅 Ημ/νία:</span>
                                                        <span className="detail-value">
                                                            {new Date(app.created_at).toLocaleDateString('el-GR')}
                                                        </span>
                                                    </div>
                                                    {app.contract_end_date && (
                                                        <div className="app-detail">
                                                            <span className="detail-label">⏰ Λήξη:</span>
                                                            <span className="detail-value">
                                                                {new Date(app.contract_end_date).toLocaleDateString('el-GR')}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="app-detail">
                                                        <span className="detail-label">🤝 Συνεργάτης:</span>
                                                        <span className="detail-value">{app.associate_name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            );
                                        })}
                                    </div>
                                    {applications.length > 4 && (
                                        <div className="show-more-container">
                                            <button 
                                                className="show-more-button"
                                                onClick={() => setShowAllApplications(!showAllApplications)}
                                            >
                                                {showAllApplications ? (
                                                    <>⬆️ Εμφάνιση λιγότερων</>
                                                ) : (
                                                    <>⬇️ Εμφάνιση όλων ({applications.length - 4} ακόμη)</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="no-applications">
                                    🚫 Δεν υπάρχουν καταχωρημένες αιτήσεις για αυτόν τον πελάτη
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="communication-section">
                    <h2 className="section-title">💬 Ιστορικό Επικοινωνίας</h2>
                    
                    <div className="add-note-form">
                        <form onSubmit={handleAddNote}>
                            <div className="form-group" style={{marginBottom: '15px'}}>
                                <textarea
                                    rows="3"
                                    placeholder="Προσθήκη νέας σημείωσης επικοινωνίας..."
                                    value={newNote}
                                    onChange={e => setNewNote(e.target.value)}
                                    className="modern-textarea"
                                    required
                                />
                            </div>
                            <div className="note-form-row">
                                <div></div>
                                <select 
                                    value={method} 
                                    onChange={e => setMethod(e.target.value)}
                                    className="modern-select"
                                >
                                    <option value="phone">📞 Τηλέφωνο</option>
                                    <option value="email">📧 Email</option>
                                    <option value="in-person">🤝 Φυσική Παρουσία</option>
                                </select>
                                <button type="submit" className="add-note-button">
                                    ➕ Προσθήκη
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="communication-log">
                        {log.length > 0 ? log.map(entry => (
                            <div key={entry.id} className="log-entry">
                                <div className="log-content">{entry.note}</div>
                                <div className="log-meta">
                                    <span className="method-badge">
                                        {getMethodIcon(entry.method)} {getMethodLabel(entry.method)}
                                    </span>
                                    <span className="user-info">👤 {entry.user_name}</span>
                                    <span className="date-info">
                                        📅 {new Date(entry.created_at).toLocaleString('el-GR')}
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="no-logs">
                                💬 Δεν υπάρχουν καταγεγραμμένες επικοινωνίες για αυτόν τον πελάτη
                            </div>
                        )}
                    </div>
                </div>

                {!isEditing && (
                    <div className="danger-zone">
                        <h3 className="section-title">⚠️ Επικίνδυνη Ζώνη</h3>
                        <p style={{color: '#6b7280', marginBottom: '15px'}}>
                            Η διαγραφή θα μετακινήσει τον πελάτη στον κάδο ανακύκλωσης
                        </p>
                        <button onClick={handleDelete} className="delete-button">
                            🗑️ Διαγραφή Πελάτη
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerDetailPage;