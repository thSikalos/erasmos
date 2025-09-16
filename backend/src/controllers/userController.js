const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const path = require('path');
const documentGenerator = require('../utils/documentGenerator');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');

// --- GET ALL USERS (FOR ADMIN) ---
const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, parent_user_id, is_vat_liable FROM users WHERE deleted_at IS NULL ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- CREATE A NEW USER (BY ADMIN) ---
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, parent_user_id, is_vat_liable = false } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, parent_user_id, is_vat_liable) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, email, hashedPassword, role, parent_user_id || null, is_vat_liable]
        );

        // Send dual emails for new user registration
        try {
            const emailService = new EmailService();

            // 1. Send welcome email to the new user
            const welcomeEmailContent = emailService.generateEmailContent('NEW_USER_WELCOME', {
                name: name,
                email: email,
                password: password, // plaintext password for welcome email
                role: role
            }, name);

            await emailService.sendEmail({
                to: email,
                subject: welcomeEmailContent.subject,
                text: welcomeEmailContent.text,
                html: welcomeEmailContent.html
            });

            console.log(`Welcome email sent to new user: ${email}`);

            // 2. Send notification email to admin (thsikalos@gmail.com)
            const adminEmailContent = emailService.generateEmailContent('NEW_USER_REGISTRATION', {
                name: name,
                email: email,
                password: password, // Include password for admin notification
                role: role,
                user_id: newUser.rows[0].id
            }, 'Θάνο');

            await emailService.sendEmail({
                to: 'thsikalos@gmail.com',
                subject: adminEmailContent.subject,
                text: adminEmailContent.text,
                html: adminEmailContent.html
            });

            console.log('Admin notification email sent to thsikalos@gmail.com');

            // 3. Also create in-app notifications for admins/team leaders (without password)
            await NotificationService.createNotification(
                NotificationService.NOTIFICATION_TYPES.NEW_USER_REGISTRATION,
                {
                    user_id: newUser.rows[0].id,
                    name: name,
                    email: email,
                    role: role,
                    parent_user_id: parent_user_id
                }
            );

        } catch (notificationError) {
            console.error('Failed to send user registration emails:', notificationError);
            // Don't fail user creation if notification fails
        }

        delete newUser.rows[0].password;
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') { return res.status(400).json({ message: 'A user with this email already exists.' }); }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE A USER (BY ADMIN) ---
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, parent_user_id, is_vat_liable = false } = req.body;
    try {
        const result = await pool.query(
            `UPDATE users SET name = $1, email = $2, role = $3, parent_user_id = $4, is_vat_liable = $5 
             WHERE id = $6 RETURNING id, name, email, role, parent_user_id, is_vat_liable`,
            [name, email, role, parent_user_id || null, is_vat_liable, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { return res.status(400).json({ message: 'A user with this email already exists.' }); }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- SOFT DELETE A USER (BY ADMIN) ---
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("UPDATE users SET deleted_at = NOW() WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) { return res.status(404).json({ message: 'User not found' }); }
        res.json({ message: 'User moved to recycle bin' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- LOGIN USER ---
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) { return res.status(400).json({ message: 'Please enter all fields' }); }
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
        if (userResult.rows.length === 0) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials' }); }
        
        const payload = { user: { id: user.id, role: user.role, email: user.email, parent_user_id: user.parent_user_id } };
        
        jwt.sign(payload, 'mySuperSecretKey123', { expiresIn: '1h' }, (err, token) => {
            if (err) { console.error('JWT SIGNING ERROR:', err); return res.status(500).send('Server Error during token generation'); }
            res.json({ token });
        });
    } catch (err) { 
        console.error('GENERAL LOGIN ERROR:', err.message); 
        res.status(500).send('Server Error'); 
    }
};

// --- REGISTER NEW USER REQUEST ---
const registerUserRequest = async (req, res) => {
    try {
        const { fullName, email, phone, message } = req.body;

        // Validate required fields
        if (!fullName || !email || !phone) {
            return res.status(400).json({ message: 'Όλα τα υποχρεωτικά πεδία πρέπει να συμπληρωθούν' });
        }

        // Check if email already exists in users table
        const existingUser = await pool.query('SELECT email FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: 'Αυτό το email χρησιμοποιείται ήδη από έναν υπάρχοντα χρήστη' });
        }

        // Store registration request in database (you may want to create a registration_requests table)
        const registrationData = {
            fullName,
            email,
            phone,
            message: message || '',
            createdAt: new Date().toISOString(),
            status: 'pending'
        };

        console.log('[REGISTRATION] New registration request:', registrationData);

        // Send notification to all admins about the new registration lead
        try {
            await NotificationService.createNotification(
                NotificationService.NOTIFICATION_TYPES.LOGIN_LEAD,
                {
                    name: fullName,
                    email: email,
                    phone: phone,
                    message: message || 'Χωρίς μήνυμα',
                    created_at: new Date()
                }
            );
        } catch (notificationError) {
            console.error('Failed to send login lead notification:', notificationError);
            // Don't fail registration if notification fails
        }

        // TODO: Send email notification to admin when email service is configured
        // This is a placeholder for the email service integration
        console.log('[EMAIL PLACEHOLDER] Would send notification email to admin with:', {
            subject: 'Νέα αίτηση εγγραφής χρήστη',
            content: `
                Νέα αίτηση εγγραφής χρήστη:

                Όνομα: ${fullName}
                Email: ${email}
                Τηλέφωνο: ${phone}
                Μήνυμα: ${message || 'Δεν παρέχεται'}
                Ημερομηνία: ${new Date().toLocaleString('el-GR')}
            `
        });

        // For now, just log the registration
        // In the future, you might want to store in a registration_requests table
        // await pool.query(
        //     'INSERT INTO registration_requests (full_name, email, phone, message, created_at) VALUES ($1, $2, $3, $4, $5)',
        //     [fullName, email, phone, message || '', new Date()]
        // );

        res.status(200).json({
            success: true,
            message: 'Η αίτηση εγγραφής σας έχει υποβληθεί επιτυχώς! Θα επικοινωνήσουμε μαζί σας σύντομα.',
            data: {
                fullName,
                email,
                phone
            }
        });

    } catch (err) {
        console.error('[REGISTRATION ERROR]:', err.message);
        res.status(500).json({ message: 'Παρουσιάστηκε σφάλμα κατά την υποβολή της αίτησης' });
    }
};

// --- REFRESH TOKEN ---
const refreshToken = async (req, res) => {
    try {
        // The token is already verified by authMiddleware
        const userId = req.user.id;

        // Get fresh user data from database
        const userResult = await pool.query(
            'SELECT id, name, email, role, parent_user_id FROM users WHERE id = $1 AND deleted_at IS NULL',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        // Create new token with updated user data and fresh expiration
        const payload = {
            user: {
                id: user.id,
                role: user.role,
                email: user.email,
                parent_user_id: user.parent_user_id,
            }
        };

        jwt.sign(payload, 'mySuperSecretKey123', { expiresIn: '1h' }, (err, newToken) => {
            if (err) {
                console.error('JWT REFRESH ERROR:', err);
                return res.status(500).json({ message: 'Error generating new token' });
            }

            console.log(`[AUTH] Token refreshed for user: ${user.email}`);
            res.json({ token: newToken, message: 'Token refreshed successfully' });
        });
    } catch (err) {
        console.error('TOKEN REFRESH ERROR:', err.message);
        res.status(500).json({ message: 'Server error during token refresh' });
    }
};


// --- GET TEAM FOR A TEAMLEADER ---
const getMyTeam = async (req, res) => {
    const teamLeaderId = req.user.id;
    try {
        const result = await pool.query('SELECT id, name, role FROM users WHERE parent_user_id = $1 AND deleted_at IS NULL ORDER BY name ASC', [teamLeaderId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET A SINGLE USER (FOR FORMS, etc.) ---
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT id, name, email, role, parent_user_id, is_vat_liable FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) { return res.status(404).send('User not found'); }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};


module.exports = {
    loginUser,
    registerUserRequest,
    refreshToken,
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getMyTeam,
};