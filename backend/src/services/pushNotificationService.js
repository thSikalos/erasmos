const webpush = require('web-push');
const pool = require('../config/db');

class PushNotificationService {
    constructor() {
        this.initializeVAPID();
    }

    /**
     * Initialize VAPID configuration
     */
    initializeVAPID() {
        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
        const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@erasmos.app';

        if (!vapidPublicKey || !vapidPrivateKey) {
            console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
            console.warn('Generate keys with: npx web-push generate-vapid-keys');
            return;
        }

        webpush.setVapidDetails(
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
        );

        console.log('✅ VAPID configuration initialized');
    }

    /**
     * Generate VAPID keys for initial setup
     * This is a utility method - run once during setup
     */
    static generateVAPIDKeys() {
        const vapidKeys = webpush.generateVAPIDKeys();
        console.log('Generated VAPID Keys:');
        console.log('Public Key:', vapidKeys.publicKey);
        console.log('Private Key:', vapidKeys.privateKey);
        console.log('\nAdd these to your .env file:');
        console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
        console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
        console.log('VAPID_SUBJECT=mailto:your-email@example.com');
        return vapidKeys;
    }

    /**
     * Get VAPID public key for client-side subscription
     */
    getVAPIDPublicKey() {
        return process.env.VAPID_PUBLIC_KEY;
    }

    /**
     * Save a push subscription for a user
     * @param {number} userId - User ID
     * @param {Object} subscription - Push subscription object from browser
     * @param {string} userAgent - Browser user agent for debugging
     */
    async saveSubscription(userId, subscription, userAgent = null) {
        const client = await pool.connect();
        try {
            const { endpoint, keys } = subscription;
            const { p256dh, auth } = keys;

            // Upsert subscription (update if exists, insert if not)
            const query = `
                INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, updated_at)
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id, endpoint)
                DO UPDATE SET
                    p256dh = EXCLUDED.p256dh,
                    auth = EXCLUDED.auth,
                    user_agent = EXCLUDED.user_agent,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id`;

            const result = await client.query(query, [userId, endpoint, p256dh, auth, userAgent]);

            console.log(`📱 Push subscription saved for user ${userId}`);
            return result.rows[0];
        } catch (error) {
            console.error('Failed to save push subscription:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Remove a push subscription
     * @param {number} userId - User ID
     * @param {string} endpoint - Subscription endpoint to remove
     */
    async removeSubscription(userId, endpoint) {
        const client = await pool.connect();
        try {
            const query = `
                DELETE FROM push_subscriptions
                WHERE user_id = $1 AND endpoint = $2
                RETURNING id`;

            const result = await client.query(query, [userId, endpoint]);

            if (result.rows.length > 0) {
                console.log(`🗑️ Push subscription removed for user ${userId}`);
                return true;
            } else {
                console.log(`⚠️ No subscription found to remove for user ${userId}`);
                return false;
            }
        } catch (error) {
            console.error('Failed to remove push subscription:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get all subscriptions for a user
     * @param {number} userId - User ID
     */
    async getUserSubscriptions(userId) {
        const client = await pool.connect();
        try {
            const query = `
                SELECT endpoint, p256dh, auth, created_at
                FROM push_subscriptions
                WHERE user_id = $1`;

            const result = await client.query(query, [userId]);
            return result.rows;
        } catch (error) {
            console.error('Failed to get user subscriptions:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Send push notification to a specific user
     * @param {number} userId - User ID
     * @param {Object} payload - Notification payload
     */
    async sendPushNotification(userId, payload) {
        if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
            console.log('⚠️ VAPID not configured, skipping push notification');
            return { success: false, error: 'VAPID not configured' };
        }

        const client = await pool.connect();
        try {
            // First check if user has push notifications enabled
            const userQuery = `SELECT push_notifications_enabled FROM users WHERE id = $1`;
            const userResult = await client.query(userQuery, [userId]);

            if (userResult.rows.length === 0) {
                return { success: false, error: 'User not found' };
            }

            if (!userResult.rows[0].push_notifications_enabled) {
                console.log(`📵 Push notifications disabled for user ${userId}`);
                return { success: false, error: 'Push notifications disabled for user' };
            }

            // Get user's subscriptions
            const subscriptionsQuery = `
                SELECT id, endpoint, p256dh, auth
                FROM push_subscriptions
                WHERE user_id = $1`;

            const subscriptionsResult = await client.query(subscriptionsQuery, [userId]);

            if (subscriptionsResult.rows.length === 0) {
                console.log(`📵 No push subscriptions found for user ${userId}`);
                return { success: false, error: 'No push subscriptions found' };
            }

            const results = [];

            // Send to all user's subscriptions
            for (const subscription of subscriptionsResult.rows) {
                try {
                    const pushSubscription = {
                        endpoint: subscription.endpoint,
                        keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth
                        }
                    };

                    const options = {
                        TTL: 24 * 60 * 60, // 24 hours
                        urgency: 'normal'
                    };

                    await webpush.sendNotification(
                        pushSubscription,
                        JSON.stringify(payload),
                        options
                    );

                    console.log(`📤 Push notification sent successfully to user ${userId}`);
                    results.push({ success: true, subscriptionId: subscription.id });

                } catch (sendError) {
                    console.error(`Failed to send push to subscription ${subscription.id}:`, sendError);

                    // If subscription is invalid (410), remove it
                    if (sendError.statusCode === 410) {
                        await this.removeInvalidSubscription(subscription.id);
                        console.log(`🗑️ Removed invalid subscription ${subscription.id}`);
                    }

                    results.push({
                        success: false,
                        subscriptionId: subscription.id,
                        error: sendError.message
                    });
                }
            }

            const successCount = results.filter(r => r.success).length;
            return {
                success: successCount > 0,
                successCount,
                totalCount: results.length,
                results
            };

        } catch (error) {
            console.error('Failed to send push notification:', error);
            return { success: false, error: error.message };
        } finally {
            client.release();
        }
    }

    /**
     * Remove invalid subscription from database
     * @param {number} subscriptionId - Subscription ID to remove
     */
    async removeInvalidSubscription(subscriptionId) {
        const client = await pool.connect();
        try {
            const query = `DELETE FROM push_subscriptions WHERE id = $1`;
            await client.query(query, [subscriptionId]);
        } catch (error) {
            console.error('Failed to remove invalid subscription:', error);
        } finally {
            client.release();
        }
    }

    /**
     * Generate notification payload for application events
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     */
    generateNotificationPayload(type, data) {
        const basePayload = {
            tag: `erasmos-${type}`,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            actions: [
                {
                    action: 'view',
                    title: 'Προβολή',
                    icon: '/favicon.ico'
                }
            ]
        };

        switch (type) {
            case 'NEW_APPLICATION':
                return {
                    ...basePayload,
                    title: '🆕 Νέα Αίτηση',
                    body: `Νέα αίτηση #${data.application_id} από ${data.creator_name} για ${data.customer_name}`,
                    data: {
                        url: `/applications/${data.application_id}`,
                        type: 'NEW_APPLICATION',
                        application_id: data.application_id
                    }
                };

            case 'APPLICATION_STATUS_CHANGE':
                const statusEmojis = {
                    'Καταχωρήθηκε': '✅',
                    'Εκκρεμεί': '⏳',
                    'Απορρίφθηκε': '❌',
                    'Ακυρώθηκε': '🚫'
                };
                const emoji = statusEmojis[data.new_status] || '📝';

                return {
                    ...basePayload,
                    title: `${emoji} Ενημέρωση Αίτησης`,
                    body: `Η αίτηση #${data.application_id} του ${data.customer_name} ${data.new_status.toLowerCase()}`,
                    data: {
                        url: `/applications/${data.application_id}`,
                        type: 'APPLICATION_STATUS_CHANGE',
                        application_id: data.application_id
                    }
                };

            default:
                return {
                    ...basePayload,
                    title: '🔔 Ειδοποίηση Erasmos',
                    body: data.message || 'Νέα ειδοποίηση',
                    data: {
                        url: '/',
                        type: 'GENERAL'
                    }
                };
        }
    }

    /**
     * Clean up old subscriptions (older than 90 days)
     */
    async cleanupOldSubscriptions() {
        const client = await pool.connect();
        try {
            const query = `
                DELETE FROM push_subscriptions
                WHERE created_at < NOW() - INTERVAL '90 days'
                RETURNING user_id`;

            const result = await client.query(query);
            console.log(`🧹 Cleaned up ${result.rowCount} old push subscriptions`);
            return result.rowCount;
        } catch (error) {
            console.error('Failed to cleanup old subscriptions:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new PushNotificationService();