import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { apiUrl } from '../utils/api';

const SimplePDFViewer = ({
    templateId,
    availableFields,
    onMappingsSaved,
    onClose
}) => {
    const [mappings, setMappings] = useState([]);
    const [selectedField, setSelectedField] = useState(null);
    const [savingMappings, setSavingMappings] = useState(false);
    const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);

    const iframeRef = useRef(null);

    useEffect(() => {
        loadPDF();
        loadExistingMappings();
    }, [templateId]);

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
                apiUrl(`/api/pdf-templates/pdf-templates/${templateId}/download`),
                config
            );

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            setPdfBlobUrl(url);
            setPdfLoading(false);

        } catch (error) {
            console.error('Error loading PDF:', error);
            setPdfError(true);
            setPdfLoading(false);
        }
    };

    const loadExistingMappings = async () => {
        try {
            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const response = await axios.get(
                apiUrl(`/api/pdf-templates/pdf-templates/${templateId}/visual-mappings`),
                config
            );

            setMappings(response.data.mappings || []);
        } catch (error) {
            console.error('Error loading existing visual mappings:', error);
            setMappings([]);
        }
    };

    const handleFieldSelect = (field) => {
        setSelectedField(field);
        console.log(`[SimplePDFViewer] Selected field:`, field);
    };

    const handleOverlayClick = (event) => {
        if (!selectedField) {
            alert('Παρακαλώ επιλέξτε πρώτα ένα πεδίο από τη δεξιά στήλη');
            return;
        }

        // Calculate coordinates relative to the PDF container
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        const newMapping = {
            id: Date.now(),
            fieldId: selectedField.id,
            fieldLabel: selectedField.label,
            fieldType: selectedField.type,
            page: 1, // Default to page 1 for iframe
            position: {
                x: Math.max(0, Math.min(100, x)),
                y: Math.max(0, Math.min(100, y)),
                width: getDefaultWidth(selectedField.type),
                height: getDefaultHeight(selectedField.type)
            },
            isRequired: true
        };

        setMappings(prev => [...prev, newMapping]);

        // Show a temporary indicator where the user clicked
        const indicator = document.createElement('div');
        indicator.style.position = 'absolute';
        indicator.style.left = x + '%';
        indicator.style.top = y + '%';
        indicator.style.width = '20px';
        indicator.style.height = '20px';
        indicator.style.background = '#27ae60';
        indicator.style.borderRadius = '50%';
        indicator.style.transform = 'translate(-50%, -50%)';
        indicator.style.zIndex = '1000';
        indicator.style.animation = 'pulse 1s ease-out';
        indicator.textContent = '✓';
        indicator.style.color = 'white';
        indicator.style.fontSize = '12px';
        indicator.style.display = 'flex';
        indicator.style.alignItems = 'center';
        indicator.style.justifyContent = 'center';
        indicator.style.fontWeight = 'bold';

        event.currentTarget.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);

        console.log(`[SimplePDFViewer] Added mapping for "${selectedField.label}" at ${Math.round(x)}%, ${Math.round(y)}%`);
    };

    const getDefaultWidth = (fieldType) => {
        switch (fieldType) {
            case 'checkbox':
            case 'radio':
                return 3;
            case 'text':
            case 'email':
            case 'number':
                return 20;
            case 'textarea':
                return 40;
            case 'select':
            case 'dropdown':
                return 25;
            default:
                return 15;
        }
    };

    const getDefaultHeight = (fieldType) => {
        switch (fieldType) {
            case 'checkbox':
            case 'radio':
                return 3;
            case 'textarea':
                return 8;
            default:
                return 4;
        }
    };

    const handleRemoveMapping = (mappingId) => {
        setMappings(prev => prev.filter(m => m.id !== mappingId));
    };

    const renderFieldIndicators = () => {
        return mappings.map(mapping => (
            <div
                key={mapping.id}
                className="field-indicator"
                style={{
                    left: `${mapping.position.x}%`,
                    top: `${mapping.position.y}%`,
                    width: `${mapping.position.width}%`,
                    height: `${mapping.position.height}%`,
                }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Αφαίρεση του πεδίου "${mapping.fieldLabel}";`)) {
                        handleRemoveMapping(mapping.id);
                    }
                }}
                title={`${mapping.fieldLabel} (${mapping.fieldType}) - Κλικ για διαγραφή`}
            >
                {mapping.fieldLabel.length > 10 ?
                    mapping.fieldLabel.substring(0, 10) + '...' :
                    mapping.fieldLabel
                }
            </div>
        ));
    };

    const handleSaveMappings = async () => {
        try {
            setSavingMappings(true);

            if (mappings.length === 0) {
                alert('Παρακαλώ δημιουργήστε τουλάχιστον ένα mapping πριν αποθηκεύσετε');
                return;
            }

            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            const mappingsData = mappings.map(mapping => ({
                fieldId: mapping.fieldId,
                fieldType: mapping.fieldType,
                page: mapping.page,
                position: mapping.position,
                isRequired: mapping.isRequired
            }));

            await axios.post(
                apiUrl(`/api/pdf-templates/pdf-templates/${templateId}/visual-mappings`),
                { mappings: mappingsData },
                config
            );

            alert(`Visual mappings αποθηκεύθηκαν επιτυχώς! (${mappingsData.length} mappings)`);

            if (onMappingsSaved) {
                onMappingsSaved();
            }

        } catch (error) {
            console.error('Error saving mappings:', error);
            alert('Σφάλμα κατά την αποθήκευση των mappings');
        } finally {
            setSavingMappings(false);
        }
    };

    if (pdfLoading) {
        return (
            <div className="simple-pdf-viewer">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span>Φόρτωση PDF...</span>
                </div>
            </div>
        );
    }

    if (pdfError || !pdfBlobUrl) {
        return (
            <div className="simple-pdf-viewer">
                <div className="error-container">
                    <span>Σφάλμα φόρτωσης PDF</span>
                    <button onClick={loadPDF}>Δοκιμή ξανά</button>
                </div>
            </div>
        );
    }

    return (
        <div className="simple-pdf-viewer">
            <style>
                {`
                    .simple-pdf-viewer {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 25px;
                        margin: 20px 0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .viewer-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        padding-bottom: 15px;
                    }

                    .viewer-header h2 {
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

                    .viewer-content {
                        display: grid;
                        grid-template-columns: 1fr 300px;
                        gap: 20px;
                        min-height: 600px;
                    }

                    .pdf-section {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .pdf-container {
                        position: relative;
                        width: 100%;
                        height: 600px;
                        border-radius: 8px;
                        overflow: hidden;
                    }

                    .pdf-iframe {
                        width: 100%;
                        height: 100%;
                        border: none;
                        background: white;
                        pointer-events: none; /* Disable iframe interactions */
                    }

                    .pdf-overlay {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        cursor: ${selectedField ? 'crosshair' : 'default'};
                        z-index: 10;
                        background: ${selectedField ? 'rgba(52, 152, 219, 0.1)' : 'transparent'};
                    }

                    .field-indicator {
                        position: absolute;
                        border: 2px solid #3498db;
                        background: rgba(52, 152, 219, 0.2);
                        border-radius: 4px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 10px;
                        font-weight: bold;
                        color: #2980b9;
                        cursor: pointer;
                        z-index: 15;
                        transition: all 0.3s ease;
                    }

                    .field-indicator:hover {
                        background: rgba(231, 76, 60, 0.3);
                        border-color: #e74c3c;
                        color: #e74c3c;
                        transform: scale(1.1);
                    }

                    @keyframes pulse {
                        0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                        50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    }

                    .fields-section {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                    }

                    .section-header {
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
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        cursor: pointer;
                        transition: all 0.3s ease;
                        user-select: none;
                    }

                    .field-item.selected {
                        background: rgba(52, 152, 219, 0.3);
                        border-color: #3498db;
                        transform: scale(1.02);
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

                    .mappings-list {
                        margin-top: 20px;
                    }

                    .mapping-item {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 10px;
                        margin-bottom: 8px;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .mapping-info {
                        color: white;
                        font-size: 0.9rem;
                    }

                    .mapping-field {
                        font-weight: 600;
                        color: #3498db;
                    }

                    .mapping-position {
                        color: rgba(255, 255, 255, 0.7);
                        font-size: 0.8rem;
                    }

                    .remove-mapping-btn {
                        background: rgba(231, 76, 60, 0.3);
                        color: #e74c3c;
                        border: none;
                        border-radius: 4px;
                        padding: 4px 8px;
                        cursor: pointer;
                        font-size: 0.8rem;
                        font-weight: 600;
                    }

                    .remove-mapping-btn:hover {
                        background: #e74c3c;
                        color: white;
                    }

                    .instructions {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        padding: 15px;
                        margin-top: 20px;
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.9rem;
                        line-height: 1.5;
                    }

                    .loading-container, .error-container {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        min-height: 400px;
                        color: white;
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

                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }

                    @media (max-width: 1200px) {
                        .viewer-content {
                            grid-template-columns: 1fr;
                            gap: 15px;
                        }

                        .fields-section {
                            order: -1;
                        }
                    }
                `}
            </style>

            <div className="viewer-header">
                <h2>🎯 Simple PDF Field Mapping</h2>
                <div className="header-actions">
                    <button
                        className="action-btn save-btn"
                        onClick={handleSaveMappings}
                        disabled={savingMappings || mappings.length === 0}
                    >
                        {savingMappings ? '⏳ Αποθήκευση...' : '💾 Αποθήκευση Mappings'}
                    </button>
                    <button className="action-btn close-btn" onClick={onClose}>
                        ✕ Κλείσιμο
                    </button>
                </div>
            </div>

            <div className="viewer-content">
                <div className="pdf-section">
                    <div className="section-header">
                        📄 PDF Template
                        {selectedField && (
                            <span style={{ color: '#3498db', marginLeft: '10px' }}>
                                (Κλικ για τοποθέτηση: {selectedField.label})
                            </span>
                        )}
                    </div>

                    <div className="pdf-container">
                        <iframe
                            ref={iframeRef}
                            className="pdf-iframe"
                            src={`${pdfBlobUrl}#view=FitH`}
                            title="PDF Template"
                        />
                        <div
                            className="pdf-overlay"
                            onClick={handleOverlayClick}
                        />
                        {renderFieldIndicators()}
                    </div>
                </div>

                <div className="fields-section">
                    <div className="section-header">
                        📝 Διαθέσιμα Πεδία ({availableFields.length})
                    </div>

                    {selectedField && (
                        <div style={{
                            background: 'rgba(52, 152, 219, 0.2)',
                            border: '1px solid #3498db',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '15px',
                            color: 'white',
                            fontSize: '0.9rem'
                        }}>
                            <strong>Επιλεγμένο:</strong> {selectedField.label}<br />
                            <small>Κάνε κλικ στο PDF για τοποθέτηση</small>
                        </div>
                    )}

                    {availableFields.map(field => (
                        <div
                            key={field.id}
                            className={`field-item ${selectedField?.id === field.id ? 'selected' : ''}`}
                            onClick={() => handleFieldSelect(field)}
                        >
                            <div className="field-name">{field.label}</div>
                            <span className="field-type">{field.type}</span>
                        </div>
                    ))}

                    <div className="mappings-list">
                        <div className="section-header">
                            ✅ Mappings ({mappings.length})
                        </div>

                        {mappings.map(mapping => (
                            <div key={mapping.id} className="mapping-item">
                                <div className="mapping-info">
                                    <div className="mapping-field">{mapping.fieldLabel}</div>
                                    <div className="mapping-position">
                                        ({Math.round(mapping.position.x)}%, {Math.round(mapping.position.y)}%)
                                    </div>
                                </div>
                                <button
                                    className="remove-mapping-btn"
                                    onClick={() => handleRemoveMapping(mapping.id)}
                                    title="Αφαίρεση mapping"
                                >
                                    🗑️
                                </button>
                            </div>
                        ))}

                        {mappings.length === 0 && (
                            <div style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                textAlign: 'center',
                                padding: '20px',
                                fontStyle: 'italic'
                            }}>
                                Δεν υπάρχουν mappings ακόμη
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="instructions">
                <strong>💡 Οδηγίες:</strong><br />
                • Επίλεξε ένα πεδίο από τη δεξιά στήλη (θα γίνει μπλε)<br />
                • Κάνε κλικ στο PDF iframe στο σημείο που θέλεις να τοποθετηθεί το πεδίο<br />
                • Μπορείς να τοποθετήσεις το ίδιο πεδίο σε πολλά σημεία<br />
                • Κάνε κλικ στο 🗑️ για να αφαιρέσεις ένα mapping<br />
                • <strong>Σημείωση:</strong> Οι συντεταγμένες είναι προσεγγιστικές με το iframe
            </div>
        </div>
    );
};

export default SimplePDFViewer;