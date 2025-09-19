import React, { useState, useEffect, useContext, useReducer, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import FileUpload from '../components/FileUpload';
import PDFReadinessIndicator from '../components/PDFReadinessIndicator';
import SignedPDFUpload from '../components/SignedPDFUpload';
import PDFErrorBoundary from '../components/PDFErrorBoundary';
import { apiUrl } from '../utils/api';
import '../App.css';

// Step indicators component
const StepIndicator = ({ currentStep, totalSteps }) => {
    const steps = [
        { number: 1, title: 'Στοιχεία Πελάτη', icon: '👤' },
        { number: 2, title: 'Στοιχεία Αίτησης', icon: '📋' },
        { number: 3, title: 'Προεπισκόπηση', icon: '✅' }
    ];

    return (
        <div className="step-indicator">
            {steps.map((step, index) => (
                <div key={step.number} className="step-item">
                    <div className={`step-circle ${currentStep >= step.number ? 'active' : ''} ${currentStep > step.number ? 'completed' : ''}`}>
                        {currentStep > step.number ? '✓' : step.icon}
                    </div>
                    <div className="step-info">
                        <div className="step-number">Βήμα {step.number}</div>
                        <div className="step-title">{step.title}</div>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`step-connector ${currentStep > step.number ? 'completed' : ''}`}></div>
                    )}
                </div>
            ))}
        </div>
    );
};


// Progress bar component
const ProgressBar = ({ currentStep, totalSteps }) => {
    const progress = (currentStep / totalSteps) * 100;
    
    return (
        <div className="progress-bar-container">
            <div className="progress-bar">
                <div 
                    className="progress-fill" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <div className="progress-text">{Math.round(progress)}% Ολοκληρωμένο</div>
        </div>
    );
};

// Application state reducer
const initialState = {
    // Customer data
    afm: '',
    customerDetails: { id: null, full_name: '', phone: '', address: '', email: '' },
    customerStatus: 'idle', // idle, checking, found, notFound
    
    // Application data
    selectedCompanyId: '',
    fieldValues: {},
    contractEndDate: '',
    isPersonal: false,
    
    // Files
    uploadedFiles: [],

    // PDF state
    pdfGenerated: false,
    generatedPDFPath: null,
    signedPDF: null,

    // UI state
    currentStep: 1,
    loading: false,
    error: '',
    
    // Modal state
    modalOpen: false,
    selectedApplication: null
};

const applicationReducer = (state, action) => {
    switch (action.type) {
        case 'SET_FIELD':
            return { ...state, [action.field]: action.value };
        case 'SET_CUSTOMER_DETAILS':
            return { ...state, customerDetails: action.data };
        case 'SET_CUSTOMER_STATUS':
            return { ...state, customerStatus: action.status };
        case 'SET_FIELD_VALUE':
            return { 
                ...state, 
                fieldValues: { ...state.fieldValues, [action.fieldId]: action.value }
            };
        case 'ADD_FILE':
            return { 
                ...state, 
                uploadedFiles: [...state.uploadedFiles, action.file]
            };
        case 'REMOVE_FILE':
            return { 
                ...state, 
                uploadedFiles: state.uploadedFiles.filter((_, index) => index !== action.index)
            };
        case 'SET_FILES':
            return { 
                ...state, 
                uploadedFiles: action.files
            };
        case 'NEXT_STEP':
            return { ...state, currentStep: Math.min(state.currentStep + 1, 3) };
        case 'PREV_STEP':
            return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
        case 'SET_LOADING':
            return { ...state, loading: action.loading };
        case 'SET_ERROR':
            return { ...state, error: action.error };
        case 'SET_MODAL_OPEN':
            return { ...state, modalOpen: action.open };
        case 'SET_SELECTED_APPLICATION':
            return { ...state, selectedApplication: action.app };
        case 'SET_PDF_GENERATED':
            return { ...state, pdfGenerated: action.generated, generatedPDFPath: action.path };
        case 'SET_SIGNED_PDF':
            return { ...state, signedPDF: action.pdf };
        default:
            return state;
    }
};

const NewApplicationPage = () => {
    const { token, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { showSuccessToast, showErrorToast, showInfoToast, showWarningToast } = useNotifications();

    // Get draftId from URL params
    const draftId = searchParams.get('draftId');
    const [companies, setCompanies] = useState([]);
    const [state, dispatch] = useReducer(applicationReducer, {
        ...initialState,
        isPersonal: user?.role === 'Admin' || (user?.role === 'TeamLeader' && user?.parent_user_id === null)
    });

    const isTeamLeaderOrAdmin = user?.role === 'TeamLeader' || user?.role === 'Admin';
    const isTopLevelLeader = isTeamLeaderOrAdmin && user?.parent_user_id === null;
    // Consistent definition: Top-Level Manager includes both Admins and TeamLeaders without parent
    const isTopLevelManager = (user?.role === 'Admin' || user?.role === 'TeamLeader') && user?.parent_user_id === null;

    // Load draft data if draftId is provided
    const loadDraftData = useCallback(async (draftId) => {
        if (!draftId || !token) return;

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(apiUrl(`/api/applications/drafts/${draftId}`), config);
            const draft = response.data;

            // Parse application data
            const applicationData = draft.application_data || {};
            const customerDetails = draft.customer_details || {};

            // Update state with draft data
            dispatch({ type: 'SET_FIELD', field: 'selectedCompanyId', value: applicationData.company_id?.toString() || '' });
            dispatch({ type: 'SET_FIELD', field: 'fieldValues', value: applicationData.field_values || {} });
            dispatch({ type: 'SET_FIELD', field: 'contractEndDate', value: draft.contract_end_date || '' });

            // Set customer details
            dispatch({ type: 'SET_FIELD', field: 'afm', value: customerDetails.afm || '' });
            dispatch({
                type: 'SET_CUSTOMER_DETAILS',
                data: {
                    id: customerDetails.id || null,
                    full_name: customerDetails.full_name || '',
                    phone: customerDetails.phone || '',
                    address: customerDetails.address || '',
                    email: customerDetails.email || '',
                    afm: customerDetails.afm || ''
                }
            });

            // Set customer status based on whether customer exists
            if (customerDetails.id) {
                dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'found' });
            } else if (customerDetails.afm) {
                dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'notFound' });
            }

            showInfoToast('Draft Loaded', 'Τα δεδομένα της προσωρινής αίτησης φορτώθηκαν επιτυχώς');

        } catch (err) {
            console.error('Error loading draft:', err);
            showErrorToast('Σφάλμα', 'Δεν ήταν δυνατή η φόρτωση της προσωρινής αίτησης');
        }
    }, [token]);

    // Load companies and fields on component mount
    useEffect(() => {
        const fetchData = async () => {
            if (!token) return;
            try {
                dispatch({ type: 'SET_LOADING', loading: true });
                const config = { headers: { Authorization: `Bearer ${token}` } };

                // Fetch companies and fields in parallel
                const [companiesRes, fieldsRes] = await Promise.all([
                    axios.get(apiUrl('/api/companies'), config),
                    axios.get(apiUrl('/api/fields'), config)
                ]);

                console.log('[NewApplication] Companies data:', companiesRes.data);
                console.log('[NewApplication] Fields data:', fieldsRes.data);

                // Create a map of fields by ID for easy lookup
                const fieldsMap = new Map();
                fieldsRes.data.forEach(field => {
                    fieldsMap.set(field.id, field);
                });

                // Enhance companies with their fields that have options
                const enhancedCompanies = companiesRes.data.map(company => {
                    // If company already has fields property with array of field objects
                    if (company.fields && Array.isArray(company.fields)) {
                        const enhancedFields = company.fields.map(companyField => {
                            // Find the full field data including options
                            const fullField = fieldsMap.get(companyField.id);
                            if (fullField) {
                                return {
                                    ...companyField,
                                    ...fullField, // This includes the options array
                                    options: fullField.options || []
                                };
                            }
                            return companyField;
                        });

                        return {
                            ...company,
                            fields: enhancedFields
                        };
                    }
                    // If company.fields is just an array of field IDs
                    else if (company.fields && Array.isArray(company.fields)) {
                        const companyFields = company.fields
                            .map(fieldId => fieldsMap.get(fieldId))
                            .filter(Boolean); // Remove any undefined fields

                        return {
                            ...company,
                            fields: companyFields
                        };
                    }

                    return company;
                });

                console.log('[NewApplication] Enhanced companies:', enhancedCompanies);
                setCompanies(enhancedCompanies);

            } catch (error) {
                console.error('[NewApplication] Error fetching data:', error);
                dispatch({ type: 'SET_ERROR', error: 'Αποτυχία φόρτωσης δεδομένων.' });
                showErrorToast('Σφάλμα', 'Αποτυχία φόρτωσης δεδομένων');
            } finally {
                dispatch({ type: 'SET_LOADING', loading: false });
            }
        };
        fetchData();
    }, [token]);

    
    // Debounced AFM check
    const checkAfmWithDelay = useCallback(async (afm) => {
        if (afm.length !== 9) return;
        
        dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'checking' });
        dispatch({ type: 'SET_ERROR', error: '' });
        
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl(`/api/customers/afm/${afm}`), config);
            dispatch({ type: 'SET_CUSTOMER_DETAILS', data: res.data });
            dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'found' });
            showSuccessToast('Πελάτης Βρέθηκε', `Ο πελάτης βρέθηκε! ${res.data.applications_count || 0} προηγούμενες αιτήσεις`);
        } catch (err) {
            if (err.response && err.response.status === 404) {
                dispatch({ 
                    type: 'SET_CUSTOMER_DETAILS', 
                    data: { id: null, afm: afm, full_name: '', phone: '', address: '' }
                });
                dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'notFound' });
                showInfoToast('Πελάτης δεν βρέθηκε', 'Συμπληρώστε τα στοιχεία.');
            } else {
                dispatch({ type: 'SET_ERROR', error: 'Σφάλμα κατά τον έλεγχο ΑΦΜ.' });
                dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'idle' });
                showErrorToast('Σφάλμα', 'Σφάλμα κατά τον έλεγχο ΑΦΜ');
            }
        }
    }, [token]);
    
    // Debounce timer
    useEffect(() => {
        if (state.afm && state.afm.length === 9) {
            const timer = setTimeout(() => {
                checkAfmWithDelay(state.afm);
            }, 500);
            return () => clearTimeout(timer);
        } else if (state.afm.length !== 9 && state.customerStatus !== 'idle') {
            dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'idle' });
            dispatch({ type: 'SET_CUSTOMER_DETAILS', data: { id: null, full_name: '', phone: '', address: '' } });
        }
    }, [state.afm, checkAfmWithDelay]);
    
    // Set default contract end date to one year from now
    useEffect(() => {
        if (!state.contractEndDate) {
            const oneYearFromNow = new Date();
            oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
            const defaultDate = oneYearFromNow.toISOString().split('T')[0];
            dispatch({ type: 'SET_FIELD', field: 'contractEndDate', value: defaultDate });
        }
    }, []);

    const handleAfmCheck = async () => {
        if (!state.afm) return;
        
        dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'checking' });
        dispatch({ type: 'SET_ERROR', error: '' });
        
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const res = await axios.get(apiUrl(`/api/customers/afm/${state.afm}`), config);
            dispatch({ type: 'SET_CUSTOMER_DETAILS', data: res.data });
            dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'found' });
            showSuccessToast('Πελάτης Βρέθηκε', 'Ο πελάτης βρέθηκε επιτυχώς!');
        } catch (err) {
            if (err.response && err.response.status === 404) {
                dispatch({ 
                    type: 'SET_CUSTOMER_DETAILS', 
                    data: { id: null, afm: state.afm, full_name: '', phone: '', address: '' }
                });
                dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'notFound' });
                showInfoToast('Πελάτης δεν βρέθηκε', 'Συμπληρώστε τα στοιχεία.');
            } else {
                dispatch({ type: 'SET_ERROR', error: 'Σφάλμα κατά τον έλεγχο ΑΦΜ.' });
                dispatch({ type: 'SET_CUSTOMER_STATUS', status: 'idle' });
                showErrorToast('Σφάλμα', 'Σφάλμα κατά τον έλεγχο ΑΦΜ');
            }
        }
    };

    const validateStep = (step) => {
        switch (step) {
            case 1:
                if (!state.afm) {
                    showErrorToast('Σφάλμα Επικύρωσης', 'Παρακαλώ εισάγετε ΑΦΜ');
                    return false;
                }
                if (state.customerStatus === 'idle' || state.customerStatus === 'checking') {
                    showErrorToast('Σφάλμα Επικύρωσης', 'Παρακαλώ ελέγξτε πρώτα το ΑΦΜ');
                    return false;
                }
                if (!state.customerDetails.full_name) {
                    showErrorToast('Σφάλμα Επικύρωσης', 'Παρακαλώ εισάγετε ονοματεπώνυμο');
                    return false;
                }
                return true;
            case 2:
                if (!state.selectedCompanyId) {
                    showErrorToast('Σφάλμα Επικύρωσης', 'Παρακαλώ επιλέξτε εταιρεία');
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNextStep = () => {
        if (validateStep(state.currentStep)) {
            dispatch({ type: 'NEXT_STEP' });
        }
    };

    const handlePrevStep = () => {
        dispatch({ type: 'PREV_STEP' });
    };

    const handleFieldChange = (fieldId, value) => {
        dispatch({ type: 'SET_FIELD_VALUE', fieldId, value });
    };

    const handleFileUpload = (fileData) => {
        dispatch({ type: 'ADD_FILE', file: fileData });
        showSuccessToast('Αρχείο', 'Αρχείο ανέβηκε επιτυχώς!');
    };
    
    const handleFilesChange = (files) => {
        dispatch({ type: 'SET_FILES', files });
    };

    const handleFileRemove = (index) => {
        dispatch({ type: 'REMOVE_FILE', index });
        showInfoToast('Αρχείο', 'Αρχείο αφαιρέθηκε');
    };

    const handlePDFGenerate = async (template) => {
        try {
            dispatch({ type: 'SET_LOADING', loading: true });

            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.post(
                apiUrl(`/api/applications/generate-pdf`),
                {
                    templateId: template.id,
                    fieldValues: state.fieldValues,
                    customerDetails: state.customerDetails,
                    companyId: state.selectedCompanyId,
                    contractEndDate: state.contractEndDate
                },
                config
            );

            if (response.data.success) {
                dispatch({
                    type: 'SET_PDF_GENERATED',
                    generated: true,
                    path: response.data.pdfPath
                });

                showSuccessToast('PDF', 'PDF δημιουργήθηκε επιτυχώς!');

                // Auto-download the generated PDF
                if (response.data.downloadUrl) {
                    window.open(apiUrl(response.data.downloadUrl), '_blank');
                }
            }
        } catch (error) {
            console.error('Error generating PDF:', error);
            const errorMessage = error.response?.data?.message || 'Σφάλμα κατά τη δημιουργία του PDF';
            showErrorToast('Σφάλμα', errorMessage);
        } finally {
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    };

    const handleSignedPDFUpload = (data) => {
        if (data.signedPDFRemoved) {
            dispatch({ type: 'SET_SIGNED_PDF', pdf: null });
            showInfoToast('PDF', 'Υπογεγραμμένο PDF αφαιρέθηκε');
        } else {
            dispatch({ type: 'SET_SIGNED_PDF', pdf: data });
            showSuccessToast('PDF', 'Υπογεγραμμένο PDF ανέβηκε επιτυχώς!');
        }
    };

    // Save as draft function (no validation required)
    const saveDraft = async () => {
        dispatch({ type: 'SET_LOADING', loading: true });
        dispatch({ type: 'SET_ERROR', error: '' });

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const draftData = {
                company_id: state.selectedCompanyId ? parseInt(state.selectedCompanyId) : null,
                field_values: state.fieldValues || {},
                contract_end_date: state.contractEndDate || null,
                customerDetails: state.customerDetails || {},
                notes: 'Προσωρινή αποθήκευση από τη φόρμα'
            };

            let response;
            if (draftId) {
                // Update existing draft
                response = await axios.put(apiUrl(`/api/applications/drafts/${draftId}`), draftData, config);
                showSuccessToast('Επιτυχία', 'Η προσωρινή αίτηση ενημερώθηκε επιτυχώς!');
            } else {
                // Create new draft
                response = await axios.post(apiUrl('/api/applications/drafts'), draftData, config);
                showSuccessToast('Επιτυχία', 'Η αίτηση αποθηκεύτηκε προσωρινά!');
            }

            setTimeout(() => {
                navigate('/applications');
            }, 1000);

        } catch (err) {
            console.error('Error saving draft:', err);
            const errorMessage = err.response?.data?.message || 'Σφάλμα κατά την προσωρινή αποθήκευση';
            dispatch({ type: 'SET_ERROR', error: errorMessage });
            showErrorToast('Σφάλμα', errorMessage);
        } finally {
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    };

    const handleSubmit = async () => {
        dispatch({ type: 'SET_LOADING', loading: true });
        dispatch({ type: 'SET_ERROR', error: '' });

        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const applicationData = {
                company_id: parseInt(state.selectedCompanyId),
                field_values: state.fieldValues,
                contract_end_date: state.contractEndDate || null,
                customerDetails: state.customerDetails,
                is_personal: state.isPersonal
            };
            
            // First create the application
            const response = await axios.post(apiUrl('/api/applications'), applicationData, config);
            const applicationId = response.data.applicationId;
            
            // Then upload files if any exist
            if (state.uploadedFiles.length > 0) {
                showInfoToast('Φόρτωση', 'Ανεβάζουν τα αρχεία...');
                let uploadedCount = 0;
                
                for (const fileInfo of state.uploadedFiles) {
                    try {
                        const formData = new FormData();
                        formData.append('file', fileInfo.file);
                        formData.append('category', fileInfo.category || 'document');
                        
                        const fileConfig = {
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'multipart/form-data'
                            }
                        };
                        
                        await axios.post(
                            apiUrl(`/api/attachments/${applicationId}/upload`),
                            formData,
                            fileConfig
                        );
                        uploadedCount++;
                    } catch (uploadError) {
                        console.error(`Failed to upload file ${fileInfo.name}:`, uploadError);
                        // Continue with other files even if one fails
                    }
                }
                
                if (uploadedCount === state.uploadedFiles.length) {
                    showSuccessToast('Επιτυχής Δημιουργία', 'Αίτηση και αρχεία δημιουργήθηκαν επιτυχώς!');
                } else {
                    showWarningToast('Μερική Επιτυχία', `Αίτηση δημιουργήθηκε! ${uploadedCount}/${state.uploadedFiles.length} αρχεία ανέβηκαν.`);
                }
            } else {
                showSuccessToast('Επιτυχής Δημιουργία', 'Αίτηση δημιουργήθηκε επιτυχώς!');
            }
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Αποτυχία δημιουργίας αίτησης.';
            dispatch({ type: 'SET_ERROR', error: errorMessage });
            showErrorToast('Σφάλμα Δημιουργίας', errorMessage);
        } finally {
            dispatch({ type: 'SET_LOADING', loading: false });
        }
    };

    const selectedCompany = companies.find(c => c.id == state.selectedCompanyId);

    // Debug logging for selectedCompany
    useEffect(() => {
        if (selectedCompany) {
            console.log('[NewApplication] Selected company:', selectedCompany);
            console.log('[NewApplication] Selected company fields:', selectedCompany.fields);
            if (selectedCompany.fields) {
                selectedCompany.fields.forEach((field, index) => {
                    console.log(`[NewApplication] Field ${index}:`, field);
                    if (field.type === 'dropdown') {
                        console.log(`[NewApplication] Field ${index} options:`, field.options);
                    }
                });
            }
        }
    }, [selectedCompany]);

    // Load draft data when draftId changes
    useEffect(() => {
        if (draftId && companies.length > 0) {
            loadDraftData(draftId);
        }
    }, [draftId, loadDraftData, companies]);


    return (
        <div className="modern-form-container">

            <div className="form-header">
                <Link to="/dashboard" className="back-link">
                    ← Επιστροφή στο Dashboard
                </Link>
                <h1 className="form-title">{draftId ? 'Επεξεργασία Προσωρινής Αίτησης' : 'Δημιουργία Νέας Αίτησης'}</h1>
                <p className="form-subtitle">
                    {draftId
                        ? 'Επεξεργασία προσωρινά αποθηκευμένης αίτησης'
                        : 'Ακολουθήστε τα βήματα για να ολοκληρώσετε την αίτηση'
                    }
                </p>
                {draftId && (
                    <div className="draft-indicator">
                        💾 Επεξεργασία προσωρινής αίτησης #{draftId}
                    </div>
                )}
            </div>

            <div className="wizard-container">
                <StepIndicator currentStep={state.currentStep} totalSteps={3} />
                <ProgressBar currentStep={state.currentStep} totalSteps={3} />

                <div className="step-content">

                    {/* Step 1: Customer Details */}
                    {state.currentStep === 1 && (
                        <div className="step-panel fade-in">
                            <div className="step-header">
                                <h2>👤 Στοιχεία Πελάτη</h2>
                                <p>Εισάγετε τον ΑΦΜ και τα στοιχεία του πελάτη</p>
                            </div>

                            <div className="form-card">
                                {isTeamLeaderOrAdmin && (
                                    <div className={`personal-toggle ${state.isPersonal ? 'active' : ''}`}>
                                        <div className="toggle-header">
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={state.isPersonal}
                                                    disabled={isTopLevelManager}
                                                    onChange={e => {
                                                        if (!isTopLevelManager) {
                                                            dispatch({ type: 'SET_FIELD', field: 'isPersonal', value: e.target.checked });
                                                        }
                                                    }}
                                                />
                                                <span className={`slider ${isTopLevelManager ? 'disabled' : ''}`}></span>
                                            </label>
                                            <div className="toggle-info">
                                                <h3>{state.isPersonal ? '👤 Προσωπική Αίτηση' : '👥 Αίτηση Συνεργάτη'}</h3>
                                                <p>{isTopLevelManager ?
                                                    '🔒 Υποχρεωτικά προσωπική αίτηση για ανώτερους διαχειριστές/ομαδάρχες' :
                                                    state.isPersonal ?
                                                        '✅ Άμεση καταχώρηση χωρίς έγκριση' :
                                                        '⏳ Αναμονή έγκρισης από ομαδάρχη'
                                                }</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label className="form-label">ΑΦΜ Πελάτη *</label>
                                    <div className="afm-input-container">
                                        <input
                                            type="text"
                                            className="afm-input"
                                            placeholder="123456789"
                                            value={state.afm}
                                            onChange={e => {
                                                const value = e.target.value.replace(/\D/g, '').substring(0, 9);
                                                dispatch({ type: 'SET_FIELD', field: 'afm', value });
                                            }}
                                            maxLength="9"
                                        />
                                        {state.customerStatus === 'checking' && (
                                            <div className="afm-spinner">
                                                <span className="spinner"></span>
                                            </div>
                                        )}
                                    </div>
                                    {state.customerStatus === 'found' && (
                                        <>
                                            <div className="status-message success">
                                                ✅ Ο πελάτης βρέθηκε στο σύστημα!
                                            </div>
                                            {state.customerDetails.applications && state.customerDetails.applications.length > 0 && (
                                                <div className="customer-history">
                                                    <h4 className="history-title">
                                                        📋 {state.customerDetails.applications_count} προηγούμενες αιτήσεις
                                                    </h4>
                                                    <div className="applications-grid">
                                                        {state.customerDetails.applications.slice(0, 3).map(app => (
                                                            <div key={app.id} className="application-card" onClick={() => {
                                                                dispatch({ type: 'SET_SELECTED_APPLICATION', app });
                                                                dispatch({ type: 'SET_MODAL_OPEN', open: true });
                                                            }}>
                                                                <div className="app-header">
                                                                    <span className="app-company">{app.company_name}</span>
                                                                    <span className={`status-badge status-${app.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                                                        {app.status}
                                                                    </span>
                                                                </div>
                                                                <div className="app-details">
                                                                    <span className="app-date">
                                                                        {new Date(app.created_at).toLocaleDateString('el-GR')}
                                                                    </span>
                                                                    <span className="app-associate">{app.associate_name}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {state.customerDetails.applications.length > 3 && (
                                                            <div className="more-apps">
                                                                +{state.customerDetails.applications.length - 3} άλλες
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {state.customerStatus === 'notFound' && (
                                        <div className="status-message info">
                                            ℹ️ Νέος πελάτης - συμπληρώστε τα στοιχεία
                                        </div>
                                    )}
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Ονοματεπώνυμο *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Εισάγετε ονοματεπώνυμο..."
                                            value={state.customerDetails.full_name}
                                            onChange={e => dispatch({
                                                type: 'SET_CUSTOMER_DETAILS',
                                                data: { ...state.customerDetails, full_name: e.target.value }
                                            })}
                                            disabled={state.customerStatus === 'found'}
                                        />
                                    </div>
                                </div>

                                <div className="form-row">
                                    <div className="form-group">
                                        <label className="form-label">Τηλέφωνο</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Εισάγετε τηλέφωνο..."
                                            value={state.customerDetails.phone || ''}
                                            onChange={e => dispatch({
                                                type: 'SET_CUSTOMER_DETAILS',
                                                data: { ...state.customerDetails, phone: e.target.value }
                                            })}
                                            disabled={state.customerStatus === 'found'}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Διεύθυνση</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Εισάγετε διεύθυνση..."
                                            value={state.customerDetails.address || ''}
                                            onChange={e => dispatch({
                                                type: 'SET_CUSTOMER_DETAILS',
                                                data: { ...state.customerDetails, address: e.target.value }
                                            })}
                                            disabled={state.customerStatus === 'found'}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Email</label>
                                        <input
                                            type="email"
                                            className="form-input"
                                            placeholder="Εισάγετε email..."
                                            value={state.customerDetails.email || ''}
                                            onChange={e => dispatch({
                                                type: 'SET_CUSTOMER_DETAILS',
                                                data: { ...state.customerDetails, email: e.target.value }
                                            })}
                                            disabled={state.customerStatus === 'found'}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Application Details */}
                    {state.currentStep === 2 && (
                        <div className="step-panel fade-in">
                            <div className="step-header">
                                <h2>📋 Στοιχεία Αίτησης</h2>
                                <p>Επιλέξτε εταιρεία και συμπληρώστε τα απαραίτητα στοιχεία</p>
                            </div>

                            <div className="form-card">
                                <div className="form-group">
                                    <label className="form-label">Επιλογή Εταιρείας *</label>
                                    <select
                                        className="form-select"
                                        value={state.selectedCompanyId}
                                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'selectedCompanyId', value: e.target.value })}
                                    >
                                        <option value="">-- Διάλεξε εταιρεία --</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="contract-date-group">
                                    <label className="contract-date-label">
                                        📅 Λήξη Συμβολαίου (προεπιλογή: +1 έτος)
                                    </label>
                                    <input
                                        type="date"
                                        className="contract-date-input"
                                        value={state.contractEndDate}
                                        onChange={e => dispatch({ type: 'SET_FIELD', field: 'contractEndDate', value: e.target.value })}
                                    />
                                </div>

                                {selectedCompany && selectedCompany.fields && (
                                    <div className="dynamic-fields">
                                        <h3 className="section-title">Στοιχεία Εταιρείας</h3>
                                        {selectedCompany.fields.map(field => (
                                            <div className="form-group" key={field.id}>
                                                <label className="form-label">
                                                    {field.label}
                                                    {field.required_for_pdf && <span style={{ color: '#e74c3c', marginLeft: '4px' }}>*</span>}
                                                </label>
                                                {field.type === 'checkbox' ? (
                                                    <label className="checkbox-label">
                                                        <input
                                                            type="checkbox"
                                                            onChange={e => handleFieldChange(field.id, e.target.checked)}
                                                        />
                                                        <span className="checkbox-custom"></span>
                                                        {field.label}
                                                    </label>
                                                ) : field.type === 'dropdown' ? (
                                                    <select
                                                        value={state.fieldValues[field.id] || ''}
                                                        onChange={e => handleFieldChange(field.id, e.target.value)}
                                                        className="form-select"
                                                    >
                                                        <option value="">-- Επιλέξτε --</option>
                                                        {field.options && field.options.length > 0 ? (
                                                            field.options
                                                                .filter(option => option.is_active !== false) // Only show active options
                                                                .map(option => (
                                                                    <option key={option.id || option.value} value={option.value}>
                                                                        {option.label}
                                                                    </option>
                                                                ))
                                                        ) : (
                                                            <option value="" disabled>Δεν υπάρχουν επιλογές διαθέσιμες</option>
                                                        )}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={field.type}
                                                        className="form-input"
                                                        placeholder={`Εισάγετε ${field.label.toLowerCase()}...`}
                                                        onChange={e => handleFieldChange(field.id, e.target.value)}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="file-upload-section">
                                    <h3 className="section-title">📎 Επισύναψη Αρχείων</h3>
                                    <p className="section-subtitle">Μπορείτε να ανεβάσετε σχετικά έγγραφα (προαιρετικό)</p>
                                    
                                    <FileUpload
                                        preUploadMode={true}
                                        onFilesChange={handleFilesChange}
                                        disabled={state.loading}
                                    />

                                    {state.uploadedFiles.length > 0 && (
                                        <div className="uploaded-files">
                                            <h4>Ανεβασμένα Αρχεία:</h4>
                                            {state.uploadedFiles.map((file, index) => (
                                                <div key={index} className="file-item">
                                                    <span className="file-name">{file.name}</span>
                                                    <button
                                                        type="button"
                                                        className="btn-remove"
                                                        onClick={() => handleFileRemove(index)}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Preview & Submit */}
                    {state.currentStep === 3 && (
                        <div className="step-panel fade-in">
                            <div className="step-header">
                                <h2>✅ Προεπισκόπηση & Υποβολή</h2>
                                <p>Ελέγξτε τα στοιχεία και υποβάλετε την αίτηση</p>
                            </div>

                            <div className="preview-container">
                                <div className="preview-card">
                                    <h3>👤 Στοιχεία Πελάτη</h3>
                                    <div className="preview-item">
                                        <span className="label">ΑΦΜ:</span>
                                        <span className="value">{state.afm}</span>
                                    </div>
                                    <div className="preview-item">
                                        <span className="label">Ονοματεπώνυμο:</span>
                                        <span className="value">{state.customerDetails.full_name}</span>
                                    </div>
                                    {state.customerDetails.phone && (
                                        <div className="preview-item">
                                            <span className="label">Τηλέφωνο:</span>
                                            <span className="value">{state.customerDetails.phone}</span>
                                        </div>
                                    )}
                                    {state.customerDetails.address && (
                                        <div className="preview-item">
                                            <span className="label">Διεύθυνση:</span>
                                            <span className="value">{state.customerDetails.address}</span>
                                        </div>
                                    )}
                                    {state.customerDetails.email && (
                                        <div className="preview-item">
                                            <span className="label">Email:</span>
                                            <span className="value">{state.customerDetails.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="preview-card">
                                    <h3>🏢 Στοιχεία Αίτησης</h3>
                                    <div className="preview-item">
                                        <span className="label">Εταιρεία:</span>
                                        <span className="value">{selectedCompany?.name}</span>
                                    </div>
                                    {state.contractEndDate && (
                                        <div className="preview-item">
                                            <span className="label">Λήξη Συμβολαίου:</span>
                                            <span className="value">{state.contractEndDate}</span>
                                        </div>
                                    )}
                                    <div className="preview-item">
                                        <span className="label">Τύπος Αίτησης:</span>
                                        <span className={`value badge ${state.isPersonal ? 'badge-success' : 'badge-info'}`}>
                                            {state.isPersonal ? 'Προσωπική' : 'Συνεργάτη'}
                                        </span>
                                    </div>
                                </div>

                                {Object.keys(state.fieldValues).length > 0 && (
                                    <div className="preview-card">
                                        <h3>📋 Δυναμικά Πεδία</h3>
                                        {Object.entries(state.fieldValues).map(([fieldId, value]) => {
                                            const field = selectedCompany?.fields?.find(f => f.id == fieldId);
                                            return (
                                                <div key={fieldId} className="preview-item">
                                                    <span className="label">{field?.label}:</span>
                                                    <span className="value">
                                                        {field?.type === 'checkbox' ? (value ? 'Ναι' : 'Όχι') : value}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {state.uploadedFiles.length > 0 && (
                                    <div className="preview-card">
                                        <h3>📎 Επισυναπτόμενα Αρχεία ({state.uploadedFiles.length})</h3>
                                        {state.uploadedFiles.map((file, index) => (
                                            <div key={index} className="file-preview">
                                                <span className="file-icon">📄</span>
                                                <span className="file-name">{file.name}</span>
                                                <span className="file-size">
                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* PDF Generation and Upload */}
                            {state.currentStep === 3 && (
                                <PDFErrorBoundary fallbackMessage="Σφάλμα στη λειτουργία PDF. Παρακαλώ ανανεώστε τη σελίδα.">
                                    <div className="pdf-section">
                                        <PDFReadinessIndicator
                                        companyId={state.selectedCompanyId}
                                        applicationData={state.fieldValues}
                                        selectedDropdownValues={state.fieldValues}
                                        onPDFGenerate={handlePDFGenerate}
                                        showGenerateButton={true}
                                    />

                                    <SignedPDFUpload
                                        applicationId={null} // Will be set after application is saved
                                        currentSignedPDF={state.signedPDF}
                                        onUploadSuccess={handleSignedPDFUpload}
                                        onUploadError={(error) => showErrorToast('Σφάλμα', error)}
                                        disabled={!state.pdfGenerated}
                                    />
                                    </div>
                                </PDFErrorBoundary>
                            )}
                        </div>
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="step-navigation">
                    {state.currentStep > 1 && (
                        <button
                            type="button"
                            className="btn-outline"
                            onClick={handlePrevStep}
                            disabled={state.loading}
                        >
                            ← Προηγούμενο
                        </button>
                    )}
                    
                    <div className="nav-spacer"></div>
                    
                    {state.currentStep < 3 ? (
                        <button
                            type="button"
                            className="btn-primary"
                            onClick={handleNextStep}
                            disabled={state.loading}
                        >
                            Επόμενο →
                        </button>
                    ) : (
                        <div className="submit-buttons">
                            <button
                                type="button"
                                className="btn-draft"
                                onClick={saveDraft}
                                disabled={state.loading}
                                title="Αποθήκευση προσωρινά χωρίς υποβολή"
                            >
                                {state.loading ? (
                                    <><span className="spinner"></span> Αποθήκευση...</>
                                ) : (
                                    '💾 Προσωρινή Αποθήκευση'
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn-success"
                                onClick={handleSubmit}
                                disabled={state.loading}
                            >
                                {state.loading ? (
                                    <><span className="spinner"></span> Υποβολή...</>
                                ) : (
                                    '🚀 Υποβολή Αίτησης'
                                )}
                            </button>
                        </div>
                    )}
                </div>

                {state.error && (
                    <div className="error-message">
                        ❌ {state.error}
                    </div>
                )}
            </div>

            {/* Application Detail Modal */}
            {state.modalOpen && state.selectedApplication && (
                <div className="modal-overlay" onClick={() => dispatch({ type: 'SET_MODAL_OPEN', open: false })}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>📋 Λεπτομέρειες Αίτησης</h3>
                            <button 
                                className="modal-close"
                                onClick={() => dispatch({ type: 'SET_MODAL_OPEN', open: false })}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-row">
                                <span className="detail-label">Εταιρεία:</span>
                                <span className="detail-value">{state.selectedApplication.company_name}</span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Κατάσταση:</span>
                                <span className={`status-badge status-${state.selectedApplication.status.toLowerCase().replace(/\s+/g, '-')}`}>
                                    {state.selectedApplication.status}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Ημερομηνία Δημιουργίας:</span>
                                <span className="detail-value">
                                    {new Date(state.selectedApplication.created_at).toLocaleDateString('el-GR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </span>
                            </div>
                            <div className="detail-row">
                                <span className="detail-label">Συνεργάτης:</span>
                                <span className="detail-value">{state.selectedApplication.associate_name}</span>
                            </div>
                            {state.selectedApplication.contract_end_date && (
                                <div className="detail-row">
                                    <span className="detail-label">Λήξη Συμβολαίου:</span>
                                    <span className="detail-value">
                                        {new Date(state.selectedApplication.contract_end_date).toLocaleDateString('el-GR')}
                                    </span>
                                </div>
                            )}
                            {(user?.role === 'TeamLeader' || user?.role === 'Admin') && (
                                <>
                                    <div className="detail-row">
                                        <span className="detail-label">Αμοιβή:</span>
                                        <span className="detail-value">{state.selectedApplication.total_commission}€</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Πληρωμή:</span>
                                        <span className={`payment-status ${state.selectedApplication.is_paid_by_company ? 'paid' : 'unpaid'}`}>
                                            {state.selectedApplication.is_paid_by_company ? 'Πληρωμένο' : 'Εκκρεμής'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .modern-form-container {
                    width: 100%;
                    min-height: calc(100vh - 40px);
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    display: flex;
                    flex-direction: column;
                }

                .form-header {
                    text-align: center;
                    padding: 20px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    border-radius: 12px;
                    margin-bottom: 20px;
                }

                .back-link {
                    display: inline-block;
                    color: #6b7280;
                    text-decoration: none;
                    margin-bottom: 20px;
                    transition: color 0.2s;
                }

                .back-link:hover {
                    color: #374151;
                }

                .form-title {
                    font-size: 2.5rem;
                    font-weight: 700;
                    color: #1f2937;
                    margin: 0 0 10px 0;
                }

                .form-subtitle {
                    font-size: 1.1rem;
                    color: #6b7280;
                    margin: 0;
                }

                .wizard-container {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    flex: 1;
                    max-width: 1200px;
                    width: 100%;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    min-height: 600px;
                }

                .step-indicator {
                    display: flex;
                    justify-content: space-between;
                    padding: 30px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    position: relative;
                }

                .step-item {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex: 1;
                    position: relative;
                }

                .step-circle {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                    margin-bottom: 10px;
                    transition: all 0.3s ease;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                }

                .step-circle.active {
                    background: rgba(255, 255, 255, 1);
                    color: #667eea;
                    border-color: white;
                }

                .step-circle.completed {
                    background: #10b981;
                    border-color: #10b981;
                    color: white;
                }

                .step-info {
                    text-align: center;
                }

                .step-number {
                    font-size: 0.75rem;
                    opacity: 0.8;
                    margin-bottom: 4px;
                }

                .step-title {
                    font-size: 0.9rem;
                    font-weight: 600;
                }

                .step-connector {
                    position: absolute;
                    top: 25px;
                    left: 50%;
                    right: -50%;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.3);
                    z-index: 0;
                }

                .step-connector.completed {
                    background: #10b981;
                }

                .progress-bar-container {
                    padding: 20px 30px 0;
                    text-align: center;
                }

                .progress-bar {
                    width: 100%;
                    height: 8px;
                    background: #e5e7eb;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 10px;
                }

                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #10b981 0%, #059669 100%);
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }

                .progress-text {
                    font-size: 0.875rem;
                    color: #6b7280;
                    font-weight: 500;
                }

                .step-content {
                    padding: 30px;
                    flex: 1;
                    overflow-y: auto;
                    min-height: 0;
                    display: flex;
                    flex-direction: column;
                }

                .step-panel {
                    animation: fadeInUp 0.3s ease;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    min-height: 0;
                }

                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .step-header {
                    text-align: center;
                    margin-bottom: 30px;
                }

                .step-header h2 {
                    font-size: 1.8rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 8px 0;
                }

                .step-header p {
                    color: #6b7280;
                    margin: 0;
                }

                .form-card {
                    background: #f9fafb;
                    border-radius: 12px;
                    padding: 30px;
                    border: 1px solid #e5e7eb;
                    flex: 1;
                    overflow-y: auto;
                    min-height: 0;
                }

                .personal-toggle {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 20px;
                    margin-bottom: 25px;
                    border: 2px solid #e5e7eb;
                    transition: all 0.3s ease;
                }

                .personal-toggle.active {
                    border-color: #10b981;
                    background: #ecfdf5;
                }

                .toggle-header {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }

                .toggle-switch {
                    position: relative;
                    width: 60px;
                    height: 30px;
                }

                .toggle-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #cbd5e1;
                    transition: .4s;
                    border-radius: 30px;
                }

                .slider:before {
                    position: absolute;
                    content: "";
                    height: 22px;
                    width: 22px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: .4s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }

                input:checked + .slider {
                    background-color: #10b981;
                }

                input:checked + .slider:before {
                    transform: translateX(30px);
                }

                .slider.disabled {
                    background-color: #e2e8f0 !important;
                    cursor: not-allowed;
                    opacity: 0.7;
                }

                .slider.disabled:before {
                    cursor: not-allowed;
                }

                input:disabled + .slider.disabled {
                    background-color: #10b981;
                    opacity: 0.7;
                }

                input:disabled + .slider.disabled:before {
                    transform: translateX(30px);
                }

                /* Additional styling for top-level managers */
                .slider.disabled {
                    position: relative;
                }

                .slider.disabled:after {
                    content: '🔒';
                    position: absolute;
                    right: -25px;
                    top: 50%;
                    transform: translateY(-50%);
                    font-size: 12px;
                }

                .toggle-info h3 {
                    margin: 0 0 4px 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .toggle-info p {
                    margin: 0;
                    font-size: 0.875rem;
                    color: #6b7280;
                }

                .form-group {
                    margin-bottom: 20px;
                }

                .form-label {
                    display: block;
                    font-weight: 600;
                    color: #374151;
                    margin-bottom: 8px;
                    font-size: 0.9rem;
                }

                .form-input,
                .form-select {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 1rem;
                    transition: all 0.3s ease;
                    background: rgba(255, 255, 255, 0.1);
                    box-sizing: border-box;
                }

                .form-input:focus,
                .form-select:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .input-group {
                    display: flex;
                    gap: 10px;
                }

                .input-group .form-input {
                    flex: 1;
                }

                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }

                .btn-secondary {
                    padding: 12px 20px;
                    background: #6b7280;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    white-space: nowrap;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-secondary:hover:not(:disabled) {
                    background: #4b5563;
                    transform: translateY(-1px);
                }

                .btn-secondary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .status-message {
                    margin-top: 8px;
                    padding: 12px;
                    border-radius: 6px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .status-message.success {
                    background: #dcfce7;
                    color: #166534;
                    border: 1px solid #bbf7d0;
                }

                .status-message.info {
                    background: #dbeafe;
                    color: #1e40af;
                    border: 1px solid #bfdbfe;
                }

                .section-title {
                    font-size: 1.2rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 25px 0 15px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .section-subtitle {
                    color: #6b7280;
                    margin-bottom: 20px;
                    font-size: 0.9rem;
                }

                .file-upload-section {
                    margin-top: 30px;
                    padding-top: 25px;
                    border-top: 1px solid #e5e7eb;
                }

                .uploaded-files {
                    margin-top: 15px;
                }

                .file-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 6px;
                    margin-bottom: 8px;
                    border: 1px solid #e5e7eb;
                }

                .btn-remove {
                    background: #ef4444;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    padding: 4px 8px;
                    cursor: pointer;
                    font-size: 0.75rem;
                }

                .preview-container {
                    display: grid;
                    gap: 20px;
                }

                .preview-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 25px;
                    border: 1px solid #e5e7eb;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
                }

                .preview-card h3 {
                    font-size: 1.3rem;
                    font-weight: 600;
                    color: #1f2937;
                    margin: 0 0 20px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .preview-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid #f3f4f6;
                }

                .preview-item:last-child {
                    border-bottom: none;
                }

                .preview-item .label {
                    font-weight: 500;
                    color: #6b7280;
                }

                .preview-item .value {
                    color: #1f2937;
                    font-weight: 500;
                }

                .badge {
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .badge-success {
                    background: #dcfce7;
                    color: #166534;
                }

                .badge-info {
                    background: #dbeafe;
                    color: #1e40af;
                }

                .file-preview {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 10px 0;
                    border-bottom: 1px solid #f3f4f6;
                }

                .file-preview:last-child {
                    border-bottom: none;
                }

                .file-size {
                    color: #6b7280;
                    font-size: 0.875rem;
                }

                .step-navigation {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 30px;
                    border-top: 1px solid #e5e7eb;
                    background: #f9fafb;
                }

                .nav-spacer {
                    flex: 1;
                }

                .btn-outline {
                    padding: 12px 24px;
                    background: transparent;
                    color: #6b7280;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-outline:hover:not(:disabled) {
                    border-color: #9ca3af;
                    color: #374151;
                    transform: translateY(-1px);
                }

                .btn-primary {
                    padding: 12px 24px;
                    background: #3b82f6;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 500;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-primary:hover:not(:disabled) {
                    background: #2563eb;
                    transform: translateY(-1px);
                }

                .btn-success {
                    padding: 15px 30px;
                    background: #10b981;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 1.1rem;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .btn-success:hover:not(:disabled) {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
                }

                .btn-outline:disabled,
                .btn-primary:disabled,
                .btn-success:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                .spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid transparent;
                    border-top: 2px solid currentColor;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    to { transform: rotate(360deg); }
                }

                .error-message {
                    background: #fee2e2;
                    color: #991b1b;
                    padding: 12px 20px;
                    border-radius: 8px;
                    margin: 20px 30px 0;
                    border: 1px solid #fecaca;
                    font-weight: 500;
                }

                .toast {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    min-width: 300px;
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    z-index: 1000;
                    animation: slideInRight 0.3s ease;
                }

                @keyframes slideInRight {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }

                .toast-success {
                    border-left: 4px solid #10b981;
                }

                .toast-error {
                    border-left: 4px solid #ef4444;
                }

                .toast-info {
                    border-left: 4px solid #3b82f6;
                }

                .toast-content {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px 20px;
                }

                .toast-icon {
                    font-size: 18px;
                }

                .toast-message {
                    flex: 1;
                    font-weight: 500;
                    color: #1f2937;
                }

                .toast-close {
                    background: none;
                    border: none;
                    font-size: 18px;
                    cursor: pointer;
                    color: #9ca3af;
                    padding: 0 4px;
                }

                .toast-close:hover {
                    color: #6b7280;
                }

                .checkbox-label {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    font-weight: normal;
                }

                .checkbox-custom {
                    width: 20px;
                    height: 20px;
                    border: 2px solid #d1d5db;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .checkbox-label input[type="checkbox"] {
                    display: none;
                }

                .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
                    background: #3b82f6;
                    border-color: #3b82f6;
                }

                .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::before {
                    content: "✓";
                    color: white;
                    font-size: 12px;
                    font-weight: bold;
                }

                /* AFM Input Styles */
                .afm-input-container {
                    position: relative;
                    display: flex;
                    align-items: center;
                }

                .afm-input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #e5e7eb;
                    border-radius: 8px;
                    font-size: 1.1rem;
                    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    letter-spacing: 1px;
                    text-align: center;
                    font-weight: 500;
                    color: #1f2937;
                    transition: all 0.3s ease;
                    background: rgba(255, 255, 255, 0.1);
                    box-sizing: border-box;
                }

                .afm-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                }

                .afm-input::placeholder {
                    color: #9ca3af;
                    font-weight: normal;
                    letter-spacing: 1px;
                }

                .afm-spinner {
                    position: absolute;
                    right: 16px;
                    display: flex;
                    align-items: center;
                }

                /* Customer History Styles */
                .customer-history {
                    margin-top: 20px;
                    padding: 20px;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                }

                .history-title {
                    margin: 0 0 15px 0;
                    font-size: 1.1rem;
                    font-weight: 600;
                    color: #334155;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .applications-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 12px;
                }

                .application-card {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 8px;
                    padding: 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }

                .application-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    border-color: #3b82f6;
                }

                .app-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 8px;
                }

                .app-company {
                    font-weight: 600;
                    color: #1f2937;
                    font-size: 0.95rem;
                }

                .app-details {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.85rem;
                    color: #6b7280;
                }

                .app-date {
                    font-weight: 500;
                }

                .app-associate {
                    color: #3b82f6;
                    font-weight: 500;
                }

                .more-apps {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f1f5f9;
                    border: 2px dashed #cbd5e1;
                    border-radius: 8px;
                    padding: 16px;
                    color: #64748b;
                    font-weight: 500;
                    font-size: 0.9rem;
                }

                /* Status Badge Styles */
                .status-badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }

                .status-καταχωρήθηκε { background: #dcfce7; color: #166534; }
                .status-προς-καταχώρηση { background: #fef3c7; color: #92400e; }
                .status-εκκρεμότητα { background: #fecaca; color: #991b1b; }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    padding: 20px;
                }

                .modal-content {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 20px 24px 16px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: #1f2937;
                }

                .modal-close {
                    background: none;
                    border: none;
                    font-size: 24px;
                    cursor: pointer;
                    color: #9ca3af;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .modal-close:hover {
                    background: #f3f4f6;
                    color: #6b7280;
                }

                .modal-body {
                    padding: 20px 24px;
                }

                .detail-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 0;
                    border-bottom: 1px solid #f3f4f6;
                }

                .detail-row:last-child {
                    border-bottom: none;
                }

                .detail-label {
                    font-weight: 500;
                    color: #6b7280;
                    font-size: 0.9rem;
                }

                .detail-value {
                    font-weight: 600;
                    color: #1f2937;
                    text-align: right;
                }

                .payment-status.paid { color: #059669; }
                .payment-status.unpaid { color: #dc2626; }

                /* Contract Date Styles */
                .contract-date-group {
                    background: #f8fafc;
                    border-radius: 8px;
                    padding: 12px;
                    margin: 15px 0;
                    border: 1px solid #e2e8f0;
                }

                .contract-date-label {
                    display: block;
                    font-size: 0.8rem;
                    color: #64748b;
                    margin-bottom: 6px;
                    font-weight: 500;
                }

                .contract-date-input {
                    width: 200px;
                    padding: 8px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 0.9rem;
                    background: rgba(255, 255, 255, 0.1);
                    color: #374151;
                }

                /* Large screens - better spacing */
                @media (min-width: 1200px) {
                    .modern-form-container {
                        padding: 30px;
                    }
                    
                    .wizard-container {
                        max-width: 1400px;
                    }
                    
                    .step-content {
                        padding: 40px;
                    }
                    
                    .form-card {
                        padding: 35px;
                    }
                }

                /* Medium screens */
                @media (max-width: 768px) {
                    .modern-form-container {
                        padding: 10px;
                        min-height: calc(100vh - 20px);
                    }

                    .form-header {
                        padding: 15px;
                        margin-bottom: 15px;
                    }

                    .form-title {
                        font-size: 2rem;
                    }

                    .step-content {
                        padding: 20px;
                    }
                    
                    .wizard-container {
                        min-height: 500px;
                    }

                    .form-row {
                        grid-template-columns: 1fr;
                    }

                    .input-group {
                        flex-direction: column;
                    }

                    .step-navigation {
                        padding: 20px;
                        flex-direction: column;
                        gap: 15px;
                    }

                    .nav-spacer {
                        display: none;
                    }

                    .toast {
                        right: 10px;
                        left: 10px;
                        min-width: auto;
                    }

                    .submit-buttons {
                        display: flex;
                        gap: 15px;
                    }
                }

                /* Draft button styles */
                .submit-buttons {
                    display: flex;
                    gap: 15px;
                    align-items: center;
                }

                .btn-draft {
                    padding: 15px 25px;
                    border: 2px solid #6c757d;
                    background: linear-gradient(135deg, #6c757d, #5a6268);
                    color: white;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    min-width: 200px;
                    justify-content: center;
                    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
                }

                .btn-draft:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(108, 117, 125, 0.4);
                    background: linear-gradient(135deg, #5a6268, #495057);
                }

                .btn-draft:active {
                    transform: translateY(-1px);
                }

                .btn-draft:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                    transform: none;
                }

                @media (max-width: 768px) {
                    .submit-buttons {
                        flex-direction: column;
                        width: 100%;
                    }

                    .btn-draft, .btn-success {
                        width: 100%;
                        min-width: auto;
                    }
                }

                /* Draft indicator styles */
                .draft-indicator {
                    background: linear-gradient(135deg, #6c757d, #5a6268);
                    color: white;
                    padding: 10px 20px;
                    border-radius: 8px;
                    margin-top: 15px;
                    font-weight: 600;
                    font-size: 0.9rem;
                    box-shadow: 0 2px 10px rgba(108, 117, 125, 0.3);
                    display: inline-block;
                }
            `}</style>
        </div>
    );
};

export default NewApplicationPage;