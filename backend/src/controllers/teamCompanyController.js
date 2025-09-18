const pool = require('../config/db');

/**
 * Get companies accessible by the current team leader's team
 * Only top-level team leaders can access this endpoint
 */
const getTeamCompanies = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Only top-level managers (Admins or TeamLeaders) can manage team companies
        if (userRole !== 'TeamLeader' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators and team leaders can manage team companies.' });
        }

        // Check if user is a top-level team leader
        const userCheck = await pool.query(
            'SELECT parent_user_id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (userCheck.rows[0].parent_user_id !== null) {
            return res.status(403).json({
                message: 'Access denied. Only top-level administrators and team leaders can manage team companies.'
            });
        }

        // Get all companies and mark which ones are accessible by this team
        const query = `
            SELECT
                c.id,
                c.name,
                CASE
                    WHEN tca.company_id IS NOT NULL THEN true
                    ELSE false
                END as is_accessible
            FROM companies c
            LEFT JOIN team_company_access tca ON c.id = tca.company_id AND tca.team_leader_id = $1
            ORDER BY c.name
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);

    } catch (err) {
        console.error('Error in getTeamCompanies:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Update team company access
 * Accepts an array of company IDs that the team should have access to
 */
const updateTeamCompanies = async (req, res) => {
    const client = await pool.connect();

    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { companyIds } = req.body;

        // Validate input
        if (!Array.isArray(companyIds)) {
            return res.status(400).json({ message: 'companyIds must be an array.' });
        }

        // Only top-level managers (Admins or TeamLeaders) can manage team companies
        if (userRole !== 'TeamLeader' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators and team leaders can manage team companies.' });
        }

        // Check if user is a top-level team leader
        const userCheck = await client.query(
            'SELECT parent_user_id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }

        if (userCheck.rows[0].parent_user_id !== null) {
            return res.status(403).json({
                message: 'Access denied. Only top-level administrators and team leaders can manage team companies.'
            });
        }

        await client.query('BEGIN');

        // Remove all existing company access for this team leader
        await client.query(
            'DELETE FROM team_company_access WHERE team_leader_id = $1',
            [userId]
        );

        // Add new company access
        if (companyIds.length > 0) {
            // Validate that all company IDs exist
            const companyCheck = await client.query(
                'SELECT id FROM companies WHERE id = ANY($1)',
                [companyIds]
            );

            if (companyCheck.rows.length !== companyIds.length) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: 'One or more company IDs are invalid.' });
            }

            // Insert new access records
            const insertQuery = `
                INSERT INTO team_company_access (team_leader_id, company_id)
                VALUES ${companyIds.map((_, index) => `($1, $${index + 2})`).join(', ')}
            `;

            await client.query(insertQuery, [userId, ...companyIds]);
        }

        await client.query('COMMIT');

        // Return updated company access
        const updatedQuery = `
            SELECT
                c.id,
                c.name,
                CASE
                    WHEN tca.company_id IS NOT NULL THEN true
                    ELSE false
                END as is_accessible
            FROM companies c
            LEFT JOIN team_company_access tca ON c.id = tca.company_id AND tca.team_leader_id = $1
            ORDER BY c.name
        `;

        const result = await client.query(updatedQuery, [userId]);

        res.json({
            message: 'Team company access updated successfully.',
            companies: result.rows
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error in updateTeamCompanies:', err.message);
        res.status(500).json({ message: 'Server Error' });
    } finally {
        client.release();
    }
};

/**
 * Get team members for the current team leader
 * Used to show which users will be affected by company access changes
 */
const getTeamMembers = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        // Only administrators and team leaders can view their team members
        if (userRole !== 'TeamLeader' && userRole !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Only administrators and team leaders can view team members.' });
        }

        const query = `
            SELECT
                id,
                name,
                email,
                role
            FROM users
            WHERE parent_user_id = $1
                AND deleted_at IS NULL
            ORDER BY name
        `;

        const result = await pool.query(query, [userId]);
        res.json(result.rows);

    } catch (err) {
        console.error('Error in getTeamMembers:', err.message);
        res.status(500).json({ message: 'Server Error' });
    }
};

/**
 * Get companies accessible by a user based on their team hierarchy
 * This is used by other controllers to filter companies for regular operations
 */
const getUserAccessibleCompanies = async (userId, userRole) => {
    try {
        let query;
        let params;

        if (userRole === 'Admin') {
            // Check if top-level or subordinate admin
            const userCheck = await pool.query(
                'SELECT parent_user_id FROM users WHERE id = $1',
                [userId]
            );

            if (userCheck.rows.length === 0) {
                throw new Error('User not found');
            }

            const parentUserId = userCheck.rows[0].parent_user_id;

            if (parentUserId === null) {
                // Top-level admin - get companies from team_company_access (like top-level team leader)
                query = `
                    SELECT DISTINCT
                        c.id,
                        c.name,
                        COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                    FROM companies c
                    INNER JOIN team_company_access tca ON c.id = tca.company_id
                    LEFT JOIN company_fields cf ON c.id = cf.company_id
                    LEFT JOIN fields f ON cf.field_id = f.id
                    WHERE tca.team_leader_id = $1
                    GROUP BY c.id, c.name
                    ORDER BY c.name
                `;
                params = [userId];
            } else {
                // Subordinate admin - get companies from parent's team access
                query = `
                    SELECT DISTINCT
                        c.id,
                        c.name,
                        COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                    FROM companies c
                    INNER JOIN team_company_access tca ON c.id = tca.company_id
                    LEFT JOIN company_fields cf ON c.id = cf.company_id
                    LEFT JOIN fields f ON cf.field_id = f.id
                    WHERE tca.team_leader_id = $1
                    GROUP BY c.id, c.name
                    ORDER BY c.name
                `;
                params = [parentUserId];
            }
        } else if (userRole === 'TeamLeader') {
            // Check if top-level or subordinate team leader
            const userCheck = await pool.query(
                'SELECT parent_user_id FROM users WHERE id = $1',
                [userId]
            );

            if (userCheck.rows.length === 0) {
                throw new Error('User not found');
            }

            const parentUserId = userCheck.rows[0].parent_user_id;

            if (parentUserId === null) {
                // Top-level team leader - get companies from team_company_access
                query = `
                    SELECT DISTINCT
                        c.id,
                        c.name,
                        COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                    FROM companies c
                    INNER JOIN team_company_access tca ON c.id = tca.company_id
                    LEFT JOIN company_fields cf ON c.id = cf.company_id
                    LEFT JOIN fields f ON cf.field_id = f.id
                    WHERE tca.team_leader_id = $1
                    GROUP BY c.id, c.name
                    ORDER BY c.name
                `;
                params = [userId];
            } else {
                // Subordinate team leader - get companies from parent team leader
                query = `
                    SELECT DISTINCT
                        c.id,
                        c.name,
                        COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                    FROM companies c
                    INNER JOIN team_company_access tca ON c.id = tca.company_id
                    LEFT JOIN company_fields cf ON c.id = cf.company_id
                    LEFT JOIN fields f ON cf.field_id = f.id
                    WHERE tca.team_leader_id = $1
                    GROUP BY c.id, c.name
                    ORDER BY c.name
                `;
                params = [parentUserId];
            }
        } else {
            // Associate or other roles - get companies from their team leader
            const teamLeaderQuery = await pool.query(
                'SELECT parent_user_id FROM users WHERE id = $1',
                [userId]
            );

            if (teamLeaderQuery.rows.length === 0 || !teamLeaderQuery.rows[0].parent_user_id) {
                // No team leader found, return empty array
                return [];
            }

            const teamLeaderId = teamLeaderQuery.rows[0].parent_user_id;

            query = `
                SELECT DISTINCT
                    c.id,
                    c.name,
                    COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                FROM companies c
                INNER JOIN team_company_access tca ON c.id = tca.company_id
                LEFT JOIN company_fields cf ON c.id = cf.company_id
                LEFT JOIN fields f ON cf.field_id = f.id
                WHERE tca.team_leader_id = $1
                GROUP BY c.id, c.name
                ORDER BY c.name
            `;
            params = [teamLeaderId];
        }

        const result = await pool.query(query, params);

        // If no companies found and user is Admin or top-level manager, fallback to all companies for backward compatibility
        if (result.rows.length === 0 && (userRole === 'Admin' || (userRole === 'TeamLeader' && params.length > 0))) {
            console.log(`No company access found for user ${userId}, falling back to all companies for backward compatibility`);
            const fallbackQuery = `
                SELECT
                    c.id,
                    c.name,
                    COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                FROM companies c
                LEFT JOIN company_fields cf ON c.id = cf.company_id
                LEFT JOIN fields f ON cf.field_id = f.id
                GROUP BY c.id, c.name
                ORDER BY c.name
            `;
            const fallbackResult = await pool.query(fallbackQuery);
            return fallbackResult.rows;
        }

        return result.rows;

    } catch (err) {
        console.error('Error in getUserAccessibleCompanies:', err.message);

        // Fallback for any error - return all companies for backward compatibility
        try {
            console.log(`Error occurred, falling back to all companies for user ${userId}`);
            const fallbackQuery = `
                SELECT
                    c.id,
                    c.name,
                    COALESCE(json_agg(json_build_object('id', f.id, 'label', f.label, 'type', f.type, 'is_commissionable', f.is_commissionable)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
                FROM companies c
                LEFT JOIN company_fields cf ON c.id = cf.company_id
                LEFT JOIN fields f ON cf.field_id = f.id
                GROUP BY c.id, c.name
                ORDER BY c.name
            `;
            const fallbackResult = await pool.query(fallbackQuery);
            return fallbackResult.rows;
        } catch (fallbackErr) {
            console.error('Fallback query also failed:', fallbackErr.message);
            throw err;
        }
    }
};

module.exports = {
    getTeamCompanies,
    updateTeamCompanies,
    getTeamMembers,
    getUserAccessibleCompanies
};