const pool = require('../config/db');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pdfAnalysisService = require('../services/pdfAnalysisService');
const mappingEngine = require('../services/mappingEngine');

// Configure multer for PDF template uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/pdf_templates');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${originalName}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

/**
 * Upload and analyze a PDF template for a specific dropdown option
 */
const uploadPDFTemplate = async (req, res) => {
    const { companyId } = req.params;
    const { fieldId, optionValue, templateName } = req.body;

    if (!req.file) {
        return res.status(400).json({ message: 'PDF file is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify company and field exist and user has permission
        const companyResult = await client.query(
            'SELECT id, name FROM companies WHERE id = $1',
            [companyId]
        );

        if (companyResult.rows.length === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }

        const fieldResult = await client.query(
            'SELECT id, label, type FROM fields WHERE id = $1',
            [fieldId]
        );

        if (fieldResult.rows.length === 0) {
            return res.status(404).json({ message: 'Field not found' });
        }

        // Check if template for this combination already exists
        const existingResult = await client.query(
            'SELECT id FROM pdf_templates WHERE company_id = $1 AND field_id = $2 AND option_value = $3',
            [companyId, fieldId, optionValue]
        );

        let templateId;

        if (existingResult.rows.length > 0) {
            // Update existing template
            templateId = existingResult.rows[0].id;

            await client.query(`
                UPDATE pdf_templates
                SET template_name = $1, pdf_file_path = $2, analysis_status = 'pending', updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [templateName, req.file.path, templateId]);
        } else {
            // Create new template
            const insertResult = await client.query(`
                INSERT INTO pdf_templates (company_id, field_id, option_value, template_name, pdf_file_path, analysis_status)
                VALUES ($1, $2, $3, $4, $5, 'pending')
                RETURNING id
            `, [companyId, fieldId, optionValue, templateName, req.file.path]);

            templateId = insertResult.rows[0].id;
        }

        // Analyze PDF in background (don't block the response)
        setImmediate(async () => {
            try {
                const fileBuffer = await fs.readFile(req.file.path);
                const analysis = await pdfAnalysisService.analyzePDF(fileBuffer, templateId);

                // Update database with analysis results
                await pool.query(`
                    UPDATE pdf_templates
                    SET analysis_status = 'analyzed', placeholders_detected = $1
                    WHERE id = $2
                `, [analysis.placeholders.length, templateId]);

                console.log(`PDF analysis completed for template ${templateId}: ${analysis.placeholders.length} placeholders found`);
            } catch (analysisError) {
                console.error(`PDF analysis failed for template ${templateId}:`, analysisError);

                await pool.query(
                    'UPDATE pdf_templates SET analysis_status = \'failed\' WHERE id = $1',
                    [templateId]
                );
            }
        });

        await client.query('COMMIT');

        res.status(201).json({
            success: true,
            templateId: templateId,
            message: 'PDF template uploaded successfully. Analysis in progress...',
            template: {
                id: templateId,
                companyId: parseInt(companyId),
                fieldId: parseInt(fieldId),
                optionValue: optionValue,
                templateName: templateName,
                fileName: req.file.filename,
                analysisStatus: 'pending'
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');

        // Clean up uploaded file on error
        try {
            await fs.unlink(req.file.path);
        } catch (unlinkError) {
            console.warn('Could not delete uploaded file:', unlinkError);
        }

        console.error('Error uploading PDF template:', error);
        res.status(500).json({
            message: 'Failed to upload PDF template',
            error: error.message
        });
    } finally {
        client.release();
    }
};

/**
 * Get all PDF templates for a company
 */
const getCompanyPDFTemplates = async (req, res) => {
    const { companyId } = req.params;

    try {
        const query = `
            SELECT
                pt.id,
                pt.field_id,
                pt.option_value,
                pt.template_name,
                pt.analysis_status,
                pt.placeholders_detected,
                pt.created_at,
                pt.updated_at,
                f.label as field_label,
                f.type as field_type
            FROM pdf_templates pt
            JOIN fields f ON pt.field_id = f.id
            WHERE pt.company_id = $1
            ORDER BY f.label, pt.option_value
        `;

        const result = await pool.query(query, [companyId]);

        res.json({
            success: true,
            templates: result.rows
        });

    } catch (error) {
        console.error('Error fetching PDF templates:', error);
        res.status(500).json({
            message: 'Failed to fetch PDF templates',
            error: error.message
        });
    }
};

/**
 * Get specific PDF template details with placeholders
 */
const getPDFTemplateDetails = async (req, res) => {
    const { templateId } = req.params;

    try {
        // Get template basic info
        const templateQuery = `
            SELECT
                pt.*,
                c.name as company_name,
                f.label as field_label
            FROM pdf_templates pt
            JOIN companies c ON pt.company_id = c.id
            JOIN fields f ON pt.field_id = f.id
            WHERE pt.id = $1
        `;

        const templateResult = await pool.query(templateQuery, [templateId]);

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ message: 'PDF template not found' });
        }

        const template = templateResult.rows[0];

        // If template is analyzed, get placeholders and mappings
        let placeholders = [];
        let mappings = [];

        if (template.analysis_status === 'analyzed' || template.analysis_status === 'mapped') {
            // Re-analyze the PDF to get current placeholders
            const fileBuffer = await fs.readFile(template.pdf_file_path);
            const analysis = await pdfAnalysisService.analyzePDF(fileBuffer, templateId);
            placeholders = analysis.placeholders;

            // Get existing mappings
            const mappingsQuery = `
                SELECT
                    pfm.*,
                    f.label as field_label,
                    f.type as field_type
                FROM pdf_field_mappings pfm
                LEFT JOIN fields f ON pfm.target_field_id = f.id
                WHERE pfm.pdf_template_id = $1
                ORDER BY pfm.placeholder
            `;

            const mappingsResult = await pool.query(mappingsQuery, [templateId]);
            mappings = mappingsResult.rows;
        }

        res.json({
            success: true,
            template: template,
            placeholders: placeholders,
            mappings: mappings,
            analysisComplete: template.analysis_status === 'analyzed' || template.analysis_status === 'mapped'
        });

    } catch (error) {
        console.error('Error fetching PDF template details:', error);
        res.status(500).json({
            message: 'Failed to fetch PDF template details',
            error: error.message
        });
    }
};

/**
 * Analyze PDF template and generate mapping suggestions
 */
const analyzePDFTemplate = async (req, res) => {
    const { templateId } = req.params;

    try {
        // Get template info
        const templateResult = await pool.query(`
            SELECT pt.*, c.id as company_id
            FROM pdf_templates pt
            JOIN companies c ON pt.company_id = c.id
            WHERE pt.id = $1
        `, [templateId]);

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ message: 'PDF template not found' });
        }

        const template = templateResult.rows[0];

        // Get company fields for mapping suggestions
        const fieldsResult = await pool.query(`
            SELECT f.id, f.label, f.type, f.is_commissionable
            FROM fields f
            JOIN company_fields cf ON f.id = cf.field_id
            WHERE cf.company_id = $1
            ORDER BY f.label
        `, [template.company_id]);

        const companyFields = fieldsResult.rows;

        // Analyze PDF
        const fileBuffer = await fs.readFile(template.pdf_file_path);
        const analysis = await pdfAnalysisService.analyzePDF(fileBuffer, templateId);

        // Generate mapping suggestions
        const enhancedPlaceholders = await mappingEngine.generateMappingSuggestions(
            analysis.placeholders,
            companyFields,
            template.company_id
        );

        // Update analysis status
        await pool.query(`
            UPDATE pdf_templates
            SET analysis_status = 'analyzed', placeholders_detected = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        `, [analysis.placeholders.length, templateId]);

        res.json({
            success: true,
            analysis: {
                ...analysis,
                placeholders: enhancedPlaceholders
            },
            availableFields: companyFields,
            message: `Analysis completed. Found ${analysis.placeholders.length} placeholders.`
        });

    } catch (error) {
        console.error('Error analyzing PDF template:', error);

        // Update status to failed
        try {
            await pool.query(
                'UPDATE pdf_templates SET analysis_status = \'failed\' WHERE id = $1',
                [templateId]
            );
        } catch (updateError) {
            console.error('Could not update failed status:', updateError);
        }

        res.status(500).json({
            message: 'Failed to analyze PDF template',
            error: error.message
        });
    }
};

/**
 * Save field mappings for a PDF template
 */
const savePDFMappings = async (req, res) => {
    const { templateId } = req.params;
    const { mappings } = req.body;

    if (!Array.isArray(mappings)) {
        return res.status(400).json({ message: 'Mappings must be an array' });
    }

    try {
        const result = await mappingEngine.saveMappings(templateId, mappings);

        res.json({
            success: true,
            ...result,
            templateId: parseInt(templateId)
        });

    } catch (error) {
        console.error('Error saving PDF mappings:', error);
        res.status(500).json({
            message: 'Failed to save PDF mappings',
            error: error.message
        });
    }
};

/**
 * Get existing mappings for a PDF template
 */
const getPDFMappings = async (req, res) => {
    const { templateId } = req.params;

    try {
        const query = `
            SELECT
                pfm.*,
                f.label as field_label,
                f.type as field_type
            FROM pdf_field_mappings pfm
            LEFT JOIN fields f ON pfm.target_field_id = f.id
            WHERE pfm.pdf_template_id = $1
            ORDER BY pfm.placeholder
        `;

        const result = await pool.query(query, [templateId]);

        res.json({
            success: true,
            mappings: result.rows
        });

    } catch (error) {
        console.error('Error fetching PDF mappings:', error);
        res.status(500).json({
            message: 'Failed to fetch PDF mappings',
            error: error.message
        });
    }
};

/**
 * Delete a PDF template
 */
const deletePDFTemplate = async (req, res) => {
    const { templateId } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get template info for file cleanup
        const templateResult = await client.query(
            'SELECT pdf_file_path FROM pdf_templates WHERE id = $1',
            [templateId]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ message: 'PDF template not found' });
        }

        const filePath = templateResult.rows[0].pdf_file_path;

        // Delete template (cascades to mappings)
        await client.query('DELETE FROM pdf_templates WHERE id = $1', [templateId]);

        // Clean up file
        try {
            await fs.unlink(filePath);
        } catch (fileError) {
            console.warn('Could not delete template file:', fileError);
        }

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'PDF template deleted successfully'
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting PDF template:', error);
        res.status(500).json({
            message: 'Failed to delete PDF template',
            error: error.message
        });
    } finally {
        client.release();
    }
};

/**
 * Download PDF template file
 */
const downloadPDFTemplate = async (req, res) => {
    const { templateId } = req.params;

    try {
        const templateResult = await pool.query(
            'SELECT pdf_file_path, template_name FROM pdf_templates WHERE id = $1',
            [templateId]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ message: 'PDF template not found' });
        }

        const { pdf_file_path, template_name } = templateResult.rows[0];

        // Check if file exists
        try {
            await fs.access(pdf_file_path);
        } catch (fileError) {
            return res.status(404).json({ message: 'Template file not found on disk' });
        }

        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');

        // Sanitize filename to avoid header issues
        const sanitizedName = template_name
            .replace(/[^\w\s.-]/gi, '_')  // Replace special chars with underscore
            .replace(/\s+/g, '_')         // Replace spaces with underscore
            .substring(0, 100);           // Limit length

        res.setHeader('Content-Disposition', `inline; filename="${sanitizedName}.pdf"`);

        // Send file
        res.sendFile(path.resolve(pdf_file_path));

    } catch (error) {
        console.error('Error downloading PDF template:', error);
        res.status(500).json({
            message: 'Failed to download PDF template',
            error: error.message
        });
    }
};

/**
 * Upload PDF template for user's company (simplified endpoint)
 */
const uploadPDFTemplateForUser = async (req, res) => {
    console.log('[PDF_UPLOAD] Starting PDF upload process');
    console.log('[PDF_UPLOAD] Request body:', req.body);
    console.log('[PDF_UPLOAD] File info:', req.file ? { filename: req.file.filename, mimetype: req.file.mimetype, size: req.file.size } : 'No file');

    const { fieldOptionId, templateName } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!req.file) {
        console.log('[PDF_UPLOAD] Error: No PDF file provided');
        return res.status(400).json({ message: 'PDF file is required' });
    }

    if (!fieldOptionId) {
        console.log('[PDF_UPLOAD] Error: No field option ID provided');
        return res.status(400).json({ message: 'Field option ID is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('[PDF_UPLOAD] Database transaction started');

        // Get user's company - Admin users can access all companies, regular users their own
        let companyQuery, companyParams;

        if (req.user.role === 'Admin') {
            // For admin users, we need to determine which company they're managing
            // This should come from the request (e.g., company selection in frontend)
            // For now, we'll require company_id in request body for admin users
            const { companyId: requestedCompanyId } = req.body;

            if (requestedCompanyId) {
                companyQuery = `SELECT id, name FROM companies WHERE id = $1`;
                companyParams = [requestedCompanyId];
            } else {
                // If no specific company requested, use the first available (backwards compatibility)
                console.log('[PDF_UPLOAD] Warning: Admin user without specific company ID - using first available');
                companyQuery = `SELECT id, name FROM companies ORDER BY id LIMIT 1`;
                companyParams = [];
            }
        } else {
            // For regular users, get their assigned companies (they can be associated with multiple companies via commissions)
            companyQuery = `
                SELECT DISTINCT c.id, c.name
                FROM companies c
                JOIN user_commissions uc ON uc.company_id = c.id
                WHERE uc.associate_id = $1
                ORDER BY c.name
                LIMIT 1
            `;
            companyParams = [userId];
        }

        const companyResult = await client.query(companyQuery, companyParams);

        if (companyResult.rows.length === 0) {
            console.log('[PDF_UPLOAD] Error: No accessible company found for user');
            return res.status(404).json({
                message: req.user.role === 'Admin' ? 'Company not found' : 'No company assigned to user'
            });
        }

        const { id: companyId, name: companyName } = companyResult.rows[0];
        console.log('[PDF_UPLOAD] Using company:', { companyId, companyName, userRole: req.user.role });

        // Verify field option exists and get field info
        // First, let's check if the field option exists at all
        const basicOptionQuery = `
            SELECT fo.*, f.id as field_id, f.label as field_label, f.type as field_type
            FROM field_options fo
            JOIN fields f ON fo.field_id = f.id
            WHERE fo.id = $1 AND fo.is_active = true
        `;
        console.log('[PDF_UPLOAD] Checking for field option with ID:', fieldOptionId);
        const basicOptionResult = await client.query(basicOptionQuery, [fieldOptionId]);

        if (basicOptionResult.rows.length === 0) {
            console.log('[PDF_UPLOAD] Error: Field option not found or inactive');
            return res.status(404).json({
                message: `Field option with ID ${fieldOptionId} not found or inactive`
            });
        }

        const fieldOption = basicOptionResult.rows[0];
        console.log('[PDF_UPLOAD] Found field option:', fieldOption);

        // Check if this field is associated with the company
        const companyFieldQuery = `
            SELECT 1 FROM company_fields WHERE company_id = $1 AND field_id = $2
        `;
        const companyFieldResult = await client.query(companyFieldQuery, [companyId, fieldOption.field_id]);

        if (companyFieldResult.rows.length === 0) {
            console.log('[PDF_UPLOAD] Error: Field not associated with company');
            return res.status(404).json({
                message: 'Field not accessible for this company'
            });
        }

        // Check if template for this option already exists
        const existingResult = await client.query(
            'SELECT id FROM pdf_templates WHERE company_id = $1 AND field_option_id = $2',
            [companyId, fieldOptionId]
        );

        let templateId;

        if (existingResult.rows.length > 0) {
            // Update existing template
            templateId = existingResult.rows[0].id;
            console.log('[PDF_UPLOAD] Updating existing template:', templateId);

            await client.query(`
                UPDATE pdf_templates
                SET template_name = $1, pdf_file_path = $2, analysis_status = 'pending', updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
            `, [templateName, req.file.path, templateId]);
        } else {
            // Create new template
            console.log('[PDF_UPLOAD] Creating new template');
            const insertResult = await client.query(`
                INSERT INTO pdf_templates (company_id, field_id, field_option_id, option_value, template_name, pdf_file_path, analysis_status)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending')
                RETURNING id
            `, [companyId, fieldOption.field_id, fieldOptionId, fieldOption.option_value, templateName, req.file.path]);

            templateId = insertResult.rows[0].id;
            console.log('[PDF_UPLOAD] Created new template with ID:', templateId);
        }

        // Analyze PDF in background (don't block the response)
        setImmediate(async () => {
            try {
                console.log('[PDF_UPLOAD] Starting background PDF analysis for template:', templateId);
                const fileBuffer = await fs.readFile(req.file.path);
                const analysis = await pdfAnalysisService.analyzePDF(fileBuffer, templateId);

                // Update database with analysis results
                await pool.query(`
                    UPDATE pdf_templates
                    SET analysis_status = 'analyzed', placeholders_detected = $1
                    WHERE id = $2
                `, [analysis.placeholders.length, templateId]);

                console.log(`[PDF_UPLOAD] PDF analysis completed for template ${templateId}: ${analysis.placeholders.length} placeholders found`);
            } catch (analysisError) {
                console.error(`[PDF_UPLOAD] PDF analysis failed for template ${templateId}:`, analysisError);

                await pool.query(
                    'UPDATE pdf_templates SET analysis_status = \'failed\' WHERE id = $1',
                    [templateId]
                );
            }
        });

        await client.query('COMMIT');
        console.log('[PDF_UPLOAD] Transaction committed successfully');

        res.status(201).json({
            success: true,
            templateId: templateId,
            message: 'PDF template uploaded successfully. Analysis in progress...',
            template: {
                id: templateId,
                companyId: companyId,
                fieldId: fieldOption.field_id,
                fieldOptionId: parseInt(fieldOptionId),
                templateName: templateName,
                fileName: req.file.filename,
                analysisStatus: 'pending',
                fieldLabel: fieldOption.field_label,
                optionLabel: fieldOption.option_label
            }
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[PDF_UPLOAD] Error during PDF upload:', error);
        console.error('[PDF_UPLOAD] Error stack:', error.stack);

        // Clean up uploaded file on error
        try {
            await fs.unlink(req.file.path);
        } catch (unlinkError) {
            console.warn('[PDF_UPLOAD] Could not delete uploaded file:', unlinkError);
        }

        res.status(500).json({
            message: 'Failed to upload PDF template',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    } finally {
        client.release();
    }
};

/**
 * Save visual mappings for a PDF template (position-based)
 */
const saveVisualMappings = async (req, res) => {
    const { templateId } = req.params;
    const { mappings } = req.body;

    if (!mappings || !Array.isArray(mappings)) {
        return res.status(400).json({ message: 'Mappings array is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Verify template exists and user has permission
        const templateResult = await client.query(`
            SELECT pt.id, pt.company_id, pt.template_name
            FROM pdf_templates pt
            WHERE pt.id = $1
        `, [templateId]);

        if (templateResult.rows.length === 0) {
            return res.status(404).json({ message: 'Template not found' });
        }

        // Delete existing visual mappings for this template
        await client.query(
            'DELETE FROM pdf_visual_mappings WHERE template_id = $1',
            [templateId]
        );

        // Insert new visual mappings
        for (const mapping of mappings) {
            const isCustomerField = mapping.isCustomerField || false;

            await client.query(`
                INSERT INTO pdf_visual_mappings (
                    template_id, field_id, field_type, page_number,
                    position_x, position_y, width, height, is_required,
                    is_customer_field, customer_field_id
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [
                templateId,
                isCustomerField ? null : mapping.fieldId, // NULL for customer fields
                mapping.fieldType,
                mapping.page,
                mapping.position.x,
                mapping.position.y,
                mapping.position.width,
                mapping.position.height,
                mapping.isRequired || false,
                isCustomerField,
                isCustomerField ? mapping.fieldId : null // Store customer field ID
            ]);
        }

        // Update template status to 'mapped'
        await client.query(`
            UPDATE pdf_templates
            SET analysis_status = 'mapped', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [templateId]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: `Successfully saved ${mappings.length} visual mappings`,
            mappingsCount: mappings.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error saving visual mappings:', error);
        res.status(500).json({
            message: 'Failed to save visual mappings',
            error: error.message
        });
    } finally {
        client.release();
    }
};

/**
 * Get customer field label by field ID
 */
const getCustomerFieldLabel = (fieldId) => {
    const customerFieldLabels = {
        'customer_name': 'Ονοματεπώνυμο',
        'customer_afm': 'ΑΦΜ',
        'customer_phone': 'Τηλέφωνο',
        'customer_address': 'Διεύθυνση',
        'customer_email': 'Email'
    };
    return customerFieldLabels[fieldId] || fieldId;
};

/**
 * Get visual mappings for a PDF template
 */
const getVisualMappings = async (req, res) => {
    const { templateId } = req.params;

    try {
        const result = await pool.query(`
            SELECT
                pvm.id,
                pvm.field_id,
                pvm.field_type,
                pvm.page_number,
                pvm.position_x,
                pvm.position_y,
                pvm.width,
                pvm.height,
                pvm.is_required,
                pvm.is_customer_field,
                pvm.customer_field_id,
                f.label as field_label
            FROM pdf_visual_mappings pvm
            LEFT JOIN fields f ON pvm.field_id = f.id
            WHERE pvm.template_id = $1
            ORDER BY pvm.page_number, pvm.position_y, pvm.position_x
        `, [templateId]);

        const mappings = result.rows.map(row => {
            // Handle customer fields vs regular fields
            const fieldId = row.is_customer_field ? row.customer_field_id : row.field_id;
            const fieldLabel = row.is_customer_field
                ? getCustomerFieldLabel(row.customer_field_id)
                : row.field_label;

            return {
                id: row.id,
                fieldId: fieldId,
                fieldLabel: fieldLabel,
                fieldType: row.field_type,
                isCustomerField: row.is_customer_field,
                page: row.page_number,
                position: {
                    x: parseFloat(row.position_x),
                    y: parseFloat(row.position_y),
                    width: parseFloat(row.width),
                    height: parseFloat(row.height)
                },
                isRequired: row.is_required
            };
        });

        res.json({
            success: true,
            mappings
        });

    } catch (error) {
        console.error('Error getting visual mappings:', error);
        res.status(500).json({
            message: 'Failed to get visual mappings',
            error: error.message
        });
    }
};

module.exports = {
    upload: upload.single('pdf'),
    uploadPDFTemplate,
    uploadPDFTemplateForUser,
    getCompanyPDFTemplates,
    getPDFTemplateDetails,
    analyzePDFTemplate,
    savePDFMappings,
    getPDFMappings,
    deletePDFTemplate,
    downloadPDFTemplate,
    saveVisualMappings,
    getVisualMappings
};