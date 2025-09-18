const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('fontkit');
const fs = require('fs').promises;
const path = require('path');
const pool = require('../config/db');

/**
 * PDF Generation Service
 * Handles the generation of filled PDFs using templates and field mappings
 */
class PDFGenerationService {
    constructor() {
        this.outputDir = path.join(__dirname, '../../uploads/generated_pdfs');
        this.ensureOutputDirectory();
    }

    /**
     * Ensure output directory exists
     */
    async ensureOutputDirectory() {
        try {
            await fs.mkdir(this.outputDir, { recursive: true });
        } catch (error) {
            console.error('Could not create output directory:', error);
        }
    }

    /**
     * Main function to generate a filled PDF from template and application data
     * @param {number} templateId - PDF template ID
     * @param {Object} applicationData - Application field values
     * @param {Object} customerDetails - Customer information
     * @param {Object} options - Additional options
     * @returns {Object} Generation result with file path and metadata
     */
    async generateFilledPDF(templateId, applicationData, customerDetails = {}, options = {}) {
        try {
            console.log(`Starting PDF generation for template ${templateId}`);

            // Get template information and file
            const template = await this.getTemplate(templateId);
            if (!template) {
                throw new Error(`Template ${templateId} not found`);
            }

            // Get field mappings for this template
            const mappings = await this.getMappings(templateId);
            if (!mappings || mappings.length === 0) {
                throw new Error(`No field mappings found for template ${templateId}`);
            }

            // Load the PDF template
            const templateBuffer = await fs.readFile(template.pdf_file_path);
            const pdfDoc = await PDFDocument.load(templateBuffer);

            // Register fontkit for custom font support
            pdfDoc.registerFontkit(fontkit);

            // Process the mappings and fill the PDF
            const filledDoc = await this.fillPDFWithMappings(
                pdfDoc,
                mappings,
                applicationData,
                customerDetails,
                options
            );

            // Generate output filename and save
            const outputFilename = this.generateOutputFilename(template, customerDetails);
            const outputPath = path.join(this.outputDir, outputFilename);

            const pdfBytes = await filledDoc.save();
            await fs.writeFile(outputPath, pdfBytes);

            console.log(`PDF generated successfully: ${outputPath}`);

            return {
                success: true,
                filePath: outputPath,
                filename: outputFilename,
                relativePath: `/generated_pdfs/${outputFilename}`,
                downloadUrl: `/uploads/generated_pdfs/${outputFilename}`,
                metadata: {
                    templateId: templateId,
                    templateName: template.template_name,
                    generatedAt: new Date(),
                    fileSize: pdfBytes.length,
                    pageCount: filledDoc.getPageCount()
                }
            };

        } catch (error) {
            console.error('PDF Generation Error:', error);
            throw new Error(`Failed to generate PDF: ${error.message}`);
        }
    }

    /**
     * Get template information from database
     * @param {number} templateId - Template ID
     * @returns {Object} Template data
     */
    async getTemplate(templateId) {
        const query = `
            SELECT
                pt.*,
                c.name as company_name,
                f.label as field_label
            FROM pdf_templates pt
            JOIN companies c ON pt.company_id = c.id
            JOIN fields f ON pt.field_id = f.id
            WHERE pt.id = $1
        `;

        const result = await pool.query(query, [templateId]);
        return result.rows.length > 0 ? result.rows[0] : null;
    }

    /**
     * Get field mappings for template
     * @param {number} templateId - Template ID
     * @returns {Array} Field mappings
     */
    async getMappings(templateId) {
        const query = `
            SELECT
                pvm.*,
                f.label as field_label,
                f.type as field_type
            FROM pdf_visual_mappings pvm
            LEFT JOIN fields f ON pvm.field_id = f.id
            WHERE pvm.template_id = $1
            ORDER BY pvm.page_number, pvm.position_y, pvm.position_x
        `;

        const result = await pool.query(query, [templateId]);

        // Transform visual mappings to compatible format
        return result.rows.map(row => {
            // Handle customer fields vs regular fields
            const isCustomerField = row.is_customer_field;
            const targetFieldId = isCustomerField ? row.customer_field_id : row.field_id;
            const fieldLabel = isCustomerField
                ? this.getCustomerFieldLabel(row.customer_field_id)
                : row.field_label;

            return {
                id: row.id,
                pdf_template_id: row.template_id,
                target_field_id: targetFieldId,
                field_type: row.field_type || 'text',
                field_label: fieldLabel,
                is_required: row.is_required,
                is_customer_field: isCustomerField,
                // Visual mapping specific data
                page_number: row.page_number,
                position_x: row.position_x,
                position_y: row.position_y,
                width: row.width,
                height: row.height,
                // Create a placeholder-like identifier for compatibility
                placeholder: `[${fieldLabel?.toUpperCase() || 'FIELD'}_${targetFieldId}]`
            };
        });
    }

    /**
     * Fill PDF with mapping data
     * @param {PDFDocument} pdfDoc - PDF document to fill
     * @param {Array} mappings - Field mappings
     * @param {Object} applicationData - Application data
     * @param {Object} customerDetails - Customer details
     * @param {Object} options - Additional options
     * @returns {PDFDocument} Filled PDF document
     */
    async fillPDFWithMappings(pdfDoc, mappings, applicationData, customerDetails, options) {
        console.log(`Filling PDF with ${mappings.length} mappings`);

        // Load a Unicode-compatible font that supports Greek characters
        let font;
        let fontSupportsUnicode = false;

        try {
            // First, try to load custom Unicode font (Noto Sans) that supports Greek
            const fontPath = path.join(__dirname, '../../assets/fonts/NotoSans-Regular.ttf');
            try {
                const fontBytes = await fs.readFile(fontPath);
                font = await pdfDoc.embedFont(fontBytes);
                fontSupportsUnicode = true;
                console.log('Successfully loaded Unicode font (Noto Sans) with Greek support');
            } catch (customFontError) {
                console.warn('Custom Unicode font not available, trying standard fonts:', customFontError.message);

                // Fallback to standard fonts - but these don't support Greek properly
                try {
                    font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
                    console.warn('Using TimesRoman - Greek characters may not display correctly');
                } catch (timesRomanError) {
                    try {
                        font = await pdfDoc.embedFont(StandardFonts.Courier);
                        console.warn('Using Courier - Greek characters may not display correctly');
                    } catch (courierError) {
                        font = await pdfDoc.embedFont(StandardFonts.Helvetica);
                        console.warn('Using Helvetica - Greek characters may not display correctly');
                    }
                }
            }
        } catch (error) {
            console.error('Critical font loading error:', error);
            font = await pdfDoc.embedFont(StandardFonts.Helvetica);
            console.warn('Using Helvetica as emergency fallback');
        }

        // Get all pages for multi-page support
        const pages = pdfDoc.getPages();

        // Process each mapping
        for (const mapping of mappings) {
            try {
                const value = this.getValueForMapping(mapping, applicationData, customerDetails);

                if (value !== null && value !== undefined && value !== '') {
                    // Get the appropriate page (visual mappings have page_number)
                    const pageIndex = (mapping.page_number || 1) - 1; // Convert to 0-based index
                    const targetPage = pages[pageIndex] || pages[0]; // Fallback to first page
                    const { width, height } = targetPage.getSize();

                    // Convert visual mapping data to coordinates format expected by fillPlaceholder
                    const mappingWithCoordinates = {
                        ...mapping,
                        coordinates: {
                            x: (mapping.position_x / 100) * width, // Convert percentage to pixels
                            y: (mapping.position_y / 100) * height, // Convert percentage to pixels
                            width: (mapping.width / 100) * width,
                            height: (mapping.height / 100) * height
                        }
                    };

                    await this.fillPlaceholder(
                        targetPage,
                        mappingWithCoordinates,
                        value,
                        font,
                        { width, height },
                        fontSupportsUnicode
                    );
                }
            } catch (error) {
                console.warn(`Error processing mapping ${mapping.placeholder}:`, error);
                // Continue with other mappings even if one fails
            }
        }

        return pdfDoc;
    }

    /**
     * Get value for a specific mapping
     * @param {Object} mapping - Field mapping
     * @param {Object} applicationData - Application data
     * @param {Object} customerDetails - Customer details
     * @returns {string} Value to fill
     */
    getValueForMapping(mapping, applicationData, customerDetails) {
        // Check if this is a customer field mapping (new system)
        if (mapping.target_field_id && typeof mapping.target_field_id === 'string' && mapping.target_field_id.startsWith('customer_')) {
            return this.getCustomerFieldValue(mapping.target_field_id, customerDetails);
        }

        // First try to get from application data using target field ID
        if (mapping.target_field_id && applicationData[mapping.target_field_id]) {
            let value = applicationData[mapping.target_field_id];

            // Handle different field types
            switch (mapping.field_type) {
                case 'checkbox':
                    return value === 'true' || value === true ? '☑' : '☐';
                case 'date':
                    return this.formatDate(value);
                case 'number':
                    return this.formatNumber(value);
                default:
                    return String(value);
            }
        }

        // Try to get from customer details based on placeholder name (legacy support)
        const placeholderUpper = (mapping.placeholder || '').toUpperCase();

        if (placeholderUpper.includes('ΟΝΟΜΑ') || placeholderUpper.includes('NAME')) {
            return customerDetails.full_name || '';
        }

        if (placeholderUpper.includes('ΤΗΛΕΦΩΝΟ') || placeholderUpper.includes('PHONE')) {
            return customerDetails.phone || '';
        }

        if (placeholderUpper.includes('ΔΙΕΥΘΥΝΣΗ') || placeholderUpper.includes('ADDRESS')) {
            return customerDetails.address || '';
        }

        if (placeholderUpper.includes('ΑΦΜ') || placeholderUpper.includes('VAT')) {
            return customerDetails.afm || '';
        }

        // Add current date for date placeholders
        if (placeholderUpper.includes('ΗΜΕΡΟΜΗΝΙΑ') || placeholderUpper.includes('DATE')) {
            return this.formatDate(new Date());
        }

        return ''; // Return empty string if no value found
    }

    /**
     * Get customer field value by field ID
     * @param {string} fieldId - Customer field ID
     * @param {Object} customerDetails - Customer details object
     * @returns {string} Customer field value
     */
    getCustomerFieldValue(fieldId, customerDetails) {
        const fieldMap = {
            'customer_name': customerDetails.full_name || '',
            'customer_afm': customerDetails.afm || '',
            'customer_phone': customerDetails.phone || '',
            'customer_address': customerDetails.address || '',
            'customer_email': customerDetails.email || ''
        };

        return fieldMap[fieldId] || '';
    }

    /**
     * Get customer field label by field ID
     * @param {string} fieldId - Customer field ID
     * @returns {string} Customer field label
     */
    getCustomerFieldLabel(fieldId) {
        const fieldLabels = {
            'customer_name': 'Ονοματεπώνυμο',
            'customer_afm': 'ΑΦΜ',
            'customer_phone': 'Τηλέφωνο',
            'customer_address': 'Διεύθυνση',
            'customer_email': 'Email'
        };

        return fieldLabels[fieldId] || fieldId;
    }

    /**
     * Fill a specific placeholder in the PDF
     * @param {PDFPage} page - PDF page
     * @param {Object} mapping - Field mapping
     * @param {string} value - Value to fill
     * @param {PDFFont} font - Font to use
     * @param {Object} pageSize - Page dimensions
     * @param {boolean} fontSupportsUnicode - Whether font supports Unicode characters
     */
    async fillPlaceholder(page, mapping, value, font, pageSize, fontSupportsUnicode = false) {
        // If coordinates are available, use them for precise placement
        if (mapping.coordinates && mapping.coordinates.x && mapping.coordinates.y) {
            const { x, y, width: fieldWidth, height: fieldHeight } = mapping.coordinates;

            try {
                page.drawText(String(value), {
                    x: x,
                    y: pageSize.height - y, // PDF coordinate system is bottom-up
                    size: fieldHeight ? Math.min(fieldHeight - 2, 12) : 10,
                    font: font,
                    color: rgb(0, 0, 0),
                    maxWidth: fieldWidth || 200,
                });
            } catch (encodingError) {
                if (fontSupportsUnicode) {
                    // If we're using a Unicode font but still get encoding error,
                    // log the issue but try to continue without conversion
                    console.error(`Unexpected encoding error with Unicode font for "${value}":`, encodingError.message);

                    // Try with a simpler approach - remove problematic characters but preserve readable ones
                    const cleanValue = String(value).replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters only
                    try {
                        page.drawText(cleanValue, {
                            x: x,
                            y: pageSize.height - y,
                            size: fieldHeight ? Math.min(fieldHeight - 2, 12) : 10,
                            font: font,
                            color: rgb(0, 0, 0),
                            maxWidth: fieldWidth || 200,
                        });
                    } catch (retryError) {
                        console.error(`Failed to render text even after cleaning: "${cleanValue}". Skipping this field.`);
                        // Skip this field rather than converting to ASCII
                    }
                } else {
                    // Using standard font that doesn't support Unicode
                    console.warn(`Font does not support Unicode characters in "${value}". Consider using Unicode font for proper character display.`);

                    // As a last resort, use ASCII conversion only for non-Unicode fonts
                    const safeValue = this.toAsciiSafe(String(value));
                    try {
                        page.drawText(safeValue, {
                            x: x,
                            y: pageSize.height - y,
                            size: fieldHeight ? Math.min(fieldHeight - 2, 12) : 10,
                            font: font,
                            color: rgb(0, 0, 0),
                            maxWidth: fieldWidth || 200,
                        });
                    } catch (fallbackError) {
                        console.error(`Failed to render even ASCII-converted text: "${safeValue}". Skipping field.`);
                    }
                }
            }

        } else {
            // Fallback: Use simple text replacement
            await this.replaceTextInPDF(page, mapping.placeholder, value, font, fontSupportsUnicode);
        }
    }

    /**
     * Simple text replacement in PDF (fallback method)
     * @param {PDFPage} page - PDF page
     * @param {string} placeholder - Placeholder text
     * @param {string} value - Replacement value
     * @param {PDFFont} font - Font to use
     * @param {boolean} fontSupportsUnicode - Whether font supports Unicode characters
     */
    async replaceTextInPDF(page, placeholder, value, font, fontSupportsUnicode = false) {
        // This is a simplified approach. In a production system,
        // you would need more sophisticated text extraction and replacement

        // For now, we'll place text at a reasonable position
        const { width, height } = page.getSize();

        // Simple heuristic positioning based on placeholder type
        let x = 100;
        let y = height - 100;

        const placeholderUpper = placeholder.toUpperCase();
        if (placeholderUpper.includes('ΟΝΟΜΑ') || placeholderUpper.includes('NAME')) {
            y = height - 200;
        } else if (placeholderUpper.includes('ΤΗΛΕΦΩΝΟ') || placeholderUpper.includes('PHONE')) {
            y = height - 250;
        } else if (placeholderUpper.includes('ΔΙΕΥΘΥΝΣΗ') || placeholderUpper.includes('ADDRESS')) {
            y = height - 300;
        }

        // Handle text encoding based on font capabilities
        try {
            page.drawText(`${placeholder}: ${value}`, {
                x: x,
                y: y,
                size: 10,
                font: font,
                color: rgb(0, 0, 0),
            });
        } catch (encodingError) {
            if (fontSupportsUnicode) {
                console.error(`Unexpected encoding error with Unicode font for "${placeholder}: ${value}":`, encodingError.message);

                // Try with cleaned text (remove control characters but preserve Unicode)
                const cleanPlaceholder = placeholder.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
                const cleanValue = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');

                try {
                    page.drawText(`${cleanPlaceholder}: ${cleanValue}`, {
                        x: x,
                        y: y,
                        size: 10,
                        font: font,
                        color: rgb(0, 0, 0),
                    });
                } catch (retryError) {
                    console.error(`Failed to render cleaned text: "${cleanPlaceholder}: ${cleanValue}". Skipping this field.`);
                }
            } else {
                console.warn(`Font does not support Unicode characters in "${placeholder}: ${value}". Consider using Unicode font.`);

                // Only convert to ASCII if using non-Unicode font
                const safePlaceholder = this.toAsciiSafe(placeholder);
                const safeValue = this.toAsciiSafe(value);

                try {
                    page.drawText(`${safePlaceholder}: ${safeValue}`, {
                        x: x,
                        y: y,
                        size: 10,
                        font: font,
                        color: rgb(0, 0, 0),
                    });
                } catch (fallbackError) {
                    console.error(`Failed to render ASCII-converted text: "${safePlaceholder}: ${safeValue}". Skipping field.`);
                }
            }
        }
    }

    /**
     * Convert Greek text to ASCII-safe representation
     * @param {string} text - Text to convert
     * @returns {string} ASCII-safe text
     */
    toAsciiSafe(text) {
        if (!text) return '';

        // Greek to Latin transliteration map
        const greekToLatin = {
            'Α': 'A', 'Β': 'B', 'Γ': 'G', 'Δ': 'D', 'Ε': 'E', 'Ζ': 'Z', 'Η': 'H', 'Θ': 'TH',
            'Ι': 'I', 'Κ': 'K', 'Λ': 'L', 'Μ': 'M', 'Ν': 'N', 'Ξ': 'X', 'Ο': 'O', 'Π': 'P',
            'Ρ': 'R', 'Σ': 'S', 'Τ': 'T', 'Υ': 'Y', 'Φ': 'F', 'Χ': 'CH', 'Ψ': 'PS', 'Ω': 'O',
            'α': 'a', 'β': 'b', 'γ': 'g', 'δ': 'd', 'ε': 'e', 'ζ': 'z', 'η': 'h', 'θ': 'th',
            'ι': 'i', 'κ': 'k', 'λ': 'l', 'μ': 'm', 'ν': 'n', 'ξ': 'x', 'ο': 'o', 'π': 'p',
            'ρ': 'r', 'σ': 's', 'ς': 's', 'τ': 't', 'υ': 'y', 'φ': 'f', 'χ': 'ch', 'ψ': 'ps', 'ω': 'o',
            'ά': 'a', 'έ': 'e', 'ή': 'h', 'ί': 'i', 'ό': 'o', 'ύ': 'y', 'ώ': 'o'
        };

        let result = text;
        for (const [greek, latin] of Object.entries(greekToLatin)) {
            result = result.replace(new RegExp(greek, 'g'), latin);
        }

        return result;
    }

    /**
     * Format date for display
     * @param {Date|string} date - Date to format
     * @returns {string} Formatted date
     */
    formatDate(date) {
        if (!date) return '';

        const dateObj = date instanceof Date ? date : new Date(date);

        if (isNaN(dateObj.getTime())) return String(date);

        return dateObj.toLocaleDateString('el-GR');
    }

    /**
     * Format number for display
     * @param {number|string} number - Number to format
     * @returns {string} Formatted number
     */
    formatNumber(number) {
        if (!number && number !== 0) return '';

        const num = typeof number === 'string' ? parseFloat(number) : number;

        if (isNaN(num)) return String(number);

        return num.toLocaleString('el-GR');
    }

    /**
     * Generate unique output filename
     * @param {Object} template - Template information
     * @param {Object} customerDetails - Customer details
     * @returns {string} Output filename
     */
    generateOutputFilename(template, customerDetails) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const customerName = (customerDetails.full_name || 'customer')
            .replace(/[^a-zA-Z0-9αβγδεζηθικλμνξοπρστυφχψω]/gi, '_')
            .substring(0, 20);

        const templateName = template.template_name
            .replace(/[^a-zA-Z0-9αβγδεζηθικλμνξοπρστυφχψω]/gi, '_')
            .substring(0, 30);

        return `${templateName}_${customerName}_${timestamp}.pdf`;
    }

    /**
     * Validate that all required fields are filled
     * @param {number} templateId - Template ID
     * @param {Object} applicationData - Application data
     * @returns {Object} Validation result
     */
    async validateRequiredFields(templateId, applicationData) {
        const mappings = await this.getMappings(templateId);

        // Get all fields to check which ones are required_for_pdf
        const fieldsResult = await pool.query('SELECT * FROM fields');
        const allFields = fieldsResult.rows;

        // Filter mappings based on field.required_for_pdf instead of mapping.is_required
        const requiredMappings = mappings.filter(m => {
            const field = allFields.find(f => f.id === m.target_field_id);
            return field?.required_for_pdf === true;
        });

        const missingFields = [];
        const availableFields = [];

        for (const mapping of requiredMappings) {
            const value = applicationData[mapping.target_field_id];
            const isEmpty = !value || value.toString().trim() === '';

            if (isEmpty) {
                missingFields.push({
                    fieldId: mapping.target_field_id,
                    fieldLabel: mapping.field_label,
                    placeholder: mapping.placeholder
                });
            } else {
                availableFields.push({
                    fieldId: mapping.target_field_id,
                    fieldLabel: mapping.field_label,
                    value: value
                });
            }
        }

        return {
            isValid: missingFields.length === 0,
            requiredCount: requiredMappings.length,
            missingCount: missingFields.length,
            missingFields,
            availableFields
        };
    }

    /**
     * Clean up old generated PDFs to save disk space
     * @param {number} maxAgeHours - Maximum age in hours before cleanup
     */
    async cleanupOldPDFs(maxAgeHours = 24) {
        try {
            const files = await fs.readdir(this.outputDir);
            const now = new Date();

            for (const file of files) {
                if (!file.endsWith('.pdf')) continue;

                const filePath = path.join(this.outputDir, file);
                const stats = await fs.stat(filePath);
                const ageHours = (now - stats.mtime) / (1000 * 60 * 60);

                if (ageHours > maxAgeHours) {
                    await fs.unlink(filePath);
                    console.log(`Cleaned up old PDF: ${file}`);
                }
            }
        } catch (error) {
            console.error('Error during PDF cleanup:', error);
        }
    }
}

module.exports = new PDFGenerationService();