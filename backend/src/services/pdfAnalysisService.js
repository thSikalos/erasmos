const { PDFDocument } = require('pdf-lib');
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;
const path = require('path');

/**
 * PDF Analysis Service
 * Handles PDF text extraction, placeholder detection, and form field analysis
 */
class PDFAnalysisService {
    constructor() {
        // Placeholder patterns to detect in PDF text
        this.placeholderPatterns = [
            // Standard bracket patterns with extended Greek support
            { pattern: /\[([A-Z_\u0370-\u03FF\u1F00-\u1FFF\s]+)\]/g, type: 'bracket', confidence: 0.95 },
            { pattern: /\{([A-Z_\u0370-\u03FF\u1F00-\u1FFF\s]+)\}/g, type: 'curly', confidence: 0.90 },
            { pattern: /<([A-Z_\u0370-\u03FF\u1F00-\u1FFF\s]+)>/g, type: 'angle', confidence: 0.85 },

            // Mixed case patterns for better Greek detection
            { pattern: /\[([A-Za-zΑ-Ωα-ω_\s\-]+)\]/g, type: 'mixed_bracket', confidence: 0.92 },
            { pattern: /\{([A-Za-zΑ-Ωα-ω_\s\-]+)\}/g, type: 'mixed_curly', confidence: 0.87 },

            // Underline patterns (minimum 3 characters)
            { pattern: /_{3,}/g, type: 'underline', confidence: 0.70 },
            { pattern: /\.{3,}/g, type: 'dots', confidence: 0.65 },
            { pattern: /-{3,}/g, type: 'dashes', confidence: 0.68 },

            // Greek-specific patterns with accented characters
            { pattern: /\[([Α-Ωα-ωάέήίόύώΐΰ_\s\-]+)\]/g, type: 'greek_bracket', confidence: 0.90 },
            { pattern: /\{([Α-Ωα-ωάέήίόύώΐΰ_\s\-]+)\}/g, type: 'greek_curly', confidence: 0.85 },

            // Form-like patterns with Greek colon
            { pattern: /:\s*_{3,}/g, type: 'colon_underline', confidence: 0.75 },
            { pattern: /:\s*\.{3,}/g, type: 'colon_dots', confidence: 0.70 },
            { pattern: /[Α-Ωα-ωάέήίόύώΐΰ]+:\s*_{3,}/g, type: 'greek_colon_underline', confidence: 0.80 },
            { pattern: /[Α-Ωα-ωάέήίόύώΐΰ]+:\s*\.{3,}/g, type: 'greek_colon_dots', confidence: 0.75 },

            // Parentheses patterns
            { pattern: /\(([A-Za-zΑ-Ωα-ωάέήίόύώΐΰ_\s\-]+)\)/g, type: 'parentheses', confidence: 0.82 }
        ];

        // Greek keyword mappings for smart suggestions
        this.greekKeywordMappings = {
            // Customer information
            'ΟΝΟΜΑ': ['full_name', 'customer_name', 'name'],
            'ΟΝΟΜΑΤΕΠΩΝΥΜΟ': ['full_name', 'customer_name'],
            'ΕΠΩΝΥΜΟ': ['last_name', 'surname'],
            'ΠΕΛΑΤΗΣ': ['full_name', 'customer_name'],
            'ΠΕΛΑΤΗ': ['full_name', 'customer_name'],
            'CUSTOMER': ['full_name', 'customer_name'],
            'NAME': ['full_name', 'customer_name', 'name'],
            'ΣΤΟΙΧΕΙΑ': ['customer_details', 'personal_info'],
            'ΠΛΗΡΟΦΟΡΙΕΣ': ['customer_details', 'information'],

            // Contact information
            'ΤΗΛΕΦΩΝΟ': ['phone', 'mobile', 'telephone'],
            'ΤΗΛ': ['phone', 'mobile'],
            'PHONE': ['phone', 'mobile'],
            'MOBILE': ['mobile', 'phone'],
            'ΚΙΝΗΤΟ': ['mobile', 'phone'],
            'ΕΠΙΚΟΙΝΩΝΙΑ': ['contact', 'phone', 'email'],
            'EMAIL': ['email', 'electronic_mail'],
            'ΗΛΕΚΤΡΟΝΙΚΟ': ['email', 'electronic_mail'],

            // Address
            'ΔΙΕΥΘΥΝΣΗ': ['address', 'location'],
            'ADDRESS': ['address', 'location'],
            'ΤΟΠΟΘΕΣΙΑ': ['location', 'address'],
            'LOCATION': ['location', 'address'],
            'ΟΔΟΣ': ['street', 'address'],
            'ΠΟΛΗ': ['city', 'location'],
            'ΤΚ': ['postal_code', 'zip_code'],
            'ΤΑΧΥΔΡΟΜΙΚΟΣ': ['postal_code', 'zip_code'],

            // Business information
            'ΑΦΜ': ['afm', 'vat_number', 'tax_id'],
            'VAT': ['afm', 'vat_number'],
            'TAX': ['afm', 'tax_id'],
            'ΕΤΑΙΡΙΑ': ['company', 'business'],
            'ΕΠΙΧΕΙΡΗΣΗ': ['business', 'company'],
            'ΕΡΓΑΣΙΑ': ['profession', 'job'],
            'ΕΠΑΓΓΕΛΜΑ': ['profession', 'occupation'],

            // Utility specific
            'ΠΑΡΟΧΗ': ['supply_number', 'meter_number', 'service_number'],
            'SUPPLY': ['supply_number', 'service_number'],
            'ΜΕΤΡΗΤΗΣ': ['meter_number', 'supply_number'],
            'METER': ['meter_number', 'supply_number'],
            'ΛΟΓΑΡΙΑΣΜΟΣ': ['account_number', 'bill_number'],
            'ΚΩΔΙΚΟΣ': ['code', 'reference_number'],
            'ΑΡΙΘΜΟΣ': ['number', 'reference'],

            // Dates
            'ΗΜΕΡΟΜΗΝΙΑ': ['date', 'created_date', 'contract_date'],
            'DATE': ['date', 'created_date', 'contract_date'],
            'ΛΗΞΗ': ['end_date', 'expiry_date'],
            'EXPIRY': ['end_date', 'expiry_date'],
            'ΕΝΑΡΞΗ': ['start_date', 'begin_date'],
            'ΣΥΜΒΟΛΑΙΟ': ['contract_date', 'agreement_date'],
            'ΑΙΤΗΣΗ': ['application_date', 'request_date'],

            // Insurance specific
            'ΠΙΝΑΚΙΔΑ': ['license_plate', 'plate_number'],
            'PLATE': ['license_plate', 'plate_number'],
            'ΟΧΗΜΑ': ['vehicle', 'car_model'],
            'VEHICLE': ['vehicle', 'car_model'],
            'CAR': ['vehicle', 'car_model'],
            'ΑΣΦΑΛΕΙΑ': ['insurance', 'coverage'],
            'ΚΑΛΥΨΗ': ['coverage', 'insurance'],
            'ΑΣΦΑΛΙΣΤΗΡΙΟ': ['insurance_policy', 'policy'],

            // Financial
            'ΠΟΣΟ': ['amount', 'sum'],
            'ΧΡΕΩΣΗ': ['charge', 'fee'],
            'ΤΙΜΗ': ['price', 'cost'],
            'ΚΟΣΤΟΣ': ['cost', 'price'],
            'ΣΥΝΟΛΟ': ['total', 'sum'],
            'ΥΠΟΛΟΙΠΟ': ['balance', 'remainder'],

            // Status and state
            'ΚΑΤΑΣΤΑΣΗ': ['status', 'state'],
            'ΕΓΚΡΙΣΗ': ['approval', 'authorization'],
            'ΑΙΤΗΜΑ': ['request', 'application'],
            'ΥΠΟΓΡΑΦΗ': ['signature', 'sign'],
            'ΕΠΙΒΕΒΑΙΩΣΗ': ['confirmation', 'verification']
        };
    }

    /**
     * Main analysis function - analyzes a PDF file and returns structured data
     * @param {Buffer} pdfBuffer - PDF file buffer
     * @param {string} templateId - Template ID for tracking
     * @returns {Object} Analysis results
     */
    async analyzePDF(pdfBuffer, templateId = null) {
        try {
            // Use pdf-parse to extract text content from the entire PDF
            const pdfData = await pdfParse(pdfBuffer);

            // Also load with pdf-lib for form field detection and page info
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();

            const results = {
                templateId,
                pageCount: pages.length,
                textContent: [],
                placeholders: [],
                formFields: [],
                analysisDate: new Date(),
                confidence: 0,
                fullText: pdfData.text
            };

            // For each page, create text content structure
            const textPerPage = this.splitTextByPages(pdfData.text, pages.length);
            for (let i = 0; i < pages.length; i++) {
                const page = pages[i];
                const pageText = textPerPage[i] || '';

                const textContent = {
                    page: i,
                    dimensions: page.getSize(),
                    text: pageText,
                    length: pageText.length
                };

                results.textContent.push(textContent);

                // Detect placeholders in this page
                const placeholders = await this.detectPlaceholders(pageText, i);
                results.placeholders = results.placeholders.concat(placeholders);
            }

            // If no page-specific text was found, analyze the full text as one page
            if (results.placeholders.length === 0 && pdfData.text.trim().length > 0) {
                console.log('[PDFAnalysis] No page-specific placeholders found, analyzing full text');
                const fullTextPlaceholders = await this.detectPlaceholders(pdfData.text, 0);
                results.placeholders = fullTextPlaceholders;
            }

            // Detect existing form fields
            results.formFields = await this.detectFormFields(pdfDoc);

            // Calculate overall confidence
            results.confidence = this.calculateOverallConfidence(results.placeholders);

            // Remove duplicates and sort by confidence
            results.placeholders = this.deduplicateAndSort(results.placeholders);

            console.log(`[PDFAnalysis] Found ${results.placeholders.length} placeholders in PDF`);

            return results;

        } catch (error) {
            console.error('PDF Analysis Error:', error);
            throw new Error(`Failed to analyze PDF: ${error.message}`);
        }
    }

    /**
     * Split PDF text content by pages (approximate)
     * @param {string} fullText - Full PDF text content
     * @param {number} pageCount - Number of pages
     * @returns {Array} Array of text content per page
     */
    splitTextByPages(fullText, pageCount) {
        if (pageCount <= 1) {
            return [fullText];
        }

        // Simple text splitting - divide text roughly by page count
        const textLength = fullText.length;
        const avgPageLength = Math.ceil(textLength / pageCount);
        const pages = [];

        for (let i = 0; i < pageCount; i++) {
            const startIndex = i * avgPageLength;
            const endIndex = Math.min((i + 1) * avgPageLength, textLength);
            pages.push(fullText.substring(startIndex, endIndex));
        }

        return pages;
    }

    /**
     * Detect placeholders in text using multiple patterns
     * @param {string} text - Text content to analyze
     * @param {number} pageIndex - Page number
     * @returns {Array} Array of detected placeholders
     */
    async detectPlaceholders(text, pageIndex = 0) {
        const placeholders = [];

        for (const patternConfig of this.placeholderPatterns) {
            const matches = [...text.matchAll(patternConfig.pattern)];

            for (const match of matches) {
                const placeholder = {
                    text: match[0],
                    content: match[1] || match[0], // Captured group or full match
                    type: patternConfig.type,
                    confidence: patternConfig.confidence,
                    position: {
                        start: match.index,
                        end: match.index + match[0].length,
                        page: pageIndex
                    },
                    context: this.extractContext(text, match.index),
                    suggestions: this.generateSuggestions(match[1] || match[0])
                };

                placeholders.push(placeholder);
            }
        }

        return placeholders;
    }

    /**
     * Generate field mapping suggestions based on placeholder content
     * @param {string} placeholderContent - The content inside the placeholder
     * @returns {Array} Array of field suggestions with confidence
     */
    generateSuggestions(placeholderContent) {
        const suggestions = [];
        const upperContent = placeholderContent.toUpperCase();

        // Check direct keyword matches
        for (const [keyword, fieldNames] of Object.entries(this.greekKeywordMappings)) {
            if (upperContent.includes(keyword)) {
                for (const fieldName of fieldNames) {
                    suggestions.push({
                        fieldName,
                        confidence: 0.95,
                        reason: `Direct keyword match: ${keyword}`
                    });
                }
            }
        }

        // Fuzzy matching for partial matches
        for (const [keyword, fieldNames] of Object.entries(this.greekKeywordMappings)) {
            const similarity = this.calculateStringSimilarity(upperContent, keyword);
            if (similarity > 0.7 && similarity < 0.95) {
                for (const fieldName of fieldNames) {
                    suggestions.push({
                        fieldName,
                        confidence: similarity * 0.8,
                        reason: `Partial match: ${keyword} (${Math.round(similarity * 100)}%)`
                    });
                }
            }
        }

        // Remove duplicates and sort by confidence
        const uniqueSuggestions = suggestions.reduce((acc, curr) => {
            const existing = acc.find(s => s.fieldName === curr.fieldName);
            if (!existing || existing.confidence < curr.confidence) {
                acc = acc.filter(s => s.fieldName !== curr.fieldName);
                acc.push(curr);
            }
            return acc;
        }, []);

        return uniqueSuggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3); // Return top 3 suggestions
    }

    /**
     * Calculate string similarity using Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    calculateStringSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Extract context around a placeholder
     * @param {string} text - Full text
     * @param {number} position - Position of the placeholder
     * @returns {Object} Context information
     */
    extractContext(text, position) {
        const contextLength = 50;
        const start = Math.max(0, position - contextLength);
        const end = Math.min(text.length, position + contextLength);

        return {
            before: text.substring(start, position),
            after: text.substring(position, end),
            full: text.substring(start, end)
        };
    }

    /**
     * Detect existing form fields in the PDF
     * @param {PDFDocument} pdfDoc - PDF document
     * @returns {Array} Array of form fields
     */
    async detectFormFields(pdfDoc) {
        try {
            const form = pdfDoc.getForm();
            const fields = form.getFields();

            return fields.map((field, index) => ({
                name: field.getName(),
                type: field.constructor.name,
                required: field.isRequired?.() || false,
                readOnly: field.isReadOnly?.() || false,
                index
            }));

        } catch (error) {
            console.warn('Could not detect form fields:', error);
            return [];
        }
    }

    /**
     * Calculate overall confidence based on detected placeholders
     * @param {Array} placeholders - Array of placeholders
     * @returns {number} Overall confidence score (0-1)
     */
    calculateOverallConfidence(placeholders) {
        if (placeholders.length === 0) return 0;

        const totalConfidence = placeholders.reduce((sum, p) => sum + p.confidence, 0);
        return totalConfidence / placeholders.length;
    }

    /**
     * Remove duplicate placeholders and sort by confidence
     * @param {Array} placeholders - Array of placeholders
     * @returns {Array} Deduplicated and sorted placeholders
     */
    deduplicateAndSort(placeholders) {
        const unique = placeholders.reduce((acc, current) => {
            const existing = acc.find(p => p.text === current.text && p.position.page === current.position.page);
            if (!existing) {
                acc.push(current);
            } else if (current.confidence > existing.confidence) {
                acc[acc.indexOf(existing)] = current;
            }
            return acc;
        }, []);

        return unique.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Validate PDF file for template usage
     * @param {Buffer} pdfBuffer - PDF file buffer
     * @returns {Object} Validation results
     */
    async validatePDFTemplate(pdfBuffer) {
        try {
            const pdfDoc = await PDFDocument.load(pdfBuffer);
            const pages = pdfDoc.getPages();

            return {
                valid: true,
                pageCount: pages.length,
                size: pdfBuffer.length,
                hasText: true, // Will be determined by text extraction
                hasFormFields: false, // Will be determined by form detection
                errors: []
            };

        } catch (error) {
            return {
                valid: false,
                errors: [`Invalid PDF file: ${error.message}`]
            };
        }
    }
}

module.exports = new PDFAnalysisService();