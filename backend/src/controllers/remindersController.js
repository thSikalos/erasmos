const pool = require('../config/db');
const NotificationService = require('../services/notificationService');

const getMyReminders = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT r.*, c.name as creator_name, a.name as assignee_name
            FROM reminders r
            JOIN users c ON r.creator_id = c.id
            JOIN users a ON r.assignee_id = a.id
            WHERE (r.creator_id = $1 OR r.assignee_id = $1)
            ORDER BY r.status ASC, r.due_date ASC
        `;
        const result = await pool.query(query, [userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const createReminder = async (req, res) => {
    const creator_id = req.user.id;
    const { assignee_id, title, due_date } = req.body;
    try {
        // --- ΕΛΕΓΧΟΣ ΔΙΚΑΙΩΜΑΤΩΝ ---
        let isAllowed = false;
        // 1. Επιτρέπεται να αναθέσει στον εαυτό του
        if (creator_id === assignee_id) {
            isAllowed = true;
        } else {
            // 2. Έλεγχος αν ο assignee είναι στην ομάδα του creator (αν ο creator είναι ομαδάρχης)
            const teamRes = await pool.query("SELECT id FROM users WHERE parent_user_id = $1", [creator_id]);
            const teamIds = teamRes.rows.map(u => u.id);
            if (teamIds.includes(assignee_id)) {
                isAllowed = true;
            } else {
                // 3. Έλεγχος αν ο assignee είναι ο προϊστάμενος του creator (αν ο creator είναι συνεργάτης)
                const creatorRes = await pool.query("SELECT parent_user_id FROM users WHERE id = $1", [creator_id]);
                if (creatorRes.rows.length > 0 && creatorRes.rows[0].parent_user_id === assignee_id) {
                    isAllowed = true;
                }
            }
        }
        if (!isAllowed) {
            return res.status(403).json({ message: "You do not have permission to assign a reminder to this user." });
        }
        // --- ΤΕΛΟΣ ΕΛΕΓΧΟΥ ---
        const newReminder = await pool.query(
            "INSERT INTO reminders (creator_id, assignee_id, title, due_date) VALUES ($1, $2, $3, $4) RETURNING *",
            [creator_id, assignee_id, title, due_date]
        );

        // Send notification for new reminder
        try {
            const creatorQuery = 'SELECT name, parent_user_id FROM users WHERE id = $1';
            const creatorResult = await pool.query(creatorQuery, [creator_id]);
            const creatorInfo = creatorResult.rows[0];

            if (creatorInfo) {
                await NotificationService.createNotification(
                    NotificationService.NOTIFICATION_TYPES.NEW_REMINDER,
                    {
                        reminder_id: newReminder.rows[0].id,
                        creator_id: creator_id,
                        creator_name: creatorInfo.name,
                        creator_parent_id: creatorInfo.parent_user_id,
                        assignee_id: assignee_id,
                        title: title,
                        due_date: due_date
                    }
                );
            }
        } catch (notificationError) {
            console.error('Failed to send reminder notification:', notificationError);
            // Don't fail reminder creation if notification fails
        }

        res.status(201).json(newReminder.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const completeReminder = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    try {
        const result = await pool.query(
            "UPDATE reminders SET status = 'completed' WHERE id = $1 AND (creator_id = $2 OR assignee_id = $2) RETURNING *",
            [id, userId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Reminder not found or you do not have permission' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getMyReminders,
    createReminder,
    completeReminder
};