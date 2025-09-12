const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const { getBillingSettings, updateBillingSettings, generateInvoice, getInvoices, generateInvoicePdf } = require('../controllers/adminBillingController');

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/settings', getBillingSettings);
router.post('/settings', updateBillingSettings);

router.get('/invoices', getInvoices);
router.post('/invoices', generateInvoice);
router.get('/invoices/:id/pdf', generateInvoicePdf);

module.exports = router;