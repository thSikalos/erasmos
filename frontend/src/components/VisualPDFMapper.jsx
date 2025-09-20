import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import axios from 'axios';
import { useNotifications } from '../context/NotificationContext';
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
    const { showConfirmModal } = useNotifications();
    const [numPages, setNumPages] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedField, setSelectedField] = useState(null);
    const [mappings, setMappings] = useState([]);
    const [pdfBlob, setPdfBlob] = useState(null);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState(false);
    const [savingMappings, setSavingMappings] = useState(false);
    const [scale, setScale] = useState(1.0);
    const [jumpToPage, setJumpToPage] = useState('');
    const [showPageOverview, setShowPageOverview] = useState(false);

    const pageRef = useRef(null);

    // Define customer fields for PDF mapping
    const customerFields = [
        {
            id: 'customer_name',
            label: 'Ονοματεπώνυμο',
            type: 'text',
            isCustomerField: true
        },
        {
            id: 'customer_afm',
            label: 'ΑΦΜ',
            type: 'text',
            isCustomerField: true
        },
        {
            id: 'customer_phone',
            label: 'Τηλέφωνο',
            type: 'text',
            isCustomerField: true
        },
        {
            id: 'customer_address',
            label: 'Διεύθυνση',
            type: 'text',
            isCustomerField: true
        },
        {
            id: 'customer_email',
            label: 'Email',
            type: 'email',
            isCustomerField: true
        }
    ];

    useEffect(() => {
        loadPDF();
        loadExistingMappings();
    }, [templateId]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.target.tagName === 'INPUT') return; // Skip if typing in input fields

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    setCurrentPage(prev => Math.max(prev - 1, 1));
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    setCurrentPage(prev => Math.min(prev + 1, numPages || 1));
                    break;
                case 'Escape':
                    setSelectedField(null);
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [numPages]);

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
                apiUrl(`/api/pdf-templates/${templateId}/visual-mappings`),
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
        setPdfError(false); // Clear any previous errors
        console.log(`[VisualPDFMapper] ✅ PDF loaded successfully with ${numPages} pages`);
    };

    const onDocumentLoadError = (error) => {
        console.error('❌ Error loading PDF document:', error);

        // Check for specific version mismatch error
        if (error.message && error.message.includes('API version') && error.message.includes('Worker version')) {
            console.error('🔧 Version mismatch detected - react-pdf and pdfjs-dist versions are incompatible');
        }

        setPdfError(true);
        setNumPages(null);
        setCurrentPage(1);
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

        // Calculate more precise coordinates
        const rawX = event.clientX - rect.left;
        const rawY = event.clientY - rect.top;

        // Ensure coordinates are within bounds
        const x = Math.max(0, Math.min(100, (rawX / rect.width) * 100));
        const y = Math.max(0, Math.min(100, (rawY / rect.height) * 100));

        // Validate field placement (avoid overlapping)
        const fieldWidth = getDefaultWidth(selectedField.type);
        const fieldHeight = getDefaultHeight(selectedField.type);

        // Check for overlapping with existing mappings on same page
        const overlappingMapping = mappings.find(mapping => {
            if (mapping.page !== currentPage) return false;

            const xOverlap = Math.abs(mapping.position.x - x) < (mapping.position.width + fieldWidth) / 2;
            const yOverlap = Math.abs(mapping.position.y - y) < (mapping.position.height + fieldHeight) / 2;

            return xOverlap && yOverlap;
        });

        if (overlappingMapping) {
            showConfirmModal({
                title: 'Συνεχίσετε την προσθήκη;',
                message: `Υπάρχει ήδη το πεδίο "${overlappingMapping.fieldLabel}" κοντά σε αυτό το σημείο. Θέλετε να συνεχίσετε;`,
                onConfirm: () => {
                    // Continue with adding the mapping
                    const newMapping = {
                        id: Date.now(),
                        fieldId: selectedField.id,
                        fieldLabel: selectedField.label,
                        fieldType: selectedField.type,
                        isCustomerField: selectedField.isCustomerField || false,
                        page: currentPage,
                        position: {
                            x: Math.round(x * 100) / 100,
                            y: Math.round(y * 100) / 100,
                            width: fieldWidth,
                            height: fieldHeight
                        },
                        isRequired: true,
                        timestamp: new Date().toISOString()
                    };

                    setMappings(prev => [...prev, newMapping]);
                    console.log(`[VisualPDFMapper] Added precise mapping for "${selectedField.label}" at (${newMapping.position.x}%, ${newMapping.position.y}%) on page ${currentPage}`);
                    showSuccessIndicator(event.target, newMapping);
                },
                type: 'warning',
                confirmText: 'Συνέχεια',
                cancelText: 'Ακύρωση'
            });
            return;
        }

        const newMapping = {
            id: Date.now(), // Temporary ID
            fieldId: selectedField.id,
            fieldLabel: selectedField.label,
            fieldType: selectedField.type,
            isCustomerField: selectedField.isCustomerField || false,
            page: currentPage,
            position: {
                x: Math.round(x * 100) / 100, // Round to 2 decimal places
                y: Math.round(y * 100) / 100,
                width: fieldWidth,
                height: fieldHeight
            },
            isRequired: true,
            timestamp: new Date().toISOString()
        };

        setMappings(prev => [...prev, newMapping]);

        // Visual feedback with precise coordinates
        console.log(`[VisualPDFMapper] Added precise mapping for "${selectedField.label}" at (${newMapping.position.x}%, ${newMapping.position.y}%) on page ${currentPage}`);

        // Show temporary success indicator
        showSuccessIndicator(event.target, newMapping);
    };

    const showSuccessIndicator = (target, mapping) => {
        const indicator = document.createElement('div');
        indicator.style.cssText = `
            position: absolute;
            left: ${mapping.position.x}%;
            top: ${mapping.position.y}%;
            width: 30px;
            height: 30px;
            background: linear-gradient(135deg, #27ae60, #2ecc71);
            border: 2px solid white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 14px;
            animation: mappingSuccess 2s ease-out forwards;
            box-shadow: 0 4px 12px rgba(39, 174, 96, 0.4);
        `;
        indicator.textContent = '✓';

        // Add keyframe animation
        if (!document.getElementById('mapping-success-styles')) {
            const style = document.createElement('style');
            style.id = 'mapping-success-styles';
            style.textContent = `
                @keyframes mappingSuccess {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    30% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    70% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        pageRef.current.appendChild(indicator);

        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.parentNode.removeChild(indicator);
            }
        }, 2000);
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

    const handleJumpToPage = () => {
        const pageNum = parseInt(jumpToPage);
        if (pageNum >= 1 && pageNum <= numPages) {
            setCurrentPage(pageNum);
            setJumpToPage('');
        } else {
            alert(`Παρακαλώ εισάγετε έγκυρο αριθμό σελίδας (1-${numPages})`);
        }
    };

    const getPageMappingCount = (pageNumber) => {
        return mappings.filter(mapping => mapping.page === pageNumber).length;
    };

    const getTotalMappingsAcrossPages = () => {
        const pageStats = {};
        mappings.forEach(mapping => {
            pageStats[mapping.page] = (pageStats[mapping.page] || 0) + 1;
        });
        return pageStats;
    };

    const validateMappings = () => {
        const errors = [];
        const warnings = [];

        // Check for duplicate field mappings
        const fieldCounts = {};
        mappings.forEach(mapping => {
            const key = `${mapping.fieldId}`;
            fieldCounts[key] = (fieldCounts[key] || 0) + 1;
        });

        Object.entries(fieldCounts).forEach(([fieldId, count]) => {
            if (count > 1) {
                const field = availableFields.find(f => f.id.toString() === fieldId);
                warnings.push(`Το πεδίο "${field?.label}" είναι mapped ${count} φορές`);
            }
        });

        // Check for mappings outside PDF bounds
        mappings.forEach(mapping => {
            if (mapping.position.x < 0 || mapping.position.x > 100 ||
                mapping.position.y < 0 || mapping.position.y > 100) {
                errors.push(`Το πεδίο "${mapping.fieldLabel}" στη σελίδα ${mapping.page} είναι εκτός ορίων`);
            }
        });

        // Check for page validity
        mappings.forEach(mapping => {
            if (mapping.page < 1 || mapping.page > numPages) {
                errors.push(`Το πεδίο "${mapping.fieldLabel}" είναι στη μη έγκυρη σελίδα ${mapping.page}`);
            }
        });

        return { errors, warnings };
    };


    const handleSaveMappings = async () => {
        try {
            setSavingMappings(true);

            if (mappings.length === 0) {
                alert('Παρακαλώ δημιουργήστε τουλάχιστον ένα mapping πριν αποθηκεύσετε');
                return;
            }

            // Run validation before saving
            const { errors, warnings } = validateMappings();

            if (errors.length > 0) {
                alert('❌ Δεν μπορεί να γίνει αποθήκευση λόγω σφαλμάτων:\n\n' + errors.join('\n'));
                return;
            }

            if (warnings.length > 0) {
                showConfirmModal({
                    title: 'Προειδοποιήσεις',
                    message: '⚠️ Βρέθηκαν προειδοποιήσεις:\n\n' +
                        warnings.join('\n') +
                        '\n\nΘέλετε να συνεχίσετε;',
                    onConfirm: async () => {
                        // Continue with the save operation
                        const token = localStorage.getItem('token');
                        const config = { headers: { Authorization: `Bearer ${token}` } };

                        // Convert mappings to API format
                        const apiMappings = mappings.map(mapping => ({
                            fieldId: mapping.fieldId,
                            x: mapping.position.x,
                            y: mapping.position.y,
                            width: mapping.position.width,
                            height: mapping.position.height,
                            page: mapping.page
                        }));

                        try {
                            await axios.post(
                                apiUrl(`/api/pdf-templates/${templateId}/mappings`),
                                { mappings: apiMappings },
                                config
                            );

                            if (onMappingsSaved) {
                                onMappingsSaved();
                            }

                            alert('Τα mappings αποθηκεύτηκαν επιτυχώς!');
                            onClose();
                        } catch (error) {
                            console.error('Error saving mappings:', error);
                            alert('Σφάλμα κατά την αποθήκευση των mappings');
                        }
                    },
                    type: 'warning',
                    confirmText: 'Συνέχεια',
                    cancelText: 'Ακύρωση'
                });
                return;
            }

            const token = localStorage.getItem('token');
            const config = { headers: { Authorization: `Bearer ${token}` } };

            // Convert mappings to API format
            const mappingsData = mappings.map(mapping => ({
                fieldId: mapping.fieldType === 'dropdown_option_value' ? mapping.fieldId : mapping.fieldId,
                fieldType: mapping.fieldType,
                isCustomerField: mapping.isCustomerField || false,
                page: mapping.page,
                position: mapping.position,
                isRequired: mapping.isRequired,
                // Add dropdown option specific data
                ...(mapping.fieldType === 'dropdown_option_value' && {
                    optionId: mapping.optionId,
                    optionValue: mapping.optionValue,
                    optionLabel: mapping.optionLabel
                })
            }));

            await axios.post(
                apiUrl(`/api/pdf-templates/${templateId}/visual-mappings`),
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

                    .validate-btn {
                        background: linear-gradient(135deg, #3498db, #2980b9);
                        color: white;
                    }

                    .validate-btn:hover:not(:disabled) {
                        transform: translateY(-2px);
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
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
                        grid-template-columns: 1fr 450px;
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
                        padding: 15px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        flex-wrap: wrap;
                        gap: 15px;
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

                    .page-display {
                        margin: 0 10px;
                        font-weight: 600;
                    }

                    .page-mapping-count {
                        color: #3498db;
                        font-size: 0.9rem;
                        margin-left: 5px;
                    }

                    .jump-to-page {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .jump-input {
                        width: 80px;
                        padding: 6px 10px;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 4px;
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        font-size: 0.9rem;
                    }

                    .jump-input::placeholder {
                        color: rgba(255, 255, 255, 0.5);
                        font-size: 0.8rem;
                    }

                    .jump-input:focus {
                        outline: none;
                        border-color: #3498db;
                        background: rgba(255, 255, 255, 0.15);
                    }

                    .jump-btn, .overview-btn {
                        background: rgba(52, 152, 219, 0.3);
                        color: #3498db;
                        border: none;
                        border-radius: 4px;
                        padding: 6px 12px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 0.9rem;
                        transition: all 0.3s ease;
                    }

                    .jump-btn:hover:not(:disabled), .overview-btn:hover {
                        background: rgba(52, 152, 219, 0.5);
                        transform: translateY(-1px);
                    }

                    .jump-btn:disabled {
                        opacity: 0.5;
                        cursor: not-allowed;
                        transform: none;
                    }

                    .page-overview-toggle {
                        display: flex;
                        align-items: center;
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
                        display: flex;
                        flex-direction: column;
                        max-height: 800px;
                    }

                    .section-header {
                        color: white;
                        font-weight: 600;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                        font-size: 1.1rem;
                        flex-shrink: 0;
                    }

                    .fields-container {
                        overflow-y: auto;
                        flex: 1;
                        margin-bottom: 20px;
                        padding-right: 8px;
                    }

                    .fields-container::-webkit-scrollbar {
                        width: 6px;
                    }

                    .fields-container::-webkit-scrollbar-track {
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 3px;
                    }

                    .fields-container::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.3);
                        border-radius: 3px;
                    }

                    .fields-container::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.5);
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

                    .mappings-filter {
                        margin-left: auto;
                    }

                    .page-filter-select {
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        border: 1px solid rgba(255, 255, 255, 0.3);
                        border-radius: 4px;
                        padding: 4px 8px;
                        font-size: 0.8rem;
                        cursor: pointer;
                    }

                    .page-filter-select:focus {
                        outline: none;
                        border-color: #3498db;
                    }

                    .mapping-item.current-page {
                        border-left: 3px solid #3498db;
                        background: rgba(52, 152, 219, 0.1);
                    }

                    .other-pages-summary {
                        margin-top: 15px;
                        padding-top: 15px;
                        border-top: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .summary-header {
                        color: rgba(255, 255, 255, 0.8);
                        font-size: 0.9rem;
                        font-weight: 600;
                        margin-bottom: 10px;
                    }

                    .page-summary-item {
                        background: rgba(255, 255, 255, 0.05);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 6px;
                        padding: 8px 12px;
                        margin-bottom: 6px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        font-size: 0.9rem;
                        color: rgba(255, 255, 255, 0.8);
                    }

                    .page-summary-item:hover {
                        background: rgba(52, 152, 219, 0.1);
                        border-color: #3498db;
                        color: white;
                    }

                    .goto-indicator {
                        color: #3498db;
                        font-weight: 600;
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

                    .page-overview-panel {
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 12px;
                        padding: 15px;
                        margin-top: 15px;
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        max-height: 300px;
                        overflow-y: auto;
                    }

                    .overview-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.2);
                    }

                    .overview-header h4 {
                        color: white;
                        margin: 0;
                        font-size: 1.1rem;
                    }

                    .close-overview-btn {
                        background: rgba(231, 76, 60, 0.3);
                        color: #e74c3c;
                        border: none;
                        border-radius: 4px;
                        padding: 4px 8px;
                        cursor: pointer;
                        font-weight: 600;
                    }

                    .close-overview-btn:hover {
                        background: #e74c3c;
                        color: white;
                    }

                    .page-thumbnails {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
                        gap: 10px;
                    }

                    .page-thumbnail {
                        background: rgba(255, 255, 255, 0.1);
                        border: 2px solid rgba(255, 255, 255, 0.2);
                        border-radius: 8px;
                        padding: 8px;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        text-align: center;
                    }

                    .page-thumbnail:hover {
                        border-color: #3498db;
                        background: rgba(52, 152, 219, 0.1);
                        transform: translateY(-2px);
                    }

                    .page-thumbnail.current {
                        border-color: #3498db;
                        background: rgba(52, 152, 219, 0.2);
                        box-shadow: 0 4px 12px rgba(52, 152, 219, 0.3);
                    }

                    .page-thumbnail canvas {
                        border-radius: 4px;
                        background: white;
                        margin-bottom: 8px;
                    }

                    .thumbnail-info {
                        color: white;
                        font-size: 0.8rem;
                    }

                    .page-number {
                        display: block;
                        font-weight: 600;
                        margin-bottom: 4px;
                    }

                    .mapping-badge {
                        background: #3498db;
                        color: white;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 0.7rem;
                        font-weight: 600;
                    }

                    @media (max-width: 1400px) {
                        .mapper-content {
                            grid-template-columns: 1fr 400px;
                        }
                    }

                    @media (max-width: 1200px) {
                        .mapper-content {
                            grid-template-columns: 1fr 350px;
                        }
                    }

                    @media (max-width: 1000px) {
                        .mapper-content {
                            grid-template-columns: 1fr;
                            gap: 15px;
                        }

                        .fields-section {
                            order: -1;
                            max-height: 400px;
                        }

                        .pdf-controls {
                            flex-direction: column;
                            gap: 10px;
                        }

                        .page-thumbnails {
                            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
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
                                title="Previous page (←)"
                            >
                                ←
                            </button>
                            <span className="page-display">
                                Σελίδα {currentPage} από {numPages}
                                {getPageMappingCount(currentPage) > 0 && (
                                    <span className="page-mapping-count">
                                        ({getPageMappingCount(currentPage)} mappings)
                                    </span>
                                )}
                            </span>
                            <button
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, numPages))}
                                disabled={currentPage >= numPages}
                                title="Next page (→)"
                            >
                                →
                            </button>
                        </div>

                        <div className="jump-to-page">
                            <input
                                type="number"
                                min="1"
                                max={numPages}
                                value={jumpToPage}
                                onChange={(e) => setJumpToPage(e.target.value)}
                                placeholder="Jump to..."
                                className="jump-input"
                                onKeyPress={(e) => e.key === 'Enter' && handleJumpToPage()}
                            />
                            <button
                                className="jump-btn"
                                onClick={handleJumpToPage}
                                disabled={!jumpToPage}
                                title="Go to page"
                            >
                                Go
                            </button>
                        </div>

                        <div className="page-overview-toggle">
                            <button
                                className="overview-btn"
                                onClick={() => setShowPageOverview(!showPageOverview)}
                                title="Toggle page overview"
                            >
                                📋 Overview
                            </button>
                        </div>

                        <div className="zoom-controls">
                            <button
                                className="zoom-btn"
                                onClick={() => setScale(prev => Math.max(prev - 0.2, 0.5))}
                                title="Zoom out"
                            >
                                −
                            </button>
                            <span>{Math.round(scale * 100)}%</span>
                            <button
                                className="zoom-btn"
                                onClick={() => setScale(prev => Math.min(prev + 0.2, 2.0))}
                                title="Zoom in"
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

                    {/* Page Overview Panel */}
                    {showPageOverview && numPages > 1 && (
                        <div className="page-overview-panel">
                            <div className="overview-header">
                                <h4>📄 Page Overview ({numPages} pages)</h4>
                                <button
                                    className="close-overview-btn"
                                    onClick={() => setShowPageOverview(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="page-thumbnails">
                                {Array.from({ length: numPages }, (_, index) => {
                                    const pageNum = index + 1;
                                    const mappingCount = getPageMappingCount(pageNum);
                                    const isCurrentPage = pageNum === currentPage;

                                    return (
                                        <div
                                            key={pageNum}
                                            className={`page-thumbnail ${isCurrentPage ? 'current' : ''}`}
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            <Document file={pdfBlob}>
                                                <Page
                                                    pageNumber={pageNum}
                                                    scale={0.2}
                                                    renderTextLayer={false}
                                                    renderAnnotationLayer={false}
                                                />
                                            </Document>
                                            <div className="thumbnail-info">
                                                <span className="page-number">Σελίδα {pageNum}</span>
                                                {mappingCount > 0 && (
                                                    <span className="mapping-badge">
                                                        {mappingCount} mappings
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="fields-section">
                    <div className="section-header">
                        📝 Διαθέσιμα Πεδία ({(availableFields.length + customerFields.length + availableFields.filter(field => field.type === 'dropdown' && field.options?.length > 0).reduce((total, field) => total + field.options.length, 0))})
                    </div>

                    {selectedField && (
                        <div style={{
                            background: 'rgba(52, 152, 219, 0.2)',
                            border: '1px solid #3498db',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '15px',
                            color: 'white',
                            fontSize: '0.9rem',
                            flexShrink: 0
                        }}>
                            <strong>Επιλεγμένο:</strong> {selectedField.label}<br />
                            <small>Κάνε κλικ στο PDF για τοποθέτηση</small>
                        </div>
                    )}

                    <div className="fields-container">
                        {/* Customer Fields Section */}
                        <div className="section-header" style={{ fontSize: '1rem', margin: '0 0 10px 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                            👤 Στοιχεία Πελάτη ({customerFields.length})
                        </div>

                        {customerFields.map(field => (
                            <div
                                key={field.id}
                                className={`field-item ${selectedField?.id === field.id ? 'selected' : ''}`}
                                onClick={() => handleFieldSelect(field)}
                                style={{ borderLeft: '3px solid #e67e22' }}
                            >
                                <div className="field-name">{field.label}</div>
                                <span className="field-type">{field.type}</span>
                            </div>
                        ))}

                        {/* Company Fields Section */}
                        <div className="section-header" style={{ fontSize: '1rem', margin: '20px 0 10px 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                            🏢 Στοιχεία Εταιρείας ({availableFields.length})
                        </div>

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

                        {/* Dropdown Option Values Section */}
                        {availableFields.filter(field => field.type === 'dropdown' && field.options?.length > 0).length > 0 && (
                            <>
                                <div className="section-header" style={{ fontSize: '1rem', margin: '20px 0 10px 0', color: 'rgba(255, 255, 255, 0.8)' }}>
                                    📋 Ονόματα Προγραμμάτων ({availableFields.filter(field => field.type === 'dropdown' && field.options?.length > 0).reduce((total, field) => total + field.options.length, 0)})
                                </div>

                                {availableFields
                                    .filter(field => field.type === 'dropdown' && field.options?.length > 0)
                                    .map(field =>
                                        field.options.map(option => (
                                            <div
                                                key={`dropdown_option_${field.id}_${option.id}`}
                                                className={`field-item ${selectedField?.id === `dropdown_option_${field.id}_${option.id}` ? 'selected' : ''}`}
                                                onClick={() => handleFieldSelect({
                                                    id: `dropdown_option_${field.id}_${option.id}`,
                                                    label: `${option.label} (${field.label})`,
                                                    type: 'dropdown_option_value',
                                                    fieldId: field.id,
                                                    optionId: option.id,
                                                    optionValue: option.value,
                                                    optionLabel: option.label
                                                })}
                                                style={{ borderLeft: '3px solid #9b59b6' }}
                                            >
                                                <div className="field-name">{option.label}</div>
                                                <span className="field-type">όνομα προγράμματος</span>
                                            </div>
                                        ))
                                    )}
                            </>
                        )}
                    </div>

                    <div className="mappings-list">
                        <div className="section-header">
                            ✅ Mappings ({mappings.length})
                            {numPages > 1 && (
                                <div className="mappings-filter">
                                    <select
                                        value={currentPage}
                                        onChange={(e) => setCurrentPage(parseInt(e.target.value))}
                                        className="page-filter-select"
                                    >
                                        {Array.from({ length: numPages }, (_, index) => {
                                            const pageNum = index + 1;
                                            const count = getPageMappingCount(pageNum);
                                            return (
                                                <option key={pageNum} value={pageNum}>
                                                    Σελίδα {pageNum} ({count})
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Current Page Mappings */}
                        {mappings
                            .filter(mapping => mapping.page === currentPage)
                            .map(mapping => (
                            <div key={mapping.id} className="mapping-item current-page">
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

                        {/* Other Pages Summary */}
                        {numPages > 1 && mappings.filter(m => m.page !== currentPage).length > 0 && (
                            <div className="other-pages-summary">
                                <div className="summary-header">📋 Άλλες σελίδες</div>
                                {Object.entries(getTotalMappingsAcrossPages())
                                    .filter(([page, count]) => parseInt(page) !== currentPage && count > 0)
                                    .map(([page, count]) => (
                                    <div
                                        key={page}
                                        className="page-summary-item"
                                        onClick={() => setCurrentPage(parseInt(page))}
                                    >
                                        <span>Σελίδα {page}: {count} mappings</span>
                                        <span className="goto-indicator">→</span>
                                    </div>
                                ))}
                            </div>
                        )}

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

                        {mappings.filter(m => m.page === currentPage).length === 0 && mappings.length > 0 && (
                            <div style={{
                                color: 'rgba(255, 255, 255, 0.6)',
                                textAlign: 'center',
                                padding: '20px',
                                fontStyle: 'italic'
                            }}>
                                Δεν υπάρχουν mappings στη σελίδα {currentPage}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="instructions">
                <strong>💡 Οδηγίες για Multi-page PDF Mapping:</strong><br />
                • <strong>Πλοήγηση:</strong> Χρησιμοποίησε ← → ή τα κουμπιά για αλλαγή σελίδας<br />
                • <strong>Jump to Page:</strong> Γράψε αριθμό σελίδας και πάτησε "Go" ή Enter<br />
                • <strong>Overview:</strong> Πάτησε "📋 Overview" για προβολή όλων των σελίδων<br />
                • <strong>Mapping:</strong> Επίλεξε πεδίο → κλικ στο PDF → αποθηκεύεται στη σωστή σελίδα<br />
                • <strong>Keyboard:</strong> ← → για σελίδες, Escape για ακύρωση επιλογής<br />
                • <strong>Zoom:</strong> + - κουμπιά για καλύτερη ακρίβεια mapping<br />
                • <strong>Validation:</strong> Οι mappings εμφανίζονται μόνο στη σωστή σελίδα
            </div>
        </div>
    );
};

export default VisualPDFMapper;