const nodemailer = require('nodemailer');
const crypto = require('crypto');
const db = require('../config/db');

class EmailVerificationService {
  constructor() {
    this.transporter = this.createTransport();
  }

  createTransport() {
    // Production configuration should use environment variables
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  // Generate verification token
  generateVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  // Send legal acceptance verification email
  async sendLegalVerificationEmail(userEmail, verificationToken, acceptanceId) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/legal/verify?token=${verificationToken}`;

      const mailOptions = {
        from: `"Erasmos - Νομική Επιβεβαίωση" <${process.env.SMTP_FROM || 'noreply@erasmos.gr'}>`,
        to: userEmail,
        subject: '🔒 Επιβεβαίωση Νομικής Αποδοχής - Erasmos',
        html: this.generateLegalVerificationEmailHTML(verificationUrl, acceptanceId),
        text: this.generateLegalVerificationEmailText(verificationUrl, acceptanceId)
      };

      const result = await this.transporter.sendMail(mailOptions);

      // Log email sending for audit trail
      await this.logEmailVerification(userEmail, verificationToken, acceptanceId, 'sent');

      console.log(`[EMAIL VERIFICATION] Legal verification email sent to ${userEmail}`);
      return result;
    } catch (error) {
      console.error('[EMAIL VERIFICATION] Failed to send legal verification email:', error);

      // Log failed email attempt
      await this.logEmailVerification(userEmail, verificationToken, acceptanceId, 'failed', error.message);

      throw new Error('Αποτυχία αποστολής email επιβεβαίωσης');
    }
  }

  // Generate HTML email content
  generateLegalVerificationEmailHTML(verificationUrl, acceptanceId) {
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
            .content {
                margin-bottom: 30px;
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
            .verification-button:hover {
                background: #059669;
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
            .legal-notice {
                background: #fffbeb;
                border: 1px solid #f59e0b;
                border-radius: 8px;
                padding: 15px;
                margin: 20px 0;
                font-size: 0.9rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔒 Erasmos</div>
                <h1 class="title">Επιβεβαίωση Νομικής Αποδοχής</h1>
            </div>

            <div class="content">
                <p>Αγαπητέ χρήστη,</p>

                <p>Λάβαμε την αίτησή σας για νομική αποδοχή των όρων και των συμφωνιών της πλατφόρμας Erasmos. Για να ολοκληρώσετε τη διαδικασία, παρακαλούμε επιβεβαιώστε τη διεύθυνση email σας.</p>

                <div class="warning-box">
                    <h3>⚠️ ΣΗΜΑΝΤΙΚΟ - ΝΟΜΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ</h3>
                    <p><strong>Αυτό το email αποτελεί μέρος της νομικής διαδικασίας.</strong> Η επιβεβαίωση αποδεικνύει ότι έχετε πρόσβαση στη διεύθυνση email που δηλώσατε και ότι αποδέχεστε τους όρους χρήσης.</p>
                </div>

                <div style="text-align: center;">
                    <a href="${verificationUrl}" class="verification-button">
                        ✅ ΕΠΙΒΕΒΑΙΩΣΗ ΝΟΜΙΚΗΣ ΑΠΟΔΟΧΗΣ
                    </a>
                </div>

                <div class="info-box">
                    <p><strong>ID Αποδοχής:</strong> ${acceptanceId}</p>
                    <p><strong>Ημερομηνία:</strong> ${new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}</p>
                    <p><strong>Χρόνος Λήξης:</strong> 24 ώρες από την αποστολή</p>
                </div>

                <div class="legal-notice">
                    <p><strong>Νομικές πληροφορίες:</strong></p>
                    <ul>
                        <li>Αυτή η επιβεβαίωση απαιτείται σύμφωνα με το GDPR</li>
                        <li>Το email αυτό καταγράφεται για λόγους audit trail</li>
                        <li>Η επιβεβαίωση δεν μπορεί να ανακληθεί μετά την ολοκλήρωση</li>
                        <li>Σε περίπτωση μη επιβεβαίωσης, η νομική αποδοχή δεν θα ισχύει</li>
                    </ul>
                </div>

                <p><strong>Σε περίπτωση που δεν πραγματοποιήσατε εσείς αυτή την αίτηση:</strong></p>
                <p>Παρακαλούμε αγνοήστε αυτό το email και επικοινωνήστε μαζί μας άμεσα στο support@erasmos.gr</p>
            </div>

            <div class="footer">
                <p><strong>Erasmos - Πλατφόρμα Επεξεργασίας Προσωπικών Δεδομένων</strong></p>
                <p>Αυτό το email στάλθηκε αυτόματα. Παρακαλούμε μην απαντήσετε σε αυτό το μήνυμα.</p>
                <p>Για υποστήριξη: support@erasmos.gr</p>
                <p style="font-size: 0.8rem; margin-top: 15px;">
                    © ${new Date().getFullYear()} Erasmos. Όλα τα δικαιώματα διατηρούνται.
                    <br>Αυτό το email αποτελεί μέρος της νομικής διαδικασίας GDPR.
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Generate plain text email content
  generateLegalVerificationEmailText(verificationUrl, acceptanceId) {
    return `
ΕΠΙΒΕΒΑΙΩΣΗ ΝΟΜΙΚΗΣ ΑΠΟΔΟΧΗΣ - ERASMOS

Αγαπητέ χρήστη,

Λάβαμε την αίτησή σας για νομική αποδοχή των όρων και των συμφωνιών της πλατφόρμας Erasmos.

⚠️ ΣΗΜΑΝΤΙΚΟ - ΝΟΜΙΚΗ ΕΠΙΒΕΒΑΙΩΣΗ
Αυτό το email αποτελεί μέρος της νομικής διαδικασίας. Η επιβεβαίωση αποδεικνύει ότι έχετε πρόσβαση στη διεύθυνση email που δηλώσατε.

Για να ολοκληρώσετε τη διαδικασία, παρακαλούμε κάντε κλικ στον παρακάτω σύνδεσμο:

${verificationUrl}

ΣΤΟΙΧΕΙΑ ΑΠΟΔΟΧΗΣ:
- ID Αποδοχής: ${acceptanceId}
- Ημερομηνία: ${new Date().toLocaleString('el-GR', { timeZone: 'Europe/Athens' })}
- Χρόνος Λήξης: 24 ώρες

ΝΟΜΙΚΕΣ ΠΛΗΡΟΦΟΡΙΕΣ:
- Αυτή η επιβεβαίωση απαιτείται σύμφωνα με το GDPR
- Το email αυτό καταγράφεται για λόγους audit trail
- Η επιβεβαίωση δεν μπορεί να ανακληθεί μετά την ολοκλήρωση

Σε περίπτωση που δεν πραγματοποιήσατε εσείς αυτή την αίτηση, παρακαλούμε αγνοήστε αυτό το email και επικοινωνήστε μαζί μας στο support@erasmos.gr

---
Erasmos - Πλατφόρμα Επεξεργασίας Προσωπικών Δεδομένων
Για υποστήριξη: support@erasmos.gr

© ${new Date().getFullYear()} Erasmos. Αυτό το email αποτελεί μέρος της νομικής διαδικασίας GDPR.
    `;
  }

  // Log email verification attempt
  async logEmailVerification(email, token, acceptanceId, status, errorMessage = null) {
    try {
      await db.query(`
        INSERT INTO legal_email_verifications (
          acceptance_id, email, verification_token, status,
          sent_at, error_message, ip_address
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        acceptanceId,
        email,
        token,
        status,
        new Date(),
        errorMessage,
        'system' // Could be enhanced to capture actual IP
      ]);
    } catch (error) {
      console.error('[EMAIL VERIFICATION] Failed to log email verification:', error);
    }
  }

  // Verify email token
  async verifyEmailToken(token) {
    try {
      const result = await db.query(`
        SELECT ev.*, la.user_id, la.user_email
        FROM legal_email_verifications ev
        JOIN legal_acceptances la ON ev.acceptance_id = la.id
        WHERE ev.verification_token = $1
        AND ev.status = 'sent'
        AND ev.verified_at IS NULL
        AND ev.sent_at > NOW() - INTERVAL '24 hours'
      `, [token]);

      if (result.rows.length === 0) {
        throw new Error('Μη έγκυρο ή ληγμένο token επιβεβαίωσης');
      }

      const verification = result.rows[0];

      // Mark as verified
      await db.query(`
        UPDATE legal_email_verifications
        SET verified_at = NOW(), status = 'verified'
        WHERE id = $1
      `, [verification.id]);

      // Update legal acceptance as email verified
      await db.query(`
        UPDATE legal_acceptances
        SET email_verified = true, email_verified_at = NOW()
        WHERE id = $1
      `, [verification.acceptance_id]);

      // Log verification action
      await db.query(`
        INSERT INTO legal_action_logs (
          user_id, action_type, action_details, ip_address, timestamp
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
        verification.user_id,
        'email_verified',
        JSON.stringify({
          acceptanceId: verification.acceptance_id,
          verificationToken: token,
          verifiedAt: new Date().toISOString()
        }),
        'system',
        new Date()
      ]);

      console.log(`[EMAIL VERIFICATION] Email verified for acceptance ID: ${verification.acceptance_id}`);

      return {
        success: true,
        acceptanceId: verification.acceptance_id,
        userId: verification.user_id,
        verifiedAt: new Date()
      };

    } catch (error) {
      console.error('[EMAIL VERIFICATION] Email verification failed:', error);
      throw error;
    }
  }

  // Send reminder email if not verified within timeframe
  async sendVerificationReminder(userEmail, verificationToken, acceptanceId) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/legal/verify?token=${verificationToken}`;

      const mailOptions = {
        from: `"Erasmos - Υπενθύμιση" <${process.env.SMTP_FROM || 'noreply@erasmos.gr'}>`,
        to: userEmail,
        subject: '⏰ Υπενθύμιση: Επιβεβαίωση Νομικής Αποδοχής - Erasmos',
        html: this.generateReminderEmailHTML(verificationUrl, acceptanceId),
        text: this.generateReminderEmailText(verificationUrl, acceptanceId)
      };

      await this.transporter.sendMail(mailOptions);
      await this.logEmailVerification(userEmail, verificationToken, acceptanceId, 'reminder_sent');

      console.log(`[EMAIL VERIFICATION] Reminder email sent to ${userEmail}`);
    } catch (error) {
      console.error('[EMAIL VERIFICATION] Failed to send reminder email:', error);
      throw error;
    }
  }

  generateReminderEmailHTML(verificationUrl, acceptanceId) {
    return `
    <!DOCTYPE html>
    <html lang="el">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Υπενθύμιση Επιβεβαίωσης</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
            .container { background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); }
            .header { text-align: center; margin-bottom: 20px; color: #f59e0b; }
            .urgent-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .verification-button { display: inline-block; background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>⏰ ΥΠΕΝΘΥΜΙΣΗ ΕΠΙΒΕΒΑΙΩΣΗΣ</h1>
            </div>

            <div class="urgent-box">
                <h3>🚨 ΑΠΑΙΤΕΙΤΑΙ ΑΜΕΣΗ ΕΝΕΡΓΕΙΑ</h3>
                <p>Η νομική σας αποδοχή (ID: ${acceptanceId}) δεν έχει επιβεβαιωθεί ακόμα μέσω email.</p>
                <p><strong>Χρόνος που απομένει: Λιγότερες από 24 ώρες</strong></p>
            </div>

            <div style="text-align: center;">
                <a href="${verificationUrl}" class="verification-button">
                    🔴 ΕΠΕΙΓΟΥΣΑ ΕΠΙΒΕΒΑΙΩΣΗ
                </a>
            </div>

            <p><strong>Σημαντικό:</strong> Χωρίς αυτή την επιβεβαίωση, η νομική σας αποδοχή δεν θα ισχύει και δεν θα μπορείτε να χρησιμοποιήσετε την πλατφόρμα.</p>
        </div>
    </body>
    </html>
    `;
  }

  generateReminderEmailText(verificationUrl, acceptanceId) {
    return `
⏰ ΥΠΕΝΘΥΜΙΣΗ ΕΠΙΒΕΒΑΙΩΣΗΣ - ERASMOS

🚨 ΑΠΑΙΤΕΙΤΑΙ ΑΜΕΣΗ ΕΝΕΡΓΕΙΑ

Η νομική σας αποδοχή (ID: ${acceptanceId}) δεν έχει επιβεβαιωθεί ακόμα μέσω email.

Χρόνος που απομένει: Λιγότερες από 24 ώρες

Παρακαλούμε επιβεβαιώστε άμεσα κάνοντας κλικ στον σύνδεσμο:
${verificationUrl}

ΣΗΜΑΝΤΙΚΟ: Χωρίς αυτή την επιβεβαίωση, η νομική σας αποδοχή δεν θα ισχύει.

---
Erasmos Support: support@erasmos.gr
    `;
  }

  // Check for unverified emails and send reminders
  async sendPendingReminders() {
    try {
      const unverifiedEmails = await db.query(`
        SELECT ev.*, la.user_email, la.user_id
        FROM legal_email_verifications ev
        JOIN legal_acceptances la ON ev.acceptance_id = la.id
        WHERE ev.status = 'sent'
        AND ev.verified_at IS NULL
        AND ev.sent_at BETWEEN NOW() - INTERVAL '23 hours' AND NOW() - INTERVAL '12 hours'
        AND ev.reminder_sent_at IS NULL
      `);

      for (const verification of unverifiedEmails.rows) {
        await this.sendVerificationReminder(
          verification.user_email,
          verification.verification_token,
          verification.acceptance_id
        );

        // Mark reminder as sent
        await db.query(`
          UPDATE legal_email_verifications
          SET reminder_sent_at = NOW()
          WHERE id = $1
        `, [verification.id]);
      }

      console.log(`[EMAIL VERIFICATION] Sent ${unverifiedEmails.rows.length} reminder emails`);
    } catch (error) {
      console.error('[EMAIL VERIFICATION] Failed to send pending reminders:', error);
    }
  }
}

module.exports = new EmailVerificationService();