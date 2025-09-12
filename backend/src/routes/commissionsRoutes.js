const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getCommissions, setCompanyCommission, setFieldCommission } = require('../controllers/commissionsController');

router.use(authMiddleware);

router.get('/', getCommissions);
router.post('/company', setCompanyCommission);
router.post('/field', setFieldCommission);

module.exports = router;