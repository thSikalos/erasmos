const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const sseService = require('../services/sseService');
const jwt = require('jsonwebtoken');

// Custom auth middleware for SSE (supports token via query parameter)
const sseAuthMiddleware = (req, res, next) => {
    let token = req.headers.authorization;

    // If no authorization header, check query parameter
    if (!token && req.query.token) {
        token = `Bearer ${req.query.token}`;
    }

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    // Remove 'Bearer ' prefix if present
    if (token.startsWith('Bearer ')) {
        token = token.slice(7);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = {
            id: decoded.user.id,
            name: decoded.user.name,
            email: decoded.user.email,
            role: decoded.user.role,
            parent_user_id: decoded.user.parent_user_id,
            is_active: true
        };
        next();
    } catch (error) {
        console.error('SSE Auth error:', error.message);
        return res.status(403).json({ message: 'Invalid token' });
    }
};

// SSE endpoint for real-time notifications
router.get('/events', sseAuthMiddleware, (req, res) => {
    const userId = req.user.id;

    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true'
    });

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'SSE connection established',
        timestamp: new Date().toISOString()
    })}\n\n`);

    // Add connection to SSE service
    sseService.addConnection(userId, res);

    // Handle client disconnect
    req.on('close', () => {
        sseService.removeConnection(userId, res);
    });

    req.on('aborted', () => {
        sseService.removeConnection(userId, res);
    });
});

// Endpoint to send test notification (for debugging)
router.post('/test-notification', authMiddleware, (req, res) => {
    const userId = req.user.id;
    const { type = 'info', title = 'Test', message = 'Test notification' } = req.body;

    const testNotification = {
        type: 'toast',
        notification_type: type,
        title,
        message,
        duration: 5000,
        timestamp: new Date().toISOString()
    };

    const sent = sseService.sendToUser(userId, testNotification);

    res.json({
        success: sent,
        message: sent ? 'Test notification sent' : 'No active SSE connections',
        notification: testNotification
    });
});

// Endpoint to get SSE connection stats (admin only)
router.get('/stats', authMiddleware, (req, res) => {
    if (req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    res.json({
        totalConnections: sseService.getTotalConnections(),
        connectedUsers: sseService.getConnectedUsersCount(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;