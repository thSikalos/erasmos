const pool = require('../config/db');

// --- CREATE A NEW FIELD IN THE LIBRARY --- (Admin only)
const createField = async (req, res) => {
    const { label, type, is_commissionable } = req.body;
    try {
        const newField = await pool.query(
            "INSERT INTO fields (label, type, is_commissionable) VALUES ($1, $2, $3) RETURNING *",
            [label, type, is_commissionable]
        );
        res.status(201).json(newField.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'A field with this label already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET ALL FIELDS FROM THE LIBRARY ---
const getAllFields = async (req, res) => {
    try {
        const fields = await pool.query("SELECT * FROM fields ORDER BY label ASC");
        res.json(fields.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE A FIELD --- (Admin only)
const updateField = async (req, res) => {
    const { id } = req.params;
    const { label, type, is_commissionable } = req.body;
    try {
        const result = await pool.query(
            "UPDATE fields SET label = $1, type = $2, is_commissionable = $3 WHERE id = $4 RETURNING *",
            [label, type, is_commissionable, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Field not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ message: 'A field with this label already exists.' });
        }
        console.error(err.message);
        res.status(500).send('Server Error');
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