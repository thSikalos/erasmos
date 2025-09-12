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
    getRenewals,
    getApplicationComments,
    addApplicationComment,
    exportRenewals // <-- ΝΕΟ
} = require('../controllers/applicationController');

router.use(authMiddleware);

router.get('/renewals/export', exportRenewals); // <-- ΝΕΟ
router.get('/renewals', getRenewals);

router.post('/', createApplication);
router.get('/', getApplications);

router.get('/:id/comments', getApplicationComments);
router.post('/:id/comments', addApplicationComment);

router.get('/:id', getApplicationById);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.patch('/:id/paid', markAsPaid);

module.exports = router;