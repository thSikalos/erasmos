const pool = require('../config/db');

// --- GET ALL CUSTOM COMMISSIONS FOR A TEAM ---
const getCommissions = async (req, res) => {
    const teamLeaderId = req.user.id;
    try {
        const companyCommissions = await pool.query(
            `SELECT uc.associate_id, uc.company_id, uc.amount FROM user_commissions uc
             JOIN users u ON uc.associate_id = u.id
             WHERE u.parent_user_id = $1 OR uc.associate_id = $1`, [teamLeaderId]
        );
        const fieldCommissions = await pool.query(
            `SELECT ufc.associate_id, ufc.field_id, ufc.amount FROM user_field_commissions ufc
             JOIN users u ON ufc.associate_id = u.id
             WHERE u.parent_user_id = $1 OR ufc.associate_id = $1`, [teamLeaderId]
        );
        res.json({
            company_commissions: companyCommissions.rows,
            field_commissions: fieldCommissions.rows,
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- SET OR UPDATE A COMPANY COMMISSION ---
const setCompanyCommission = async (req, res) => {
    const { associate_id, company_id, amount } = req.body;
    try {
        const query = `
            INSERT INTO user_commissions (associate_id, company_id, amount) VALUES ($1, $2, $3)
            ON CONFLICT (associate_id, company_id) DO UPDATE SET amount = EXCLUDED.amount RETURNING *;`;
        const result = await pool.query(query, [associate_id, company_id, amount]);
        res.status(201).json(result.rows[0]);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
};

// --- SET OR UPDATE A FIELD COMMISSION ---
const setFieldCommission = async (req, res) => {
    const { associate_id, field_id, amount } = req.body;
    try {
        const query = `
            INSERT INTO user_field_commissions (associate_id, field_id, amount) VALUES ($1, $2, $3)
            ON CONFLICT (associate_id, field_id) DO UPDATE SET amount = EXCLUDED.amount RETURNING *;`;
        const result = await pool.query(query, [associate_id, field_id, amount]);
        res.status(201).json(result.rows[0]);
    } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
};

module.exports = { getCommissions, setCompanyCommission, setFieldCommission };