const pool = require('../config/db');

/**
 * Get the effective user ID for data access based on role inheritance
 * For Secretary role: returns parent_user_id (TeamLeader)
 * For other roles: returns the user's own ID
 * @param {Object} user - The authenticated user object
 * @returns {Promise<number>} The effective user ID to use for data queries
 */
const getEffectiveUserId = async (user) => {
    const { id: userId, role } = user;
    
    // If user is Secretary, use parent_user_id for inheritance
    if (role === 'Secretary') {
        try {
            const result = await pool.query('SELECT parent_user_id FROM users WHERE id = $1', [userId]);
            const parentUserId = result.rows[0]?.parent_user_id;
            
            if (!parentUserId) {
                throw new Error('Secretary does not have an assigned team leader (parent_user_id)');
            }
            
            return parentUserId;
        } catch (error) {
            console.error('Error getting parent user ID for Secretary:', error);
            throw error;
        }
    }
    
    // For all other roles (Admin, TeamLeader, Associate), use their own ID
    return userId;
};

/**
 * Check if the user has permission to access financial data
 * @param {string} role - User role
 * @returns {boolean} True if user can access financial data
 */
const canAccessFinancialData = (role) => {
    return role === 'Admin' || role === 'TeamLeader';
};

/**
 * Get team members for a given user ID (for TeamLeaders and Admins)
 * @param {number} userId - The user ID to get team members for
 * @returns {Promise<Array>} Array of team member IDs
 */
const getTeamMemberIds = async (userId) => {
    try {
        const result = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
        return result.rows.map(row => row.id);
    } catch (error) {
        console.error('Error getting team member IDs:', error);
        throw error;
    }
};

module.exports = {
    getEffectiveUserId,
    canAccessFinancialData,
    getTeamMemberIds
};