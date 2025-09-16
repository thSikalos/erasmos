const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor() {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    /**
     * Send email using SendGrid
     * @param {Object} emailOptions - Email options (to, subject, text, html)
     */
    async sendEmail(emailOptions) {
        try {
            const { to, subject, text, html } = emailOptions;

            if (!to || !subject || (!text && !html)) {
                throw new Error('Missing required email fields');
            }

            const msg = {
                to: to,
                from: process.env.EMAIL_FROM || 'no-reply@erasmos.app',
                subject: subject,
                text: text,
                html: html || text
            };

            const result = await sgMail.send(msg);

            console.log(`[EMAIL] Successfully sent to ${to}: ${subject}`);
            return { success: true, result };
        } catch (error) {
            console.error('[EMAIL] Send failed:', error.message);
            if (error.response) {
                console.error('[EMAIL] SendGrid error:', error.response.body);
            }
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate email content based on notification type
     * @param {string} type - Notification type
     * @param {Object} data - Notification data
     * @param {string} recipientName - Recipient name for personalization
     */
    generateEmailContent(type, data, recipientName = 'Συνεργάτη') {
        switch (type) {
            case 'APPLICATION_STATUS_CHANGE':
                return {
                    subject: `Ενημέρωση κατάστασης αίτησης #${data.application_id}`,
                    text: `Αγαπητέ ${recipientName},\n\nΗ αίτηση #${data.application_id} του πελάτη ${data.customer_name} ${this.getStatusText(data.new_status)}.\n\nΜπορείτε να δείτε περισσότερες λεπτομέρειες στο σύστημα Erasmos.\n\nΜε εκτίμηση,\nΤο σύστημα Erasmos`,
                    html: this.createHtmlTemplate({
                        title: 'Ενημέρωση Κατάστασης Αίτησης',
                        content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                                 <p>Η αίτηση <strong>#${data.application_id}</strong> του πελάτη <strong>${data.customer_name}</strong> ${this.getStatusText(data.new_status)}.</p>
                                 <p>Μπορείτε να δείτε περισσότερες λεπτομέρειες στο σύστημα Erasmos.</p>`,
                        linkUrl: data.link_url
                    })
                };

            case 'NEW_APPLICATION':
                return {
                    subject: `Νέα αίτηση #${data.application_id} από ${data.creator_name}`,
                    text: `Αγαπητέ ${recipientName},\n\nΔημιουργήθηκε νέα αίτηση #${data.application_id} από τον ${data.creator_name} για τον πελάτη ${data.customer_name}.\n\nΠαρακαλώ ελέγξτε το σύστημα για περαιτέρω ενέργειες.\n\nΜε εκτίμηση,\nΤο σύστημα Erasmos`,
                    html: this.createHtmlTemplate({
                        title: 'Νέα Αίτηση',
                        content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                                 <p>Δημιουργήθηκε νέα αίτηση <strong>#${data.application_id}</strong> από τον <strong>${data.creator_name}</strong> για τον πελάτη <strong>${data.customer_name}</strong>.</p>
                                 <p>Παρακαλώ ελέγξτε το σύστημα για περαιτέρω ενέργειες.</p>`,
                        linkUrl: data.link_url
                    })
                };

            case 'LOGIN_LEAD':
                return {
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
                };

            case 'NEW_USER_REGISTRATION':
                return {
                    subject: `Νέος χρήστης δημιουργήθηκε: ${data.name}`,
                    text: `Αγαπητέ ${recipientName},\n\nΝέος χρήστης δημιουργήθηκε στο σύστημα Erasmos:\n\nΌνομα: ${data.name}\nEmail: ${data.email}\nΡόλος: ${data.role}\n${data.password ? `Κωδικός: ${data.password}\n` : ''}Ημερομηνία: ${new Date().toLocaleDateString('el-GR')}\n\nΜε εκτίμηση,\nΤο σύστημα Erasmos`,
                    html: this.createHtmlTemplate({
                        title: 'Νέος Χρήστης',
                        content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                                 <p>Νέος χρήστης δημιουργήθηκε στο σύστημα Erasmos:</p>
                                 <ul>
                                    <li><strong>Όνομα:</strong> ${data.name}</li>
                                    <li><strong>Email:</strong> ${data.email}</li>
                                    <li><strong>Ρόλος:</strong> ${data.role}</li>
                                    ${data.password ? `<li><strong>Κωδικός:</strong> <code style="background: #f5f5f5; padding: 2px 4px; border-radius: 3px;">${data.password}</code></li>` : ''}
                                    <li><strong>Ημερομηνία:</strong> ${new Date().toLocaleDateString('el-GR')}</li>
                                 </ul>`,
                        linkUrl: data.link_url
                    })
                };

            case 'NEW_USER_WELCOME':
                return {
                    subject: 'Καλώς ήρθες στο ERASMOS!',
                    text: `Αγαπητέ ${data.name},\n\nΚαλώς ήρθες στο σύστημα ERASMOS!\n\nΤα στοιχεία πρόσβασής σας είναι:\nEmail: ${data.email}\nΚωδικός: ${data.password}\nΡόλος: ${data.role}\n\nΜπορείτε να συνδεθείτε στο σύστημα και να αρχίσετε να εργάζεστε αμέσως.\n\nΓια οποιαδήποτε απορία, μη διστάσετε να επικοινωνήσετε μαζί μας.\n\nΜε εκτίμηση,\nΗ ομάδα ERASMOS`,
                    html: this.createHtmlTemplate({
                        title: 'Καλώς ήρθες στο ERASMOS!',
                        content: `<p>Αγαπητέ <strong>${data.name}</strong>,</p>
                                 <p>Καλώς ήρθες στο σύστημα <strong>ERASMOS</strong>! 🎉</p>
                                 <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                                    <h3 style="margin-top: 0; color: #007bff;">Τα στοιχεία πρόσβασής σας:</h3>
                                    <ul style="list-style: none; padding: 0;">
                                        <li style="margin: 10px 0;"><strong>Email:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">${data.email}</code></li>
                                        <li style="margin: 10px 0;"><strong>Κωδικός:</strong> <code style="background: #fff; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;">${data.password}</code></li>
                                        <li style="margin: 10px 0;"><strong>Ρόλος:</strong> <span style="background: #e7f3ff; padding: 4px 8px; border-radius: 4px; color: #0066cc;">${data.role}</span></li>
                                    </ul>
                                 </div>
                                 <p>Μπορείτε να συνδεθείτε στο σύστημα και να αρχίσετε να εργάζεστε αμέσως.</p>
                                 <p>Για οποιαδήποτε απορία, μη διστάσετε να επικοινωνήσετε μαζί μας.</p>
                                 <p style="margin-top: 30px;"><strong>Καλή αρχή!</strong> 🚀</p>`,
                        linkUrl: 'http://localhost:5173'
                    })
                };

            case 'MONTHLY_SUMMARY':
                return {
                    subject: 'Μηνιαία ενημέρωση αμοιβών',
                    text: data.message, // Use the prepared message from controller
                    html: this.createMonthlySummaryHtml(data, recipientName)
                };

            default:
                return {
                    subject: 'Ειδοποίηση από το σύστημα Erasmos',
                    text: data.message || 'Νέα ειδοποίηση από το σύστημα.',
                    html: this.createHtmlTemplate({
                        title: 'Ειδοποίηση Συστήματος',
                        content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                                 <p>${data.message || 'Νέα ειδοποίηση από το σύστημα.'}</p>`,
                        linkUrl: data.link_url
                    })
                };
        }
    }

    /**
     * Helper method to get status text in Greek
     */
    getStatusText(status) {
        if (!status) return '';

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
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #007bff; margin: 0; font-size: 24px;">${title}</h1>
                </div>

                <div style="color: #333333; font-size: 16px;">
                    ${content}
                </div>

                ${linkUrl ? `
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${linkUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Άνοιγμα Συστήματος</a>
                </div>
                ` : ''}

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666;">
                    <p>Αυτό το email στάλθηκε αυτόματα από το σύστημα ERASMOS.</p>
                    <p>Για τεχνική υποστήριξη, επικοινωνήστε μαζί μας.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Create monthly summary HTML (placeholder for now)
     */
    createMonthlySummaryHtml(data, recipientName) {
        return this.createHtmlTemplate({
            title: 'Μηνιαία Ενημέρωση',
            content: `<p>Αγαπητέ <strong>${recipientName}</strong>,</p>
                     <p>${data.message}</p>`,
            linkUrl: null
        });
    }
}

module.exports = EmailService;