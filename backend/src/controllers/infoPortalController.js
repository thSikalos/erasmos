const pool = require('../config/db');

// --- GET ALL COMPANIES WITH THEIR INFO SECTIONS ---
const getAllCompaniesWithSections = async (req, res) => {
    try {

        const query = `
            SELECT
                c.id as company_id,
                c.name as company_name,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', cis.id,
                            'section_type', cis.section_type,
                            'title', cis.title,
                            'content', cis.content,
                            'order_index', cis.order_index,
                            'is_active', cis.is_active,
                            'created_at', cis.created_at,
                            'updated_at', cis.updated_at
                        ) ORDER BY cis.order_index
                    ) FILTER (WHERE cis.id IS NOT NULL),
                    '[]'::json
                ) as sections
            FROM companies c
            LEFT JOIN company_info_sections cis ON c.id = cis.company_id
            WHERE cis.is_active = true OR cis.is_active IS NULL
            GROUP BY c.id, c.name
            ORDER BY c.name;
        `;

        const result = await pool.query(query);

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching companies with sections:', err.message);
        res.status(500).json({ error: 'Server Error', details: err.message });
    }
};

// --- GET SECTIONS FOR A SPECIFIC COMPANY ---
const getCompanySections = async (req, res) => {
    const { companyId } = req.params;

    try {
        const query = `
            SELECT
                cis.id,
                cis.section_type,
                cis.title,
                cis.content,
                cis.order_index,
                cis.is_active,
                cis.created_at,
                cis.updated_at,
                c.name as company_name
            FROM company_info_sections cis
            JOIN companies c ON cis.company_id = c.id
            WHERE cis.company_id = $1 AND cis.is_active = true
            ORDER BY cis.order_index;
        `;

        const result = await pool.query(query, [companyId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No sections found for this company' });
        }

        res.json({
            company_id: parseInt(companyId),
            company_name: result.rows[0].company_name,
            sections: result.rows
        });
    } catch (err) {
        console.error('Error fetching company sections:', err.message);
        res.status(500).json({ error: 'Server Error' });
    }
};

// --- CREATE NEW SECTION FOR A COMPANY --- (Admin only)
const createSection = async (req, res) => {
    const { companyId } = req.params;
    const { section_type, title, content, order_index } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if company exists
        const companyCheck = await client.query('SELECT id FROM companies WHERE id = $1', [companyId]);
        if (companyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Company not found' });
        }

        // If no order_index provided, get the next available order
        let finalOrderIndex = order_index;
        if (!finalOrderIndex) {
            const maxOrderResult = await client.query(
                'SELECT COALESCE(MAX(order_index), 0) + 1 as next_order FROM company_info_sections WHERE company_id = $1',
                [companyId]
            );
            finalOrderIndex = maxOrderResult.rows[0].next_order;
        } else {
            // Shift existing sections if necessary
            await client.query(
                'UPDATE company_info_sections SET order_index = order_index + 1 WHERE company_id = $1 AND order_index >= $2',
                [companyId, finalOrderIndex]
            );
        }

        // Insert new section
        const insertQuery = `
            INSERT INTO company_info_sections (company_id, section_type, title, content, order_index)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;

        const result = await client.query(insertQuery, [
            companyId,
            section_type || 'general',
            title,
            content || '',
            finalOrderIndex
        ]);

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error creating section:', err.message);

        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ error: 'Section with this order already exists' });
        }

        res.status(500).json({ error: 'Server Error' });
    } finally {
        client.release();
    }
};

// --- UPDATE SECTION --- (Admin only)
const updateSection = async (req, res) => {
    const { sectionId } = req.params;
    const { section_type, title, content, order_index, is_active } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if section exists
        const sectionCheck = await client.query('SELECT * FROM company_info_sections WHERE id = $1', [sectionId]);
        if (sectionCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const currentSection = sectionCheck.rows[0];

        // Handle order index changes
        if (order_index && order_index !== currentSection.order_index) {
            // Update other sections' order
            if (order_index > currentSection.order_index) {
                // Moving down: decrease order of sections in between
                await client.query(
                    'UPDATE company_info_sections SET order_index = order_index - 1 WHERE company_id = $1 AND order_index > $2 AND order_index <= $3',
                    [currentSection.company_id, currentSection.order_index, order_index]
                );
            } else {
                // Moving up: increase order of sections in between
                await client.query(
                    'UPDATE company_info_sections SET order_index = order_index + 1 WHERE company_id = $1 AND order_index >= $2 AND order_index < $3',
                    [currentSection.company_id, order_index, currentSection.order_index]
                );
            }
        }

        // Update the section
        const updateQuery = `
            UPDATE company_info_sections
            SET
                section_type = COALESCE($1, section_type),
                title = COALESCE($2, title),
                content = COALESCE($3, content),
                order_index = COALESCE($4, order_index),
                is_active = COALESCE($5, is_active),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *;
        `;

        const result = await client.query(updateQuery, [
            section_type,
            title,
            content,
            order_index,
            is_active,
            sectionId
        ]);

        await client.query('COMMIT');
        res.json(result.rows[0]);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating section:', err.message);

        if (err.code === '23505') {
            return res.status(400).json({ error: 'Section with this order already exists' });
        }

        res.status(500).json({ error: 'Server Error' });
    } finally {
        client.release();
    }
};

// --- DELETE SECTION --- (Admin only)
const deleteSection = async (req, res) => {
    const { sectionId } = req.params;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get section info before deletion
        const sectionResult = await client.query('SELECT company_id, order_index FROM company_info_sections WHERE id = $1', [sectionId]);
        if (sectionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const { company_id, order_index } = sectionResult.rows[0];

        // Delete section
        await client.query('DELETE FROM company_info_sections WHERE id = $1', [sectionId]);

        // Reorder remaining sections
        await client.query(
            'UPDATE company_info_sections SET order_index = order_index - 1 WHERE company_id = $1 AND order_index > $2',
            [company_id, order_index]
        );

        await client.query('COMMIT');
        res.json({ message: 'Section deleted successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting section:', err.message);
        res.status(500).json({ error: 'Server Error' });
    } finally {
        client.release();
    }
};

// --- REORDER SECTIONS --- (Admin only)
const reorderSections = async (req, res) => {
    const { sections } = req.body; // Array of { id, order_index }

    if (!Array.isArray(sections)) {
        return res.status(400).json({ error: 'Sections must be an array' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update all sections with new order
        for (const section of sections) {
            await client.query(
                'UPDATE company_info_sections SET order_index = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [section.order_index, section.id]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Sections reordered successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error reordering sections:', err.message);
        res.status(500).json({ error: 'Server Error' });
    } finally {
        client.release();
    }
};

module.exports = {
    getAllCompaniesWithSections,
    getCompanySections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections
};