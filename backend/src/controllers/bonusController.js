const pool = require('../config/db');

// --- CREATE A NEW BONUS --- (TeamLeader/Admin only)
const createBonus = async (req, res) => {
    const creator_id = req.user.id;
    const { target_user_id, name, start_date, end_date, application_count_target, bonus_amount_per_application } = req.body;

    try {
        const newBonus = await pool.query(
            `INSERT INTO bonuses (creator_id, target_user_id, name, start_date, end_date, application_count_target, bonus_amount_per_application) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [creator_id, target_user_id, name, start_date, end_date, application_count_target, bonus_amount_per_application]
        );
        res.status(201).json(newBonus.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createBonus
};