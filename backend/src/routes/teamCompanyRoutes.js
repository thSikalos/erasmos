const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getTeamCompanies,
    updateTeamCompanies,
    getTeamMembers
} = require('../controllers/teamCompanyController');

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/team-companies
 * Get companies accessible by the current team leader's team
 * Only top-level team leaders can access this endpoint
 */
router.get('/', getTeamCompanies);

/**
 * PUT /api/team-companies
 * Update team company access
 * Body: { companyIds: [1, 2, 3] }
 * Only top-level team leaders can access this endpoint
 */
router.put('/', updateTeamCompanies);

/**
 * GET /api/team-companies/members
 * Get team members for the current team leader
 * Used to show which users will be affected by company access changes
 */
router.get('/members', getTeamMembers);

module.exports = router;