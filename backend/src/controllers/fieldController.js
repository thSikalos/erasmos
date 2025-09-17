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
        GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table
    `, [fieldId]);

    return result.rows[0];
};

// --- CREATE A NEW FIELD IN THE LIBRARY --- (Admin only)
const createField = async (req, res) => {
    const { label, type, is_commissionable, show_in_applications_table, options } = req.body;

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
            "INSERT INTO fields (label, type, is_commissionable, show_in_applications_table) VALUES ($1, $2, $3, $4) RETURNING *",
            [label, type, is_commissionable, show_in_applications_table]
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
        const fields = await pool.query(`
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
            GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table
            ORDER BY f.label ASC
        `);
        res.json(fields.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE A FIELD --- (Admin only)
const updateField = async (req, res) => {
    const { id } = req.params;
    const { label, type, is_commissionable, show_in_applications_table, options } = req.body;

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
            "UPDATE fields SET label = $1, type = $2, is_commissionable = $3, show_in_applications_table = $4 WHERE id = $5 RETURNING *",
            [label, type, is_commissionable, show_in_applications_table, id]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Field not found' });
        }

        // Handle dropdown options update
        if (type === 'dropdown' && options) {
            // Delete existing options
            await client.query("DELETE FROM field_options WHERE field_id = $1", [id]);

            // Insert new options
            for (let i = 0; i < options.length; i++) {
                const option = options[i];
                await client.query(
                    "INSERT INTO field_options (field_id, option_value, option_label, display_order) VALUES ($1, $2, $3, $4)",
                    [id, option.value, option.label, i]
                );
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

module.exports = {
    createField,
    getAllFields,
    updateField,
    deleteField
};