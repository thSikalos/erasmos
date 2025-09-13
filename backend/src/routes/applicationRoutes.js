const express = require('express');
const router = express.Router();
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
    getDisplayableFields
} = require('../controllers/applicationController');

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

router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.patch('/:id/paid', markAsPaid);
router.patch('/:id/unpaid', markAsUnpaid);

module.exports = router;