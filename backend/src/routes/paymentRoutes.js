const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    createPaymentStatement, 
    createClawback,
    getStatements,
    updateStatementStatus,
    generateStatementPdf
} = require('../controllers/paymentController');

router.use(authMiddleware);

// --- Statements ---
router.post('/statements', createPaymentStatement);
router.get('/statements', getStatements);
router.get('/statements/:id/pdf', generateStatementPdf);
router.patch('/statements/:id/status', updateStatementStatus);

// --- Clawbacks ---
router.post('/clawbacks', createClawback);

module.exports = router;