import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';

const PDFReadinessIndicator = ({
    companyId,
    applicationData,
    selectedDropdownValues = {},
    onPDFGenerate,
    showGenerateButton = true
}) => {
    const [pdfStatus, setPdfStatus] = useState({
        isReady: false,
        availableTemplates: [],
        missingFields: [],
        selectedTemplate: null,
        loading: true
    });

    const [generatingPDF, setGeneratingPDF] = useState(false);

    useEffect(() => {
        if (companyId && applicationData) {
            checkPDFReadiness();
        }
    }, [companyId, applicationData, selectedDropdownValues]);

    const checkPDFReadiness = async () => {
        try {
            setPdfStatus(prev => ({ ...prev, loading: true }));
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // First, get available templates for this company
            const templatesResponse = await axios.get(
                apiUrl(`/api/pdf-templates/companies/${companyId}/pdf-templates`),
                config
            );

            const templates = templatesResponse.data.templates || [];

            // Find templates that match current dropdown selections
            const matchingTemplates = templates.filter(template => {
                const fieldValue = selectedDropdownValues[template.field_id] ||
                                 applicationData[template.field_id];
                return fieldValue && fieldValue === template.option_value;
            });

            if (matchingTemplates.length === 0) {
                setPdfStatus({
                    isReady: false,
                    availableTemplates: [],
                    missingFields: [],
                    selectedTemplate: null,
                    loading: false,
                    noMatchingTemplate: true
                });
                return;
            }

            // For now, use the first matching template
            const selectedTemplate = matchingTemplates[0];

            // Check if this template has mappings and if all required fields are filled
            const mappingsResponse = await axios.get(
                apiUrl(`/api/pdf-templates/pdf-templates/${selectedTemplate.id}/mappings`),
                config
            );

            const mappings = mappingsResponse.data.mappings || [];
            const requiredMappings = mappings.filter(m => m.is_required);

            const missingFields = [];
            const availableFields = [];

            for (const mapping of requiredMappings) {
                const fieldValue = applicationData[mapping.target_field_id] || '';
                const isEmpty = !fieldValue || fieldValue.toString().trim() === '';

                if (isEmpty) {
                    missingFields.push({
                        fieldId: mapping.target_field_id,
                        fieldLabel: mapping.field_label || `Field ${mapping.target_field_id}`,
                        placeholder: mapping.placeholder
                    });
                } else {
                    availableFields.push({
                        fieldId: mapping.target_field_id,
                        fieldLabel: mapping.field_label,
                        value: fieldValue
                    });
                }
            }

            setPdfStatus({
                isReady: missingFields.length === 0 && mappings.length > 0,
                availableTemplates: matchingTemplates,
                selectedTemplate: selectedTemplate,
                missingFields: missingFields,
                availableFields: availableFields,
                totalRequired: requiredMappings.length,
                loading: false,
                noMatchingTemplate: false
            });

        } catch (error) {
            console.error('Error checking PDF readiness:', error);
            setPdfStatus({
                isReady: false,
                availableTemplates: [],
                missingFields: [],
                selectedTemplate: null,
                loading: false,
                error: error.response?.data?.message || 'Σφάλμα ελέγχου PDF'
            });
        }
    };

    const handleGeneratePDF = async () => {
        if (!pdfStatus.isReady || !pdfStatus.selectedTemplate) {
            return;
        }

        try {
            setGeneratingPDF(true);

            if (onPDFGenerate) {
                await onPDFGenerate(pdfStatus.selectedTemplate);
            }

        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Σφάλμα κατά τη δημιουργία του PDF');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const getStatusIcon = () => {
        if (pdfStatus.loading) return '⏳';
        if (pdfStatus.error) return '❌';
        if (pdfStatus.noMatchingTemplate) return '📋';
        if (pdfStatus.isReady) return '✅';
        return '⚠️';
    };

    const getStatusColor = () => {
        if (pdfStatus.loading) return '#f39c12';
        if (pdfStatus.error) return '#e74c3c';
        if (pdfStatus.noMatchingTemplate) return '#95a5a6';
        if (pdfStatus.isReady) return '#27ae60';
        return '#f39c12';
    };

    const getStatusText = () => {
        if (pdfStatus.loading) return 'Έλεγχος PDF...';
        if (pdfStatus.error) return `Σφάλμα: ${pdfStatus.error}`;
        if (pdfStatus.noMatchingTemplate) return 'Δεν υπάρχει PDF template για την επιλογή σας';
        if (pdfStatus.isReady) return 'PDF έτοιμο για δημιουργία!';
        return `Λείπουν ${pdfStatus.missingFields.length} απαιτούμενα πεδία`;
    };

    return (
        <div className="pdf-readiness-indicator">
            <style>
                {`
                    .pdf-readiness-indicator {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 12px;
                        padding: 20px;
                        margin: 15px 0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .pdf-status-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 15px;
                    }

                    .pdf-status-info {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .status-icon {
                        font-size: 1.5rem;
                    }

                    .status-text {
                        font-weight: 600;
                        font-size: 1rem;
                    }

                    .pdf-generate-btn {
                        background: linear-gradient(135deg, #8e44ad, #9b59b6);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        padding: 10px 20px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                        font-size: 0.9rem;
                    }

                    .pdf-generate-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 15px rgba(142, 68, 173, 0.3);
                    }

                    .pdf-generate-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .pdf-details {
                        margin-top: 15px;
                    }

                    .template-info {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .template-info h4 {
                        color: white;
                        margin: 0 0 8px 0;
                        font-size: 0.9rem;
                    }

                    .template-details {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.8rem;
                        display: flex;
                        gap: 15px;
                        flex-wrap: wrap;
                    }

                    .missing-fields {
                        margin-top: 10px;
                    }

                    .missing-fields h4 {
                        color: #f39c12;
                        margin: 0 0 10px 0;
                        font-size: 0.9rem;
                    }

                    .missing-field-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 8px;
                    }

                    .missing-field-item {
                        background: rgba(243, 156, 18, 0.1);
                        border: 1px solid rgba(243, 156, 18, 0.3);
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 0.8rem;
                        color: #f39c12;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .available-fields {
                        margin-top: 10px;
                    }

                    .available-fields h4 {
                        color: #27ae60;
                        margin: 0 0 10px 0;
                        font-size: 0.9rem;
                    }

                    .available-field-list {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                        gap: 8px;
                    }

                    .available-field-item {
                        background: rgba(39, 174, 96, 0.1);
                        border: 1px solid rgba(39, 174, 96, 0.3);
                        border-radius: 6px;
                        padding: 8px 12px;
                        font-size: 0.8rem;
                        color: #27ae60;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .progress-bar {
                        width: 100%;
                        height: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 4px;
                        overflow: hidden;
                        margin-top: 10px;
                    }

                    .progress-fill {
                        height: 100%;
                        background: linear-gradient(90deg, #27ae60, #2ecc71);
                        transition: width 0.3s ease;
                        border-radius: 4px;
                    }

                    .progress-text {
                        text-align: center;
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.8rem;
                        margin-top: 8px;
                    }

                    .no-template-message {
                        text-align: center;
                        color: rgba(255, 255, 255, 0.7);
                        font-style: italic;
                        padding: 15px;
                    }

                    @media (max-width: 768px) {
                        .pdf-status-header {
                            flex-direction: column;
                            align-items: flex-start;
                            gap: 10px;
                        }

                        .missing-field-list,
                        .available-field-list {
                            grid-template-columns: 1fr;
                        }
                    }
                `}
            </style>

            <div className="pdf-status-header">
                <div className="pdf-status-info">
                    <span className="status-icon">{getStatusIcon()}</span>
                    <span className="status-text" style={{ color: getStatusColor() }}>
                        {getStatusText()}
                    </span>
                </div>

                {showGenerateButton && pdfStatus.isReady && (
                    <button
                        className="pdf-generate-btn"
                        onClick={handleGeneratePDF}
                        disabled={generatingPDF}
                    >
                        {generatingPDF ? (
                            <>⏳ Δημιουργία...</>
                        ) : (
                            <>📄 Εκτύπωση Συμβολαίου</>
                        )}
                    </button>
                )}
            </div>

            {!pdfStatus.loading && !pdfStatus.error && !pdfStatus.noMatchingTemplate && (
                <div className="pdf-details">
                    {pdfStatus.selectedTemplate && (
                        <div className="template-info">
                            <h4>📋 Template: {pdfStatus.selectedTemplate.template_name}</h4>
                            <div className="template-details">
                                <span>🔗 {pdfStatus.selectedTemplate.option_value}</span>
                                <span>🎯 {pdfStatus.selectedTemplate.placeholders_detected} placeholders</span>
                                <span>📊 {pdfStatus.selectedTemplate.analysis_status}</span>
                            </div>
                        </div>
                    )}

                    {/* Progress Bar */}
                    {pdfStatus.totalRequired > 0 && (
                        <>
                            <div className="progress-bar">
                                <div
                                    className="progress-fill"
                                    style={{
                                        width: `${((pdfStatus.totalRequired - pdfStatus.missingFields.length) / pdfStatus.totalRequired) * 100}%`
                                    }}
                                />
                            </div>
                            <div className="progress-text">
                                {pdfStatus.totalRequired - pdfStatus.missingFields.length} / {pdfStatus.totalRequired} πεδία συμπληρωμένα
                            </div>
                        </>
                    )}

                    {/* Missing Fields */}
                    {pdfStatus.missingFields.length > 0 && (
                        <div className="missing-fields">
                            <h4>⚠️ Απαιτούμενα πεδία που λείπουν:</h4>
                            <div className="missing-field-list">
                                {pdfStatus.missingFields.map((field, index) => (
                                    <div key={index} className="missing-field-item">
                                        <span>❌</span>
                                        <span>{field.fieldLabel}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Available Fields */}
                    {pdfStatus.availableFields && pdfStatus.availableFields.length > 0 && (
                        <div className="available-fields">
                            <h4>✅ Συμπληρωμένα πεδία:</h4>
                            <div className="available-field-list">
                                {pdfStatus.availableFields.map((field, index) => (
                                    <div key={index} className="available-field-item">
                                        <span>✅</span>
                                        <span>{field.fieldLabel}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {pdfStatus.noMatchingTemplate && (
                <div className="no-template-message">
                    Για να δημιουργηθεί PDF, πρέπει να επιλεγεί μια από τις διαθέσιμες επιλογές dropdown
                    που έχουν PDF template ανεβασμένο από τον διαχειριστή.
                </div>
            )}
        </div>
    );
};

export default PDFReadinessIndicator;