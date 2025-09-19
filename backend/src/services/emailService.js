const sgMail = require('@sendgrid/mail');

class EmailService {
    constructor() {
        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }

    /**
     * Generate a 6-digit alphanumeric verification code
     * Format: A1B2C3 (alternating letters and numbers)
     */
    generateVerificationCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';

        let code = '';
        for (let i = 0; i < 6; i++) {
            if (i % 2 === 0) {
                // Even positions: letters
                code += letters.charAt(Math.floor(Math.random() * letters.length));
            } else {
                // Odd positions: numbers
                code += numbers.charAt(Math.floor(Math.random() * numbers.length));
            }
        }

        return code;
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

            console.log(`[EMAIL] ===== ENHANCED DEBUG LOGGING =====`);
            console.log(`[EMAIL] Timestamp: ${new Date().toISOString()}`);
            console.log(`[EMAIL] Attempting to send email to: ${to}`);
            console.log(`[EMAIL] Subject: ${subject}`);
            console.log(`[EMAIL] From: ${msg.from}`);
            console.log(`[EMAIL] SendGrid API Key present: ${!!process.env.SENDGRID_API_KEY}`);
            console.log(`[EMAIL] SendGrid API Key (first 10 chars): ${process.env.SENDGRID_API_KEY ? process.env.SENDGRID_API_KEY.substring(0, 10) + '...' : 'MISSING'}`);
            console.log(`[EMAIL] Text length: ${text ? text.length : 0} characters`);
            console.log(`[EMAIL] HTML length: ${html ? html.length : 0} characters`);
            console.log(`[EMAIL] ========================================`);

            const result = await sgMail.send(msg);

            console.log(`[EMAIL] ===== SENDGRID SUCCESS RESPONSE =====`);
            console.log(`[EMAIL] Successfully sent to ${to}`);
            console.log(`[EMAIL] Response status: ${result[0]?.statusCode}`);
            console.log(`[EMAIL] Response headers:`, JSON.stringify(result[0]?.headers, null, 2));
            console.log(`[EMAIL] Response body:`, JSON.stringify(result[0]?.body, null, 2));
            console.log(`[EMAIL] Message ID: ${result[0]?.headers?.['x-message-id']}`);
            console.log(`[EMAIL] =========================================`);

            return {
                success: true,
                result,
                messageId: result[0]?.headers?.['x-message-id'],
                statusCode: result[0]?.statusCode
            };
        } catch (error) {
            console.error(`[EMAIL] ===== SENDGRID ERROR RESPONSE =====`);
            console.error(`[EMAIL] Send failed to ${emailOptions.to}`);
            console.error(`[EMAIL] Error message: ${error.message}`);
            console.error(`[EMAIL] Error code: ${error.code}`);

            if (error.response) {
                console.error(`[EMAIL] HTTP Status: ${error.response.status}`);
                console.error(`[EMAIL] Response headers:`, JSON.stringify(error.response.headers, null, 2));
                console.error(`[EMAIL] Response body:`, JSON.stringify(error.response.body, null, 2));

                // Detailed SendGrid error analysis
                if (error.response.body?.errors) {
                    console.error(`[EMAIL] SendGrid specific errors:`);
                    error.response.body.errors.forEach((err, index) => {
                        console.error(`[EMAIL]   Error ${index + 1}: ${err.message} (${err.field})`);
                    });
                }
            }

            console.error(`[EMAIL] Full error stack:`, error.stack);
            console.error(`[EMAIL] ====================================`);

            return {
                success: false,
                error: error.message,
                errorCode: error.code,
                httpStatus: error.response?.status,
                sendGridErrors: error.response?.body?.errors
            };
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

            case 'PASSWORD_RESET':
                return {
                    subject: 'Επαναφορά κωδικού πρόσβασης - ERASMOS',
                    text: `Αγαπητέ ${data.name},\n\nΛάβαμε αίτημα επαναφοράς κωδικού πρόσβασης για τον λογαριασμό σας στο σύστημα ERASMOS.\n\nΓια να επαναφέρετε τον κωδικό σας, κάντε κλικ στον παρακάτω σύνδεσμο:\n${data.resetUrl}\n\nΑυτός ο σύνδεσμος θα λήξει σε 1 ώρα για λόγους ασφαλείας.\n\nΑν δεν ζητήσατε εσείς αυτή την επαναφορά, παρακαλώ αγνοήστε αυτό το email.\n\nΜε εκτίμηση,\nΗ ομάδα ERASMOS`,
                    html: this.createHtmlTemplate({
                        title: 'Επαναφορά Κωδικού Πρόσβασης',
                        content: `<p>Αγαπητέ <strong>${data.name}</strong>,</p>
                                 <p>Λάβαμε αίτημα επαναφοράς κωδικού πρόσβασης για τον λογαριασμό σας στο σύστημα <strong>ERASMOS</strong>.</p>
                                 <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                                    <p style="margin: 0;"><strong>⚠️ Σημαντικό:</strong> Αυτός ο σύνδεσμος θα λήξει σε <strong>1 ώρα</strong> για λόγους ασφαλείας.</p>
                                 </div>
                                 <div style="text-align: center; margin: 30px 0;">
                                    <a href="${data.resetUrl}" style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">🔐 Επαναφορά Κωδικού</a>
                                 </div>
                                 <p style="color: #666; font-size: 14px; margin-top: 30px;">Αν δεν ζητήσατε εσείς αυτή την επαναφορά, παρακαλώ αγνοήστε αυτό το email. Ο κωδικός σας παραμένει ασφαλής.</p>`,
                        linkUrl: null // Already included in the content
                    })
                };

            case 'MONTHLY_SUMMARY':
                return {
                    subject: 'Μηνιαία ενημέρωση αμοιβών',
                    text: data.message, // Use the prepared message from controller
                    html: this.createMonthlySummaryHtml(data, recipientName)
                };

            case 'LEGAL_EMAIL_VERIFICATION':
                return {
                    subject: '🔒 Επιβεβαίωση Νομικής Αποδοχής - ERASMOS',
                    text: this.generateLegalVerificationText(data.verificationCode, data.acceptanceId),
                    html: this.generateLegalVerificationHTML(data.verificationCode, data.acceptanceId)
                };

            case 'USER_STATUS_ACTIVATED':
                return {
                    subject: '✅ Ο λογαριασμός σας ενεργοποιήθηκε - ERASMOS',
                    text: `Αγαπητέ ${data.name},\n\nΟ λογαριασμός σας στο σύστημα ERASMOS έχει ενεργοποιηθεί επιτυχώς.\n\nΜπορείτε τώρα να συνδεθείτε και να χρησιμοποιήσετε κανονικά το σύστημα.\n\nΑν έχετε οποιεσδήποτε απορίες, μη διστάσετε να επικοινωνήσετε μαζί μας.\n\nΜε εκτίμηση,\nΗ ομάδα ERASMOS`,
                    html: this.createHtmlTemplate({
                        title: 'Ενεργοποίηση Λογαριασμού',
                        content: `<p>Αγαπητέ <strong>${data.name}</strong>,</p>
                                 <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                    <h3 style="color: #155724; margin: 0;">✅ Λογαριασμός Ενεργοποιήθηκε</h3>
                                    <p style="color: #155724; margin: 10px 0 0 0;">Ο λογαριασμός σας στο σύστημα ERASMOS έχει ενεργοποιηθεί επιτυχώς!</p>
                                 </div>
                                 <p>Μπορείτε τώρα να συνδεθείτε και να χρησιμοποιήσετε κανονικά το σύστημα.</p>
                                 <p>Αν έχετε οποιεσδήποτε απορίες, μη διστάσετε να επικοινωνήσετε μαζί μας.</p>`,
                        linkUrl: process.env.FRONTEND_URL || 'http://localhost:5173'
                    })
                };

            case 'USER_STATUS_DEACTIVATED':
                return {
                    subject: '⚠️ Ο λογαριασμός σας απενεργοποιήθηκε - ERASMOS',
                    text: `Αγαπητέ ${data.name},\n\nΣας ενημερώνουμε ότι ο λογαριασμός σας στο σύστημα ERASMOS έχει απενεργοποιηθεί.\n\nΑυτό σημαίνει ότι δεν μπορείτε πλέον να συνδεθείτε στο σύστημα μέχρι να ενεργοποιηθεί ξανά.\n\nΓια περισσότερες πληροφορίες ή για να επαναφέρετε τον λογαριασμό σας, παρακαλώ επικοινωνήστε με τον διαχειριστή του συστήματος.\n\nΜε εκτίμηση,\nΗ ομάδα ERASMOS`,
                    html: this.createHtmlTemplate({
                        title: 'Απενεργοποίηση Λογαριασμού',
                        content: `<p>Αγαπητέ <strong>${data.name}</strong>,</p>
                                 <div style="background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                                    <h3 style="color: #721c24; margin: 0;">⚠️ Λογαριασμός Απενεργοποιήθηκε</h3>
                                    <p style="color: #721c24; margin: 10px 0 0 0;">Ο λογαριασμός σας στο σύστημα ERASMOS έχει απενεργοποιηθεί.</p>
                                 </div>
                                 <p>Αυτό σημαίνει ότι δεν μπορείτε πλέον να συνδεθείτε στο σύστημα μέχρι να ενεργοποιηθεί ξανά.</p>
                                 <p>Για περισσότερες πληροφορίες ή για να επαναφέρετε τον λογαριασμό σας, παρακαλώ επικοινωνήστε με τον διαχειριστή του συστήματος.</p>`,
                        linkUrl: null
                    })
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

    /**
     * Send legal verification email with manual code
     */
    async sendLegalVerificationEmail(userEmail, verificationCode, acceptanceId) {
        try {
            const emailContent = this.generateEmailContent('LEGAL_EMAIL_VERIFICATION', {
                verificationCode: verificationCode,
                acceptanceId: acceptanceId
            }, 'χρήστη');

            const result = await this.sendEmail({
                to: userEmail,
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html
            });

            console.log(`[EMAIL] Legal verification email sent to ${userEmail} with code: ${verificationCode}`);
            return result;
        } catch (error) {
            console.error('[EMAIL] Failed to send legal verification email:', error);
            throw error;
        }
    }

    /**
     * Generate legal verification HTML content
     */
    generateLegalVerificationHTML(verificationCode, acceptanceId) {
        return `
        <!DOCTYPE html>
        <html lang="el">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Επιβεβαίωση Νομικής Αποδοχής</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f5f5f5;
                }
                .container {
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #10b981;
                    padding-bottom: 20px;
                }
                .logo {
                    font-size: 2rem;
                    font-weight: bold;
                    color: #10b981;
                    margin-bottom: 10px;
                }
                .title {
                    color: #1f2937;
                    font-size: 1.5rem;
                    margin: 0;
                }
                .warning-box {
                    background: #fef2f2;
                    border: 2px solid #ef4444;
                    border-radius: 8px;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: center;
                }
                .warning-box h3 {
                    color: #dc2626;
                    margin: 0 0 10px 0;
                    font-size: 1.1rem;
                }
                .verification-button {
                    display: inline-block;
                    background: #10b981;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin: 20px 0;
                    text-align: center;
                }
                .info-box {
                    background: #f0f9ff;
                    border: 1px solid #0ea5e9;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 1px solid #e5e7eb;
                    font-size: 0.9rem;
                    color: #6b7280;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🔒 ERASMOS</div>
                    <h1 class="title">Επιβεβαίωση Νομικής Αποδοχής</h1>
                </div>

                <div class="content">
                    <p>Αγαπητέ χρήστη,</p>
                    <p>Λάβαμε την αίτησή σας για νομική αποδοχή των όρων και των συμφωνιών της πλατφόρμας ERASMOS. Για να ολοκληρώσετε τη διαδικασία, παρακαλούμε εισάγετε τον παρακάτω κωδικό επιβεβαίωσης στην εφαρμογή.</p>

                    <div class="warning-box">
                        <h3>⚠️ ΣΗΜΑΝΤΙΚΟ - ΝΟΜΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ</h3>
                        <p><strong>Αυτό το email αποτελεί μέρος της νομικής διαδικασίας.</strong> Η επιβεβαίωση αποδεικνύει ότι έχετε πρόσβαση στη διεύθυνση email που δηλώσατε και ότι αποδέχεστε τους όρους χρήσης.</p>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #f8f9fa; border: 3px solid #10b981; border-radius: 12px; padding: 20px; display: inline-block;">
                            <h2 style="margin: 0; color: #10b981; font-size: 2.5rem; letter-spacing: 0.2em; font-family: 'Courier New', monospace;">${verificationCode}</h2>
                            <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">Κωδικός Επιβεβαίωσης</p>
                        </div>
                    </div>

                    <div style="background: #e7f3ff; border: 1px solid #0ea5e9; border-radius: 8px; padding: 15px; margin: 20px 0;">
                        <p style="margin: 0; color: #0066cc;"><strong>📝 Οδηγίες:</strong></p>
                        <p style="margin: 5px 0 0 0; color: #0066cc;">Εισάγετε τον παραπάνω κωδικό στο πεδίο επιβεβαίωσης της εφαρμογής ERASMOS για να ολοκληρώσετε τη νομική διαδικασία.</p>
                    </div>

                    <div class="info-box">
                        <p><strong>ID Αποδοχής:</strong> ${acceptanceId}</p>
                        <p><strong>Ημερομηνία:</strong> ${new Date().toLocaleString('el-GR')}</p>
                        <p><strong>Χρόνος Λήξης:</strong> 24 ώρες από την αποστολή</p>
                    </div>

                    <p><strong>Σε περίπτωση που δεν πραγματοποιήσατε εσείς αυτή την αίτηση:</strong></p>
                    <p>Παρακαλούμε αγνοήστε αυτό το email και επικοινωνήστε μαζί μας άμεσα στο thsikalos@gmail.com</p>
                </div>

                <div class="footer">
                    <p><strong>ERASMOS - Πλατφόρμα Επεξεργασίας Προσωπικών Δεδομένων</strong></p>
                    <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το μήνυμα.</p>
                    <p>Για υποστήριξη: thsikalos@gmail.com</p>
                    <p style="font-size: 0.8rem; margin-top: 15px;">
                        © ${new Date().getFullYear()} ERASMOS. Όλα τα δικαιώματα διατηρούνται.
                        <br>Αυτό το email αποτελεί μέρος της νομικής διαδικασίας GDPR.
                    </p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    /**
     * Generate legal verification text content
     */
    generateLegalVerificationText(verificationCode, acceptanceId) {
        return `
🔒 ΕΠΙΒΕΒΑΙΩΣΗ ΝΟΜΙΚΗΣ ΑΠΟΔΟΧΗΣ - ERASMOS

Αγαπητέ χρήστη,

Λάβαμε την αίτησή σας για νομική αποδοχή των όρων και των συμφωνιών της πλατφόρμας ERASMOS.

⚠️ ΣΗΜΑΝΤΙΚΟ - ΝΟΜΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ
Αυτό το email αποτελεί μέρος της νομικής διαδικασίας. Η επιβεβαίωση αποδεικνύει ότι έχετε πρόσβαση στη διεύθυνση email που δηλώσατε.

ΚΩΔΙΚΟΣ ΕΠΙΒΕΒΑΙΩΣΗΣ: ${verificationCode}

📝 ΟΔΗΓΙΕΣ:
Εισάγετε τον παραπάνω κωδικό στο πεδίο επιβεβαίωσης της εφαρμογής ERASMOS για να ολοκληρώσετε τη νομική διαδικασία.

ΣΤΟΙΧΕΙΑ ΑΠΟΔΟΧΗΣ:
- ID Αποδοχής: ${acceptanceId}
- Κωδικός Επιβεβαίωσης: ${verificationCode}
- Ημερομηνία: ${new Date().toLocaleString('el-GR')}
- Χρόνος Λήξης: 24 ώρες

ΝΟΜΙΚΕΣ ΠΛΗΡΟΦΟΡΙΕΣ:
- Αυτή η επιβεβαίωση απαιτείται σύμφωνα με το GDPR
- Το email αυτό καταγράφεται για λόγους audit trail
- Η επιβεβαίωση δεν μπορεί να ανακληθεί μετά την ολοκλήρωση

Σε περίπτωση που δεν πραγματοποιήσατε εσείς αυτή την αίτηση, παρακαλούμε αγνοήστε αυτό το email και επικοινωνήστε μαζί μας στο thsikalos@gmail.com

---
ERASMOS - Πλατφόρμα Επεξεργασίας Προσωπικών Δεδομένων
Για υποστήριξη: thsikalos@gmail.com

© ${new Date().getFullYear()} ERASMOS. Αυτό το email αποτελεί μέρος της νομικής διαδικασίας GDPR.
        `;
    }
}

module.exports = EmailService;