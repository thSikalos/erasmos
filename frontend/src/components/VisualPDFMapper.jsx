import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { apiUrl } from '../utils/api';

// Set up PDF.js worker - use bundled version to avoid CSP issues
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

const VisualPDFMapper = ({
    templateId,
    availableFields,
    onMappingsSaved,
    onClose
}) => {
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedField, setSelectedField] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);
    const [savingMappings, setSavingMappings] = useState(false);
    const [scale, setScale] = useState(1.0);

    const pageRef = useRef(null);

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
            setPdfBlob(blob);
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
            // Fallback to empty mappings if endpoint doesn't exist yet
            setMappings([]);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
        console.log(`[VisualPDFMapper] PDF loaded with ${numPages} pages`);
    };

    const onDocumentLoadError = (error) => {
        console.error('Error loading PDF document:', error);
        setPdfError(true);
    };

    const handleFieldSelect = (field) => {
        setSelectedField(field);
        console.log(`[VisualPDFMapper] Selected field:`, field);
    };

    const handlePageClick = (event) => {
        if (!selectedField || !pageRef.current) return;

        const pageElement = pageRef.current.querySelector('.react-pdf__Page__canvas');
        if (!pageElement) return;

        const rect = pageElement.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100; // Percentage from left
        const y = ((event.clientY - rect.top) / rect.height) * 100; // Percentage from top

        const newMapping = {
            id: Date.now(), // Temporary ID
            fieldId: selectedField.id,
            fieldLabel: selectedField.label,
            fieldType: selectedField.type,
            page: currentPage,
            position: {
                x: x,
                y: y,
                width: getDefaultWidth(selectedField.type),
                height: getDefaultHeight(selectedField.type)
            },
            isRequired: true
        };

        setMappings(prev => [...prev, newMapping]);
        console.log(`[VisualPDFMapper] Added mapping:`, newMapping);
    };

    const getDefaultWidth = (fieldType) => {
        switch (fieldType) {
            case 'checkbox':
            case 'radio':
                return 3; // Small width for checkboxes
            case 'text':
            case 'email':
            case 'number':
                return 20; // Medium width for text fields
            case 'textarea':
                return 40; // Large width for text areas
            case 'select':
            case 'dropdown':
                return 25; // Medium-large for dropdowns
            default:
                return 15;
        }
    };

    const getDefaultHeight = (fieldType) => {
        switch (fieldType) {
            case 'checkbox':
            case 'radio':
                return 3; // Small height for checkboxes
            case 'textarea':
                return 8; // Large height for text areas
            default:
                return 4; // Standard height
        }
    };

    const handleRemoveMapping = (mappingId) => {
        setMappings(prev => prev.filter(m => m.id !== mappingId));
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

            // Convert mappings to API format
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

    const renderFieldIndicators = () => {
        return mappings
            .filter(mapping => mapping.page === currentPage)
            .map(mapping => (
                <div
                    key={mapping.id}
                    className="field-indicator"
                    style={{
                        position: 'absolute',
                        left: `${mapping.position.x}%`,
                        top: `${mapping.position.y}%`,
                        width: `${mapping.position.width}%`,
                        height: `${mapping.position.height}%`,
                        border: '2px solid #3498db',
                        backgroundColor: 'rgba(52, 152, 219, 0.2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#2980b9',
                        zIndex: 10
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveMapping(mapping.id);
                    }}
                    title={`${mapping.fieldLabel} (${mapping.fieldType}) - Κλικ για διαγραφή`}
                >
                    {mapping.fieldLabel}
                </div>
            ));
    };

    if (pdfLoading) {
        return (
            <div className="visual-pdf-mapper">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <span>Φόρτωση PDF...</span>
                </div>
            </div>
        );
    }

    if (pdfError || !pdfBlob) {
        return (
            <div className="visual-pdf-mapper">
                <div className="error-container">
                    <span>Σφάλμα φόρτωσης PDF</span>
                    <button onClick={loadPDF}>Δοκιμή ξανά</button>
                </div>
            </div>
        );
    }

    return (
        <div className="visual-pdf-mapper">
            <style>
                {`
                    .visual-pdf-mapper {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 15px;
                        padding: 25px;
                        margin: 20px 0;
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .mapper-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 25px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        padding-bottom: 15px;
                    }

                    .mapper-header h2 {
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

                    .mapper-content {
                        display: grid;
                        grid-template-columns: 1fr 300px;
                        gap: 20px;
                        min-height: 600px;
                    }

                    .pdf-viewer-section {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        position: relative;
                    }

                    .pdf-controls {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                        padding: 10px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                    }

                    .page-controls {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: white;
                    }

                    .page-btn {
                        background: rgba(52, 152, 219, 0.3);
                        color: #3498db;
                        border: none;
                        border-radius: 4px;
                        padding: 5px 10px;
                        cursor: pointer;
                        font-weight: 600;
                    }

                    .page-btn:hover:not(:disabled) {
                        background: rgba(52, 152, 219, 0.5);
                    }

                    .page-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                    }

                    .zoom-controls {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        color: white;
                    }

                    .zoom-btn {
                        background: rgba(52, 152, 219, 0.3);
                        color: #3498db;
                        border: none;
                        border-radius: 4px;
                        padding: 5px 8px;
                        cursor: pointer;
                        font-weight: 600;
                    }

                    .zoom-btn:hover {
                        background: rgba(52, 152, 219, 0.5);
                    }

                    .pdf-container {
                        position: relative;
                        display: flex;
                        justify-content: center;
                        background: white;
                        border-radius: 8px;
                        overflow: hidden;
                        cursor: ${selectedField ? 'crosshair' : 'default'};
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
                        .mapper-content {
                            grid-template-columns: 1fr;
                            gap: 15px;
                        }

                        .fields-section {
                            order: -1;
                        }
                    }
                `}
            </style>

            <div className="mapper-header">
                <h2>🎯 Visual PDF Field Mapping</h2>
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

            <div className="mapper-content">
                <div className="pdf-viewer-section">
                    <div className="pdf-controls">
                        <div className="page-controls">
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage <= 1}
                            >
                                ←
                            </button>
                            <span>Σελίδα {currentPage} από {numPages}</span>
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))}
                                disabled={currentPage >= numPages}
                            >
                                →
                            </button>
                        </div>

                        <div className="zoom-controls">
                            <button
                                className="zoom-btn"
                                onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                            >
                                −
                            </button>
                            <span>{Math.round(scale * 100)}%</span>
                            <button
                                className="zoom-btn"
                                onClick={() => setScale(prev => Math.min(prev + 0.2, 2.0))}
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="pdf-container" onClick={handlePageClick} ref={pageRef}>
                        <Document
                            file={pdfBlob}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                        >
                            <Page
                                pageNumber={currentPage}
                                scale={scale}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                            />
                        </Document>
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
                                        Σελίδα {mapping.page} • ({Math.round(mapping.position.x)}%, {Math.round(mapping.position.y)}%)
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
                • Κάνε κλικ στο PDF στο σημείο που θέλεις να τοποθετηθεί το πεδίο<br />
                • Μπορείς να τοποθετήσεις το ίδιο πεδίο σε πολλά σημεία<br />
                • Κάνε κλικ πάνω σε ένα mapping για να το αφαιρέσεις<br />
                • Χρησιμοποίησε τα κουμπιά zoom και σελίδας για καλύτερη ακρίβεια
            </div>
        </div>
    );
};

export default VisualPDFMapper;