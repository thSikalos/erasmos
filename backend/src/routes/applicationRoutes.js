const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const authMiddleware = require('../middleware/authMiddleware');
const {
    createApplication,
    getApplications,
    getApplicationById,
    updateApplicationStatus,
    updateApplication,
    markAsPaid,
    markAsUnpaid,
    getRenewals,
    getApplicationComments,
    addApplicationComment,
    exportRenewals, // <-- ΝΕΟ
    getTeamApplications,
    getApplicationCommissionableFields,
    updateFieldPaymentStatus,
    createFieldClawback,
    getApplicationFieldPayments,
    getDisplayableFields,
    // PDF Generation routes
    generateApplicationPDF,
    checkPDFReadiness,
    uploadSignedPDF
} = require('../controllers/applicationController');

// Configure multer for signed PDF uploads
const signedPDFStorage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../../uploads/signed_pdfs');
        try {
            await fs.mkdir(uploadDir, { recursive: true });
            cb(null, uploadDir);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        const applicationId = req.params.id;
        const timestamp = Date.now();
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `app_${applicationId}_signed_${timestamp}_${sanitizedName}`);
    }
});

const signedPDFUpload = multer({
    storage: signedPDFStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

router.use(authMiddleware);

router.get('/renewals/export', exportRenewals); // <-- ΝΕΟ
router.get('/renewals', getRenewals);
router.get('/team-applications', getTeamApplications);

router.post('/', createApplication);
router.get('/', getApplications);

router.get('/:id/comments', getApplicationComments);
router.post('/:id/comments', addApplicationComment);
router.get('/:id/commissionable-fields', getApplicationCommissionableFields);
router.get('/:id/field-payments', getApplicationFieldPayments);

// Field-level payment management routes
router.patch('/:applicationId/fields/:fieldId/payment', updateFieldPaymentStatus);
router.post('/:applicationId/fields/:fieldId/clawback', createFieldClawback);

// Displayable fields for table configuration
router.get('/displayable-fields', getDisplayableFields);

// PDF Generation routes
router.post('/generate-pdf', generateApplicationPDF);
router.get('/:id/pdf-readiness', checkPDFReadiness);
router.post('/:id/upload-signed', signedPDFUpload.single('signedPDF'), uploadSignedPDF);

router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.patch('/:id/paid', markAsPaid);
router.patch('/:id/unpaid', markAsUnpaid);

module.exports = router;