const pool = require('../config/db');

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

// --- PREPARE VIBER MONTHLY SUMMARY DRAFTS ---
const prepareViberSummary = async (req, res) => {
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
                    INSERT INTO notifications (user_id, message, status, channel)
                    VALUES ($1, $2, 'draft', 'viber') RETURNING *`;
                const draftRes = await client.query(insertQuery, [teamLeaderId, message]);
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

// --- GET DRAFT VIBER NOTIFICATIONS ---
const getDraftViberNotifications = async(req, res) => {
    const userId = req.user.id;
    try {
        const query = "SELECT * FROM notifications WHERE user_id = $1 AND channel = 'viber' AND status = 'draft' ORDER BY created_at DESC";
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- SEND A NOTIFICATION (SIMULATED) ---
const sendNotification = async (req, res) => {
    const { id } = req.params;
    try {
        const notificationRes = await pool.query("SELECT * FROM notifications WHERE id = $1", [id]);
        if (notificationRes.rows.length === 0) return res.status(404).json({ message: 'Notification not found' });
       
        const notification = notificationRes.rows[0];
        if (notification.channel === 'viber') {
            console.log(`---- SIMULATING VIBER SEND ----`);
            console.log(`MESSAGE: ${notification.message}`);
            console.log(`-------------------------------`);
        }
       
        await pool.query("UPDATE notifications SET status = 'sent' WHERE id = $1", [id]);
        res.json({ message: 'Notification marked as sent.'});
    } catch (err) {
        await pool.query("UPDATE notifications SET status = 'failed' WHERE id = $1", [id]);
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getMyNotifications,
    markAsRead,
    markAllAsRead,
    prepareViberSummary,
    getDraftViberNotifications,
    sendNotification
};