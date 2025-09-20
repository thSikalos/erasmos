const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    prepareEmailSummary,
    getDraftEmailNotifications,
    sendNotification,
    createToastNotification,
    subscribeToPush,
    unsubscribeFromPush,
    getVAPIDPublicKey,
    testPushNotification
} = require('../controllers/notificationsController');

router.use(authMiddleware);

// In-App Notifications
router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.post('/mark-all-read', markAllAsRead);

// Email functionality for Team Leaders
router.post('/prepare-summary', prepareEmailSummary);
router.get('/drafts', getDraftEmailNotifications);
router.post('/:id/send', sendNotification);

// Toast notifications functionality
router.post('/toast', createToastNotification);

// Push notifications functionality
router.get('/push/vapid-public-key', getVAPIDPublicKey);
router.post('/push/subscribe', subscribeToPush);
router.delete('/push/subscribe', unsubscribeFromPush);
router.post('/push/test', testPushNotification);

module.exports = router;