const pool = require('../config/db');

/**
 * Mapping Engine Service
 * Handles intelligent field mapping between PDF placeholders and company fields
 */
class MappingEngine {
    constructor() {
        this.confidenceThreshold = 0.6; // Minimum confidence for automatic suggestions
        this.maxSuggestions = 5; // Maximum suggestions per placeholder
    }

    /**
     * Generate intelligent mapping suggestions for placeholders
     * @param {Array} placeholders - Detected placeholders from PDF
     * @param {Array} companyFields - Available fields for the company
     * @param {number} companyId - Company ID for context
     * @returns {Array} Enhanced placeholders with mapping suggestions
     */
    async generateMappingSuggestions(placeholders, companyFields, companyId) {
        try {
            const enhancedPlaceholders = [];

            for (const placeholder of placeholders) {
                const suggestions = await this.findBestMatches(
                    placeholder.content || placeholder.text,
                    companyFields,
                    companyId
                );

                const enhancedPlaceholder = {
                    ...placeholder,
                    mappingSuggestions: suggestions,
                    autoMappable: suggestions.length > 0 && suggestions[0].confidence >= this.confidenceThreshold,
                    recommendedMapping: suggestions.length > 0 ? suggestions[0] : null
                };

                enhancedPlaceholders.push(enhancedPlaceholder);
            }

            return enhancedPlaceholders;

        } catch (error) {
            console.error('Error generating mapping suggestions:', error);
            throw error;
        }
    }

    /**
     * Find best field matches for a placeholder
     * @param {string} placeholderText - The placeholder text to match
     * @param {Array} companyFields - Available company fields
     * @param {number} companyId - Company ID
     * @returns {Array} Array of field matches with confidence scores
     */
    async findBestMatches(placeholderText, companyFields, companyId) {
        const matches = [];
        const cleanText = placeholderText.toUpperCase().trim();

        // Priority 1: Exact keyword matches
        const exactMatches = this.findExactKeywordMatches(cleanText, companyFields);
        matches.push(...exactMatches);

        // Priority 2: Partial keyword matches
        const partialMatches = this.findPartialKeywordMatches(cleanText, companyFields);
        matches.push(...partialMatches);

        // Priority 3: Fuzzy string similarity matches
        const fuzzyMatches = this.findFuzzyMatches(cleanText, companyFields);
        matches.push(...fuzzyMatches);

        // Priority 4: Field type-based matches
        const typeMatches = this.findTypeBasedMatches(cleanText, companyFields);
        matches.push(...typeMatches);

        // Remove duplicates, sort by confidence, and limit results
        const uniqueMatches = this.deduplicateMatches(matches);
        const sortedMatches = uniqueMatches
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, this.maxSuggestions);

        // Enhance with historical mapping data if available
        return await this.enhanceWithHistoricalData(sortedMatches, companyId);
    }

    /**
     * Find exact keyword matches between placeholder and fields
     * @param {string} placeholderText - Cleaned placeholder text
     * @param {Array} companyFields - Company fields
     * @returns {Array} Exact matches
     */
    findExactKeywordMatches(placeholderText, companyFields) {
        const matches = [];

        // Enhanced Greek keyword mappings
        const exactKeywords = {
            // Customer Information
            'ΟΝΟΜΑ': ['full_name', 'customer_name', 'name'],
            'ΟΝΟΜΑΤΕΠΩΝΥΜΟ': ['full_name', 'customer_name'],
            'ΠΕΛΑΤΗΣ': ['customer_name', 'full_name'],
            'CUSTOMER': ['customer_name', 'full_name'],
            'NAME': ['full_name', 'customer_name'],
            'FULL_NAME': ['full_name', 'customer_name'],

            // Contact Information
            'ΤΗΛΕΦΩΝΟ': ['phone', 'telephone', 'mobile'],
            'ΤΗΛ': ['phone', 'mobile'],
            'PHONE': ['phone', 'telephone'],
            'MOBILE': ['mobile', 'phone'],
            'ΚΙΝΗΤΟ': ['mobile', 'phone'],
            'ΤΗΛΕΦΩΝΙΚΟ': ['phone', 'mobile'],

            // Address Information
            'ΔΙΕΥΘΥΝΣΗ': ['address', 'location', 'street_address'],
            'ADDRESS': ['address', 'street_address'],
            'ΤΟΠΟΘΕΣΙΑ': ['location', 'address'],
            'LOCATION': ['location', 'address'],
            'ΟΔΟΣ': ['street', 'address'],
            'STREET': ['street', 'address'],
            'ΠΟΛΗ': ['city', 'location'],
            'CITY': ['city', 'location'],

            // Business Information
            'ΑΦΜ': ['afm', 'tax_number', 'vat_number'],
            'VAT': ['vat_number', 'afm'],
            'TAX_NUMBER': ['tax_number', 'afm'],
            'ΦΟΡΟΣ': ['tax_number', 'afm'],

            // Utility Specific
            'ΠΑΡΟΧΗ': ['supply_number', 'service_number', 'meter_number'],
            'SUPPLY': ['supply_number', 'service_number'],
            'SERVICE': ['service_number', 'supply_number'],
            'ΜΕΤΡΗΤΗΣ': ['meter_number', 'supply_number'],
            'METER': ['meter_number', 'supply_number'],
            'ΛΟΓΑΡΙΑΣΜΟΣ': ['account_number', 'bill_number'],
            'ACCOUNT': ['account_number', 'bill_number'],

            // Dates
            'ΗΜΕΡΟΜΗΝΙΑ': ['date', 'created_date', 'start_date'],
            'DATE': ['date', 'created_date'],
            'ΕΝΑΡΞΗ': ['start_date', 'begin_date'],
            'START': ['start_date', 'begin_date'],
            'ΛΗΞΗ': ['end_date', 'expiry_date'],
            'END': ['end_date', 'expiry_date'],
            'EXPIRY': ['expiry_date', 'end_date'],

            // Insurance Specific
            'ΠΙΝΑΚΙΔΑ': ['license_plate', 'plate_number'],
            'PLATE': ['plate_number', 'license_plate'],
            'LICENSE': ['license_plate', 'license_number'],
            'ΟΧΗΜΑ': ['vehicle', 'car_model'],
            'VEHICLE': ['vehicle', 'car_model'],
            'CAR': ['car_model', 'vehicle'],
            'ΜΟΝΤΕΛΟ': ['model', 'car_model'],
            'MODEL': ['car_model', 'model'],
            'ΑΣΦΑΛΕΙΑ': ['insurance_type', 'coverage'],
            'INSURANCE': ['insurance_type', 'coverage'],

            // Energy Specific
            'ΠΡΟΓΡΑΜΜΑ': ['program', 'tariff_type'],
            'PROGRAM': ['program', 'tariff_type'],
            'ΤΑΡΙΦΑ': ['tariff', 'rate_type'],
            'TARIFF': ['tariff', 'rate_type'],
            'ΚΑΤΑΝΑΛΩΣΗ': ['consumption', 'usage'],
            'CONSUMPTION': ['consumption', 'usage']
        };

        for (const [keyword, fieldNames] of Object.entries(exactKeywords)) {
            if (placeholderText.includes(keyword)) {
                for (const fieldName of fieldNames) {
                    const matchingField = companyFields.find(field =>
                        field.label?.toLowerCase().includes(fieldName.toLowerCase()) ||
                        field.name?.toLowerCase().includes(fieldName.toLowerCase()) ||
                        field.type === fieldName
                    );

                    if (matchingField) {
                        matches.push({
                            field: matchingField,
                            confidence: 0.95,
                            matchType: 'exact_keyword',
                            keyword: keyword,
                            reason: `Exact keyword match: ${keyword} → ${matchingField.label}`
                        });
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Find partial keyword matches
     * @param {string} placeholderText - Cleaned placeholder text
     * @param {Array} companyFields - Company fields
     * @returns {Array} Partial matches
     */
    findPartialKeywordMatches(placeholderText, companyFields) {
        const matches = [];

        const partialKeywords = [
            'ΟΝΟΜΑΤ', 'ΠΕΛΑΤ', 'ΤΗΛΕΦ', 'ΔΙΕΥΘ', 'ΠΑΡΟΧ', 'ΜΕΤΡΗΤ',
            'ΗΜΕΡΟΜ', 'ΠΙΝΑΚΙΔ', 'ΟΧΗΜΑΤ', 'ΑΣΦΑΛΕΙ', 'ΠΡΟΓΡΑΜΜΑΤ'
        ];

        for (const keyword of partialKeywords) {
            if (placeholderText.includes(keyword)) {
                for (const field of companyFields) {
                    const fieldText = (field.label || field.name || '').toUpperCase();
                    if (fieldText.includes(keyword.substring(0, 4))) {
                        matches.push({
                            field: field,
                            confidence: 0.75,
                            matchType: 'partial_keyword',
                            keyword: keyword,
                            reason: `Partial keyword match: ${keyword} in ${field.label}`
                        });
                    }
                }
            }
        }

        return matches;
    }

    /**
     * Find fuzzy string similarity matches
     * @param {string} placeholderText - Cleaned placeholder text
     * @param {Array} companyFields - Company fields
     * @returns {Array} Fuzzy matches
     */
    findFuzzyMatches(placeholderText, companyFields) {
        const matches = [];

        for (const field of companyFields) {
            const fieldText = (field.label || field.name || '').toUpperCase();
            const similarity = this.calculateStringSimilarity(placeholderText, fieldText);

            if (similarity > 0.6) {
                matches.push({
                    field: field,
                    confidence: similarity * 0.8, // Reduce confidence for fuzzy matches
                    matchType: 'fuzzy_similarity',
                    similarity: similarity,
                    reason: `String similarity: ${Math.round(similarity * 100)}% match with ${field.label}`
                });
            }
        }

        return matches;
    }

    /**
     * Find matches based on field types
     * @param {string} placeholderText - Cleaned placeholder text
     * @param {Array} companyFields - Company fields
     * @returns {Array} Type-based matches
     */
    findTypeBasedMatches(placeholderText, companyFields) {
        const matches = [];

        const typeIndicators = {
            'DATE': ['date', 'datetime'],
            'ΗΜΕΡΟΜΗΝΙΑ': ['date', 'datetime'],
            'EMAIL': ['email'],
            'PHONE': ['tel', 'phone'],
            'NUMBER': ['number'],
            'ΑΡΙΘΜΟΣ': ['number'],
            'CHECK': ['checkbox'],
            'ΕΠΙΛΟΓΗ': ['checkbox', 'select']
        };

        for (const [indicator, types] of Object.entries(typeIndicators)) {
            if (placeholderText.includes(indicator)) {
                const matchingFields = companyFields.filter(field =>
                    types.includes(field.type)
                );

                for (const field of matchingFields) {
                    matches.push({
                        field: field,
                        confidence: 0.65,
                        matchType: 'type_based',
                        typeIndicator: indicator,
                        reason: `Field type match: ${indicator} suggests ${field.type} type`
                    });
                }
            }
        }

        return matches;
    }

    /**
     * Remove duplicate matches, keeping the highest confidence
     * @param {Array} matches - Array of matches
     * @returns {Array} Deduplicated matches
     */
    deduplicateMatches(matches) {
        const unique = matches.reduce((acc, current) => {
            const existing = acc.find(match => match.field.id === current.field.id);

            if (!existing) {
                acc.push(current);
            } else if (current.confidence > existing.confidence) {
                const index = acc.indexOf(existing);
                acc[index] = current;
            }

            return acc;
        }, []);

        return unique;
    }

    /**
     * Enhance matches with historical mapping data
     * @param {Array} matches - Current matches
     * @param {number} companyId - Company ID
     * @returns {Array} Enhanced matches
     */
    async enhanceWithHistoricalData(matches, companyId) {
        try {
            // Query for historical mappings for this company
            const historicalQuery = `
                SELECT
                    pfm.placeholder,
                    pfm.target_field_id,
                    f.label as field_label,
                    COUNT(*) as usage_count,
                    AVG(pfm.confidence_score) as avg_confidence
                FROM pdf_field_mappings pfm
                JOIN pdf_templates pt ON pfm.pdf_template_id = pt.id
                JOIN fields f ON pfm.target_field_id = f.id
                WHERE pt.company_id = $1
                AND pfm.mapping_status = 'verified'
                GROUP BY pfm.placeholder, pfm.target_field_id, f.label
                ORDER BY usage_count DESC
            `;

            const historicalResult = await pool.query(historicalQuery, [companyId]);
            const historicalData = historicalResult.rows;

            // Enhance matches with historical context
            const enhancedMatches = matches.map(match => {
                const historical = historicalData.find(h => h.target_field_id === match.field.id);

                if (historical) {
                    return {
                        ...match,
                        confidence: Math.min(match.confidence + 0.1, 1.0), // Boost confidence
                        hasHistoricalData: true,
                        historicalUsage: historical.usage_count,
                        historicalConfidence: parseFloat(historical.avg_confidence),
                        reason: `${match.reason} + Historical usage (${historical.usage_count}x)`
                    };
                }

                return match;
            });

            return enhancedMatches;

        } catch (error) {
            console.warn('Could not enhance with historical data:', error);
            return matches;
        }
    }

    /**
     * Calculate string similarity using Levenshtein distance
     * @param {string} str1 - First string
     * @param {string} str2 - Second string
     * @returns {number} Similarity score (0-1)
     */
    calculateStringSimilarity(str1, str2) {
        if (!str1 || !str2) return 0;

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
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

        for (let i = 0; i <= str1.length; i++) {
            matrix[0][i] = i;
        }

        for (let j = 0; j <= str2.length; j++) {
            matrix[j][0] = j;
        }

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;

                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                );
            }
        }

        return matrix[str2.length][str1.length];
    }

    /**
     * Save mapping configuration to database
     * @param {number} templateId - PDF template ID
     * @param {Array} mappings - Array of mapping configurations
     * @returns {Object} Save result
     */
    async saveMappings(templateId, mappings) {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Delete existing mappings for this template
            await client.query(
                'DELETE FROM pdf_field_mappings WHERE pdf_template_id = $1',
                [templateId]
            );

            // Insert new mappings
            let savedCount = 0;
            for (const mapping of mappings) {
                const result = await client.query(`
                    INSERT INTO pdf_field_mappings (
                        pdf_template_id, placeholder, target_field_id, field_type,
                        coordinates, confidence_score, is_required, mapping_status
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING id
                `, [
                    templateId,
                    mapping.placeholder,
                    mapping.targetFieldId,
                    mapping.fieldType || 'text',
                    JSON.stringify(mapping.coordinates || {}),
                    mapping.confidence || 0,
                    mapping.isRequired !== false, // Default to true
                    'mapped'
                ]);

                if (result.rows.length > 0) savedCount++;
            }

            // Update template analysis status
            await client.query(
                'UPDATE pdf_templates SET analysis_status = $1, placeholders_detected = $2 WHERE id = $3',
                ['mapped', mappings.length, templateId]
            );

            await client.query('COMMIT');

            return {
                success: true,
                savedMappings: savedCount,
                message: `Successfully saved ${savedCount} mappings`
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error saving mappings:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Validate mapping configuration
     * @param {number} templateId - PDF template ID
     * @param {Array} applicationData - Application field data
     * @returns {Object} Validation result
     */
    async validateMappingCompleteness(templateId, applicationData) {
        try {
            const mappingsResult = await pool.query(`
                SELECT
                    pfm.*,
                    f.label as field_label,
                    f.type as field_type
                FROM pdf_field_mappings pfm
                JOIN fields f ON pfm.target_field_id = f.id
                WHERE pfm.pdf_template_id = $1 AND pfm.is_required = true
            `, [templateId]);

            const requiredMappings = mappingsResult.rows;
            const missingFields = [];
            const availableFields = [];

            for (const mapping of requiredMappings) {
                const fieldValue = applicationData[mapping.target_field_id];
                const isEmpty = !fieldValue || fieldValue.toString().trim() === '';

                if (isEmpty) {
                    missingFields.push({
                        fieldId: mapping.target_field_id,
                        fieldLabel: mapping.field_label,
                        placeholder: mapping.placeholder,
                        required: true
                    });
                } else {
                    availableFields.push({
                        fieldId: mapping.target_field_id,
                        fieldLabel: mapping.field_label,
                        value: fieldValue
                    });
                }
            }

            return {
                isComplete: missingFields.length === 0,
                totalRequired: requiredMappings.length,
                availableCount: availableFields.length,
                missingCount: missingFields.length,
                missingFields: missingFields,
                availableFields: availableFields
            };

        } catch (error) {
            console.error('Error validating mapping completeness:', error);
            throw error;
        }
    }
}

module.exports = new MappingEngine();