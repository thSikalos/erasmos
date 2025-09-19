const pool = require('../config/db');

// Helper function to get field with its options
const getFieldWithOptions = async (fieldId) => {
    const result = await pool.query(`
        SELECT
            f.*,
            CASE
                WHEN f.type = 'dropdown' THEN
                    json_agg(
                        json_build_object(
                            'id', fo.id,
                            'value', fo.option_value,
                            'label', fo.option_label,
                            'order', fo.display_order
                        ) ORDER BY fo.display_order, fo.option_label
                    ) FILTER (WHERE fo.is_active = true)
                ELSE NULL
            END as options
        FROM fields f
        LEFT JOIN field_options fo ON f.id = fo.field_id AND fo.is_active = true
        WHERE f.id = $1
        GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table, f.required_for_pdf
    `, [fieldId]);

    return result.rows[0];
};

// --- CREATE A NEW FIELD IN THE LIBRARY --- (Admin only)
const createField = async (req, res) => {
    const { label, type, is_commissionable, show_in_applications_table, required_for_pdf, options } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validate dropdown fields have options
        if (type === 'dropdown') {
            if (!options || !Array.isArray(options) || options.length === 0) {
                return res.status(400).json({
                    message: 'Dropdown fields must have at least one option'
                });
            }

            // Validate option structure
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (!option.value || !option.label) {
                    return res.status(400).json({
                        message: `Option ${i + 1} must have both value and label`
                    });
                }
            }

            // Check for duplicate option values
            const values = options.map(opt => opt.value);
            if (new Set(values).size !== values.length) {
                return res.status(400).json({
                    message: 'Option values must be unique'
                });
            }
        }

        // Create the field
        const newField = await client.query(
            "INSERT INTO fields (label, type, is_commissionable, show_in_applications_table, required_for_pdf) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [label, type, is_commissionable, show_in_applications_table, required_for_pdf || false]
        );

        const fieldId = newField.rows[0].id;

        // If dropdown, create options
        if (type === 'dropdown' && options) {
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                await client.query(
                    "INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES ($1, $2, $3, $4)",
                    [fieldId, option.value, option.label, i]
                );
            }
        }

        await client.query('COMMIT');

        // Return field with options
        const fieldWithOptions = await getFieldWithOptions(fieldId);
        res.status(201).json(fieldWithOptions);

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(400).json({ message: 'A field with this label already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET ALL FIELDS FROM THE LIBRARY ---
const getAllFields = async (req, res) => {
    try {
        // Check if the requesting user is an admin to include inactive options
        const isAdmin = req.user && req.user.role === 'Admin';

        let query;
        if (isAdmin) {
            // For admin users, include all options with is_active flag
            query = `
                SELECT
                    f.*,
                    CASE
                        WHEN f.type = 'dropdown' THEN
                            json_agg(
                                json_build_object(
                                    'id', fo.id,
                                    'value', fo.option_value,
                                    'label', fo.option_label,
                                    'order', fo.display_order,
                                    'is_active', fo.is_active
                                ) ORDER BY fo.display_order, fo.option_label
                            ) FILTER (WHERE fo.id IS NOT NULL)
                        ELSE NULL
                    END as options
                FROM fields f
                LEFT JOIN field_options fo ON f.id = fo.field_id
                GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table, f.required_for_pdf
                ORDER BY f.label ASC
            `;
        } else {
            // For regular users, only show active options
            query = `
                SELECT
                    f.*,
                    CASE
                        WHEN f.type = 'dropdown' THEN
                            json_agg(
                                json_build_object(
                                    'id', fo.id,
                                    'value', fo.option_value,
                                    'label', fo.option_label,
                                    'order', fo.display_order
                                ) ORDER BY fo.display_order, fo.option_label
                            ) FILTER (WHERE fo.is_active = true)
                        ELSE NULL
                    END as options
                FROM fields f
                LEFT JOIN field_options fo ON f.id = fo.field_id AND fo.is_active = true
                GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table, f.required_for_pdf
                ORDER BY f.label ASC
            `;
        }

        const fields = await pool.query(query);
        res.json(fields.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE A FIELD --- (Admin only)
const updateField = async (req, res) => {
    const { id } = req.params;
    const { label, type, is_commissionable, show_in_applications_table, required_for_pdf, options } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Validate dropdown fields have options if type is dropdown
        if (type === 'dropdown') {
            if (!options || !Array.isArray(options) || options.length === 0) {
                return res.status(400).json({
                    message: 'Dropdown fields must have at least one option'
                });
            }

            // Validate option structure
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                if (!option.value || !option.label) {
                    return res.status(400).json({
                        message: `Option ${i + 1} must have both value and label`
                    });
                }
            }

            // Check for duplicate option values
            const values = options.map(opt => opt.value);
            if (new Set(values).size !== values.length) {
                return res.status(400).json({
                    message: 'Option values must be unique'
                });
            }
        }

        // Update the field
        const result = await client.query(
            "UPDATE fields SET label = $1, type = $2, is_commissionable = $3, show_in_applications_table = $4, required_for_pdf = $5 WHERE id = $6 RETURNING *",
            [label, type, is_commissionable, show_in_applications_table, required_for_pdf || false, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Field not found' });
        }

        // Handle dropdown options update
        if (type === 'dropdown' && options) {
            // Get existing options to preserve their is_active states
            const existingOptions = await client.query(
                "SELECT * FROM field_options WHERE field_id = $1",
                [id]
            );

            // Create a map of existing options by value for quick lookup
            const existingOptionsMap = new Map();
            existingOptions.rows.forEach(opt => {
                existingOptionsMap.set(opt.option_value, opt);
            });

            // Delete options that are no longer in the new list
            const newOptionValues = options.map(opt => opt.value);
            if (existingOptions.rows.length > 0) {
                const valuesToDelete = existingOptions.rows
                    .filter(opt => !newOptionValues.includes(opt.option_value))
                    .map(opt => opt.option_value);

                if (valuesToDelete.length > 0) {
                    await client.query(
                        "DELETE FROM field_options WHERE field_id = $1 AND option_value = ANY($2)",
                        [id, valuesToDelete]
                    );
                }
            }

            // Update or insert options
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                const existingOption = existingOptionsMap.get(option.value);

                if (existingOption) {
                    // Update existing option (preserve is_active state)
                    await client.query(
                        "UPDATE field_options SET option_label = $1, display_order = $2 WHERE id = $3",
                        [option.label, i, existingOption.id]
                    );
                } else {
                    // Insert new option (default is_active = true)
                    await client.query(
                        "INSERT INTO field_options (field_id, option_value, option_label, display_order, is_active) VALUES ($1, $2, $3, $4, $5)",
                        [id, option.value, option.label, i, true]
                    );
                }
            }
        } else if (type !== 'dropdown') {
            // If changing from dropdown to another type, remove all options
            await client.query("DELETE FROM field_options WHERE field_id = $1", [id]);
        }

        await client.query('COMMIT');

        // Return field with updated options
        const fieldWithOptions = await getFieldWithOptions(id);
        res.json(fieldWithOptions);

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(400).json({ message: 'A field with this label already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- DELETE A FIELD --- (Admin only)
const deleteField = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM fields WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Field not found' });
        }
        res.json({ message: 'Field deleted successfully' });
    } catch (err) {
        // Αν το πεδίο χρησιμοποιείται κάπου, η βάση θα βγάλει σφάλμα foreign key
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Cannot delete field because it is being used by a company.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- TOGGLE FIELD OPTION ACTIVE STATE --- (Admin only)
const toggleFieldOptionActive = async (req, res) => {
    const { optionId } = req.params;

    try {
        // Get current option state
        const currentOption = await pool.query(
            "SELECT * FROM field_options WHERE id = $1",
            [optionId]
        );

        if (currentOption.rows.length === 0) {
            return res.status(404).json({ message: 'Field option not found' });
        }

        const option = currentOption.rows[0];
        const newActiveState = !option.is_active;

        // Update the option's active state
        const result = await pool.query(
            "UPDATE field_options SET is_active = $1 WHERE id = $2 RETURNING *",
            [newActiveState, optionId]
        );

        // Get updated field with all options (including inactive ones for admin view)
        const fieldWithAllOptions = await pool.query(`
            SELECT
                f.*,
                json_agg(
                    json_build_object(
                        'id', fo.id,
                        'value', fo.option_value,
                        'label', fo.option_label,
                        'order', fo.display_order,
                        'is_active', fo.is_active
                    ) ORDER BY fo.display_order, fo.option_label
                ) as options
            FROM fields f
            LEFT JOIN field_options fo ON f.id = fo.field_id
            WHERE f.id = $1
            GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table, f.required_for_pdf
        `, [option.field_id]);

        res.json({
            message: `Field option ${newActiveState ? 'activated' : 'deactivated'} successfully`,
            option: result.rows[0],
            field: fieldWithAllOptions.rows[0]
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- DELETE FIELD OPTION PERMANENTLY --- (Admin only)
const deleteFieldOption = async (req, res) => {
    const { optionId } = req.params;

    try {
        // Get option details first
        const optionResult = await pool.query(
            "SELECT fo.*, f.label as field_label FROM field_options fo JOIN fields f ON fo.field_id = f.id WHERE fo.id = $1",
            [optionId]
        );

        if (optionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Field option not found' });
        }

        const option = optionResult.rows[0];

        // Check if option is used in any applications
        const usageResult = await pool.query(`
            SELECT COUNT(*) as usage_count
            FROM application_values av
            WHERE av.field_id = $1 AND av.value = $2
        `, [option.field_id, option.option_value]);

        const usageCount = parseInt(usageResult.rows[0].usage_count);

        if (usageCount > 0) {
            return res.status(400).json({
                message: `Cannot delete option because it is used in ${usageCount} applications. Consider deactivating it instead.`
            });
        }

        // Delete the option
        await pool.query("DELETE FROM field_options WHERE id = $1", [optionId]);

        res.json({
            message: 'Field option deleted successfully',
            deletedOption: {
                id: option.id,
                label: option.option_label,
                value: option.option_value,
                field_label: option.field_label
            }
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- CHECK FIELD OPTION USAGE --- (Admin only)
const checkFieldOptionUsage = async (req, res) => {
    const { optionId } = req.params;

    try {
        // Get the option details
        const optionResult = await pool.query(
            "SELECT fo.*, f.label as field_label FROM field_options fo JOIN fields f ON fo.field_id = f.id WHERE fo.id = $1",
            [optionId]
        );

        if (optionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Field option not found' });
        }

        const option = optionResult.rows[0];

        // Check usage in applications
        const usageResult = await pool.query(`
            SELECT
                COUNT(*) as usage_count,
                COUNT(CASE WHEN a.status = 'approved' THEN 1 END) as approved_count,
                COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count
            FROM application_values av
            JOIN applications a ON av.application_id = a.id
            WHERE av.field_id = $1 AND av.value = $2
        `, [option.field_id, option.option_value]);

        const usage = usageResult.rows[0];

        res.json({
            option: {
                id: option.id,
                label: option.option_label,
                value: option.option_value,
                field_label: option.field_label,
                is_active: option.is_active
            },
            usage: {
                total_applications: parseInt(usage.usage_count),
                approved_applications: parseInt(usage.approved_count),
                pending_applications: parseInt(usage.pending_count)
            },
            can_safely_deactivate: parseInt(usage.usage_count) === 0
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createField,
    getAllFields,
    updateField,
    deleteField,
    toggleFieldOptionActive,
    checkFieldOptionUsage,
    deleteFieldOption
};