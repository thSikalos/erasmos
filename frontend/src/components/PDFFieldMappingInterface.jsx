import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';

const PDFFieldMappingInterface = ({
    templateId,
    analysisResults,
    availableFields,
    onMappingsSaved,
    onClose
}) => {
    const [mappings, setMappings] = useState({});
    const [savingMappings, setSavingMappings] = useState(false);
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverTarget, setDragOverTarget] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);

    useEffect(() => {
        // Initialize mappings from existing ones or analysis suggestions
        initializeMappings();
    }, [analysisResults, templateId]);

    useEffect(() => {
        // Load PDF with authentication
        loadPDF();
        return () => {
            // Cleanup blob URL when component unmounts
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }
        };
    }, [templateId]);

    const initializeMappings = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Try to load existing mappings first
            const existingMappingsResponse = await axios.get(
                apiUrl(`/api/pdf-templates/${templateId}/mappings`),
                config
            );

            const existingMappings = existingMappingsResponse.data.mappings || [];
            const mappingsMap = {};

            // Load existing mappings
            existingMappings.forEach(mapping => {
                mappingsMap[mapping.placeholder] = {
                    targetFieldId: mapping.target_field_id,
                    fieldType: mapping.field_type,
                    isRequired: mapping.is_required,
                    confidence: mapping.confidence_score,
                    coordinates: mapping.coordinates,
                    mappingStatus: mapping.mapping_status
                };
            });

            // For new placeholders without mappings, use AI suggestions
            if (analysisResults?.placeholders) {
                analysisResults.placeholders.forEach(placeholder => {
                    if (!mappingsMap[placeholder.text] && placeholder.recommendedMapping) {
                        const field = availableFields.find(f =>
                            f.id === placeholder.recommendedMapping.fieldId ||
                            f.label.toLowerCase().includes(placeholder.recommendedMapping.fieldName?.toLowerCase())
                        );

                        if (field) {
                            mappingsMap[placeholder.text] = {
                                targetFieldId: field.id,
                                fieldType: field.type,
                                isRequired: true,
                                confidence: placeholder.recommendedMapping.confidence || 0,
                                coordinates: {},
                                mappingStatus: 'suggested'
                            };
                        }
                    }
                });
            }

            setMappings(mappingsMap);

        } catch (error) {
            console.error('Error loading existing mappings:', error);

            // Fallback to AI suggestions only
            if (analysisResults?.placeholders) {
                const mappingsMap = {};

                analysisResults.placeholders.forEach(placeholder => {
                    if (placeholder.recommendedMapping) {
                        const field = availableFields.find(f =>
                            f.label.toLowerCase().includes(placeholder.recommendedMapping.fieldName?.toLowerCase())
                        );

                        if (field) {
                            mappingsMap[placeholder.text] = {
                                targetFieldId: field.id,
                                fieldType: field.type,
                                isRequired: true,
                                confidence: placeholder.recommendedMapping.confidence || 0,
                                coordinates: {},
                                mappingStatus: 'suggested'
                            };
                        }
                    }
                });

                setMappings(mappingsMap);
            }
        }
    };

    const loadPDF = async () => {
        try {
            setPdfLoading(true);
            setPdfError(false);

            const token = localStorage.getItem('token');
            const config = {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            };

            const response = await axios.get(
                apiUrl(`/api/pdf-templates/${templateId}/download`),
                config
            );

            // Create blob URL for the PDF
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            // Cleanup previous blob URL
            if (pdfBlobUrl) {
                URL.revokeObjectURL(pdfBlobUrl);
            }

            setPdfBlobUrl(url);
            setPdfLoading(false);

        } catch (error) {
            console.error('Error loading PDF:', error);
            setPdfError(true);
            setPdfLoading(false);
        }
    };

    const handleDragStart = (e, item, itemType) => {
        setDraggedItem({ ...item, itemType });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', e.target.outerHTML);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnter = (e, targetId) => {
        e.preventDefault();
        setDragOverTarget(targetId);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOverTarget(null);
    };

    const handleDrop = (e, targetPlaceholder) => {
        e.preventDefault();
        setDragOverTarget(null);

        if (!draggedItem || draggedItem.itemType !== 'field') return;

        // Create or update mapping
        setMappings(prev => ({
            ...prev,
            [targetPlaceholder]: {
                targetFieldId: draggedItem.id,
                fieldType: draggedItem.type,
                isRequired: true,
                confidence: 0.8, // Manual mapping gets high confidence
                coordinates: {},
                mappingStatus: 'mapped'
            }
        }));

        setDraggedItem(null);
    };

    const handleRemoveMapping = (placeholder) => {
        setMappings(prev => {
            const updated = { ...prev };
            delete updated[placeholder];
            return updated;
        });
    };

    const handleToggleRequired = (placeholder) => {
        setMappings(prev => ({
            ...prev,
            [placeholder]: {
                ...prev[placeholder],
                isRequired: !prev[placeholder]?.isRequired
            }
        }));
    };

    const handleSaveMappings = async () => {
        try {
            setSavingMappings(true);

            // Validate that we have at least one mapping
            if (Object.keys(mappings).length === 0) {
                alert('Παρακαλώ δημιουργήστε τουλάχιστον ένα mapping πριν αποθηκεύσετε');
                return;
            }

            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Convert mappings to API format
            const mappingsArray = Object.entries(mappings).map(([placeholder, mapping]) => ({
                placeholder: placeholder,
                targetFieldId: mapping.targetFieldId,
                fieldType: mapping.fieldType,
                isRequired: mapping.isRequired,
                confidence: mapping.confidence,
                coordinates: mapping.coordinates
            }));

            await axios.post(
                apiUrl(`/api/pdf-templates/${templateId}/mappings`),
                { mappings: mappingsArray },
                config
            );

            alert(`Mappings αποθηκεύθηκαν επιτυχώς! (${mappingsArray.length} mappings)`);

            if (onMappingsSaved) {
                onMappingsSaved();
            }

        } catch (error) {
            console.error('Error saving mappings:', error);

            let errorMessage = 'Σφάλμα κατά την αποθήκευση των mappings';

            if (error.response?.status === 400) {
                errorMessage = error.response.data?.message || 'Μη έγκυρα δεδομένα mappings';
            } else if (error.response?.status === 401) {
                errorMessage = 'Μη εξουσιοδοτημένη πρόσβαση. Παρακαλώ συνδεθείτε ξανά';
            } else if (error.response?.status >= 500) {
                errorMessage = 'Σφάλμα στον διακομιστή. Παρακαλώ δοκιμάστε ξανά';
            }

            alert(errorMessage);
        } finally {
            setSavingMappings(false);
        }
    };

    const getFieldById = (fieldId) => {
        return availableFields.find(f => f.id === fieldId);
    };

    const getMappingStatusColor = (status) => {
        const colors = {
            'suggested': '#f39c12',
            'mapped': '#27ae60',
            'verified': '#3498db',
            'unmapped': '#95a5a6'
        };
        return colors[status] || colors.unmapped;
    };

    const handleRetryPdf = () => {
        loadPDF();
    };

    const placeholders = analysisResults?.placeholders || [];
    const unmappedPlaceholders = placeholders.filter(p => !mappings[p.text]);
    const mappedPlaceholders = placeholders.filter(p => mappings[p.text]);

    // Construct PDF URL for viewing
    const pdfUrl = apiUrl(`/api/pdf-templates/${templateId}/download`);

    return (
        <div className="pdf-field-mapping-interface">
            <style>
                {`
                    .pdf-field-mapping-interface {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 25px;
                        margin: 20px 0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .mapping-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        padding-bottom: 15px;
                    }

                    .mapping-header h2 {
                        color: white;
                        margin: 0;
                        font-size: 1.5rem;
                    }

                    .header-actions {
                        display: flex;
                        gap: 10px;
                    }

                    .action-btn {
                        padding: 10px 15px;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    }

                    .save-btn {
                        background: linear-gradient(135deg, #27ae60, #229954);
                        color: white;
                    }

                    .save-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(39, 174, 96, 0.3);
                    }

                    .close-btn {
                        background: linear-gradient(135deg, #95a5a6, #7f8c8d);
                        color: white;
                    }

                    .close-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(149, 165, 166, 0.3);
                    }

                    .action-btn:disabled {
                        opacity: 0.6;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .mapping-grid {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr 1fr;
                        gap: 20px;
                        margin-bottom: 25px;
                    }

                    .mapping-column {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        min-height: 400px;
                    }

                    .pdf-viewer-column {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        min-height: 600px;
                        display: flex;
                        flex-direction: column;
                    }

                    .pdf-iframe {
                        flex: 1;
                        border: none;
                        border-radius: 8px;
                        background: white;
                        min-height: 550px;
                    }

                    .pdf-error {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                        color: rgba(255, 255, 255, 0.7);
                        font-style: italic;
                        text-align: center;
                        padding: 40px;
                    }

                    .pdf-loading {
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                        color: rgba(255, 255, 255, 0.7);
                        padding: 40px;
                    }

                    .loading-spinner {
                        width: 30px;
                        height: 30px;
                        border: 3px solid rgba(255, 255, 255, 0.3);
                        border-top: 3px solid white;
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 15px;
                    }

                    .column-header {
                        color: white;
                        font-weight: 600;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        font-size: 1.1rem;
                    }

                    .field-item {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 10px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        cursor: grab;
                        transition: all 0.3s ease;
                        user-select: none;
                    }

                    .field-item:active {
                        cursor: grabbing;
                    }

                    .field-item.dragging {
                        opacity: 0.5;
                        transform: rotate(5deg);
                    }

                    .field-item:hover {
                        background: rgba(255, 255, 255, 0.15);
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
                    }

                    .field-name {
                        color: white;
                        font-weight: 600;
                        margin-bottom: 4px;
                    }

                    .field-type {
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 0.8rem;
                        background: rgba(255, 255, 255, 0.1);
                        padding: 2px 8px;
                        border-radius: 4px;
                        display: inline-block;
                    }

                    .placeholder-item {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 10px;
                        border: 2px dashed rgba(255, 255, 255, 0.3);
                        transition: all 0.3s ease;
                    }

                    .placeholder-item.drag-over {
                        border-color: #3498db;
                        background: rgba(52, 152, 219, 0.2);
                        transform: scale(1.02);
                    }

                    .placeholder-text {
                        color: white;
                        font-weight: 600;
                        font-family: 'Courier New', monospace;
                        margin-bottom: 4px;
                    }

                    .placeholder-confidence {
                        font-size: 0.8rem;
                        color: rgba(255, 255, 255, 0.7);
                    }

                    .mapping-item {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 12px;
                        margin-bottom: 10px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .mapping-pair {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10px;
                    }

                    .mapping-placeholder {
                        font-family: 'Courier New', monospace;
                        color: #f39c12;
                        font-weight: 600;
                    }

                    .mapping-arrow {
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 1.2rem;
                        margin: 0 10px;
                    }

                    .mapping-field {
                        color: #27ae60;
                        font-weight: 600;
                    }

                    .mapping-controls {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        gap: 10px;
                    }

                    .confidence-indicator {
                        font-size: 0.8rem;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-weight: 600;
                    }

                    .confidence-high {
                        background: rgba(39, 174, 96, 0.3);
                        color: #27ae60;
                    }

                    .confidence-medium {
                        background: rgba(243, 156, 18, 0.3);
                        color: #f39c12;
                    }

                    .confidence-low {
                        background: rgba(231, 76, 60, 0.3);
                        color: #e74c3c;
                    }

                    .mapping-controls button {
                        padding: 4px 8px;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        font-weight: 600;
                        transition: all 0.3s ease;
                    }

                    .toggle-required {
                        background: rgba(52, 152, 219, 0.3);
                        color: #3498db;
                    }

                    .toggle-required.required {
                        background: #3498db;
                        color: white;
                    }

                    .remove-mapping {
                        background: rgba(231, 76, 60, 0.3);
                        color: #e74c3c;
                    }

                    .remove-mapping:hover {
                        background: #e74c3c;
                        color: white;
                    }

                    .status-indicator {
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        display: inline-block;
                        margin-right: 8px;
                    }

                    .progress-summary {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        padding: 15px;
                        margin-bottom: 20px;
                        text-align: center;
                        color: white;
                    }

                    .progress-stats {
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        font-size: 1.1rem;
                        font-weight: 600;
                    }

                    .stat-item {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    }

                    @media (max-width: 1400px) {
                        .mapping-grid {
                            grid-template-columns: 1fr 1fr;
                            gap: 15px;
                        }

                        .pdf-viewer-column {
                            grid-column: span 2;
                            min-height: 400px;
                        }
                    }

                    @media (max-width: 1024px) {
                        .mapping-grid {
                            grid-template-columns: 1fr;
                            gap: 15px;
                        }

                        .mapping-column, .pdf-viewer-column {
                            min-height: 300px;
                        }
                    }
                `}
            </style>

            <div className="mapping-header">
                <h2>🎯 Field Mapping Configuration</h2>
                <div className="header-actions">
                    <button
                        className="action-btn save-btn"
                        onClick={handleSaveMappings}
                        disabled={savingMappings}
                    >
                        {savingMappings ? '⏳ Αποθήκευση...' : '💾 Αποθήκευση Mappings'}
                    </button>
                    <button className="action-btn close-btn" onClick={onClose}>
                        ✕ Κλείσιμο
                    </button>
                </div>
            </div>

            <div className="progress-summary">
                <div className="progress-stats">
                    <div className="stat-item">
                        <span>📄 Placeholders:</span>
                        <span>{placeholders.length}</span>
                    </div>
                    <div className="stat-item">
                        <span>✅ Mapped:</span>
                        <span style={{ color: '#27ae60' }}>{mappedPlaceholders.length}</span>
                    </div>
                    <div className="stat-item">
                        <span>❌ Unmapped:</span>
                        <span style={{ color: '#e74c3c' }}>{unmappedPlaceholders.length}</span>
                    </div>
                </div>
            </div>

            <div className="mapping-grid">
                {/* PDF Viewer Column */}
                <div className="pdf-viewer-column">
                    <div className="column-header">
                        📄 PDF Template Preview
                    </div>

                    {pdfLoading && (
                        <div className="pdf-loading">
                            <div className="loading-spinner"></div>
                            <span>Φόρτωση PDF...</span>
                        </div>
                    )}

                    {pdfError && (
                        <div className="pdf-error">
                            <span style={{ fontSize: '2rem', marginBottom: '10px' }}>📄</span>
                            <span>Σφάλμα φόρτωσης PDF</span>
                            <button
                                onClick={handleRetryPdf}
                                style={{
                                    marginTop: '10px',
                                    padding: '8px 16px',
                                    background: 'rgba(52, 152, 219, 0.3)',
                                    color: '#3498db',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer'
                                }}
                            >
                                Δοκιμή ξανά
                            </button>
                        </div>
                    )}

                    {!pdfError && !pdfLoading && pdfBlobUrl && (
                        <iframe
                            className="pdf-iframe"
                            src={`${pdfBlobUrl}#view=FitH`}
                            title="PDF Template"
                        />
                    )}
                </div>

                {/* Available Fields Column */}
                <div className="mapping-column">
                    <div className="column-header">
                        📝 Διαθέσιμα Πεδία ({availableFields.length})
                    </div>

                    {availableFields.map(field => (
                        <div
                            key={field.id}
                            className={`field-item ${draggedItem?.id === field.id ? 'dragging' : ''}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, field, 'field')}
                        >
                            <div className="field-name">{field.label}</div>
                            <span className="field-type">{field.type}</span>
                        </div>
                    ))}
                </div>

                {/* Unmapped Placeholders Column */}
                <div className="mapping-column">
                    <div className="column-header">
                        🔍 PDF Placeholders ({unmappedPlaceholders.length})
                    </div>

                    {unmappedPlaceholders.map(placeholder => (
                        <div
                            key={placeholder.text}
                            className={`placeholder-item ${
                                dragOverTarget === placeholder.text ? 'drag-over' : ''
                            }`}
                            onDragOver={handleDragOver}
                            onDragEnter={(e) => handleDragEnter(e, placeholder.text)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, placeholder.text)}
                        >
                            <div className="placeholder-text">{placeholder.text}</div>
                            <div className="placeholder-confidence">
                                Confidence: {Math.round(placeholder.confidence * 100)}%
                            </div>
                            {placeholder.suggestions && placeholder.suggestions.length > 0 && (
                                <div style={{ fontSize: '0.7rem', marginTop: '5px', color: 'rgba(255,255,255,0.6)' }}>
                                    💡 Suggested: {placeholder.suggestions[0]?.fieldName}
                                </div>
                            )}
                        </div>
                    ))}

                    {unmappedPlaceholders.length === 0 && (
                        <div style={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            textAlign: 'center',
                            padding: '20px',
                            fontStyle: 'italic'
                        }}>
                            🎉 Όλα τα placeholders έχουν αντιστοιχιστεί!
                        </div>
                    )}
                </div>

                {/* Mapped Fields Column */}
                <div className="mapping-column">
                    <div className="column-header">
                        ✅ Mapped Fields ({mappedPlaceholders.length})
                    </div>

                    {mappedPlaceholders.map(placeholder => {
                        const mapping = mappings[placeholder.text];
                        const field = getFieldById(mapping?.targetFieldId);
                        const confidence = mapping?.confidence || 0;

                        let confidenceClass = 'confidence-low';
                        if (confidence > 0.8) confidenceClass = 'confidence-high';
                        else if (confidence > 0.6) confidenceClass = 'confidence-medium';

                        return (
                            <div key={placeholder.text} className="mapping-item">
                                <div className="mapping-pair">
                                    <span className="mapping-placeholder">{placeholder.text}</span>
                                    <span className="mapping-arrow">→</span>
                                    <span className="mapping-field">{field?.label}</span>
                                </div>

                                <div className="mapping-controls">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span
                                            className="status-indicator"
                                            style={{ backgroundColor: getMappingStatusColor(mapping?.mappingStatus) }}
                                        />
                                        <span className={`confidence-indicator ${confidenceClass}`}>
                                            {Math.round(confidence * 100)}%
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '5px' }}>
                                        <button
                                            className={`toggle-required ${mapping?.isRequired ? 'required' : ''}`}
                                            onClick={() => handleToggleRequired(placeholder.text)}
                                            title={mapping?.isRequired ? 'Υποχρεωτικό' : 'Προαιρετικό'}
                                        >
                                            {mapping?.isRequired ? '🔒' : '🔓'}
                                        </button>

                                        <button
                                            className="remove-mapping"
                                            onClick={() => handleRemoveMapping(placeholder.text)}
                                            title="Αφαίρεση mapping"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {mappedPlaceholders.length === 0 && (
                        <div style={{
                            color: 'rgba(255, 255, 255, 0.6)',
                            textAlign: 'center',
                            padding: '20px',
                            fontStyle: 'italic'
                        }}>
                            Σύρετε τα πεδία εδώ για να δημιουργήσετε mappings
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '15px',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
            }}>
                <strong>💡 Οδηγίες:</strong><br />
                • Δείτε το PDF template στην αριστερή στήλη για να κατανοήσετε τη δομή<br />
                • Σύρετε τα πεδία από τη δεύτερη στήλη στα placeholders της τρίτης<br />
                • Χρησιμοποιήστε τα κουμπιά 🔒/🔓 για να ορίσετε υποχρεωτικά πεδία<br />
                • Τα χρώματα δείχνουν την αξιοπιστία της αντιστοίχισης (πράσινο = υψηλή, κίτρινο = μεσαία, κόκκινο = χαμηλή)<br />
                • Αποθηκεύστε τα mappings πριν κλείσετε το παράθυρο
            </div>
        </div>
    );
};

export default PDFFieldMappingInterface;