const pool = require('../config/db');

// --- CREATE A NEW COMPANY AND ASSIGN FIELDS --- (Admin only)
const createCompany = async (req, res) => {
    const { name, field_ids } = req.body; // field_ids is an array of IDs [1, 2, 5]
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create the company
        const companyRes = await client.query(
            "INSERT INTO companies (name) VALUES ($1) RETURNING id",
            [name]
        );
        const newCompanyId = companyRes.rows[0].id;

        // Link the fields to the company
        if (field_ids && field_ids.length > 0) {
            for (const fieldId of field_ids) {
                await client.query(
                    "INSERT INTO company_fields (company_id, field_id) VALUES ($1, $2)",
                    [newCompanyId, fieldId]
                );
            }
        }
        
        await client.query('COMMIT');
        res.status(201).json({ id: newCompanyId, name, field_ids });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(400).json({ message: 'A company with this name already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET ALL COMPANIES WITH THEIR FIELDS ---
const getAllCompanies = async (req, res) => {
    try {
        const query = `
            SELECT 
                c.id, 
                c.name,
                COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
            FROM companies c
            LEFT JOIN company_fields cf ON c.id = cf.company_id
            LEFT JOIN fields f ON cf.field_id = f.id
            GROUP BY c.id, c.name
            ORDER BY c.name;
        `;
        const companies = await pool.query(query);
        res.json(companies.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE A COMPANY --- (Admin only)
const updateCompany = async (req, res) => {
    const { id } = req.params;
    const { name, field_ids } = req.body;
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Ενημέρωση του ονόματος της εταιρείας
        await client.query("UPDATE companies SET name = $1 WHERE id = $2", [name, id]);

        // Διαγραφή των παλιών συνδέσεων με τα πεδία
        await client.query("DELETE FROM company_fields WHERE company_id = $1", [id]);

        // Εισαγωγή των νέων συνδέσεων με τα πεδία
        if (field_ids && field_ids.length > 0) {
            for (const fieldId of field_ids) {
                await client.query(
                    "INSERT INTO company_fields (company_id, field_id) VALUES ($1, $2)",
                    [id, fieldId]
                );
            }
        }
        
        await client.query('COMMIT');
        res.status(200).json({ message: 'Company updated successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        if (err.code === '23505') {
            return res.status(400).json({ message: 'A company with this name already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- DELETE A COMPANY --- (Admin only)
const deleteCompany = async (req, res) => {
    const { id } = req.params;
    try {
        // Η διαγραφή από τον πίνακα companies θα ενεργοποιήσει το ON DELETE CASCADE
        // στον πίνακα company_fields, καθαρίζοντας αυτόματα τις συνδέσεις.
        await pool.query("DELETE FROM companies WHERE id = $1", [id]);
        res.json({ message: 'Company deleted successfully' });
    } catch (err) {
        // Αν η εταιρεία χρησιμοποιείται σε κάποια αίτηση ή αμοιβή, η βάση θα το μπλοκάρει
        if (err.code === '23503') {
            return res.status(400).json({ message: 'Cannot delete company because it is being used in applications or commissions.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createCompany,
    getAllCompanies,
    updateCompany,
    deleteCompany
};