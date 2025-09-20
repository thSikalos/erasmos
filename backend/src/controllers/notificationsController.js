const pool = require('../config/db');
const NotificationService = require('../services/notificationService');
const pushNotificationService = require('../services/pushNotificationService');

// --- GET UNREAD IN-APP NOTIFICATIONS FOR LOGGED-IN USER ---
const getMyNotifications = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = "SELECT * FROM notifications WHERE user_id = $1 AND channel = 'in-app' AND status = 'unread' ORDER BY created_at DESC LIMIT 10";
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- MARK A NOTIFICATION AS READ ---
const markAsRead = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const query = "UPDATE notifications SET status = 'read' WHERE id = $1 AND user_id = $2 RETURNING *";
        const result = await pool.query(query, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found or not owned by user' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- MARK ALL NOTIFICATIONS AS READ ---
const markAllAsRead = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            UPDATE notifications
            SET status = 'read'
            WHERE user_id = $1 AND channel = 'in-app' AND status = 'unread'
            RETURNING id`;
        const result = await pool.query(query, [userId]);
        res.json({
            message: 'All notifications marked as read',
            count: result.rows.length
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- PREPARE EMAIL MONTHLY SUMMARY DRAFTS ---
const prepareEmailSummary = async (req, res) => {
    const teamLeaderId = req.user.id;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const teamRes = await client.query("SELECT id, name, is_vat_liable FROM users WHERE parent_user_id = $1 AND deleted_at IS NULL", [teamLeaderId]);
        const teamMembers = teamRes.rows;
        let createdDrafts = [];
        const lastMonthStart = "date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'";
        const thisMonthStart = "date_trunc('month', CURRENT_DATE)";
       
        for (const member of teamMembers) {
            // Query 1: Get total commissions for the last month
            const commissionQuery = `
                SELECT COALESCE(SUM(total_commission), 0) as total
                FROM applications
                WHERE user_id = $1 AND created_at >= ${lastMonthStart} AND created_at < ${thisMonthStart}`;
            const commissionRes = await client.query(commissionQuery, [member.id]);
            const subtotal = parseFloat(commissionRes.rows[0].total);
            if (subtotal > 0) {
                // Query 2: Get the breakdown of applications per company
                const breakdownQuery = `
                    SELECT co.name as company_name, COUNT(app.id) as count
                    FROM applications app
                    JOIN companies co ON app.company_id = co.id
                    WHERE app.user_id = $1 AND app.created_at >= ${lastMonthStart} AND app.created_at < ${thisMonthStart}
                    GROUP BY co.name;
                `;
                const breakdownRes = await client.query(breakdownQuery, [member.id]);
                // Construct the message
                const breakdownText = breakdownRes.rows.map(c => `${c.company_name}: ${c.count}`).join(', ');
                const vatText = member.is_vat_liable ? "+ΦΠΑ" : "";
                const message = `Καλησπέρα ${member.name.split(' ')[0]}, για τον προηγούμενο μήνα οι αιτήσεις σου ήταν: ${breakdownText}. Οι συνολικές σου αμοιβές υπολογίζονται περίπου στα ${subtotal.toFixed(2)}€ ${vatText}. Καλή συνέχεια!`;
               
                // Insert the draft notification, assigned to the team leader
                const insertQuery = `
                    INSERT INTO notifications (user_id, message, status, channel, notification_type, metadata)
                    VALUES ($1, $2, 'draft', 'email', $3, $4) RETURNING *`;

                const emailMetadata = {
                    type: NotificationService.NOTIFICATION_TYPES.MONTHLY_SUMMARY,
                    member_name: member.name,
                    member_id: member.id,
                    total_amount: subtotal.toFixed(2),
                    breakdown: breakdownText,
                    vat_text: vatText,
                    period: `${new Date().getMonth() + 1}/${new Date().getFullYear()}`
                };
                const draftRes = await client.query(insertQuery, [teamLeaderId, message, NotificationService.NOTIFICATION_TYPES.MONTHLY_SUMMARY, JSON.stringify(emailMetadata)]);
                createdDrafts.push(draftRes.rows[0]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json(createdDrafts);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET DRAFT EMAIL NOTIFICATIONS ---
const getDraftEmailNotifications = async(req, res) => {
    const userId = req.user.id;
    try {
        const query = "SELECT * FROM notifications WHERE user_id = $1 AND channel = 'email' AND status = 'draft' ORDER BY created_at DESC";
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- SEND EMAIL NOTIFICATION ---
const sendNotification = async (req, res) => {
    const { id } = req.params;
    const NotificationService = require('../services/notificationService');

    try {
        const notificationRes = await pool.query(`
            SELECT n.*, u.email, u.name as user_name
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE n.id = $1
        `, [id]);

        if (notificationRes.rows.length === 0) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        const notification = notificationRes.rows[0];

        if (notification.channel === 'email') {
            // Parse metadata to get email context
            let metadata = {};
            try {
                metadata = JSON.parse(notification.metadata || '{}');
            } catch (e) {
                console.warn('Failed to parse notification metadata:', e);
            }

            // Generate email content based on type
            const emailContent = NotificationService.emailService.generateEmailContent(
                notification.notification_type || NotificationService.NOTIFICATION_TYPES.SYSTEM_ALERT,
                {
                    ...metadata,
                    message: notification.message
                },
                notification.user_name
            );

            // Send email
            const emailResult = await NotificationService.emailService.sendEmail({
                to: notification.email,
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html
            });

            if (emailResult.success) {
                await pool.query("UPDATE notifications SET status = 'sent' WHERE id = $1", [id]);
                res.json({
                    message: 'Email sent successfully',
                    messageId: emailResult.messageId,
                    recipient: notification.email
                });
            } else {
                await pool.query("UPDATE notifications SET status = 'failed' WHERE id = $1", [id]);
                res.status(500).json({
                    message: 'Failed to send email',
                    error: emailResult.error
                });
            }
        } else {
            // For in-app notifications, just mark as sent
            await pool.query("UPDATE notifications SET status = 'sent' WHERE id = $1", [id]);
            res.json({ message: 'Notification marked as sent' });
        }
    } catch (err) {
        await pool.query("UPDATE notifications SET status = 'failed' WHERE id = $1", [id]);
        console.error('Send notification error:', err.message);
        res.status(500).json({ message: 'Server Error', error: err.message });
    }
};

// --- CREATE TOAST NOTIFICATION ---
const createToastNotification = async (req, res) => {
    try {
        const { type, title, message, duration, link_url } = req.body;
        const userId = req.user.id;

        // Validate required fields
        if (!type || !message) {
            return res.status(400).json({
                message: 'Type and message are required',
                required: ['type', 'message']
            });
        }

        // Validate notification type
        const validTypes = [
            NotificationService.NOTIFICATION_TYPES.SYSTEM_SUCCESS,
            NotificationService.NOTIFICATION_TYPES.SYSTEM_ERROR,
            NotificationService.NOTIFICATION_TYPES.SYSTEM_WARNING,
            NotificationService.NOTIFICATION_TYPES.SYSTEM_INFO
        ];

        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: 'Invalid notification type',
                validTypes: validTypes
            });
        }

        // Create toast notification via central service
        const notifications = await NotificationService.createNotification(type, {
            user_id: userId,
            title: title || 'Ειδοποίηση',
            message: message,
            duration: duration || 5000,
            link_url: link_url || null
        });

        res.status(201).json({
            success: true,
            message: 'Toast notification created successfully',
            notifications: notifications
        });

    } catch (error) {
        console.error('Create toast notification error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// --- GET VAPID PUBLIC KEY FOR CLIENT-SIDE SUBSCRIPTION ---
const getVAPIDPublicKey = async (req, res) => {
    try {
        const publicKey = pushNotificationService.getVAPIDPublicKey();

        if (!publicKey) {
            return res.status(503).json({
                success: false,
                message: 'Push notifications not configured on server'
            });
        }

        res.json({
            success: true,
            publicKey: publicKey
        });
    } catch (error) {
        console.error('Get VAPID public key error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// --- SUBSCRIBE TO PUSH NOTIFICATIONS ---
const subscribeToPush = async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;
        const userAgent = req.get('User-Agent');

        // Validate subscription object
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription object',
                required: {
                    subscription: {
                        endpoint: 'string',
                        keys: {
                            p256dh: 'string',
                            auth: 'string'
                        }
                    }
                }
            });
        }

        // Save subscription and enable push notifications for user
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Save subscription using current transaction
            const { endpoint, keys } = subscription;
            const { p256dh, auth } = keys;

            const saveQuery = `
                INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, endpoint)
                DO UPDATE SET
                    p256dh = EXCLUDED.p256dh,
                    auth = EXCLUDED.auth,
                    user_agent = EXCLUDED.user_agent,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id`;

            const saveResult = await client.query(saveQuery, [userId, endpoint, p256dh, auth, userAgent]);
            console.log(`📱 Push subscription saved for user ${userId}, subscription ID: ${saveResult.rows[0].id}`);

            // Enable push notifications for user if not already enabled
            await client.query(
                'UPDATE users SET push_notifications_enabled = true WHERE id = $1',
                [userId]
            );

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Successfully subscribed to push notifications'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Subscribe to push error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// --- UNSUBSCRIBE FROM PUSH NOTIFICATIONS ---
const unsubscribeFromPush = async (req, res) => {
    try {
        const { endpoint } = req.body;
        const userId = req.user.id;

        // Validate endpoint
        if (!endpoint) {
            return res.status(400).json({
                success: false,
                message: 'Endpoint is required',
                required: ['endpoint']
            });
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Remove specific subscription
            const removed = await pushNotificationService.removeSubscription(userId, endpoint);

            // Check if user has any remaining subscriptions
            const subscriptions = await pushNotificationService.getUserSubscriptions(userId);

            // If no subscriptions left, disable push notifications for user
            if (subscriptions.length === 0) {
                await client.query(
                    'UPDATE users SET push_notifications_enabled = false WHERE id = $1',
                    [userId]
                );
            }

            await client.query('COMMIT');

            res.json({
                success: true,
                message: removed ? 'Successfully unsubscribed from push notifications' : 'Subscription not found',
                hasRemainingSubscriptions: subscriptions.length > 0
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Unsubscribe from push error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
};

// --- TEST PUSH NOTIFICATION ---
const testPushNotification = async (req, res) => {
    try {
        const userId = req.user.id;

        // Create test notification payload
        const testPayload = {
            title: '🔔 Test Erasmos Notification',
            body: 'Αυτό είναι ένα test push notification! Δουλεύει τέλεια! 🎉',
            icon: '/vite.svg',
            badge: '/vite.svg',
            tag: 'erasmos-test',
            requireInteraction: true,
            data: {
                url: '/dashboard',
                timestamp: Date.now(),
                type: 'TEST'
            },
            actions: [
                {
                    action: 'view',
                    title: 'Προβολή Dashboard'
                },
                {
                    action: 'dismiss',
                    title: 'Απόρριψη'
                }
            ]
        };

        // Send push notification to current user
        const result = await pushNotificationService.sendPushNotification(userId, testPayload);

        res.json({
            success: result.success,
            message: result.success ? 'Test push notification sent successfully!' : 'Failed to send push notification',
            payload: testPayload,
            details: result
        });

    } catch (error) {
        console.error('Test push notification error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to send test push notification',
            error: error.message
        });
    }
};

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    prepareEmailSummary,
    getDraftEmailNotifications,
    sendNotification,
    createToastNotification,
    getVAPIDPublicKey,
    subscribeToPush,
    unsubscribeFromPush,
    testPushNotification
};