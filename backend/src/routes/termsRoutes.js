const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');

const {
    getCurrentTerms,
    getTermsHistory,
    getTermsVersion,
    getUserAcceptanceStatus,
    acceptCurrentTerms,
    createTermsVersion,
    updateTermsVersion,
    setCurrentVersion,
    getUserAcceptanceReport,
    getTermsPdfFiles,
    downloadTermsPdf,
    generatePdfForTerms
} = require('../controllers/termsController');

// --- PUBLIC ROUTES ---
// Get current terms (accessible without authentication for initial display)
router.get('/current', getCurrentTerms);

// --- AUTHENTICATED USER ROUTES ---
router.use(authMiddleware);

// Check if user needs to accept terms
router.get('/acceptance-status', getUserAcceptanceStatus);

// Accept current terms
router.post('/accept', acceptCurrentTerms);

// View terms history
router.get('/history', getTermsHistory);

// View specific terms version
router.get('/version/:id', getTermsVersion);

// --- ADMIN ONLY ROUTES ---
// Create new terms version
router.post('/', [authMiddleware, adminMiddleware], createTermsVersion);

// Update existing terms version
router.put('/version/:id', [authMiddleware, adminMiddleware], updateTermsVersion);

// Set current version
router.put('/version/:id/set-current', [authMiddleware, adminMiddleware], setCurrentVersion);

// Get user acceptance report
router.get('/acceptance-report', [authMiddleware, adminMiddleware], getUserAcceptanceReport);

// Get all PDF files
router.get('/pdfs', [authMiddleware, adminMiddleware], getTermsPdfFiles);

// Generate PDF for existing terms version
router.post('/version/:id/generate-pdf', [authMiddleware, adminMiddleware], generatePdfForTerms);

// Download PDF file (available to all authenticated users)
router.get('/pdf/download/:id', downloadTermsPdf);

module.exports = router;