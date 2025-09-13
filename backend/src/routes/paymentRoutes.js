const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const financeAuthMiddleware = require('../middleware/financeAuthMiddleware');
const {
    createPaymentStatement,
    createClawback,
    getStatements,
    updateStatementStatus,
    generateStatementPdf,
    deletePaymentStatement,
    editPaymentStatement,
    markStatementAsPaid
} = require('../controllers/paymentController');

router.use(authMiddleware);
router.use(financeAuthMiddleware);

// --- Statements ---
router.post('/statements', (req, res, next) => {
    console.log("POST /statements route hit");
    console.log("Request body:", req.body);
    console.log("User:", req.user);
    next();
}, createPaymentStatement);
router.get('/statements', getStatements);
router.get('/statements/:id/pdf', generateStatementPdf);
router.patch('/statements/:id/status', updateStatementStatus);

// New statement management endpoints
router.delete('/statements/:id', deletePaymentStatement);
router.put('/statements/:id', editPaymentStatement);
router.patch('/statements/:id/mark-paid', markStatementAsPaid);

// --- Clawbacks ---
router.post('/clawbacks', createClawback);

module.exports = router;