const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getMyReminders, createReminder, completeReminder } = require('../controllers/remindersController');

router.use(authMiddleware);

router.get('/', getMyReminders);
router.post('/', createReminder);
router.patch('/:id/complete', completeReminder);

module.exports = router;