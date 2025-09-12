const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getMyNotifications,
    markAsRead,
    prepareViberSummary,
    getDraftViberNotifications,
    sendNotification
} = require('../controllers/notificationsController');

router.use(authMiddleware);

// In-App Notifications
router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);

// Viber functionality for Team Leaders
router.post('/prepare-summary', prepareViberSummary);
router.get('/drafts', getDraftViberNotifications);
router.post('/:id/send', sendNotification);


module.exports = router;