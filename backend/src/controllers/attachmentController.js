const pool = require('../config/db');

// (Σημείωση: Η λογική του upload θα προστεθεί εδώ όταν συνδέσουμε το multer)

// --- GET ALL ATTACHMENTS FOR AN APPLICATION ---
const getAttachments = async (req, res) => {
    const { applicationId } = req.params;
    try {
        const query = "SELECT id, file_name, created_at FROM attachments WHERE application_id = $1 ORDER BY created_at DESC";
        const result = await pool.query(query, [applicationId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- DELETE AN ATTACHMENT ---
const deleteAttachment = async (req, res) => {
    const { id } = req.params;
    // (Εδώ θα έπρεπε να υπάρχει και λογική διαγραφής του αρχείου από το cloud)
    try {
        await pool.query("DELETE FROM attachments WHERE id = $1", [id]);
        res.json({ message: 'Attachment deleted successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getAttachments,
    deleteAttachment
};