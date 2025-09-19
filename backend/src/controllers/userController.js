const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const path = require('path');
const documentGenerator = require('../utils/documentGenerator');
const NotificationService = require('../services/notificationService');
const EmailService = require('../services/emailService');

// --- GET ALL USERS (FOR ADMIN) ---
const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, parent_user_id, is_vat_liable, is_active FROM users WHERE deleted_at IS NULL ORDER BY name ASC');
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

        // Check if user is active
        if (!user.is_active) {
            return res.status(403).json({
                message: 'Ο λογαριασμός σας έχει απενεργοποιηθεί. Επικοινωνήστε με τον διαχειριστή.',
                code: 'ACCOUNT_DEACTIVATED'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials' }); }
        
        const payload = { user: { id: user.id, role: user.role, email: user.email, name: user.name, parent_user_id: user.parent_user_id } };
        
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
                name: user.name,
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

// --- FORGOT PASSWORD ---
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Παρακαλώ εισάγετε το email σας' });
        }

        // Check if user exists
        const userResult = await pool.query(
            'SELECT id, name, email FROM users WHERE email = $1 AND deleted_at IS NULL',
            [email]
        );

        if (userResult.rows.length === 0) {
            // Return success even if user doesn't exist for security reasons
            return res.status(200).json({
                message: 'Αν το email υπάρχει στο σύστημα, θα λάβετε οδηγίες επαναφοράς κωδικού'
            });
        }

        const user = userResult.rows[0];

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

        // Store token and expiration in database
        await pool.query(
            'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3',
            [resetToken, resetExpires, user.id]
        );

        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

        // Send email
        try {
            const emailService = new EmailService();
            const emailContent = emailService.generateEmailContent('PASSWORD_RESET', {
                name: user.name,
                resetUrl: resetUrl
            }, user.name);

            await emailService.sendEmail({
                to: user.email,
                subject: emailContent.subject,
                text: emailContent.text,
                html: emailContent.html
            });

            console.log(`[PASSWORD_RESET] Reset email sent to: ${user.email}`);

            res.status(200).json({
                message: 'Αν το email υπάρχει στο σύστημα, θα λάβετε οδηγίες επαναφοράς κωδικού'
            });

        } catch (emailError) {
            console.error('[PASSWORD_RESET] Failed to send email:', emailError);
            // Clear the token if email fails
            await pool.query(
                'UPDATE users SET password_reset_token = NULL, password_reset_expires = NULL WHERE id = $1',
                [user.id]
            );

            res.status(500).json({
                message: 'Παρουσιάστηκε σφάλμα κατά την αποστολή email. Παρακαλώ δοκιμάστε ξανά'
            });
        }

    } catch (err) {
        console.error('[FORGOT_PASSWORD] Error:', err.message);
        res.status(500).json({ message: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά' });
    }
};

// --- RESET PASSWORD ---
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Απαιτούνται όλα τα πεδία' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' });
        }

        // Find user by token and check if token is not expired
        const userResult = await pool.query(
            'SELECT id, name, email FROM users WHERE password_reset_token = $1 AND password_reset_expires > NOW() AND deleted_at IS NULL',
            [token]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({
                message: 'Το token επαναφοράς είναι άκυρο ή έχει λήξει. Παρακαλώ ζητήστε νέο link επαναφοράς'
            });
        }

        const user = userResult.rows[0];

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password and clear reset token
        await pool.query(
            'UPDATE users SET password = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2',
            [hashedPassword, user.id]
        );

        console.log(`[PASSWORD_RESET] Password successfully reset for user: ${user.email}`);

        res.status(200).json({
            message: 'Ο κωδικός σας επαναφέρθηκε επιτυχώς. Μπορείτε τώρα να συνδεθείτε με τον νέο κωδικό'
        });

    } catch (err) {
        console.error('[RESET_PASSWORD] Error:', err.message);
        res.status(500).json({ message: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά' });
    }
};

// --- CHANGE PASSWORD (for logged-in users) ---
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Απαιτούνται όλα τα πεδία' });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες' });
        }

        // Get user's current password
        const userResult = await pool.query(
            'SELECT id, password FROM users WHERE id = $1 AND deleted_at IS NULL',
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'Χρήστης δεν βρέθηκε' });
        }

        const user = userResult.rows[0];

        // Verify current password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return res.status(400).json({ message: 'Ο τρέχων κωδικός είναι λανθασμένος' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Update password
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedNewPassword, userId]
        );

        console.log(`[CHANGE_PASSWORD] Password successfully changed for user ID: ${userId}`);

        res.status(200).json({
            message: 'Ο κωδικός σας άλλαξε επιτυχώς'
        });

    } catch (err) {
        console.error('[CHANGE_PASSWORD] Error:', err.message);
        res.status(500).json({ message: 'Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά' });
    }
};

// --- GET ALL TEAM LEADERS WITH TEAM INFO ---
const getAllTeamLeaders = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.role,
                u.parent_user_id,
                u.is_active,
                u.is_vat_liable,
                COUNT(tm.id) as team_member_count,
                COUNT(CASE WHEN tm.is_active = true THEN 1 END) as active_team_members,
                ARRAY_AGG(
                    CASE WHEN tm.id IS NOT NULL
                    THEN json_build_object(
                        'id', tm.id,
                        'name', tm.name,
                        'email', tm.email,
                        'role', tm.role,
                        'is_active', tm.is_active
                    ) END
                ) FILTER (WHERE tm.id IS NOT NULL) as team_members
            FROM users u
            LEFT JOIN users tm ON u.id = tm.parent_user_id AND tm.deleted_at IS NULL
            WHERE u.role IN ('TeamLeader', 'Admin')
            AND u.deleted_at IS NULL
            GROUP BY u.id, u.name, u.email, u.role, u.parent_user_id, u.is_active, u.is_vat_liable
            ORDER BY u.name ASC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error('Get team leaders error:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- TOGGLE USER ACTIVE STATUS ---
const toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    try {
        // Get current user status
        const userResult = await pool.query('SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];
        const newStatus = !user.is_active;

        // Update user status
        const result = await pool.query(
            'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, role, is_active',
            [newStatus, id]
        );

        // Log the action
        console.log(`User ${user.name} (${user.email}) status changed to: ${newStatus ? 'Active' : 'Inactive'}`);

        // Create notification for admins about the status change
        try {
            await NotificationService.createNotification(
                'USER_STATUS_CHANGE',
                {
                    user_id: user.id,
                    user_name: user.name,
                    user_email: user.email,
                    new_status: newStatus ? 'Ενεργός' : 'Απενεργοποιημένος',
                    changed_by: req.user.name || 'Admin'
                }
            );
        } catch (notificationError) {
            console.error('Failed to send status change notification:', notificationError);
        }

        res.json({
            message: `User status updated successfully to ${newStatus ? 'Active' : 'Inactive'}`,
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Toggle user status error:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- TOGGLE TEAM STATUS (TEAM LEADER + ALL TEAM MEMBERS) ---
const toggleTeamStatus = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get team leader info
        const teamLeaderResult = await client.query(
            'SELECT id, name, email, role, is_active FROM users WHERE id = $1 AND deleted_at IS NULL AND role IN (\'TeamLeader\', \'Admin\')',
            [id]
        );

        if (teamLeaderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Team Leader not found' });
        }

        const teamLeader = teamLeaderResult.rows[0];
        const newStatus = !teamLeader.is_active;

        // Get all team members (including nested team members)
        const teamMembersResult = await client.query(`
            WITH RECURSIVE team_hierarchy AS (
                -- Base case: direct team members
                SELECT id, name, email, role, parent_user_id, is_active, 1 as level
                FROM users
                WHERE parent_user_id = $1 AND deleted_at IS NULL

                UNION ALL

                -- Recursive case: team members of team members
                SELECT u.id, u.name, u.email, u.role, u.parent_user_id, u.is_active, th.level + 1
                FROM users u
                INNER JOIN team_hierarchy th ON u.parent_user_id = th.id
                WHERE u.deleted_at IS NULL AND th.level < 10 -- Prevent infinite recursion
            )
            SELECT id, name, email, role, is_active, level FROM team_hierarchy
            ORDER BY level, name
        `, [id]);

        // Update team leader status
        await client.query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, id]);

        // Update all team members status
        const teamMemberIds = teamMembersResult.rows.map(member => member.id);
        if (teamMemberIds.length > 0) {
            await client.query(
                `UPDATE users SET is_active = $1 WHERE id = ANY($2::int[])`,
                [newStatus, teamMemberIds]
            );
        }

        await client.query('COMMIT');

        // Log the action
        console.log(`Team Leader ${teamLeader.name} and ${teamMemberIds.length} team members status changed to: ${newStatus ? 'Active' : 'Inactive'}`);

        // Create notification for admins about the team status change
        try {
            await NotificationService.createNotification(
                'TEAM_STATUS_CHANGE',
                {
                    team_leader_id: teamLeader.id,
                    team_leader_name: teamLeader.name,
                    team_leader_email: teamLeader.email,
                    affected_members_count: teamMemberIds.length,
                    new_status: newStatus ? 'Ενεργή' : 'Απενεργοποιημένη',
                    changed_by: req.user.name || 'Admin'
                }
            );
        } catch (notificationError) {
            console.error('Failed to send team status change notification:', notificationError);
        }

        res.json({
            message: `Team status updated successfully to ${newStatus ? 'Active' : 'Inactive'}`,
            team_leader: { ...teamLeader, is_active: newStatus },
            affected_members: teamMemberIds.length,
            team_members: teamMembersResult.rows.map(member => ({ ...member, is_active: newStatus }))
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Toggle team status error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET TEAM HIERARCHY FOR A SPECIFIC TEAM LEADER ---
const getTeamHierarchy = async (req, res) => {
    const { id } = req.params;
    try {
        // Get team leader info
        const teamLeaderResult = await pool.query(
            'SELECT id, name, email, role, is_active, parent_user_id FROM users WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (teamLeaderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Team Leader not found' });
        }

        // Get recursive team hierarchy
        const hierarchyResult = await pool.query(`
            WITH RECURSIVE team_hierarchy AS (
                -- Base case: the team leader
                SELECT id, name, email, role, parent_user_id, is_active, 0 as level,
                       ARRAY[id] as path, CAST(name AS TEXT) as hierarchy_path
                FROM users
                WHERE id = $1 AND deleted_at IS NULL

                UNION ALL

                -- Recursive case: team members
                SELECT u.id, u.name, u.email, u.role, u.parent_user_id, u.is_active, th.level + 1,
                       th.path || u.id, th.hierarchy_path || ' → ' || u.name
                FROM users u
                INNER JOIN team_hierarchy th ON u.parent_user_id = th.id
                WHERE u.deleted_at IS NULL AND th.level < 10 -- Prevent infinite recursion
            )
            SELECT * FROM team_hierarchy
            ORDER BY level, name
        `, [id]);

        res.json({
            team_leader: teamLeaderResult.rows[0],
            hierarchy: hierarchyResult.rows
        });
    } catch (err) {
        console.error('Get team hierarchy error:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- TOGGLE SUB-TEAM STATUS (USER + THEIR DIRECT SUBTREE ONLY) ---
const toggleSubTeamStatus = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Get user info (can be any user, not just team leaders)
        const userResult = await client.query(
            'SELECT id, name, email, role, is_active, parent_user_id FROM users WHERE id = $1 AND deleted_at IS NULL',
            [id]
        );

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];
        const newStatus = !user.is_active;

        // Check if user has a parent who is inactive (validation)
        if (newStatus && user.parent_user_id) {
            const parentResult = await client.query(
                'SELECT is_active FROM users WHERE id = $1 AND deleted_at IS NULL',
                [user.parent_user_id]
            );

            if (parentResult.rows.length > 0 && !parentResult.rows[0].is_active) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    message: 'Δεν μπορείτε να ενεργοποιήσετε χρήστη όταν ο προϊστάμενός του είναι απενεργοποιημένος. Ενεργοποιήστε πρώτα τον προϊστάμενο.'
                });
            }
        }

        // Get only direct children (not recursive)
        const directChildrenResult = await client.query(
            'SELECT id, name, email, role, is_active FROM users WHERE parent_user_id = $1 AND deleted_at IS NULL',
            [id]
        );

        // Update the user's status
        await client.query('UPDATE users SET is_active = $1 WHERE id = $2', [newStatus, id]);

        // If deactivating, also deactivate all direct children
        const directChildrenIds = directChildrenResult.rows.map(child => child.id);
        if (!newStatus && directChildrenIds.length > 0) {
            await client.query(
                'UPDATE users SET is_active = false WHERE id = ANY($1::int[])',
                [directChildrenIds]
            );
        }

        await client.query('COMMIT');

        // Log the action
        console.log(`User ${user.name} and ${directChildrenIds.length} direct children status changed to: ${newStatus ? 'Active' : 'Inactive'}`);

        // Create notification for admins about the sub-team status change
        try {
            await NotificationService.createNotification(
                'SUBTEAM_STATUS_CHANGE',
                {
                    user_id: user.id,
                    user_name: user.name,
                    user_email: user.email,
                    affected_direct_children: directChildrenIds.length,
                    new_status: newStatus ? 'Ενεργή' : 'Απενεργοποιημένη',
                    changed_by: req.user.name || 'Admin'
                }
            );
        } catch (notificationError) {
            console.error('Failed to send sub-team status change notification:', notificationError);
        }

        res.json({
            message: `Sub-team status updated successfully to ${newStatus ? 'Active' : 'Inactive'}`,
            user: { ...user, is_active: newStatus },
            affected_direct_children: directChildrenIds.length,
            direct_children: directChildrenResult.rows.map(child => ({ ...child, is_active: newStatus ? child.is_active : false }))
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Toggle sub-team status error:', err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};


module.exports = {
    loginUser,
    registerUserRequest,
    refreshToken,
    createUser,
    getAllUsers,
    getAllTeamLeaders,
    getUserById,
    updateUser,
    deleteUser,
    getMyTeam,
    toggleUserStatus,
    toggleTeamStatus,
    toggleSubTeamStatus,
    getTeamHierarchy,
    forgotPassword,
    resetPassword,
    changePassword,
};