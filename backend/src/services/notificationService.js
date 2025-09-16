const pool = require('../config/db');
const EmailService = require('./emailService');

class NotificationService {
    static NOTIFICATION_TYPES = {
        APPLICATION_STATUS_CHANGE: 'application_status_change',
        NEW_APPLICATION: 'new_application',
        LOGIN_LEAD: 'login_lead',
        NEW_USER_REGISTRATION: 'new_user_registration',
        PAYMENT_UPDATE: 'payment_update',
        SYSTEM_ALERT: 'system_alert',
        NEW_REMINDER: 'new_reminder'
    };

    static CHANNELS = {
        IN_APP: 'in-app',
        EMAIL: 'email'
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
            const channel = options.channel || this.CHANNELS.IN_APP;

            const createdNotifications = [];

            for (const recipientId of recipients) {
                const linkUrl = this.generateLinkUrl(type, data);

                const insertQuery = `
                    INSERT INTO notifications (user_id, message, status, channel, link_url, notification_type, metadata)
                    VALUES ($1, $2, 'unread', $3, $4, $5, $6)
                    RETURNING *`;

                const metadata = {
                    type,
                    ...data,
                    created_by: data.created_by || null,
                    application_id: data.application_id || null,
                    user_id: data.user_id || null
                };

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

            default:
                console.warn(`Unknown notification type: ${type}`);
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
                    return `Νέα υπενθύμιση από ${data.creator_name}: "${data.title}" (καταληκτική ημερομηνία: ${new Date(data.due_date).toLocaleDateString('el-GR')})`;
                } else {
                    // Assigned to someone else
                    return `Σας ανατέθηκε νέα υπενθύμιση από ${data.creator_name}: "${data.title}" (καταληκτική ημερομηνία: ${new Date(data.due_date).toLocaleDateString('el-GR')})`;
                }

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
                return data.link_url || '/admin';

            case this.NOTIFICATION_TYPES.NEW_REMINDER:
                return '/dashboard'; // Reminders are shown on dashboard

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