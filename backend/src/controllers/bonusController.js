const pool = require('../config/db');

// --- CREATE A NEW BONUS --- (TeamLeader/Admin only)
const createBonus = async (req, res) => {
    const creator_id = req.user.id;
    const { target_user_id, name, application_count_target, bonus_amount_per_application, company_ids } = req.body;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Create the bonus (continuous monthly bonus)
        const newBonus = await client.query(
            `INSERT INTO bonuses (creator_id, target_user_id, name, application_count_target, bonus_amount_per_application)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [creator_id, target_user_id, name, application_count_target, bonus_amount_per_application]
        );

        const bonusId = newBonus.rows[0].id;

        // Insert company associations if provided
        if (company_ids && company_ids.length > 0) {
            for (const companyId of company_ids) {
                await client.query(
                    `INSERT INTO bonus_companies (bonus_id, company_id) VALUES ($1, $2)`,
                    [bonusId, companyId]
                );
            }
        }

        await client.query('COMMIT');
        res.status(201).json({
            ...newBonus.rows[0],
            company_ids: company_ids || []
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET BONUSES FOR A USER ---
const getBonuses = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUserId = userId || req.user.id;

        const bonusesQuery = await pool.query(`
            SELECT
                b.*,
                u.name as creator_name,
                COALESCE(json_agg(
                    CASE WHEN bc.company_id IS NOT NULL
                    THEN json_build_object('id', c.id, 'name', c.name)
                    ELSE NULL END
                ) FILTER (WHERE bc.company_id IS NOT NULL), '[]') as companies
            FROM bonuses b
            LEFT JOIN users u ON b.creator_id = u.id
            LEFT JOIN bonus_companies bc ON b.id = bc.bonus_id
            LEFT JOIN companies c ON bc.company_id = c.id
            WHERE b.target_user_id = $1 AND b.is_active = true
            GROUP BY b.id, u.name
            ORDER BY b.created_at DESC
        `, [targetUserId]);

        res.json(bonusesQuery.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET BONUS PROGRESS ---
const getBonusProgress = async (req, res) => {
    try {
        const { userId } = req.params;
        const targetUserId = userId || req.user.id;

        const progressQuery = await pool.query(`
            WITH bonus_progress AS (
                SELECT
                    b.id,
                    b.name,
                    b.application_count_target,
                    b.bonus_amount_per_application,
                    b.is_active,
                    b.created_at,
                    -- Count applications that were included in paid payment statements this month
                    (
                        SELECT COUNT(DISTINCT si.application_id)
                        FROM statement_items si
                        JOIN payment_statements ps ON si.statement_id = ps.id
                        JOIN applications a ON si.application_id = a.id
                        WHERE a.user_id = b.target_user_id
                        AND DATE_TRUNC('month', ps.created_at) = DATE_TRUNC('month', CURRENT_DATE)
                        AND ps.status = 'paid'  -- Only count paid statements for bonus
                        AND (
                            -- If bonus has specific companies, count only those
                            EXISTS(SELECT 1 FROM bonus_companies bc WHERE bc.bonus_id = b.id)
                            AND a.company_id IN (
                                SELECT bc.company_id
                                FROM bonus_companies bc
                                WHERE bc.bonus_id = b.id
                            )
                            OR
                            -- If no specific companies, count all applications
                            NOT EXISTS(SELECT 1 FROM bonus_companies bc WHERE bc.bonus_id = b.id)
                        )
                    ) as current_applications,
                    -- Get breakdown by company for current month
                    COALESCE(json_agg(
                        CASE WHEN bc.company_id IS NOT NULL
                        THEN json_build_object(
                            'company_id', c.id,
                            'company_name', c.name,
                            'application_count', (
                                SELECT COUNT(DISTINCT si2.application_id)
                                FROM statement_items si2
                                JOIN payment_statements ps2 ON si2.statement_id = ps2.id
                                JOIN applications a2 ON si2.application_id = a2.id
                                WHERE a2.user_id = b.target_user_id
                                AND a2.company_id = c.id
                                AND DATE_TRUNC('month', ps2.created_at) = DATE_TRUNC('month', CURRENT_DATE)
                                AND ps2.status = 'paid'
                            )
                        )
                        ELSE NULL END
                    ) FILTER (WHERE bc.company_id IS NOT NULL), '[]') as company_breakdown
                FROM bonuses b
                LEFT JOIN bonus_companies bc ON b.id = bc.bonus_id
                LEFT JOIN companies c ON bc.company_id = c.id
                WHERE b.target_user_id = $1
                AND b.is_active = true
                GROUP BY b.id
            )
            SELECT
                *,
                CASE
                    WHEN current_applications >= application_count_target THEN true
                    ELSE false
                END as is_achieved,
                CASE
                    WHEN current_applications >= application_count_target
                    THEN application_count_target * bonus_amount_per_application
                    ELSE 0
                END as earned_amount,
                ROUND((current_applications::DECIMAL / application_count_target) * 100, 1) as progress_percentage,
                TO_CHAR(CURRENT_DATE, 'Month YYYY') as current_month
            FROM bonus_progress
            ORDER BY created_at DESC
        `, [targetUserId]);

        res.json(progressQuery.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET ALL BONUSES (Admin/TeamLeader only) ---
const getAllBonuses = async (req, res) => {
    try {
        const bonusesQuery = await pool.query(`
            SELECT
                b.*,
                u_creator.name as creator_name,
                u_target.name as target_name,
                COALESCE(json_agg(
                    CASE WHEN bc.company_id IS NOT NULL
                    THEN json_build_object('id', c.id, 'name', c.name)
                    ELSE NULL END
                ) FILTER (WHERE bc.company_id IS NOT NULL), '[]') as companies
            FROM bonuses b
            LEFT JOIN users u_creator ON b.creator_id = u_creator.id
            LEFT JOIN users u_target ON b.target_user_id = u_target.id
            LEFT JOIN bonus_companies bc ON b.id = bc.bonus_id
            LEFT JOIN companies c ON bc.company_id = c.id
            WHERE b.is_active = true
            GROUP BY b.id, u_creator.name, u_target.name
            ORDER BY b.created_at DESC
        `);

        res.json(bonusesQuery.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createBonus,
    getBonuses,
    getBonusProgress,
    getAllBonuses
};