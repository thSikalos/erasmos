const pool = require('../config/db');
const EmailService = require('./emailService');
const sseService = require('./sseService');
const pushNotificationService = require('./pushNotificationService');

class NotificationService {
    static NOTIFICATION_TYPES = {
        APPLICATION_STATUS_CHANGE: 'application_status_change',
        NEW_APPLICATION: 'new_application',
        LOGIN_LEAD: 'login_lead',
        NEW_USER_REGISTRATION: 'new_user_registration',
        PAYMENT_UPDATE: 'payment_update',
        SYSTEM_ALERT: 'system_alert',
        NEW_REMINDER: 'new_reminder',
        USER_STATUS_CHANGE: 'user_status_change',
        TEAM_STATUS_CHANGE: 'team_status_change',
        SUBTEAM_STATUS_CHANGE: 'subteam_status_change',
        MONTHLY_SUMMARY: 'monthly_summary',
        // Toast notification types
        SYSTEM_SUCCESS: 'system_success',
        SYSTEM_ERROR: 'system_error',
        SYSTEM_WARNING: 'system_warning',
        SYSTEM_INFO: 'system_info'
    };

    static CHANNELS = {
        IN_APP: 'in-app',
        EMAIL: 'email',
        TOAST: 'toast',
        PUSH: 'push'
    };

    static emailService = new EmailService();

    /**
     * Creates a new notification with role-based routing
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {Object} options - Additional options
     */
    static async createNotification(type, data, options = {}) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const recipients = await this.getRecipientsForNotificationType(type, data, client);
            const message = this.generateMessage(type, data);

            // Determine channels based on notification type
            let channels;
            if ([this.NOTIFICATION_TYPES.SYSTEM_SUCCESS, this.NOTIFICATION_TYPES.SYSTEM_ERROR,
                 this.NOTIFICATION_TYPES.SYSTEM_WARNING, this.NOTIFICATION_TYPES.SYSTEM_INFO].includes(type)) {
                // Toast notifications only create TOAST channel (real-time only, not stored in DB)
                channels = [this.CHANNELS.TOAST];
            } else if ([this.NOTIFICATION_TYPES.NEW_APPLICATION,
                       this.NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGE].includes(type)) {
                // Application notifications create in-app, email, and push notifications
                channels = [this.CHANNELS.IN_APP, this.CHANNELS.EMAIL, this.CHANNELS.PUSH];
            } else {
                // Other notifications create both in-app and email notifications
                channels = [this.CHANNELS.IN_APP, this.CHANNELS.EMAIL];
            }
            const createdNotifications = [];

            for (const recipientId of recipients) {
                const linkUrl = this.generateLinkUrl(type, data);

                const metadata = {
                    type,
                    ...data,
                    created_by: data.created_by || null,
                    application_id: data.application_id || null,
                    user_id: data.user_id || null
                };

                // Create notification for each channel
                for (const channel of channels) {
                    if (channel === this.CHANNELS.TOAST) {
                        // Toast notifications are not stored in DB - they're sent directly via real-time connection
                        const toastNotification = {
                            id: `toast-${Date.now()}-${recipientId}`,
                            user_id: recipientId,
                            message,
                            channel,
                            link_url: linkUrl,
                            notification_type: type,
                            metadata,
                            status: 'sent',
                            created_at: new Date().toISOString()
                        };

                        createdNotifications.push(toastNotification);

                        // Send toast notification via WebSocket/SSE to frontend
                        await this.sendToastNotification(toastNotification, recipientId, data);

                    } else if (channel === this.CHANNELS.PUSH) {
                        // Push notifications are sent via push service
                        const pushNotification = {
                            id: `push-${Date.now()}-${recipientId}`,
                            user_id: recipientId,
                            message,
                            channel,
                            link_url: linkUrl,
                            notification_type: type,
                            metadata,
                            status: 'sent',
                            created_at: new Date().toISOString()
                        };

                        createdNotifications.push(pushNotification);

                        // Send push notification
                        await this.sendPushNotification(pushNotification, recipientId, type, data);

                    } else {
                        // Regular notifications are stored in database
                        const insertQuery = `
                            INSERT INTO notifications (user_id, message, status, channel, link_url, notification_type, metadata)
                            VALUES ($1, $2, 'unread', $3, $4, $5, $6)
                            RETURNING *`;

                        const result = await client.query(insertQuery, [
                            recipientId,
                            message,
                            channel,
                            linkUrl,
                            type,
                            JSON.stringify(metadata)
                        ]);

                        const notification = result.rows[0];
                        createdNotifications.push(notification);

                        // Send email if channel is EMAIL
                        if (channel === this.CHANNELS.EMAIL) {
                            await this.sendEmailNotification(notification, recipientId, type, data, client);
                        }
                    }
                }
            }

            await client.query('COMMIT');
            return createdNotifications;

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Failed to create notification:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Determines recipients based on notification type and user roles
     */
    static async getRecipientsForNotificationType(type, data, client) {
        switch (type) {
            case this.NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGE:
                // Notify the original creator (συνεργάτης) of the application
                if (data.original_creator_id) {
                    return [data.original_creator_id];
                }
                return [];

            case this.NOTIFICATION_TYPES.NEW_APPLICATION:
                // Notify the team leader of the application creator
                if (data.creator_id) {
                    const teamLeaderQuery = `
                        SELECT parent_user_id FROM users
                        WHERE id = $1 AND parent_user_id IS NOT NULL`;
                    const result = await client.query(teamLeaderQuery, [data.creator_id]);

                    if (result.rows.length > 0) {
                        return [result.rows[0].parent_user_id];
                    }

                    // If no team leader, notify all admins
                    const adminQuery = `SELECT id FROM users WHERE role = 'Admin' AND deleted_at IS NULL`;
                    const adminResult = await client.query(adminQuery);
                    return adminResult.rows.map(row => row.id);
                }
                return [];

            case this.NOTIFICATION_TYPES.LOGIN_LEAD:
                // Notify all admins
                const adminQuery = `SELECT id FROM users WHERE role = 'Admin' AND deleted_at IS NULL`;
                const adminResult = await client.query(adminQuery);
                return adminResult.rows.map(row => row.id);

            case this.NOTIFICATION_TYPES.NEW_USER_REGISTRATION:
                // Notify team leader if assigned, otherwise all admins
                if (data.parent_user_id) {
                    return [data.parent_user_id];
                }
                const allAdminsQuery = `SELECT id FROM users WHERE role = 'Admin' AND deleted_at IS NULL`;
                const allAdminsResult = await client.query(allAdminsQuery);
                return allAdminsResult.rows.map(row => row.id);

            case this.NOTIFICATION_TYPES.PAYMENT_UPDATE:
                // Notify recipient and creator of payment statement
                const recipients = [];
                if (data.recipient_id) recipients.push(data.recipient_id);
                if (data.creator_id && data.creator_id !== data.recipient_id) {
                    recipients.push(data.creator_id);
                }
                return recipients;

            case this.NOTIFICATION_TYPES.SYSTEM_ALERT:
                // Notify all admins for system alerts
                const systemAdminQuery = `SELECT id FROM users WHERE role = 'Admin' AND deleted_at IS NULL`;
                const systemAdminResult = await client.query(systemAdminQuery);
                return systemAdminResult.rows.map(row => row.id);

            case this.NOTIFICATION_TYPES.NEW_REMINDER:
                // Notify the assignee if it's a different person than creator
                if (data.assignee_id && data.assignee_id !== data.creator_id) {
                    return [data.assignee_id];
                }
                // If assigning to self, notify the team leader (hierarchical notifications)
                if (data.assignee_id === data.creator_id && data.creator_parent_id) {
                    return [data.creator_parent_id];
                }
                return [];

            case this.NOTIFICATION_TYPES.USER_STATUS_CHANGE:
            case this.NOTIFICATION_TYPES.TEAM_STATUS_CHANGE:
            case this.NOTIFICATION_TYPES.SUBTEAM_STATUS_CHANGE:
                // Notify all admins for user status changes
                const statusAdminQuery = `SELECT id FROM users WHERE role = 'Admin' AND deleted_at IS NULL`;
                const statusAdminResult = await client.query(statusAdminQuery);
                return statusAdminResult.rows.map(row => row.id);

            case this.NOTIFICATION_TYPES.MONTHLY_SUMMARY:
                // Monthly summary notifications are typically drafts created for team leaders
                // They should not auto-notify anyone - they're manually sent
                return [];

            case this.NOTIFICATION_TYPES.SYSTEM_SUCCESS:
            case this.NOTIFICATION_TYPES.SYSTEM_ERROR:
            case this.NOTIFICATION_TYPES.SYSTEM_WARNING:
            case this.NOTIFICATION_TYPES.SYSTEM_INFO:
                // Toast notifications are sent to specific user(s) passed in data.user_ids
                // If no specific users, send to the creating user
                if (data.user_ids && Array.isArray(data.user_ids)) {
                    return data.user_ids;
                } else if (data.user_id) {
                    return [data.user_id];
                }
                return [];

            // Handle uppercase variants from old database records
            case 'USER_STATUS_CHANGE':
            case 'TEAM_STATUS_CHANGE':
            case 'SUBTEAM_STATUS_CHANGE':
            case 'SYSTEM_ALERT':
            case 'MONTHLY_SUMMARY':
                // Legacy uppercase variants - notify all admins for status changes, no one for monthly summary
                if (type === 'MONTHLY_SUMMARY') {
                    return [];
                }
                const legacyAdminQuery = `SELECT id FROM users WHERE role = 'Admin' AND deleted_at IS NULL`;
                const legacyAdminResult = await client.query(legacyAdminQuery);
                return legacyAdminResult.rows.map(row => row.id);

            default:
                console.warn(`Unknown notification type: ${type}`);
                console.warn(`Stack trace:`, new Error().stack);
                return [];
        }
    }

    /**
     * Generates notification message based on type and data
     */
    static generateMessage(type, data) {
        switch (type) {
            case this.NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGE:
                const statusTranslations = {
                    'Καταχωρήθηκε': 'καταχωρήθηκε',
                    'Εκκρεμεί': 'τέθηκε σε εκκρεμότητα',
                    'Απορρίφθηκε': 'απορρίφθηκε',
                    'Ακυρώθηκε': 'ακυρώθηκε'
                };
                const statusText = statusTranslations[data.new_status] || data.new_status;
                return `Η αίτηση #${data.application_id} του πελάτη ${data.customer_name} ${statusText}.`;

            case this.NOTIFICATION_TYPES.NEW_APPLICATION:
                return `Νέα αίτηση #${data.application_id} από τον ${data.creator_name} για τον πελάτη ${data.customer_name}.`;

            case this.NOTIFICATION_TYPES.LOGIN_LEAD:
                return `Νέος ενδιαφερόμενος εγγράφηκε: ${data.name} (${data.email}) - ${data.phone || 'Χωρίς τηλέφωνο'}`;

            case this.NOTIFICATION_TYPES.NEW_USER_REGISTRATION:
                return `Νέος χρήστης εγγράφηκε στο σύστημα: ${data.name} (${data.email}) - ${data.role}`;

            case this.NOTIFICATION_TYPES.PAYMENT_UPDATE:
                if (data.action === 'created') {
                    return `Νέα ταμειακή κατάσταση #${data.statement_id} δημιουργήθηκε για ${data.recipient_name} - ${data.total_amount}€`;
                } else if (data.action === 'marked_paid') {
                    return `Η ταμειακή κατάσταση #${data.statement_id} μαρκαρίστηκε ως πληρωμένη - ${data.total_amount}€`;
                }
                return `Ενημέρωση ταμειακής κατάστασης #${data.statement_id}`;

            case this.NOTIFICATION_TYPES.SYSTEM_ALERT:
                return data.message || 'Νέα ειδοποίηση συστήματος';

            case this.NOTIFICATION_TYPES.NEW_REMINDER:
                if (data.assignee_id === data.creator_id) {
                    // Self-assigned reminder, notify team leader
                    return `Νέα υπενθύμιση από ${data.creator_name}: "${data.title}" (καταληκτική ημερομηνία: ${new Date(data.due_date).toLocaleDateString('el-GR', { timeZone: 'Europe/Athens' })})`;
                } else {
                    // Assigned to someone else
                    return `Σας ανατέθηκε νέα υπενθύμιση από ${data.creator_name}: "${data.title}" (καταληκτική ημερομηνία: ${new Date(data.due_date).toLocaleDateString('el-GR', { timeZone: 'Europe/Athens' })})`;
                }

            case this.NOTIFICATION_TYPES.USER_STATUS_CHANGE:
            case 'USER_STATUS_CHANGE':
                return `Ο χρήστης ${data.user_name} (${data.user_email}) έγινε ${data.new_status} από ${data.changed_by}`;

            case this.NOTIFICATION_TYPES.TEAM_STATUS_CHANGE:
            case 'TEAM_STATUS_CHANGE':
                return `Η ομάδα του ${data.team_leader_name} έγινε ${data.new_status} από ${data.changed_by} (${data.affected_members_count} μέλη επηρεάστηκαν)`;

            case this.NOTIFICATION_TYPES.SUBTEAM_STATUS_CHANGE:
            case 'SUBTEAM_STATUS_CHANGE':
                return `Ο χρήστης ${data.user_name} και η υπο-ομάδα του έγινε ${data.new_status} από ${data.changed_by} (${data.affected_direct_children} άμεσα παιδιά επηρεάστηκαν)`;

            case this.NOTIFICATION_TYPES.MONTHLY_SUMMARY:
            case 'MONTHLY_SUMMARY':
                return data.message || 'Μηνιαία ενημέρωση αμοιβών';

            case this.NOTIFICATION_TYPES.SYSTEM_SUCCESS:
            case this.NOTIFICATION_TYPES.SYSTEM_ERROR:
            case this.NOTIFICATION_TYPES.SYSTEM_WARNING:
            case this.NOTIFICATION_TYPES.SYSTEM_INFO:
                // Toast notifications use the provided message directly
                return data.message || data.title || 'Ειδοποίηση συστήματος';

            case 'SYSTEM_ALERT':
                return data.message || 'Νέα ειδοποίηση συστήματος';

            default:
                return data.message || 'Νέα ειδοποίηση';
        }
    }

    /**
     * Generates link URL for notification navigation
     */
    static generateLinkUrl(type, data) {
        switch (type) {
            case this.NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGE:
            case this.NOTIFICATION_TYPES.NEW_APPLICATION:
                return data.application_id ? `/application/${data.application_id}` : '/applications';

            case this.NOTIFICATION_TYPES.LOGIN_LEAD:
                return '/admin/users';

            case this.NOTIFICATION_TYPES.NEW_USER_REGISTRATION:
                return data.user_id ? `/admin/users` : '/admin';

            case this.NOTIFICATION_TYPES.PAYMENT_UPDATE:
                return '/payments';

            case this.NOTIFICATION_TYPES.SYSTEM_ALERT:
            case 'SYSTEM_ALERT':
                return data.link_url || '/admin';

            case this.NOTIFICATION_TYPES.NEW_REMINDER:
                return '/dashboard'; // Reminders are shown on dashboard

            case this.NOTIFICATION_TYPES.MONTHLY_SUMMARY:
            case 'MONTHLY_SUMMARY':
                return '/notifications'; // Monthly summaries are managed in notifications

            case this.NOTIFICATION_TYPES.SYSTEM_SUCCESS:
            case this.NOTIFICATION_TYPES.SYSTEM_ERROR:
            case this.NOTIFICATION_TYPES.SYSTEM_WARNING:
            case this.NOTIFICATION_TYPES.SYSTEM_INFO:
                // Toast notifications can have custom link_url from data, otherwise null (no navigation)
                return data.link_url || null;

            case this.NOTIFICATION_TYPES.USER_STATUS_CHANGE:
            case this.NOTIFICATION_TYPES.TEAM_STATUS_CHANGE:
            case this.NOTIFICATION_TYPES.SUBTEAM_STATUS_CHANGE:
            case 'USER_STATUS_CHANGE':
            case 'TEAM_STATUS_CHANGE':
            case 'SUBTEAM_STATUS_CHANGE':
                return '/admin/team-management';

            default:
                return null;
        }
    }

    /**
     * Bulk mark notifications as read for a user
     */
    static async markAllAsRead(userId) {
        try {
            const query = `
                UPDATE notifications
                SET status = 'read'
                WHERE user_id = $1 AND status = 'unread' AND channel = 'in-app'
                RETURNING id`;
            const result = await pool.query(query, [userId]);
            return result.rows.length;
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
            throw error;
        }
    }

    /**
     * Get notification statistics for admin dashboard
     */
    static async getNotificationStats() {
        try {
            const query = `
                SELECT
                    notification_type,
                    channel,
                    status,
                    COUNT(*) as count,
                    DATE_TRUNC('day', created_at) as date
                FROM notifications
                WHERE created_at >= NOW() - INTERVAL '30 days'
                GROUP BY notification_type, channel, status, DATE_TRUNC('day', created_at)
                ORDER BY date DESC`;

            const result = await pool.query(query);
            return result.rows;
        } catch (error) {
            console.error('Failed to get notification stats:', error);
            throw error;
        }
    }

    /**
     * Send email notification to recipient
     */
    static async sendEmailNotification(notification, recipientId, type, data, client) {
        try {
            // Get recipient email and name
            const userQuery = `SELECT email, name FROM users WHERE id = $1`;
            const userResult = await client.query(userQuery, [recipientId]);

            if (userResult.rows.length === 0) {
                console.warn(`User not found for email notification: ${recipientId}`);
                return;
            }

            const user = userResult.rows[0];
            if (!user.email) {
                console.warn(`No email address for user: ${recipientId}`);
                return;
            }

            // Generate email content
            const emailContent = this.emailService.generateEmailContent(type, data, user.name);

            // Send email
            const result = await this.emailService.sendEmail({
                to: user.email,
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html
            });

            // Update notification status based on email result
            if (result.success) {
                await client.query(
                    `UPDATE notifications SET status = 'sent' WHERE id = $1`,
                    [notification.id]
                );
                console.log(`Email sent successfully to ${user.email} for notification ${notification.id}`);
            } else {
                await client.query(
                    `UPDATE notifications SET status = 'failed' WHERE id = $1`,
                    [notification.id]
                );
                console.error(`Failed to send email to ${user.email}:`, result.error);
            }

        } catch (error) {
            console.error('Error sending email notification:', error);
            // Mark as failed
            try {
                await client.query(
                    `UPDATE notifications SET status = 'failed' WHERE id = $1`,
                    [notification.id]
                );
            } catch (updateError) {
                console.error('Failed to update notification status:', updateError);
            }
        }
    }

    /**
     * Send toast notification to frontend via real-time connection
     */
    static async sendToastNotification(toastNotification, recipientId, data) {
        try {
            const sseMessage = {
                type: 'toast',
                notification_type: toastNotification.notification_type,
                title: data.title || 'Ειδοποίηση',
                message: toastNotification.message,
                duration: data.duration || 5000,
                linkUrl: toastNotification.link_url,
                id: toastNotification.id,
                timestamp: toastNotification.created_at
            };

            console.log(`🍞 Sending toast notification to user ${recipientId}:`, sseMessage);

            // Send via SSE to frontend
            const sent = sseService.sendToUser(recipientId, sseMessage);

            return { success: sent };
        } catch (error) {
            console.error('Failed to send toast notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send push notification to user
     */
    static async sendPushNotification(pushNotification, recipientId, type, data) {
        try {
            // Generate notification payload using push service
            const payload = pushNotificationService.generateNotificationPayload(type, data);

            console.log(`📱 Sending push notification to user ${recipientId}:`, payload);

            // Send push notification
            const result = await pushNotificationService.sendPushNotification(recipientId, payload);

            if (result.success) {
                console.log(`✅ Push notification sent successfully to user ${recipientId}`);
            } else {
                console.log(`📵 Push notification failed for user ${recipientId}:`, result.error);
            }

            return result;
        } catch (error) {
            console.error('Failed to send push notification:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Clean up old notifications (older than 90 days)
     */
    static async cleanupOldNotifications() {
        try {
            const query = `
                DELETE FROM notifications
                WHERE created_at < NOW() - INTERVAL '90 days' AND status = 'read'`;
            const result = await pool.query(query);
            return result.rowCount;
        } catch (error) {
            console.error('Failed to cleanup old notifications:', error);
            throw error;
        }
    }
}

module.exports = NotificationService;