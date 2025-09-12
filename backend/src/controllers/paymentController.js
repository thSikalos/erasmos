const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// --- GENERATE PDF FOR A STATEMENT (SMART VERSION) ---
const generateStatementPdf = async (req, res) => {
    const { id } = req.params;
    try {
        // Παίρνουμε όλα τα δεδομένα
        const statementQuery = `
            SELECT ps.*,
                   c.name as creator_name, c.afm as creator_afm, c.address as creator_address, c.profession as creator_profession,
                   r.name as recipient_name, r.email as recipient_email, r.phone as recipient_phone
            FROM payment_statements ps
            JOIN users c ON ps.creator_id = c.id
            JOIN users r ON ps.recipient_id = r.id
            WHERE ps.id = $1
        `;
        const statementRes = await pool.query(statementQuery, [id]);
        if (statementRes.rows.length === 0) {
            return res.status(404).send('Statement not found');
        }
        const statement = statementRes.rows[0];
        const itemsQuery = `
            SELECT a.id, c.full_name as customer_name, a.total_commission
            FROM statement_items si
            JOIN applications a ON si.application_id = a.id
            JOIN customers c ON a.customer_id = c.id
            WHERE si.statement_id = $1
        `;
        const itemsRes = await pool.query(itemsQuery, [id]);
        const items = itemsRes.rows;
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="statement-${id}.pdf"`);
        doc.pipe(res);
        const fontPath = path.join(__dirname, '../assets/Roboto-Regular.ttf');
        doc.registerFont('Roboto', fontPath);
        doc.font('Roboto');
        doc.fontSize(20).text(`ΤΑΜΕΙΑΚΗ ΚΑΤΑΣΤΑΣΗ #${statement.id}`, { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Ημερομηνία Έκδοσης: ${new Date(statement.created_at).toLocaleDateString('el-GR')}`);
        doc.moveDown(2);
        doc.text('ΑΠΟ (Ομαδάρχης):', { underline: true });
        doc.text(statement.creator_name || '');
        if(statement.creator_profession) doc.text(statement.creator_profession);
        if(statement.creator_address) doc.text(statement.creator_address);
        if(statement.creator_afm) doc.text(`ΑΦΜ: ${statement.creator_afm}`);
        doc.moveDown();
       
        doc.text('ΠΡΟΣ (Συνεργάτης):', { underline: true });
        doc.text(statement.recipient_name || '');
        if(statement.recipient_email) doc.text(statement.recipient_email);
        // --- ΕΞΥΠΝΟΣ ΕΛΕΓΧΟΣ ---
        // Τυπώνει το τηλέφωνο μόνο αν υπάρχει
        if(statement.recipient_phone) doc.text(`Τηλέφωνο: ${statement.recipient_phone}`);
        doc.moveDown(2);
        doc.fontSize(14).text('Ανάλυση Αμοιβών:', { underline: true });
        doc.moveDown();
        items.forEach(item => {
            doc.fontSize(10).text(`- Αίτηση #${item.id} (${item.customer_name}): ${parseFloat(item.total_commission).toFixed(2)} €`);
        });
        doc.moveDown(2);
        doc.fontSize(12).font('Roboto');
        doc.text(`Καθαρό Ποσό: ${parseFloat(statement.subtotal).toFixed(2)} €`, { align: 'right' });
        if(parseFloat(statement.vat_amount) > 0) {
            doc.text(`ΦΠΑ (24%): ${parseFloat(statement.vat_amount).toFixed(2)} €`, { align: 'right' });
        }
        doc.moveDown();
        doc.fontSize(14).text(`ΣΥΝΟΛΙΚΟ ΠΟΣΟ: ${parseFloat(statement.total_amount).toFixed(2)} €`, { align: 'right' });
        doc.end();
    } catch (err) {
        console.error("PDF Generation Error:", err.message);
        res.status(500).send('Could not generate PDF');
    }
};

const createPaymentStatement = async (req, res) => {
    const { recipient_id, application_ids } = req.body;
    const creator_id = req.user.id;
    if (!application_ids || application_ids.length === 0) { return res.status(400).json({ message: 'No applications selected.' }); }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const appsCheckQuery = `SELECT id, is_paid_by_company, status, total_commission FROM applications WHERE id = ANY($1::int[]) FOR UPDATE`;
        const appsCheckResult = await client.query(appsCheckQuery, [application_ids]);
        if (appsCheckResult.rows.length !== application_ids.length) { throw new Error('One or more application IDs are invalid.'); }
        for (const app of appsCheckResult.rows) { const itemCheckQuery = "SELECT id FROM statement_items WHERE application_id = $1"; const itemCheckResult = await client.query(itemCheckQuery, [app.id]); if (itemCheckResult.rows.length > 0) { throw new Error(`Application #${app.id} is already in another statement.`); } if (!app.is_paid_by_company || app.status !== 'Καταχωρήθηκε') { throw new Error(`Application #${app.id} is not ready to be paid.`); } }
        const commissionsTotal = appsCheckResult.rows.reduce((sum, app) => sum + (app.total_commission ? parseFloat(app.total_commission) : 0), 0);
        let bonusTotal = 0;
        const activeBonusesQuery = "SELECT * FROM bonuses WHERE target_user_id = $1 AND is_active = TRUE AND start_date <= CURRENT_DATE AND end_date >= CURRENT_DATE";
        const activeBonusesRes = await client.query(activeBonusesQuery, [recipient_id]);
        for (const bonus of activeBonusesRes.rows) { const appCountQuery = "SELECT COUNT(*) FROM applications WHERE user_id = $1 AND created_at BETWEEN $2 AND $3"; const appCountRes = await client.query(appCountQuery, [recipient_id, bonus.start_date, bonus.end_date]); const appCount = parseInt(appCountRes.rows[0].count); if (appCount >= bonus.application_count_target) { const bonusEligibleAppsCount = application_ids.length; bonusTotal += bonusEligibleAppsCount * parseFloat(bonus.bonus_amount_per_application); } }
        const clawbacksQuery = "SELECT id, amount FROM clawbacks WHERE user_id = $1 AND is_settled = FALSE FOR UPDATE";
        const clawbacksResult = await client.query(clawbacksQuery, [recipient_id]);
        const clawbacksTotal = clawbacksResult.rows.reduce((sum, cb) => sum + parseFloat(cb.amount), 0);
        const subtotal = commissionsTotal + bonusTotal - clawbacksTotal;
        const userVatQuery = "SELECT is_vat_liable FROM users WHERE id = $1";
        const userVatResult = await client.query(userVatQuery, [recipient_id]);
        const isVatLiable = userVatResult.rows.length > 0 && userVatResult.rows[0].is_vat_liable;
        let vatAmount = 0;
        if (isVatLiable) { vatAmount = subtotal * 0.24; }
        const finalTotalAmount = subtotal + vatAmount;
        const statementQuery = "INSERT INTO payment_statements (creator_id, recipient_id, total_amount, subtotal, vat_amount) VALUES ($1, $2, $3, $4, $5) RETURNING id";
        const statementResult = await client.query(statementQuery, [creator_id, recipient_id, finalTotalAmount.toFixed(2), subtotal.toFixed(2), vatAmount.toFixed(2)]);
        const newStatementId = statementResult.rows[0].id;
        for (const appId of application_ids) { const itemQuery = "INSERT INTO statement_items (statement_id, application_id) VALUES ($1, $2)"; await client.query(itemQuery, [newStatementId, appId]); }
        if (clawbacksResult.rows.length > 0) { const clawbackIds = clawbacksResult.rows.map(cb => cb.id); const settleClawbacksQuery = "UPDATE clawbacks SET is_settled = TRUE WHERE id = ANY($1::int[])"; await client.query(settleClawbacksQuery, [clawbackIds]); }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Payment statement created successfully', statementId: newStatementId, subtotal, vatAmount, bonusTotal, finalTotalAmount });
    } catch (err) { await client.query('ROLLBACK'); console.error("Error in createPaymentStatement:", err.message); res.status(500).json({ message: err.message || 'An error occurred while creating the statement.' }); } finally { client.release(); }
};

const getStatements = async (req, res) => {
    const userId = req.user.id;
    const query = `
        SELECT 
            ps.*, 
            creator.name as creator_name, 
            recipient.name as recipient_name,
            COALESCE(json_agg(si.application_id) FILTER (WHERE si.application_id IS NOT NULL), '[]') as application_ids
        FROM payment_statements ps
        JOIN users creator ON ps.creator_id = creator.id
        JOIN users recipient ON ps.recipient_id = recipient.id
        LEFT JOIN statement_items si ON ps.id = si.statement_id
        WHERE ps.creator_id = $1 OR ps.recipient_id = $1
        GROUP BY ps.id, creator.name, recipient.name
        ORDER BY ps.created_at DESC
    `;
    try {
        const statements = await pool.query(query, [userId]);
        res.json(statements.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const updateStatementStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const result = await pool.query("UPDATE payment_statements SET status = $1 WHERE id = $2 RETURNING *", [status, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Statement not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const createClawback = async (req, res) => {
    const { user_id, application_id, amount, reason } = req.body;
    try {
        const newClawback = await pool.query(
            "INSERT INTO clawbacks (user_id, application_id, amount, reason) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, application_id, amount, reason]
        );
        res.status(201).json(newClawback.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { 
    createPaymentStatement,
    createClawback,
    getStatements,
    updateStatementStatus,
    generateStatementPdf
};