/**
 * PDF Error Handling Middleware
 * Provides comprehensive error handling for PDF-related operations
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Enhanced error handler for PDF operations
 */
const pdfErrorHandler = (err, req, res, next) => {
    console.error('PDF Operation Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        body: req.body,
        user: req.user?.id,
        timestamp: new Date().toISOString()
    });

    // Log error to file for monitoring
    logErrorToFile(err, req).catch(logErr => {
        console.error('Failed to log error to file:', logErr);
    });

    // Determine error type and respond appropriately
    const errorResponse = categorizeError(err);

    res.status(errorResponse.status).json({
        success: false,
        message: errorResponse.message,
        code: errorResponse.code,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
            details: errorResponse.details
        })
    });
};

/**
 * Categorize errors and provide appropriate responses
 */
const categorizeError = (err) => {
    const message = err.message.toLowerCase();

    // PDF Library Errors
    if (message.includes('pdf') && (message.includes('corrupt') || message.includes('invalid'))) {
        return {
            status: 400,
            code: 'PDF_CORRUPT',
            message: 'Το αρχείο PDF είναι κατεστραμμένο ή μη έγκυρο',
            details: 'The PDF file appears to be corrupted or in an invalid format'
        };
    }

    // File Not Found Errors
    if (message.includes('enoent') || message.includes('not found')) {
        return {
            status: 404,
            code: 'FILE_NOT_FOUND',
            message: 'Το αρχείο δεν βρέθηκε',
            details: 'The requested file could not be found'
        };
    }

    // Permission Errors
    if (message.includes('eacces') || message.includes('permission')) {
        return {
            status: 500,
            code: 'FILE_PERMISSION_ERROR',
            message: 'Σφάλμα δικαιωμάτων αρχείου',
            details: 'Insufficient permissions to access the file'
        };
    }

    // Disk Space Errors
    if (message.includes('enospc') || message.includes('no space')) {
        return {
            status: 507,
            code: 'DISK_SPACE_ERROR',
            message: 'Ανεπαρκής αποθηκευτικός χώρος',
            details: 'Insufficient disk space for the operation'
        };
    }

    // File Size Errors
    if (message.includes('file too large') || message.includes('size limit')) {
        return {
            status: 413,
            code: 'FILE_TOO_LARGE',
            message: 'Το αρχείο είναι πολύ μεγάλο',
            details: 'The file exceeds the maximum allowed size'
        };
    }

    // Database Errors
    if (message.includes('database') || message.includes('constraint') || message.includes('foreign key')) {
        return {
            status: 500,
            code: 'DATABASE_ERROR',
            message: 'Σφάλμα βάσης δεδομένων',
            details: 'A database operation failed'
        };
    }

    // Template Errors
    if (message.includes('template') && message.includes('not found')) {
        return {
            status: 404,
            code: 'TEMPLATE_NOT_FOUND',
            message: 'Το template PDF δεν βρέθηκε',
            details: 'The specified PDF template does not exist'
        };
    }

    // Mapping Errors
    if (message.includes('mapping') || message.includes('required fields')) {
        return {
            status: 400,
            code: 'MAPPING_ERROR',
            message: 'Σφάλμα στη σύνδεση πεδίων',
            details: 'Field mapping is incomplete or invalid'
        };
    }

    // Font Errors
    if (message.includes('font') || message.includes('embed')) {
        return {
            status: 500,
            code: 'FONT_ERROR',
            message: 'Σφάλμα γραμματοσειράς',
            details: 'Unable to load or embed the required font'
        };
    }

    // Timeout Errors
    if (message.includes('timeout') || message.includes('etimedout')) {
        return {
            status: 408,
            code: 'OPERATION_TIMEOUT',
            message: 'Η λειτουργία έληξε λόγω καθυστέρησης',
            details: 'The operation took too long to complete'
        };
    }

    // Network Errors
    if (message.includes('network') || message.includes('connection')) {
        return {
            status: 503,
            code: 'NETWORK_ERROR',
            message: 'Σφάλμα δικτύου',
            details: 'Network connection failed'
        };
    }

    // Validation Errors
    if (message.includes('validation') || message.includes('invalid')) {
        return {
            status: 400,
            code: 'VALIDATION_ERROR',
            message: 'Μη έγκυρα δεδομένα',
            details: 'The provided data failed validation'
        };
    }

    // Generic Error
    return {
        status: 500,
        code: 'UNKNOWN_ERROR',
        message: 'Προέκυψε ένα απροσδόκητο σφάλμα',
        details: 'An unexpected error occurred'
    };
};

/**
 * Log error to file for monitoring purposes
 */
const logErrorToFile = async (err, req) => {
    try {
        const logDir = path.join(__dirname, '../../logs');
        const logFile = path.join(logDir, 'pdf-errors.log');

        // Ensure log directory exists
        await fs.mkdir(logDir, { recursive: true });

        const logEntry = {
            timestamp: new Date().toISOString(),
            error: {
                message: err.message,
                stack: err.stack,
                name: err.name
            },
            request: {
                url: req.originalUrl,
                method: req.method,
                headers: {
                    'user-agent': req.headers['user-agent'],
                    'content-type': req.headers['content-type']
                },
                user: req.user?.id,
                body: req.method !== 'GET' ? sanitizeBody(req.body) : undefined
            }
        };

        const logLine = JSON.stringify(logEntry) + '\n';
        await fs.appendFile(logFile, logLine);

    } catch (logError) {
        // Don't let logging errors crash the application
        console.error('Failed to log error:', logError);
    }
};

/**
 * Sanitize request body for logging (remove sensitive data)
 */
const sanitizeBody = (body) => {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };

    // Remove potentially sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'credential'];

    for (const field of sensitiveFields) {
        if (sanitized[field]) {
            sanitized[field] = '[REDACTED]';
        }
    }

    // Truncate large field values to prevent massive logs
    Object.keys(sanitized).forEach(key => {
        if (typeof sanitized[key] === 'string' && sanitized[key].length > 1000) {
            sanitized[key] = sanitized[key].substring(0, 1000) + '... [TRUNCATED]';
        }
    });

    return sanitized;
};

/**
 * Middleware to validate PDF operations prerequisites
 */
const validatePDFOperation = (operation) => {
    return async (req, res, next) => {
        try {
            switch (operation) {
                case 'generate':
                    await validateGenerateOperation(req);
                    break;
                case 'upload':
                    await validateUploadOperation(req);
                    break;
                case 'analyze':
                    await validateAnalyzeOperation(req);
                    break;
                default:
                    throw new Error(`Unknown PDF operation: ${operation}`);
            }
            next();
        } catch (error) {
            next(error);
        }
    };
};

/**
 * Validate PDF generation operation
 */
const validateGenerateOperation = async (req) => {
    const { templateId, fieldValues } = req.body;

    if (!templateId || !Number.isInteger(Number(templateId))) {
        throw new Error('Valid template ID is required');
    }

    if (!fieldValues || typeof fieldValues !== 'object') {
        throw new Error('Field values are required');
    }

    // Additional validation can be added here
};

/**
 * Validate PDF upload operation
 */
const validateUploadOperation = async (req) => {
    if (!req.file && !req.files) {
        throw new Error('PDF file is required for upload');
    }

    const file = req.file || (req.files && req.files.length > 0 ? req.files[0] : null);

    if (!file) {
        throw new Error('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size exceeds 10MB limit');
    }
};

/**
 * Validate PDF analysis operation
 */
const validateAnalyzeOperation = async (req) => {
    const { templateId } = req.body;

    if (!templateId || !Number.isInteger(Number(templateId))) {
        throw new Error('Valid template ID is required for analysis');
    }
};

/**
 * Cleanup temporary files on error
 */
const cleanupTempFiles = (req, res, next) => {
    // Store original end function
    const originalEnd = res.end;

    res.end = function(...args) {
        // Clean up any uploaded files if the response indicates an error
        if (res.statusCode >= 400 && req.file) {
            fs.unlink(req.file.path).catch(err => {
                console.error('Failed to cleanup temp file:', err);
            });
        }

        // Call original end function
        originalEnd.apply(this, args);
    };

    next();
};

/**
 * Request timeout middleware for PDF operations
 */
const pdfTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
        const timeout = setTimeout(() => {
            const error = new Error('PDF operation timeout');
            error.code = 'OPERATION_TIMEOUT';
            next(error);
        }, timeoutMs);

        res.on('finish', () => {
            clearTimeout(timeout);
        });

        res.on('close', () => {
            clearTimeout(timeout);
        });

        next();
    };
};

module.exports = {
    pdfErrorHandler,
    validatePDFOperation,
    cleanupTempFiles,
    pdfTimeout,
    categorizeError,
    logErrorToFile
};