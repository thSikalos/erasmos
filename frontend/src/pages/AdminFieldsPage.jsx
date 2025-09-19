import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { apiUrl } from '../utils/api';
import '../App.css';

const AdminFieldsPage = () => {
    const { token, user } = useContext(AuthContext);
    const { showDeleteConfirm, showSuccessToast, showErrorToast } = useNotifications();
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [isEditing, setIsEditing] = useState(false);
    const [currentFieldId, setCurrentFieldId] = useState(null);
    const [label, setLabel] = useState('');
    const [type, setType] = useState('text');
    const [isCommissionable, setIsCommissionable] = useState(false);
    const [showInTable, setShowInTable] = useState(false);
    const [requiredForPdf, setRequiredForPdf] = useState(false);

    // Dropdown options state
    const [fieldOptions, setFieldOptions] = useState([]);
    const [newOptionValue, setNewOptionValue] = useState('');

    // Company selection state (for admin users)
    const [companies, setCompanies] = useState([]);
    const [selectedCompanyId, setSelectedCompanyId] = useState(null);

    // Temporary ID counter for new options (negative numbers)
    const [tempIdCounter, setTempIdCounter] = useState(-1);

    const fetchCompanies = async () => {
        if (!token || !user || user.role !== 'Admin') return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl('/api/companies'), config);
            setCompanies(res.data);
            // Auto-select first company if none selected
            if (res.data.length > 0 && !selectedCompanyId) {
                setSelectedCompanyId(res.data[0].id);
            }
        } catch (err) {
            console.error('Failed to fetch companies:', err);
        }
    };

    const fetchData = async () => {
        if (!token) return;
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl('/api/fields'), config);
            console.log('Fields data received:', res.data);
            // Log dropdown fields specifically
            res.data.forEach(field => {
                if (field.type === 'dropdown' && field.options) {
                    console.log(`Dropdown field "${field.label}" options:`, field.options);
                    field.options.forEach(opt => {
                        console.log(`Option ID type: ${typeof opt.id}, value: ${opt.id}`);
                        // Debug the disabled condition
                        const isDisabled = typeof opt.id === 'number' && opt.id < 0;
                        console.log(`Option ${opt.id} disabled: ${isDisabled} (isNegativeNumber=${typeof opt.id === 'number' && opt.id < 0})`);
                    });
                }
            });
            setFields(res.data);
        } catch (err) {
            setError('Failed to fetch fields');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        fetchCompanies();
    }, [token, user]);

    const resetForm = () => {
        setIsEditing(false);
        setCurrentFieldId(null);
        setLabel('');
        setType('text');
        setIsCommissionable(false);
        setShowInTable(false);
        setRequiredForPdf(false);
        setFieldOptions([]);
        setNewOptionValue('');
        setTempIdCounter(-1); // Reset temporary ID counter
    };

    // Dropdown options management
    const addFieldOption = () => {
        if (!newOptionValue.trim()) {
            showErrorToast('Σφάλμα', 'Παρακαλώ συμπλήρωσε το όνομα προγράμματος');
            return;
        }

        // Check for duplicate values
        if (fieldOptions.some(opt => opt.value === newOptionValue.trim())) {
            showErrorToast('Σφάλμα', 'Αυτό το όνομα προγράμματος υπάρχει ήδη');
            return;
        }

        const newOption = {
            id: tempIdCounter, // Negative ID for temporary options
            value: newOptionValue.trim(),
            label: newOptionValue.trim(), // Use the same value for both value and label
            order: fieldOptions.length
        };

        setFieldOptions([...fieldOptions, newOption]);
        setTempIdCounter(tempIdCounter - 1); // Decrement for next temporary option
        setNewOptionValue('');
    };

    const removeFieldOption = (optionId) => {
        setFieldOptions(fieldOptions.filter(opt => opt.id !== optionId));
    };

    // Toggle field option active state
    const toggleFieldOptionActive = async (optionId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.patch(
                apiUrl(`/api/fields/options/${optionId}/toggle-active`),
                {},
                config
            );

            showSuccessToast('Επιτυχία', response.data.message);

            // Refresh the field data
            fetchData();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to toggle option state';
            showErrorToast('Σφάλμα', errorMessage);
        }
    };

    // Hard delete field option (permanent removal)
    const hardDeleteFieldOption = async (optionId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.delete(
                apiUrl(`/api/fields/options/${optionId}`),
                config
            );

            showSuccessToast('Επιτυχία', response.data.message);

            // Refresh the field data
            fetchData();
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to delete option';
            showErrorToast('Σφάλμα', errorMessage);
        }
    };

    // Confirm hard delete with usage checking
    const confirmHardDelete = async (optionId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                apiUrl(`/api/fields/options/${optionId}/usage`),
                config
            );

            const { option, usage } = response.data;

            if (usage.total_applications > 0) {
                showErrorToast(
                    'Δεν είναι δυνατή η διαγραφή',
                    `Αυτή η επιλογή χρησιμοποιείται σε ${usage.total_applications} αιτήσεις. Δεν μπορεί να διαγραφεί μόνιμα. Μπορείτε να την απενεργοποιήσετε αντί αυτού.`
                );
                return;
            }

            const message = `Θέλετε να διαγράψετε ΜΟΝΙΜΑ την επιλογή "${option.label}"?\n\n` +
                `⚠️ ΠΡΟΣΟΧΗ: Αυτή η ενέργεια είναι μη αναστρέψιμη!\n\n` +
                `Αν θέλετε απλώς να την αποκρύψετε από τα νέα dropdown menus, ` +
                `χρησιμοποιήστε το κουμπί απενεργοποίησης (❌) αντί αυτού.`;

            if (window.confirm(message)) {
                hardDeleteFieldOption(optionId);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to check option usage';
            showErrorToast('Σφάλμα', errorMessage);
        }
    };

    // Check field option usage before toggling
    const checkFieldOptionUsage = async (optionId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                apiUrl(`/api/fields/options/${optionId}/usage`),
                config
            );

            const { option, usage, can_safely_deactivate } = response.data;

            if (!option.is_active) {
                // If option is inactive, we can safely reactivate it
                toggleFieldOptionActive(optionId);
                return;
            }

            // If option is active and has usage, show confirmation
            if (!can_safely_deactivate) {
                const message = `Αυτή η επιλογή χρησιμοποιείται σε ${usage.total_applications} αιτήσεις ` +
                    `(${usage.approved_applications} εγκεκριμένες, ${usage.pending_applications} σε εκκρεμότητα).\n\n` +
                    `Αν την απενεργοποιήσετε, δεν θα εμφανίζεται πλέον ως επιλογή στα νέα dropdown menus, ` +
                    `αλλά οι υπάρχουσες αιτήσεις θα διατηρήσουν την τιμή τους.\n\n` +
                    `Θέλετε να συνεχίσετε;`;

                if (window.confirm(message)) {
                    toggleFieldOptionActive(optionId);
                }
            } else {
                // Safe to deactivate
                toggleFieldOptionActive(optionId);
            }
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Failed to check option usage';
            showErrorToast('Σφάλμα', errorMessage);
        }
    };


    const handleEditClick = (field) => {
        setIsEditing(true);
        setCurrentFieldId(field.id);
        setLabel(field.label);
        setType(field.type);
        setIsCommissionable(field.is_commissionable);
        setShowInTable(field.show_in_applications_table || false);
        setRequiredForPdf(field.required_for_pdf || false);

        // Load options for dropdown fields
        if (field.type === 'dropdown' && field.options) {
            setFieldOptions(field.options.map(option => ({
                id: option.id,
                value: option.value,
                label: option.label,
                order: option.order,
                is_active: option.is_active !== undefined ? option.is_active : true
            })));
        } else {
            setFieldOptions([]);
        }
    };

    const handleDeleteClick = async (fieldId) => {
        const field = fields.find(f => f.id === fieldId);
        showDeleteConfirm(`το πεδίο "${field?.label || 'Unknown'}"`, async () => {
            setError('');
            try {
                const config = { headers: { Authorization: `Bearer ${token}` } };
                await axios.delete(apiUrl(`/api/fields/${fieldId}`), config);
                showSuccessToast('Επιτυχία', 'Το πεδίο διαγράφηκε επιτυχώς!');
                fetchData();
            } catch (err) {
                const errorMessage = err.response?.data?.message || 'Failed to delete field';
                setError(errorMessage);
                showErrorToast('Σφάλμα', errorMessage);
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validate dropdown fields have options
        if (type === 'dropdown' && fieldOptions.length === 0) {
            showErrorToast('Σφάλμα', 'Τα dropdown πεδία χρειάζονται τουλάχιστον μία επιλογή');
            return;
        }

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const fieldData = {
            label,
            type,
            is_commissionable: isCommissionable,
            show_in_applications_table: showInTable,
            required_for_pdf: requiredForPdf
        };

        // Add options for dropdown fields
        if (type === 'dropdown') {
            fieldData.options = fieldOptions.map((option, index) => ({
                value: option.value,
                label: option.label,
                order: index
            }));
        }

        try {
            if (isEditing) {
                await axios.put(apiUrl(`/api/fields/${currentFieldId}`), fieldData, config);
            } else {
                await axios.post(apiUrl('/api/fields'), fieldData, config);
            }
            resetForm();
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'An error occurred');
        }
    };


    return (
        <div>
            <style>{`
                .admin-fields-container {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    position: relative;
                    padding: 0;
                    overflow-x: hidden;
                }

                .admin-fields-container::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: 
                        radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                        radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                        radial-gradient(circle at 40% 40%, rgba(120, 119, 198, 0.2) 0%, transparent 50%);
                    pointer-events: none;
                }

                .modern-header {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(20px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 2rem 0;
                    position: relative;
                    z-index: 10;
                }

                .header-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 0 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .header-title {
                    background: linear-gradient(135deg, #ffffff, #f8f9ff);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    background-clip: text;
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin: 0;
                    text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                }

                .back-link {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(10px);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: 600;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .back-link:hover {
                    background: rgba(255, 255, 255, 0.25);
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
                }

                .main-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                    position: relative;
                    z-index: 5;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 2rem;
                }

                .form-card {
                    background: rgba(255, 255, 255, 0.15);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                }

                .form-card::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .form-card:hover::before {
                    left: 100%;
                }

                .card-title {
                    color: white;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .form-group-modern {
                    margin-bottom: 1.5rem;
                }

                .form-group-modern label {
                    display: block;
                    color: white;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    font-size: 0.9rem;
                }

                .form-group-modern input,
                .form-group-modern select {
                    width: 100%;
                    padding: 12px 16px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    box-sizing: border-box;
                }

                .form-group-modern input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }

                .form-group-modern input:focus,
                .form-group-modern select:focus {
                    outline: none;
                    border-color: rgba(255, 255, 255, 0.4);
                    background: rgba(255, 255, 255, 0.15);
                    box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1);
                }

                .form-group-modern select option {
                    background: #4a5568;
                    color: white;
                }

                .checkbox-group-modern {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 1.5rem;
                    padding: 12px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                }

                .checkbox-group-modern input[type="checkbox"] {
                    width: 20px;
                    height: 20px;
                    accent-color: #10b981;
                }

                .checkbox-group-modern label {
                    color: white;
                    font-weight: 500;
                    margin: 0;
                    cursor: pointer;
                }

                .form-actions-modern {
                    display: flex;
                    gap: 1rem;
                    justify-content: flex-end;
                    margin-top: 2rem;
                }

                .save-button {
                    background: linear-gradient(135deg, #10b981, #059669);
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .save-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
                }

                .cancel-button {
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.9rem;
                }

                .cancel-button:hover {
                    background: rgba(255, 255, 255, 0.15);
                    transform: translateY(-2px);
                }

                /* Dropdown Options Manager Styles */
                .dropdown-options-manager {
                    background: rgba(142, 68, 173, 0.1);
                    border: 1px solid rgba(142, 68, 173, 0.3);
                    border-radius: 12px;
                    padding: 20px;
                    margin: 20px 0;
                }

                .dropdown-options-manager h3 {
                    color: #8e44ad;
                    margin: 0 0 15px 0;
                    font-size: 1.1rem;
                }

                .add-option-form {
                    margin-bottom: 20px;
                }

                .option-inputs {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }

                .option-inputs input {
                    flex: 1;
                    min-width: 200px;
                    padding: 8px 12px;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.1);
                    color: white;
                    font-size: 0.9rem;
                }

                .option-inputs input::placeholder {
                    color: rgba(255, 255, 255, 0.6);
                }

                .add-option-btn {
                    background: linear-gradient(135deg, #27ae60, #2ecc71);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    padding: 8px 16px;
                    cursor: pointer;
                    font-weight: 600;
                    transition: all 0.3s ease;
                    white-space: nowrap;
                }

                .add-option-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(39, 174, 96, 0.3);
                }

                .options-list {
                    space-y: 8px;
                }

                .option-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: rgba(255, 255, 255, 0.1);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 8px;
                    padding: 12px;
                    margin-bottom: 8px;
                    transition: all 0.3s ease;
                }

                .option-item.inactive {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    opacity: 0.6;
                }

                .option-item.inactive .option-info {
                    text-decoration: line-through;
                    color: rgba(255, 255, 255, 0.7);
                }

                .option-info {
                    color: white;
                    flex: 1;
                }

                .option-info strong {
                    color: #8e44ad;
                }

                .option-actions {
                    display: flex;
                    gap: 8px;
                }

                .move-btn, .remove-btn, .pdf-upload-btn, .toggle-active-btn, .hard-delete-btn {
                    border: none;
                    border-radius: 6px;
                    padding: 6px 10px;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.3s ease;
                }

                .move-btn {
                    background: rgba(52, 152, 219, 0.3);
                    color: #3498db;
                }

                .move-btn:hover:not(:disabled) {
                    background: #3498db;
                    color: white;
                }

                .move-btn:disabled {
                    opacity: 0.4;
                    cursor: not-allowed;
                }

                .remove-btn {
                    background: rgba(231, 76, 60, 0.3);
                    color: #e74c3c;
                }

                .remove-btn:hover {
                    background: #e74c3c;
                    color: white;
                }

                .pdf-upload-btn {
                    background: rgba(155, 89, 182, 0.3);
                    color: #9b59b6;
                }

                .pdf-upload-btn:hover:not(:disabled) {
                    background: #9b59b6;
                    color: white;
                }

                .pdf-upload-btn:disabled {
                    background: rgba(155, 89, 182, 0.1);
                    color: rgba(155, 89, 182, 0.4);
                    cursor: not-allowed;
                    opacity: 0.5;
                }

                .toggle-active-btn {
                    background: rgba(46, 204, 113, 0.3);
                    color: #2ecc71;
                }

                .toggle-active-btn:hover {
                    background: #2ecc71;
                    color: white;
                }

                .toggle-active-btn.inactive {
                    background: rgba(231, 76, 60, 0.3);
                    color: #e74c3c;
                }

                .toggle-active-btn.inactive:hover {
                    background: #e74c3c;
                    color: white;
                }

                .hard-delete-btn {
                    background: rgba(192, 57, 43, 0.2);
                    color: #c0392b;
                    border: 1px solid rgba(192, 57, 43, 0.4);
                }

                .hard-delete-btn:hover {
                    background: #c0392b;
                    color: white;
                    transform: scale(1.05);
                    box-shadow: 0 2px 8px rgba(192, 57, 43, 0.4);
                }

                .no-options-message {
                    background: rgba(243, 156, 18, 0.1);
                    border: 1px solid rgba(243, 156, 18, 0.3);
                    border-radius: 8px;
                    padding: 12px;
                    color: #f39c12;
                    text-align: center;
                    font-weight: 600;
                }

                .options-count-badge {
                    background: rgba(142, 68, 173, 0.3);
                    color: #8e44ad;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }

                .dropdown-options-preview {
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    margin-top: 8px;
                    padding-left: 20px;
                }

                .option-preview {
                    background: rgba(255, 255, 255, 0.1);
                    color: rgba(255, 255, 255, 0.8);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.8rem;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .more-options {
                    color: rgba(255, 255, 255, 0.6);
                    font-style: italic;
                    font-size: 0.8rem;
                }

                .error-message-modern {
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 12px;
                    padding: 1rem;
                    color: white;
                    margin-top: 1rem;
                    font-weight: 500;
                }

                .fields-list {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    border-radius: 20px;
                    padding: 2rem;
                    position: relative;
                    overflow: hidden;
                }

                .fields-list::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .fields-list:hover::before {
                    left: 100%;
                }

                .field-item {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 1rem;
                    margin-bottom: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    transition: all 0.3s ease;
                }

                .field-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                }

                .field-info {
                    color: white;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .field-type-badge {
                    background: linear-gradient(135deg, #3b82f6, #2563eb);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }

                .commission-badge {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    padding: 4px 8px;
                    border-radius: 6px;
                    font-size: 0.7rem;
                    font-weight: 600;
                }

                .action-buttons {
                    display: flex;
                    gap: 0.5rem;
                }

                .edit-button {
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.8rem;
                }

                .edit-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(245, 158, 11, 0.3);
                }

                .delete-button {
                    background: linear-gradient(135deg, #ef4444, #dc2626);
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-size: 0.8rem;
                }

                .delete-button:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
                }

                .loading-container {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 200px;
                    color: white;
                }

                .loading-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid white;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }

                .loading-text {
                    font-size: 1.1rem;
                    font-weight: 500;
                }

                .empty-state {
                    text-align: center;
                    padding: 2rem;
                    color: rgba(255, 255, 255, 0.7);
                }

                .empty-state-icon {
                    font-size: 3rem;
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }

                .empty-state-text {
                    font-size: 1.1rem;
                    font-weight: 500;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 1024px) {
                    .main-content {
                        grid-template-columns: 1fr;
                        gap: 1.5rem;
                    }
                }

                @media (max-width: 768px) {
                    .header-content {
                        flex-direction: column;
                        gap: 1rem;
                        text-align: center;
                    }

                    .header-content > div {
                        flex-direction: column;
                        gap: 0.5rem;
                        width: 100%;
                    }

                    .header-content select {
                        width: 100% !important;
                        max-width: 200px;
                        margin: 0 auto;
                    }

                    .header-title {
                        font-size: 1.8rem;
                    }

                    .main-content {
                        grid-template-columns: 1fr;
                        padding: 1rem;
                    }

                    .form-card,
                    .fields-list {
                        padding: 1.5rem;
                    }

                    .field-item {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: flex-start;
                        padding: 1rem;
                    }

                    .field-info {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                        width: 100%;
                    }

                    .dropdown-options-preview {
                        margin-top: 0.5rem;
                        padding-left: 0;
                    }

                    .action-buttons {
                        width: 100%;
                        justify-content: flex-start;
                        gap: 0.5rem;
                        flex-wrap: wrap;
                    }

                    .edit-button,
                    .delete-button {
                        flex: 1;
                        min-width: 80px;
                        text-align: center;
                        font-size: 0.9rem;
                        padding: 10px 16px;
                    }

                    /* Dropdown options management mobile styles */
                    .option-inputs {
                        flex-direction: column;
                        gap: 0.5rem;
                    }

                    .option-inputs input {
                        min-width: auto;
                        width: 100%;
                    }

                    .add-option-btn {
                        width: 100%;
                        margin-top: 0.5rem;
                    }

                    .option-item {
                        flex-direction: column;
                        gap: 0.5rem;
                        align-items: flex-start;
                    }

                    .option-actions {
                        width: 100%;
                        justify-content: flex-start;
                        flex-wrap: wrap;
                        gap: 0.5rem;
                    }

                    .move-btn, .remove-btn, .pdf-upload-btn, .toggle-active-btn, .hard-delete-btn {
                        flex: 1;
                        min-width: 60px;
                    }
                }

                @media (max-width: 480px) {
                    .admin-fields-container {
                        padding: 0;
                    }

                    .modern-header {
                        padding: 1rem 0;
                    }

                    .header-content {
                        padding: 0 1rem;
                    }

                    .main-content {
                        padding: 0.5rem;
                    }

                    .form-card,
                    .fields-list {
                        padding: 1rem;
                        margin: 0.5rem;
                        border-radius: 15px;
                    }

                    .edit-button,
                    .delete-button {
                        font-size: 0.8rem;
                        padding: 8px 12px;
                    }
                }
            `}</style>

            <div className="admin-fields-container">
                <header className="modern-header">
                    <div className="header-content">
                        <h1 className="header-title">📝 Βιβλιοθήκη Πεδίων</h1>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {user?.role === 'Admin' && companies.length > 0 && (
                                <select
                                    value={selectedCompanyId || ''}
                                    onChange={(e) => setSelectedCompanyId(parseInt(e.target.value))}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'white',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <option value="">Επιλέξτε Εταιρία</option>
                                    {companies.map(company => (
                                        <option key={company.id} value={company.id} style={{color: '#333'}}>
                                            {company.name}
                                        </option>
                                    ))}
                                </select>
                            )}
                            <Link to="/admin" className="back-link">
                                ← Πίσω στο Admin Panel
                            </Link>
                        </div>
                    </div>
                </header>

                <main className="main-content">
                    <div className="form-card">
                        <h2 className="card-title">
                            {isEditing ? '✏️ Επεξεργασία Πεδίου' : '➕ Δημιουργία Νέου Πεδίου'}
                        </h2>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group-modern">
                                <label>🏷️ Ετικέτα Πεδίου</label>
                                <input 
                                    type="text" 
                                    value={label} 
                                    onChange={e => setLabel(e.target.value)} 
                                    required 
                                    placeholder="π.χ. χρωμα προγραμματος και εταιρια"
                                />
                            </div>
                            <div className="form-group-modern">
                                <label>🎯 Τύπος Πεδίου</label>
                                <select value={type} onChange={e => setType(e.target.value)}>
                                    <option value="text">📝 Κείμενο</option>
                                    <option value="number">🔢 Αριθμός</option>
                                    <option value="date">📅 Ημερομηνία</option>
                                    <option value="checkbox">☑️ Checkbox</option>
                                    <option value="dropdown">📋 Dropdown/Select</option>
                                </select>
                            </div>
                            <div className="checkbox-group-modern">
                                <input 
                                    type="checkbox" 
                                    id="is_commissionable" 
                                    checked={isCommissionable} 
                                    onChange={e => setIsCommissionable(e.target.checked)} 
                                />
                                <label htmlFor="is_commissionable">💰 Δέχεται Αμοιβή;</label>
                            </div>
                            <div className="checkbox-group-modern">
                                <input
                                    type="checkbox"
                                    id="show_in_applications_table"
                                    checked={showInTable}
                                    onChange={e => setShowInTable(e.target.checked)}
                                />
                                <label htmlFor="show_in_applications_table">📋 Εμφάνιση στον Πίνακα Αιτήσεων;</label>
                            </div>
                            <div className="checkbox-group-modern">
                                <input
                                    type="checkbox"
                                    id="required_for_pdf"
                                    checked={requiredForPdf}
                                    onChange={e => setRequiredForPdf(e.target.checked)}
                                />
                                <label htmlFor="required_for_pdf">📄* Απαραίτητο για εκδοση PDF;</label>
                            </div>

                            {/* Dropdown Options Manager */}
                            {type === 'dropdown' && (
                                <div className="dropdown-options-manager">
                                    <h3>📋 Επιλογές Dropdown</h3>

                                    {/* Add new option */}
                                    <div className="add-option-form">
                                        <div className="option-inputs">
                                            <input
                                                type="text"
                                                placeholder="ονομα προγραμματος"
                                                value={newOptionValue}
                                                onChange={e => setNewOptionValue(e.target.value)}
                                            />
                                            <button type="button" onClick={addFieldOption} className="add-option-btn">
                                                ➕ Προσθήκη
                                            </button>
                                        </div>
                                    </div>

                                    {/* Options list */}
                                    {fieldOptions.length > 0 && (
                                        <div className="options-list">
                                            {fieldOptions.map((option, index) => (
                                                <div
                                                    key={option.id}
                                                    className={`option-item ${option.is_active === false ? 'inactive' : ''}`}
                                                >
                                                    <span className="option-info">
                                                        <strong>{option.label}</strong> ({option.value})
                                                        {option.is_active === false && (
                                                            <span style={{
                                                                marginLeft: '8px',
                                                                fontSize: '0.7rem',
                                                                color: '#e74c3c',
                                                                background: 'rgba(231, 76, 60, 0.2)',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                ΑΠΕΝΕΡΓΟΠΟΙΗΜΕΝΟ
                                                            </span>
                                                        )}
                                                    </span>
                                                    <div className="option-actions">
                                                        {/* Only show toggle button for existing options (with real IDs) */}
                                                        {option.id > 0 && (
                                                            <>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => checkFieldOptionUsage(option.id)}
                                                                    className={`toggle-active-btn ${option.is_active === false ? 'inactive' : ''}`}
                                                                    title={option.is_active === false ? 'Επανενεργοποίηση επιλογής' : 'Απενεργοποίηση επιλογής (δεν θα διαγραφεί)'}
                                                                >
                                                                    {option.is_active === false ? '🔄' : '❌'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => confirmHardDelete(option.id)}
                                                                    className="hard-delete-btn"
                                                                    title="ΜΟΝΙΜΗ διαγραφή επιλογής (μη αναστρέψιμο)"
                                                                >
                                                                    🗑️
                                                                </button>
                                                            </>
                                                        )}
                                                        {/* Only show remove button for new options (negative IDs) */}
                                                        {option.id < 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeFieldOption(option.id)}
                                                                className="remove-btn"
                                                                title="Αφαίρεση νέας επιλογής"
                                                            >
                                                                🗑️
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {fieldOptions.length === 0 && (
                                        <div className="no-options-message">
                                            ⚠️ Τα dropdown πεδία χρειάζονται τουλάχιστον μία επιλογή
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="form-actions-modern">
                                <button type="submit" className="save-button">
                                    {isEditing ? '💾 Αποθήκευση Αλλαγών' : '➕ Δημιουργία Πεδίου'}
                                </button>
                                {isEditing && (
                                    <button type="button" onClick={resetForm} className="cancel-button">
                                        ❌ Ακύρωση
                                    </button>
                                )}
                            </div>
                            {error && <div className="error-message-modern">❌ {error}</div>}
                        </form>
                    </div>

                    <div className="fields-list">
                        <h2 className="card-title">📋 Υπάρχοντα Πεδία</h2>
                        {loading ? (
                            <div className="loading-container">
                                <div>
                                    <div className="loading-spinner"></div>
                                    <div className="loading-text">Φόρτωση πεδίων...</div>
                                </div>
                            </div>
                        ) : fields.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">📝</div>
                                <div className="empty-state-text">Δεν υπάρχουν πεδία ακόμα</div>
                            </div>
                        ) : (
                            fields.map(field => (
                                <div key={field.id} className="field-item">
                                    <div className="field-info">
                                        <span style={{ fontWeight: '600' }}>
                                            {field.label}
                                            {field.required_for_pdf && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>*</span>}
                                        </span>
                                        <span className="field-type-badge">{field.type}</span>
                                        {field.is_commissionable && (
                                            <span className="commission-badge">💰 Αμοιβή</span>
                                        )}
                                        {field.required_for_pdf && (
                                            <span className="commission-badge" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>📄 PDF Required</span>
                                        )}
                                        {field.type === 'dropdown' && field.options && (
                                            <span className="options-count-badge">
                                                📋 {field.options.length} επιλογές
                                            </span>
                                        )}
                                    </div>
                                    {field.type === 'dropdown' && field.options && field.options.length > 0 && (
                                        <div className="dropdown-options-preview">
                                            {field.options.slice(0, 3).map(option => (
                                                <span
                                                    key={option.id}
                                                    className={`option-preview ${option.is_active === false ? 'inactive' : ''}`}
                                                    style={option.is_active === false ? {
                                                        opacity: 0.5,
                                                        textDecoration: 'line-through',
                                                        background: 'rgba(231, 76, 60, 0.1)',
                                                        borderColor: 'rgba(231, 76, 60, 0.3)'
                                                    } : {}}
                                                >
                                                    {option.label}
                                                    {option.is_active === false && (
                                                        <span style={{ fontSize: '0.6rem', marginLeft: '4px' }}>❌</span>
                                                    )}
                                                </span>
                                            ))}
                                            {field.options.length > 3 && (
                                                <span className="more-options">
                                                    +{field.options.length - 3} ακόμα
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <div className="action-buttons">
                                        <button onClick={() => handleEditClick(field)} className="edit-button">
                                            ✏️ Edit
                                        </button>
                                        <button onClick={() => handleDeleteClick(field.id)} className="delete-button">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminFieldsPage;