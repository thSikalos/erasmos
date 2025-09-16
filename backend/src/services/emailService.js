const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor() {
        // Initialize SendGrid with API key from environment
        const apiKey = process.env.SENDGRID_API_KEY;
        if (!apiKey) {
            console.warn('SENDGRID_API_KEY not found in environment variables');
        } else {
            sgMail.setApiKey(apiKey);
        }
    }

    /**
     * Send a single email using SendGrid
     * @param {Object} emailData - Email configuration
     * @param {string} emailData.to - Recipient email address
     * @param {string} emailData.subject - Email subject
     * @param {string} emailData.text - Plain text content
     * @param {string} emailData.html - HTML content (optional)
     * @param {string} emailData.from - Sender email (default: no-reply@erasmos.app)
     */
    async sendEmail({ to, subject, text, html, from = 'no-reply@erasmos.app' }) {
        try {
            const msg = {
                to,
                from,
                subject,
                text,
                ...(html && { html })
            };

            const result = await sgMail.send(msg);
            console.log(`Email sent successfully to ${to}:`, result[0].statusCode);
            return {
                success: true,
                messageId: result[0].headers['x-message-id'],
                statusCode: result[0].statusCode
            };

        } catch (error) {
            console.error('SendGrid email send error:', error);

            // Extract meaningful error information
            let errorMessage = 'Failed to send email';
            if (error.response && error.response.body) {
                errorMessage = error.response.body.errors?.[0]?.message || errorMessage;
            }

            return {
                success: false,
                error: errorMessage,
                details: error.message
            };
        }
    }

    /**
     * Send bulk emails (for team notifications)
     * @param {Array} recipients - Array of recipient objects {email, name}
     * @param {string} subject - Email subject
     * @param {string} text - Plain text content
     * @param {string} html - HTML content
     */
    async sendBulkEmails(recipients, subject, text, html) {
        const results = [];

        for (const recipient of recipients) {
            const result = await this.sendEmail({
                to: recipient.email,
                subject,
                text: text.replace('{{name}}', recipient.name || 'Συνεργάτη'),
                html: html?.replace('{{name}}', recipient.name || 'Συνεργάτη')
            });

            results.push({
                email: recipient.email,
                name: recipient.name,
                ...result
            });

            // Add small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return results;
    }

    /**
     * Generate email content for different notification types
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {string} recipientName - Recipient name for personalization
     */
    generateEmailContent(type, data, recipientName = 'Συνεργάτη') {
        const templates = {
            APPLICATION_STATUS_CHANGE: {
                subject: `Ενημέρωση κατάστασης αίτησης #${data.application_id}`,
                text: `Αγαπητέ ${recipientName},\n\nΗ αίτηση #${data.application_id} του πελάτη ${data.customer_name} ${this.getStatusText(data.new_status)}.\n\nΜπορείτε να δείτε περισσότερες λεπτομέρειες στο σύστημα Erasmos.\n\nΜε εκτίμηση,\nΤο σύστημα Erasmos`,
                html: this.createHtmlTemplate({
                    title: 'Ενημέρωση Κατάστασης Αίτησης',
                    content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                             <p>Η αίτηση <strong>#${data.application_id}</strong> του πελάτη <strong>${data.customer_name}</strong> ${this.getStatusText(data.new_status)}.</p>
                             <p>Μπορείτε να δείτε περισσότερες λεπτομέρειες στο σύστημα Erasmos.</p>`,
                    linkUrl: data.link_url
                })
            },

            NEW_APPLICATION: {
                subject: `Νέα αίτηση #${data.application_id} από ${data.creator_name}`,
                text: `Αγαπητέ ${recipientName},\n\nΔημιουργήθηκε νέα αίτηση #${data.application_id} από τον ${data.creator_name} για τον πελάτη ${data.customer_name}.\n\nΠαρακαλώ ελέγξτε το σύστημα για περαιτέρω ενέργειες.\n\nΜε εκτίμηση,\nΤο σύστημα Erasmos`,
                html: this.createHtmlTemplate({
                    title: 'Νέα Αίτηση',
                    content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                             <p>Δημιουργήθηκε νέα αίτηση <strong>#${data.application_id}</strong> από τον <strong>${data.creator_name}</strong> για τον πελάτη <strong>${data.customer_name}</strong>.</p>
                             <p>Παρακαλώ ελέγξτε το σύστημα για περαιτέρω ενέργειες.</p>`,
                    linkUrl: data.link_url
                })
            },

            LOGIN_LEAD: {
                subject: 'Νέος ενδιαφερόμενος εγγράφηκε στο σύστημα',
                text: `Αγαπητέ ${recipientName},\n\nΝέος ενδιαφερόμενος εγγράφηκε στο σύστημα:\n\nΌνομα: ${data.name}\nEmail: ${data.email}\nΤηλέφωνο: ${data.phone || 'Δεν δόθηκε'}\n\nΠαρακαλώ ελέγξτε το σύστημα για περαιτέρω ενέργειες.\n\nΜε εκτίμηση,\nΤο σύστημα Erasmos`,
                html: this.createHtmlTemplate({
                    title: 'Νέος Ενδιαφερόμενος',
                    content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                             <p>Νέος ενδιαφερόμενος εγγράφηκε στο σύστημα:</p>
                             <ul>
                                <li><strong>Όνομα:</strong> ${data.name}</li>
                                <li><strong>Email:</strong> ${data.email}</li>
                                <li><strong>Τηλέφωνο:</strong> ${data.phone || 'Δεν δόθηκε'}</li>
                             </ul>
                             <p>Παρακαλώ ελέγξτε το σύστημα για περαιτέρω ενέργειες.</p>`,
                    linkUrl: data.link_url
                })
            },

            MONTHLY_SUMMARY: {
                subject: 'Μηνιαία ενημέρωση αμοιβών',
                text: data.message, // Use the prepared message from controller
                html: this.createMonthlySummaryHtml(data, recipientName)
            }
        };

        return templates[type] || {
            subject: 'Ειδοποίηση από το σύστημα Erasmos',
            text: data.message || 'Νέα ειδοποίηση από το σύστημα.',
            html: this.createHtmlTemplate({
                title: 'Ειδοποίηση Συστήματος',
                content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                         <p>${data.message || 'Νέα ειδοποίηση από το σύστημα.'}</p>`
            })
        };
    }

    /**
     * Helper method to get status text in Greek
     */
    getStatusText(status) {
        const statusTranslations = {
            'Καταχωρήθηκε': 'καταχωρήθηκε επιτυχώς',
            'Εκκρεμεί': 'τέθηκε σε εκκρεμότητα',
            'Απορρίφθηκε': 'απορρίφθηκε',
            'Ακυρώθηκε': 'ακυρώθηκε'
        };
        return statusTranslations[status] || status.toLowerCase();
    }

    /**
     * Create HTML template for emails
     */
    createHtmlTemplate({ title, content, linkUrl }) {
        return `
        <!DOCTYPE html>
        <html lang="el">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #007bff; }
                .title { color: #333; margin: 20px 0 10px 0; }
                .content { margin: 20px 0; }
                .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">ERASMOS</div>
                    <h2 class="title">${title}</h2>
                </div>
                <div class="content">
                    ${content}
                    ${linkUrl ? `<p><a href="${linkUrl}" class="button">Δείτε περισσότερα</a></p>` : ''}
                </div>
                <div class="footer">
                    <p>Με εκτίμηση,<br><strong>Το σύστημα Erasmos</strong></p>
                    <p><small>Αυτό είναι αυτοματοποιημένο μήνυμα. Παρακαλώ μη απαντήσετε.</small></p>
                </div>
            </div>
        </body>
        </html>`;
    }

    /**
     * Create HTML for monthly summary emails
     */
    createMonthlySummaryHtml(data, recipientName) {
        return `
        <!DOCTYPE html>
        <html lang="el">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Μηνιαία Ενημέρωση Αμοιβών</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { text-align: center; border-bottom: 2px solid #28a745; padding-bottom: 20px; margin-bottom: 30px; }
                .logo { font-size: 24px; font-weight: bold; color: #28a745; }
                .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #28a745; }
                .amount { font-size: 24px; font-weight: bold; color: #28a745; }
                .breakdown { background: white; padding: 15px; border-radius: 5px; margin: 10px 0; }
                .footer { text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; color: #666; font-size: 14px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">ERASMOS</div>
                    <h2>Μηνιαία Ενημέρωση Αμοιβών</h2>
                </div>
                <div class="content">
                    <p>Καλησπέρα <strong>${recipientName}</strong>,</p>

                    <div class="summary-card">
                        <h3>Συνολικές Αμοιβές Μήνα</h3>
                        <div class="amount">${data.total_amount}€ ${data.vat_text || ''}</div>

                        ${data.breakdown ? `
                        <div class="breakdown">
                            <h4>Ανάλυση ανά εταιρεία:</h4>
                            <p>${data.breakdown}</p>
                        </div>
                        ` : ''}
                    </div>

                    <p>Καλή συνέχεια!</p>
                </div>
                <div class="footer">
                    <p>Με εκτίμηση,<br><strong>Το σύστημα Erasmos</strong></p>
                    <p><small>Αυτό είναι αυτοματοποιημένο μήνυμα. Παρακαλώ μη απαντήσετε.</small></p>
                </div>
            </div>
        </body>
        </html>`;
    }

    /**
     * Test SendGrid connection
     */
    async testConnection() {
        try {
            // Send a simple test email to verify connection
            await this.sendEmail({
                to: 'test@erasmos.app', // This should be a valid test email
                subject: 'SendGrid Connection Test',
                text: 'This is a test email to verify SendGrid connection.'
            });
            return { success: true, message: 'SendGrid connection successful' };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

module.exports = EmailService;