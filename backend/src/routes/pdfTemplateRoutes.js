const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const pdfTemplateController = require('../controllers/pdfTemplateController');

/**
 * PDF Template Management Routes
 * All routes require authentication
 */

// Upload PDF template for user's company and dropdown option (simplified)
router.post('/upload',
    authMiddleware,
    pdfTemplateController.upload,
    pdfTemplateController.uploadPDFTemplateForUser
);

// Upload PDF template for a specific company and dropdown option
router.post('/companies/:companyId/pdf-templates',
    authMiddleware,
    pdfTemplateController.upload,
    pdfTemplateController.uploadPDFTemplate
);

// Get all PDF templates for a company
router.get('/companies/:companyId/pdf-templates',
    authMiddleware,
    pdfTemplateController.getCompanyPDFTemplates
);

// Get specific template details with placeholders and mappings
router.get('/pdf-templates/:templateId',
    authMiddleware,
    pdfTemplateController.getPDFTemplateDetails
);

// Analyze PDF template and generate mapping suggestions
router.post('/pdf-templates/:templateId/analyze',
    authMiddleware,
    pdfTemplateController.analyzePDFTemplate
);

// Save field mappings for a PDF template
router.post('/pdf-templates/:templateId/mappings',
    authMiddleware,
    pdfTemplateController.savePDFMappings
);

// Get existing mappings for a PDF template
router.get('/pdf-templates/:templateId/mappings',
    authMiddleware,
    pdfTemplateController.getPDFMappings
);

// Delete a PDF template
router.delete('/pdf-templates/:templateId',
    authMiddleware,
    pdfTemplateController.deletePDFTemplate
);

// Download PDF template file
router.get('/pdf-templates/:templateId/download',
    authMiddleware,
    pdfTemplateController.downloadPDFTemplate
);

// Save visual mappings for a PDF template (position-based)
router.post('/pdf-templates/:templateId/visual-mappings',
    authMiddleware,
    pdfTemplateController.saveVisualMappings
);

// Get visual mappings for a PDF template
router.get('/pdf-templates/:templateId/visual-mappings',
    authMiddleware,
    pdfTemplateController.getVisualMappings
);

module.exports = router;