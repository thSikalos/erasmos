const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const financeAuthMiddleware = require('../middleware/financeAuthMiddleware');
const { getDashboardStats, getDetailedReport, exportDetailedReport, getChartData } = require('../controllers/reportsController');

router.use(authMiddleware);

// Dashboard stats should be accessible to Secretary (not financial data)
router.get('/dashboard', getDashboardStats);

// Financial reports are protected
router.get('/detailed', financeAuthMiddleware, getDetailedReport);
router.get('/detailed/export', financeAuthMiddleware, exportDetailedReport);
router.get('/charts', financeAuthMiddleware, getChartData);

module.exports = router;