import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PDFFieldMappingInterface from './PDFFieldMappingInterface';
import VisualPDFMapper from './VisualPDFMapper';
import SimplePDFViewer from './SimplePDFViewer';
import { apiUrl } from '../utils/api';

const PDFTemplateManager = ({ company, onClose }) => {
    const [templates, setTemplates] = useState([]);
    const [dropdownFields, setDropdownFields] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadingTemplate, setUploadingTemplate] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    // Form states
    const [selectedFieldId, setSelectedFieldId] = useState('');
    const [selectedFieldOptionId, setSelectedFieldOptionId] = useState('');
    const [templateName, setTemplateName] = useState('');
    const [pdfFile, setPdfFile] = useState(null);

    // Get available options for selected field
    const getAvailableOptions = () => {
        if (!selectedFieldId) return [];
        const selectedField = dropdownFields.find(field => field.id === parseInt(selectedFieldId));
        return selectedField?.options || [];
    };

    // Handle field selection change
    const handleFieldChange = (e) => {
        setSelectedFieldId(e.target.value);
        setSelectedFieldOptionId(''); // Reset option selection when field changes
    };

    // Analysis states
    const [analyzingTemplate, setAnalyzingTemplate] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);

    // Mapping Interface states
    const [showMappingInterface, setShowMappingInterface] = useState(false);
    const [currentTemplateForMapping, setCurrentTemplateForMapping] = useState(null);
    const [mappingInterfaceData, setMappingInterfaceData] = useState(null);

    useEffect(() => {
        if (company?.id) {
            loadTemplates();
            loadDropdownFields();
        }
    }, [company]);

    const loadTemplates = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(
                apiUrl(`/api/pdf-templates/companies/${company.id}/pdf-templates`),
                config
            );

            setTemplates(response.data.templates || []);
        } catch (error) {
            console.error('Error loading templates:', error);
            alert('Σφάλμα φόρτωσης templates');
        } finally {
            setLoading(false);
        }
    };

    const loadDropdownFields = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Load all fields for this company and filter for dropdown/select types
            const fieldsResponse = await axios.get(apiUrl('/api/fields'), config);
            const allFields = fieldsResponse.data;

            console.log('[PDFTemplateManager] All fields from API:', allFields);
            console.log('[PDFTemplateManager] Company object:', company);
            console.log('[PDFTemplateManager] Company fields:', company.fields);

            if (!company.fields || company.fields.length === 0) {
                console.log('[PDFTemplateManager] No fields assigned to this company');
                setDropdownFields([]);
                return;
            }

            // Filter for company fields that are dropdown types
            const companyFields = allFields.filter(field => {
                const isCompanyField = company.fields?.some(cf => cf.id === field.id);
                const isDropdownType = (field.type === 'select' || field.type === 'dropdown');

                console.log(`[PDFTemplateManager] Field ${field.id} (${field.label}):`, {
                    type: field.type,
                    isCompanyField,
                    isDropdownType,
                    included: isCompanyField && isDropdownType,
                    hasOptions: field.options ? field.options.length : 0
                });

                return isCompanyField && isDropdownType;
            });

            console.log('[PDFTemplateManager] Filtered dropdown fields:', companyFields);

            if (companyFields.length === 0) {
                console.log('[PDFTemplateManager] No dropdown fields found for this company');
            }

            setDropdownFields(companyFields);
        } catch (error) {
            console.error('Error loading dropdown fields:', error);
            alert('Σφάλμα κατά τη φόρτωση των dropdown πεδίων');
            setDropdownFields([]);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            if (!templateName) {
                setTemplateName(file.name.replace('.pdf', ''));
            }
        } else {
            alert('Παρακαλώ επιλέξτε αρχείο PDF');
            e.target.value = '';
        }
    };

    const handleUploadTemplate = async () => {
        if (!selectedFieldOptionId || !templateName || !pdfFile) {
            alert('Παρακαλώ συμπληρώστε όλα τα πεδία');
            return;
        }

        // Validate file type
        if (pdfFile.type !== 'application/pdf') {
            alert('Παρακαλώ επιλέξτε έγκυρο αρχείο PDF');
            return;
        }

        // Validate file size (10MB limit)
        if (pdfFile.size > 10 * 1024 * 1024) {
            alert('Το αρχείο είναι πολύ μεγάλο. Το μέγιστο μέγεθος είναι 10MB');
            return;
        }

        try {
            setUploadingTemplate(true);
            const token = localStorage.getItem('token');

            const formData = new FormData();
            formData.append('pdf', pdfFile);
            formData.append('fieldOptionId', selectedFieldOptionId);
            formData.append('templateName', templateName);

            console.log('[PDFTemplateManager] Uploading with fieldOptionId:', selectedFieldOptionId);

            const response = await axios.post(
                apiUrl('/api/pdf-templates/upload'),
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            if (response.data.success) {
                alert('PDF Template ανέβηκε επιτυχώς! Γίνεται ανάλυση...');

                // Reset form
                setSelectedFieldId('');
                setSelectedFieldOptionId('');
                setTemplateName('');
                setPdfFile(null);

                // Reset file input
                const fileInput = document.getElementById('pdfFileInput');
                if (fileInput) fileInput.value = '';

                // Reload templates
                loadTemplates();
            }
        } catch (error) {
            console.error('Error uploading template:', error);

            let errorMessage = 'Σφάλμα κατά το ανέβασμα';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Μη έγκυρα δεδομένα';
            } else if (error.response?.status === 413) {
                errorMessage = 'Το αρχείο είναι πολύ μεγάλο';
            } else if (error.response?.status === 401) {
                errorMessage = 'Μη εξουσιοδοτημένη πρόσβαση. Παρακαλώ συνδεθείτε ξανά';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Σφάλμα στον διακομιστή. Παρακαλώ δοκιμάστε ξανά';
            } else if (error.request) {
                errorMessage = 'Πρόβλημα δικτύου. Ελέγξτε τη σύνδεσή σας';
            }

            alert(`Σφάλμα: ${errorMessage}`);
        } finally {
            setUploadingTemplate(false);
        }
    };

    const handleAnalyzeTemplate = async (templateId) => {
        try {
            setAnalyzingTemplate(templateId);
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Get all company fields for mapping
            const fieldsResponse = await axios.get(apiUrl('/api/fields'), config);
            const allFields = fieldsResponse.data;

            // Filter for company fields
            const companyFields = allFields.filter(field => {
                return company.fields?.some(cf => cf.id === field.id);
            });

            console.log('[PDFTemplateManager] Company fields for visual mapping:', companyFields);

            // Set up data for visual mapping interface
            setCurrentTemplateForMapping(templateId);
            setMappingInterfaceData({
                templateId: templateId,
                availableFields: companyFields
            });

            // Show visual mapping interface
            setShowMappingInterface(true);

        } catch (error) {
            console.error('Error setting up visual mapping:', error);
            alert('Σφάλμα κατά την προετοιμασία του visual mapping');
        } finally {
            setAnalyzingTemplate(null);
        }
    };

    const handleDeleteTemplate = async (templateId) => {
        if (!window.confirm('Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το template;')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            await axios.delete(
                apiUrl(`/api/pdf-templates/pdf-templates/${templateId}`),
                config
            );

            alert('Template διαγράφηκε επιτυχώς');
            loadTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            alert('Σφάλμα κατά τη διαγραφή');
        }
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            'pending': { color: '#f39c12', text: 'Ανάλυση σε εξέλιξη' },
            'analyzed': { color: '#27ae60', text: 'Αναλύθηκε' },
            'mapped': { color: '#3498db', text: 'Έτοιμο' },
            'failed': { color: '#e74c3c', text: 'Αποτυχία' }
        };

        const config = statusConfig[status] || statusConfig['pending'];

        return (
            <span style={{
                background: config.color,
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 'bold'
            }}>
                {config.text}
            </span>
        );
    };

    const handleMappingsSaved = () => {
        // Reload templates to update status
        loadTemplates();

        // Close mapping interface
        setShowMappingInterface(false);
        setCurrentTemplateForMapping(null);
        setMappingInterfaceData(null);
    };

    const handleCloseMappingInterface = () => {
        setShowMappingInterface(false);
        setCurrentTemplateForMapping(null);
        setMappingInterfaceData(null);
    };

    if (loading) {
        return (
            <div className="pdf-template-manager">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Φόρτωση templates...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="pdf-template-manager">
            <style>
                {`
                    .pdf-template-manager {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 25px;
                        margin: 20px 0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .template-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        padding-bottom: 15px;
                    }

                    .template-header h2 {
                        color: white;
                        margin: 0;
                        font-size: 1.5rem;
                    }

                    .close-btn {
                        background: linear-gradient(135deg, #e74c3c, #c0392b);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 10px 15px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    }

                    .close-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
                    }

                    .upload-form {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 25px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .upload-form h3 {
                        color: white;
                        margin: 0 0 20px 0;
                        font-size: 1.2rem;
                    }

                    .form-row {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 15px;
                        margin-bottom: 15px;
                    }

                    .form-group {
                        display: flex;
                        flex-direction: column;
                    }

                    .form-group label {
                        color: white;
                        font-weight: 600;
                        margin-bottom: 8px;
                        font-size: 0.9rem;
                    }

                    .form-group input,
                    .form-group select {
                        padding: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 1rem;
                        backdrop-filter: blur(10px);
                    }

                    .form-group input::placeholder {
                        color: rgba(255, 255, 255, 0.6);
                    }

                    .form-group input:focus,
                    .form-group select:focus {
                        outline: none;
                        border-color: rgba(52, 152, 219, 0.7);
                        box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
                        background: rgba(255, 255, 255, 0.15);
                    }

                    .form-group select:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        background: rgba(255, 255, 255, 0.05);
                    }

                    .file-input-wrapper {
                        position: relative;
                        overflow: hidden;
                        display: inline-block;
                        width: 100%;
                    }

                    .file-input {
                        position: absolute;
                        left: -9999px;
                    }

                    .file-input-label {
                        display: block;
                        padding: 12px;
                        border: 2px dashed rgba(255, 255, 255, 0.3);
                        border-radius: 8px;
                        background: rgba(255, 255, 255, 0.05);
                        color: white;
                        text-align: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }

                    .file-input-label:hover {
                        border-color: rgba(52, 152, 219, 0.7);
                        background: rgba(255, 255, 255, 0.1);
                    }

                    .upload-btn {
                        background: linear-gradient(135deg, #27ae60, #229954);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 12px 20px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        width: 100%;
                        margin-top: 15px;
                    }

                    .upload-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
                    }

                    .upload-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .templates-list {
                        margin-top: 25px;
                    }

                    .templates-list h3 {
                        color: white;
                        margin-bottom: 15px;
                        font-size: 1.2rem;
                    }

                    .template-item {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 10px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .template-info {
                        flex: 1;
                    }

                    .template-title {
                        color: white;
                        font-weight: 600;
                        margin-bottom: 5px;
                    }

                    .template-details {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.9rem;
                        display: flex;
                        gap: 15px;
                        align-items: center;
                        flex-wrap: wrap;
                    }

                    .template-actions {
                        display: flex;
                        gap: 10px;
                    }

                    .action-btn {
                        padding: 8px 12px;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.8rem;
                        transition: all 0.3s ease;
                    }

                    .analyze-btn {
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                    }

                    .analyze-btn:hover:not(:disabled) {
                        transform: translateY(-1px);
                        box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
                    }

                    .delete-btn {
                        background: linear-gradient(135deg, #e74c3c, #c0392b);
                        color: white;
                    }

                    .delete-btn:hover {
                        transform: translateY(-1px);
                        box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
                    }

                    .action-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .no-templates {
                        text-align: center;
                        color: rgba(255, 255, 255, 0.7);
                        padding: 30px;
                        font-style: italic;
                    }

                    .loading-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 200px;
                        color: white;
                    }

                    .spinner {
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

                    @media (max-width: 768px) {
                        .form-row {
                            grid-template-columns: 1fr;
                        }

                        .template-item {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 15px;
                        }

                        .template-actions {
                            width: 100%;
                            justify-content: center;
                        }
                    }
                `}
            </style>

            <div className="template-header">
                <h2>📄 PDF Templates - {company.name}</h2>
                <button className="close-btn" onClick={onClose}>
                    ✕ Κλείσιμο
                </button>
            </div>

            <div className="upload-form">
                <h3>➕ Ανέβασμα Νέου Template</h3>

                {dropdownFields.length === 0 ? (
                    <div style={{
                        background: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '8px',
                        padding: '15px',
                        color: 'rgba(255, 193, 7, 0.9)',
                        textAlign: 'center',
                        marginBottom: '20px'
                    }}>
                        ⚠️ Δεν υπάρχουν dropdown πεδία για αυτήν την εταιρία. <br/>
                        Παρακαλώ προσθέστε dropdown πεδία στην εταιρία πρώτα από τη διαχείριση πεδίων.
                    </div>
                ) : (
                    <>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Dropdown Πεδίο:</label>
                                <select
                                    value={selectedFieldId}
                                    onChange={handleFieldChange}
                                >
                                    <option value="">-- Επιλέξτε πεδίο --</option>
                                    {dropdownFields.map(field => (
                                        <option key={field.id} value={field.id}>
                                            {field.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Επιλογή:</label>
                                <select
                                    value={selectedFieldOptionId}
                                    onChange={(e) => setSelectedFieldOptionId(e.target.value)}
                                    disabled={!selectedFieldId}
                                >
                                    <option value="">-- Επιλέξτε επιλογή --</option>
                                    {getAvailableOptions().map(option => (
                                        <option key={option.id} value={option.id}>
                                            {option.label} ({option.value})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Όνομα Template:</label>
                                <input
                                    type="text"
                                    value={templateName}
                                    onChange={(e) => setTemplateName(e.target.value)}
                                    placeholder="π.χ. Συμβόλαιο Σταθερού Προγράμματος"
                                />
                            </div>

                            <div className="form-group">
                                <label>PDF Αρχείο:</label>
                                <div className="file-input-wrapper">
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={handleFileChange}
                                        className="file-input"
                                        id="pdfFileInput"
                                    />
                                    <label htmlFor="pdfFileInput" className="file-input-label">
                                        {pdfFile ? `📄 ${pdfFile.name}` : '📤 Επιλέξτε PDF αρχείο'}
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            className="upload-btn"
                            onClick={handleUploadTemplate}
                            disabled={uploadingTemplate || dropdownFields.length === 0}
                        >
                            {uploadingTemplate ? (
                                <>⏳ Ανέβασμα...</>
                            ) : (
                                <>🚀 Ανέβασμα Template</>
                            )}
                        </button>
                    </>
                )}
            </div>

            <div className="templates-list">
                <h3>📋 Υπάρχοντα Templates ({templates.length})</h3>

                {templates.length === 0 ? (
                    <div className="no-templates">
                        Δεν υπάρχουν templates για αυτήν την εταιρία
                    </div>
                ) : (
                    templates.map(template => (
                        <div key={template.id} className="template-item">
                            <div className="template-info">
                                <div className="template-title">
                                    {template.template_name}
                                </div>
                                <div className="template-details">
                                    <span>📋 {template.field_label}</span>
                                    <span>🔗 {template.option_value}</span>
                                    <span>{getStatusBadge(template.analysis_status)}</span>
                                    {template.placeholders_detected > 0 && (
                                        <span>🔍 {template.placeholders_detected} placeholders</span>
                                    )}
                                </div>
                            </div>

                            <div className="template-actions">
                                <button
                                    className="action-btn analyze-btn"
                                    onClick={() => handleAnalyzeTemplate(template.id)}
                                    disabled={analyzingTemplate === template.id}
                                >
                                    {analyzingTemplate === template.id ? (
                                        <>⏳ Ανάλυση...</>
                                    ) : (
                                        <>🎯 Visual Mapping</>
                                    )}
                                </button>

                                <button
                                    className="action-btn delete-btn"
                                    onClick={() => handleDeleteTemplate(template.id)}
                                >
                                    🗑️ Διαγραφή
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Visual PDF Mapping Interface */}
            {showMappingInterface && mappingInterfaceData && (
                <VisualPDFMapper
                    templateId={mappingInterfaceData.templateId}
                    availableFields={mappingInterfaceData.availableFields}
                    onMappingsSaved={handleMappingsSaved}
                    onClose={handleCloseMappingInterface}
                />
            )}
        </div>
    );
};

export default PDFTemplateManager;