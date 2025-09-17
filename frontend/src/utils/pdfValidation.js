/**
 * PDF Validation Utilities
 * Provides comprehensive validation for PDF-related operations
 */

// Maximum file size for PDF uploads (10MB)
export const MAX_PDF_SIZE = 10 * 1024 * 1024;

// Minimum PDF file size (1KB)
export const MIN_PDF_SIZE = 1024;

// Supported PDF MIME types
export const SUPPORTED_PDF_TYPES = [
    'application/pdf',
    'application/x-pdf',
    'application/x-bzpdf',
    'application/x-gzpdf'
];

/**
 * Validate PDF file for upload
 * @param {File} file - The file to validate
 * @returns {Object} Validation result
 */
export const validatePDFFile = (file) => {
    const errors = [];
    const warnings = [];

    // Check if file exists
    if (!file) {
        errors.push('Δεν έχει επιλεγεί αρχείο');
        return { isValid: false, errors, warnings };
    }

    // Check file type
    if (!SUPPORTED_PDF_TYPES.includes(file.type)) {
        errors.push('Μη υποστηριζόμενος τύπος αρχείου. Μόνο PDF αρχεία επιτρέπονται');
    }

    // Check file extension
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.pdf')) {
        errors.push('Το αρχείο πρέπει να έχει κατάληξη .pdf');
    }

    // Check file size
    if (file.size > MAX_PDF_SIZE) {
        errors.push(`Το αρχείο είναι πολύ μεγάλο. Μέγιστο μέγεθος: ${Math.round(MAX_PDF_SIZE / (1024 * 1024))}MB`);
    }

    if (file.size < MIN_PDF_SIZE) {
        errors.push('Το αρχείο είναι πολύ μικρό ή κατεστραμμένο');
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
        /[<>:"/\\|?*]/,  // Invalid characters
        /^\./,           // Hidden files
        /\.(exe|bat|cmd|scr|pif|vbs|js)$/i  // Executable extensions
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(fileName))) {
        errors.push('Μη έγκυρο όνομα αρχείου');
    }

    // Warnings for large files
    if (file.size > 5 * 1024 * 1024) {
        warnings.push('Το αρχείο είναι μεγάλο και μπορεί να χρειαστεί περισσότερος χρόνος για ανέβασμα');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings,
        fileInfo: {
            name: file.name,
            size: file.size,
            type: file.type,
            sizeFormatted: formatFileSize(file.size)
        }
    };
};

/**
 * Validate template data before saving
 * @param {Object} templateData - Template data to validate
 * @returns {Object} Validation result
 */
export const validateTemplateData = (templateData) => {
    const errors = [];
    const warnings = [];

    // Required fields validation
    const requiredFields = ['companyId', 'fieldId', 'optionValue', 'templateName'];

    for (const field of requiredFields) {
        if (!templateData[field] || templateData[field].toString().trim() === '') {
            errors.push(`Το πεδίο "${getFieldDisplayName(field)}" είναι υποχρεωτικό`);
        }
    }

    // Template name validation
    if (templateData.templateName) {
        const templateName = templateData.templateName.trim();

        if (templateName.length < 3) {
            errors.push('Το όνομα του template πρέπει να έχει τουλάχιστον 3 χαρακτήρες');
        }

        if (templateName.length > 100) {
            errors.push('Το όνομα του template δεν μπορεί να υπερβαίνει τους 100 χαρακτήρες');
        }

        // Check for special characters
        if (!/^[a-zA-Zα-ωΑ-Ω0-9\s\-_()]+$/.test(templateName)) {
            warnings.push('Το όνομα του template περιέχει ειδικούς χαρακτήρες που μπορεί να προκαλέσουν προβλήματα');
        }
    }

    // Option value validation
    if (templateData.optionValue && templateData.optionValue.length > 255) {
        errors.push('Η τιμή της επιλογής δεν μπορεί να υπερβαίνει τους 255 χαρακτήρες');
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate field mapping data
 * @param {Object} mappingData - Mapping data to validate
 * @returns {Object} Validation result
 */
export const validateMappingData = (mappingData) => {
    const errors = [];
    const warnings = [];

    // Required fields
    if (!mappingData.placeholder || mappingData.placeholder.trim() === '') {
        errors.push('Το placeholder είναι υποχρεωτικό');
    }

    if (!mappingData.targetFieldId) {
        errors.push('Το πεδίο προορισμού είναι υποχρεωτικό');
    }

    // Placeholder validation
    if (mappingData.placeholder) {
        const placeholder = mappingData.placeholder.trim();

        if (placeholder.length > 500) {
            errors.push('Το placeholder δεν μπορεί να υπερβαίνει τους 500 χαρακτήρες');
        }

        // Check for suspicious content
        if (/[<>]/.test(placeholder)) {
            warnings.push('Το placeholder περιέχει χαρακτήρες που μπορεί να προκαλέσουν προβλήματα');
        }
    }

    // Coordinates validation
    if (mappingData.coordinates) {
        const { x, y, width, height } = mappingData.coordinates;

        if (x !== undefined && (x < 0 || x > 10000)) {
            errors.push('Η συντεταγμένη X δεν είναι έγκυρη');
        }

        if (y !== undefined && (y < 0 || y > 10000)) {
            errors.push('Η συντεταγμένη Y δεν είναι έγκυρη');
        }

        if (width !== undefined && (width < 0 || width > 5000)) {
            errors.push('Το πλάτος δεν είναι έγκυρο');
        }

        if (height !== undefined && (height < 0 || height > 1000)) {
            errors.push('Το ύψος δεν είναι έγκυρο');
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Validate PDF generation request
 * @param {Object} generationData - Generation request data
 * @returns {Object} Validation result
 */
export const validatePDFGeneration = (generationData) => {
    const errors = [];
    const warnings = [];

    // Template ID validation
    if (!generationData.templateId || !Number.isInteger(Number(generationData.templateId))) {
        errors.push('Μη έγκυρο ID template');
    }

    // Application data validation
    if (!generationData.applicationData || typeof generationData.applicationData !== 'object') {
        errors.push('Μη έγκυρα δεδομένα αίτησης');
    }

    // Check for required mappings
    if (generationData.requiredMappings && Array.isArray(generationData.requiredMappings)) {
        const missingFields = generationData.requiredMappings.filter(mapping => {
            const fieldValue = generationData.applicationData[mapping.targetFieldId];
            return !fieldValue || fieldValue.toString().trim() === '';
        });

        if (missingFields.length > 0) {
            errors.push(`Λείπουν απαιτούμενα πεδία: ${missingFields.map(f => f.fieldLabel).join(', ')}`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
};

/**
 * Format file size for display
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get display name for field
 * @param {string} fieldName - Internal field name
 * @returns {string} Display name in Greek
 */
const getFieldDisplayName = (fieldName) => {
    const fieldNames = {
        companyId: 'Εταιρεία',
        fieldId: 'Πεδίο',
        optionValue: 'Τιμή Επιλογής',
        templateName: 'Όνομα Template',
        placeholder: 'Placeholder',
        targetFieldId: 'Πεδίο Προορισμού'
    };

    return fieldNames[fieldName] || fieldName;
};

/**
 * Sanitize file name for safe storage
 * @param {string} fileName - Original file name
 * @returns {string} Sanitized file name
 */
export const sanitizeFileName = (fileName) => {
    return fileName
        .replace(/[^a-zA-Zα-ωΑ-Ω0-9.\-_()]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '')
        .substring(0, 100);
};

/**
 * Check if PDF analysis is needed
 * @param {Object} template - Template object
 * @returns {boolean} Whether analysis is needed
 */
export const needsAnalysis = (template) => {
    if (!template) return false;

    return template.analysis_status === 'pending' ||
           template.analysis_status === 'failed' ||
           !template.analysis_status;
};

/**
 * Check if template has sufficient mappings for PDF generation
 * @param {Array} mappings - Template mappings
 * @returns {Object} Readiness status
 */
export const checkTemplateReadiness = (mappings) => {
    if (!Array.isArray(mappings) || mappings.length === 0) {
        return {
            isReady: false,
            reason: 'Δεν υπάρχουν mappings',
            mappedCount: 0,
            totalCount: 0
        };
    }

    const mappedFields = mappings.filter(m => m.mapping_status === 'mapped');
    const requiredFields = mappings.filter(m => m.is_required);
    const mappedRequiredFields = requiredFields.filter(m => m.mapping_status === 'mapped');

    const hasAllRequired = requiredFields.length === 0 || mappedRequiredFields.length === requiredFields.length;
    const hasAnyMapped = mappedFields.length > 0;

    return {
        isReady: hasAllRequired && hasAnyMapped,
        reason: !hasAnyMapped
            ? 'Δεν υπάρχουν mapped πεδία'
            : !hasAllRequired
            ? 'Λείπουν απαιτούμενα πεδία'
            : 'Έτοιμο για δημιουργία PDF',
        mappedCount: mappedFields.length,
        totalCount: mappings.length,
        requiredCount: requiredFields.length,
        mappedRequiredCount: mappedRequiredFields.length
    };
};

export default {
    validatePDFFile,
    validateTemplateData,
    validateMappingData,
    validatePDFGeneration,
    formatFileSize,
    sanitizeFileName,
    needsAnalysis,
    checkTemplateReadiness,
    MAX_PDF_SIZE,
    MIN_PDF_SIZE,
    SUPPORTED_PDF_TYPES
};