const express = require('express');
const router = express.Router();
const {
    getAllCompaniesWithSections,
    getCompanySections,
    createSection,
    updateSection,
    deleteSection,
    reorderSections
} = require('../controllers/infoPortalController');

// Import middleware
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

// --- PUBLIC/AUTHENTICATED ROUTES ---

// GET all companies with their info sections
// Anyone authenticated can view
router.get('/companies', authMiddleware, getAllCompaniesWithSections);

// GET specific company sections
// Anyone authenticated can view
router.get('/companies/:companyId', authMiddleware, getCompanySections);

// --- ADMIN ONLY ROUTES ---

// CREATE new section for a company
router.post('/companies/:companyId/sections', authMiddleware, adminMiddleware, createSection);

// UPDATE specific section
router.put('/sections/:sectionId', authMiddleware, adminMiddleware, updateSection);

// DELETE specific section
router.delete('/sections/:sectionId', authMiddleware, adminMiddleware, deleteSection);

// REORDER sections (bulk update)
router.put('/sections/reorder', authMiddleware, adminMiddleware, reorderSections);

module.exports = router;