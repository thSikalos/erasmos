const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getDashboardStats, getDetailedReport, exportDetailedReport, getChartData } = require('../controllers/reportsController');

router.use(authMiddleware);

router.get('/dashboard', getDashboardStats);
router.get('/detailed', getDetailedReport);
router.get('/detailed/export', exportDetailedReport);
router.get('/charts', getChartData); // <-- ΝΕΟ ROUTE

module.exports = router;