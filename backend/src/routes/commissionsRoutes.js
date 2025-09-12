const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const financeAuthMiddleware = require('../middleware/financeAuthMiddleware');
const { getCommissions, setCompanyCommission, setFieldCommission } = require('../controllers/commissionsController');

router.use(authMiddleware);
router.use(financeAuthMiddleware);

router.get('/', getCommissions);
router.post('/company', setCompanyCommission);
router.post('/field', setFieldCommission);

module.exports = router;