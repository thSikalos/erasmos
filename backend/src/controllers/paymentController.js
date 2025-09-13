const pool = require('../config/db');
const documentGenerator = require('../utils/documentGenerator');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

// --- GENERATE PDF FOR A STATEMENT (ENTERPRISE VERSION) ---
const generateStatementPdf = async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch statement data
        const statementQuery = `
            SELECT ps.*,
                   r.name as recipient_name, r.email as recipient_email, r.phone as recipient_phone
            FROM payment_statements ps
            JOIN users r ON ps.recipient_id = r.id
            WHERE ps.id = $1
        `;
        const statementRes = await pool.query(statementQuery, [id]);
        if (statementRes.rows.length === 0) {
            return res.status(404).send('Statement not found');
        }
        const statement = statementRes.rows[0];

        // Fetch statement items with field-level details
        const itemsQuery = `
            SELECT DISTINCT
                a.id as application_id,
                c.full_name as customer_name,
                comp.name as company_name,
                CASE
                    WHEN si.field_id IS NOT NULL THEN f.label
                    ELSE 'Αίτηση'
                END as item_type,
                CASE
                    WHEN si.field_id IS NOT NULL THEN COALESCE(cf.commission_amount, 0)
                    ELSE COALESCE(a.total_commission, 0)
                END as commission_amount,
                a.id as sort_application_id,
                COALESCE(f.label, 'ZZZZZ') as sort_field_label
            FROM statement_items si
            JOIN applications a ON si.application_id = a.id
            JOIN customers c ON a.customer_id = c.id
            JOIN companies comp ON a.company_id = comp.id
            LEFT JOIN fields f ON si.field_id = f.id
            LEFT JOIN company_fields cf ON si.field_id = cf.field_id AND a.company_id = cf.company_id
            WHERE si.statement_id = $1
            ORDER BY sort_application_id, sort_field_label
        `;
        const itemsRes = await pool.query(itemsQuery, [id]);
        const items = itemsRes.rows;

        // Prepare data for the new document generator
        const documentData = {
            statement: statement,
            items: items,
            issuerId: statement.creator_id
        };

        // Generate PDF using the new enterprise system
        const doc = await documentGenerator.generatePDF('payment_statement', documentData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="tameiaki_katastasi_${id}.pdf"`);
        
        // Pipe the document to response
        doc.pipe(res);
        doc.end();

    } catch (err) {
        console.error("Enterprise PDF Generation Error:", err.message);
        res.status(500).send('Could not generate PDF');
    }
};

const createPaymentStatement = async (req, res) => {
    console.log("=== CREATE PAYMENT STATEMENT START ===");
    console.log("Request body:", req.body);
    console.log("User:", req.user);
    const { recipient_id, application_ids } = req.body;
    const creator_id = req.user.id;
    console.log("Parsed values - recipient_id:", recipient_id, "application_ids:", application_ids, "creator_id:", creator_id);
    if (!application_ids || application_ids.length === 0) { return res.status(400).json({ message: 'No applications selected.' }); }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const appsCheckQuery = `SELECT id, is_paid_by_company, status, total_commission FROM applications WHERE id = ANY($1::int[]) FOR UPDATE`;
        const appsCheckResult = await client.query(appsCheckQuery, [application_ids]);
        if (appsCheckResult.rows.length !== application_ids.length) { throw new Error('One or more application IDs are invalid.'); }
        for (const app of appsCheckResult.rows) { const itemCheckQuery = "SELECT id FROM statement_items WHERE application_id = $1"; const itemCheckResult = await client.query(itemCheckQuery, [app.id]); if (itemCheckResult.rows.length > 0) { throw new Error(`Application #${app.id} is already in another statement.`); } if (!app.is_paid_by_company || app.status !== 'Καταχωρήθηκε') { throw new Error(`Application #${app.id} is not ready to be paid.`); } }
        // Calculate total commissions including field-level payments
        let commissionsTotal = 0;
        for (const app of appsCheckResult.rows) {
            // Check for field-level payments first
            const fieldPaymentsQuery = `
                SELECT SUM(cf.commission_amount) as field_commission_total
                FROM field_payments fp
                JOIN company_fields cf ON fp.field_id = cf.field_id 
                JOIN applications a ON fp.application_id = a.id AND a.company_id = cf.company_id
                WHERE fp.application_id = $1 AND fp.is_paid_by_company = TRUE
            `;
            const fieldPaymentsResult = await client.query(fieldPaymentsQuery, [app.id]);
            const fieldCommissionTotal = parseFloat(fieldPaymentsResult.rows[0].field_commission_total || 0);
            
            if (fieldCommissionTotal > 0) {
                commissionsTotal += fieldCommissionTotal;
            } else {
                // Use application-level commission (legacy behavior)
                commissionsTotal += parseFloat(app.total_commission || 0);
            }
        }
        // Calculate bonuses for the current month based on applications in payment statements
        const bonusQuery = `
            WITH bonus_progress AS (
                SELECT
                    b.id,
                    b.name,
                    b.application_count_target,
                    b.bonus_amount_per_application,
                    b.is_active,
                    b.created_at,
                    -- Count applications that were included in payment statements this month
                    (
                        SELECT COUNT(DISTINCT si.application_id)
                        FROM statement_items si
                        JOIN payment_statements ps ON si.statement_id = ps.id
                        JOIN applications a ON si.application_id = a.id
                        WHERE a.user_id = b.target_user_id
                        AND DATE_TRUNC('month', ps.created_at) = DATE_TRUNC('month', CURRENT_DATE)
                        AND ps.payment_status = 'paid'  -- Only count paid statements for bonus
                        AND (
                            -- If bonus has specific companies, count only those
                            EXISTS(SELECT 1 FROM bonus_companies bc WHERE bc.bonus_id = b.id)
                            AND a.company_id IN (
                                SELECT bc.company_id
                                FROM bonus_companies bc
                                WHERE bc.bonus_id = b.id
                            )
                            OR
                            -- If no specific companies, count all applications
                            NOT EXISTS(SELECT 1 FROM bonus_companies bc WHERE bc.bonus_id = b.id)
                        )
                    ) as current_applications
                FROM bonuses b
                WHERE b.target_user_id = $1
                AND b.is_active = true
                GROUP BY b.id
            )
            SELECT
                *,
                CASE
                    WHEN current_applications >= application_count_target
                    THEN application_count_target * bonus_amount_per_application
                    ELSE 0
                END as earned_amount,
                CASE
                    WHEN current_applications >= application_count_target THEN true
                    ELSE false
                END as is_achieved
            FROM bonus_progress
            ORDER BY created_at DESC
        `;

        const bonusResult = await client.query(bonusQuery, [recipient_id]);
        const bonuses = bonusResult.rows;
        let bonusTotal = bonuses.reduce((sum, bonus) => sum + parseFloat(bonus.earned_amount || 0), 0);

        console.log("Bonus calculation result:", bonuses);
        console.log("Total bonus amount:", bonusTotal);
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

        // Create detailed bonus breakdown for the statement
        let bonusDetails = '';
        if (bonuses.length > 0) {
            const achievedBonuses = bonuses.filter(bonus => bonus.is_achieved);
            if (achievedBonuses.length > 0) {
                bonusDetails = achievedBonuses.map(bonus => {
                    return `${bonus.name}: ${bonus.current_applications}/${bonus.application_count_target} αιτήσεις (€${bonus.earned_amount})`;
                }).join(', ');
            }
        }
        console.log("Bonus details:", bonusDetails);

        const statementQuery = "INSERT INTO payment_statements (creator_id, recipient_id, total_amount, subtotal, vat_amount, bonus_amount, bonus_details) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id";
        const statementResult = await client.query(statementQuery, [creator_id, recipient_id, finalTotalAmount.toFixed(2), subtotal.toFixed(2), vatAmount.toFixed(2), bonusTotal.toFixed(2), bonusDetails]);
        const newStatementId = statementResult.rows[0].id;
        // Check for field-level payments
        for (const appId of application_ids) {
            // First check if application has field-level payments
            const fieldPaymentsQuery = `
                SELECT fp.field_id, cf.commission_amount
                FROM field_payments fp
                JOIN company_fields cf ON fp.field_id = cf.field_id AND fp.application_id IN (
                    SELECT id FROM applications WHERE id = $1 AND company_id = cf.company_id
                )
                WHERE fp.application_id = $1 AND fp.is_paid_by_company = TRUE
            `;
            const fieldPaymentsResult = await client.query(fieldPaymentsQuery, [appId]);
            
            if (fieldPaymentsResult.rows.length > 0) {
                // Add field-level items
                for (const fieldPayment of fieldPaymentsResult.rows) {
                    const itemQuery = "INSERT INTO statement_items (statement_id, application_id, field_id) VALUES ($1, $2, $3)";
                    await client.query(itemQuery, [newStatementId, appId, fieldPayment.field_id]);
                }
            } else {
                // Add application-level item (legacy behavior)
                const itemQuery = "INSERT INTO statement_items (statement_id, application_id) VALUES ($1, $2)";
                await client.query(itemQuery, [newStatementId, appId]);
            }
        }
        if (clawbacksResult.rows.length > 0) { const clawbackIds = clawbacksResult.rows.map(cb => cb.id); const settleClawbacksQuery = "UPDATE clawbacks SET is_settled = TRUE WHERE id = ANY($1::int[])"; await client.query(settleClawbacksQuery, [clawbackIds]); }
        await client.query('COMMIT');
        res.status(201).json({ message: 'Payment statement created successfully', statementId: newStatementId, subtotal, vatAmount, bonusTotal, finalTotalAmount });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Error in createPaymentStatement:", err.message);
        console.error("Full error stack:", err.stack);
        console.error("Error details:", err);
        res.status(500).json({ message: err.message || 'An error occurred while creating the statement.' });
    } finally {
        client.release();
    }
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

// --- DELETE PAYMENT STATEMENT (DRAFT ONLY) ---
const deletePaymentStatement = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if statement exists and is draft status
        const statementCheck = await client.query(
            `SELECT id, creator_id, payment_status FROM payment_statements
             WHERE id = $1 FOR UPDATE`,
            [id]
        );

        if (statementCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Payment statement not found' });
        }

        const statement = statementCheck.rows[0];

        // Check if user has permission (must be creator or admin)
        if (statement.creator_id !== userId && req.user.role !== 'Admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Not authorized to delete this statement' });
        }

        // Check if statement is still in draft status
        if (statement.payment_status !== 'draft') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot delete paid statement' });
        }

        // Delete statement items first (foreign key constraint)
        await client.query('DELETE FROM statement_items WHERE statement_id = $1', [id]);

        // Delete the statement
        await client.query('DELETE FROM payment_statements WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.json({ message: 'Payment statement deleted successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting payment statement:', err.message);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

// --- EDIT PAYMENT STATEMENT (DRAFT ONLY) ---
const editPaymentStatement = async (req, res) => {
    const { id } = req.params;
    const { application_ids } = req.body;
    const userId = req.user.id;

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if statement exists and is draft status
        const statementCheck = await client.query(
            `SELECT id, creator_id, recipient_id, payment_status FROM payment_statements
             WHERE id = $1 FOR UPDATE`,
            [id]
        );

        if (statementCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Payment statement not found' });
        }

        const statement = statementCheck.rows[0];

        // Check permissions
        if (statement.creator_id !== userId && req.user.role !== 'Admin') {
            await client.query('ROLLBACK');
            return res.status(403).json({ message: 'Not authorized to edit this statement' });
        }

        // Check if statement is still in draft status
        if (statement.payment_status !== 'draft') {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Cannot edit paid statement' });
        }

        // Recalculate the statement with new applications
        // Similar logic to createPaymentStatement but for updating existing statement

        // Validate applications first
        const appsCheckQuery = `SELECT id, is_paid_by_company, status, total_commission FROM applications WHERE id = ANY($1::int[]) FOR UPDATE`;
        const appsCheckResult = await client.query(appsCheckQuery, [application_ids]);

        if (appsCheckResult.rows.length !== application_ids.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'One or more application IDs are invalid.' });
        }

        // Check that applications are not in other statements
        for (const app of appsCheckResult.rows) {
            const itemCheckQuery = "SELECT id FROM statement_items WHERE application_id = $1 AND statement_id != $2";
            const itemCheckResult = await client.query(itemCheckQuery, [app.id, id]);
            if (itemCheckResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: `Application #${app.id} is already in another statement.` });
            }
            if (!app.is_paid_by_company || app.status !== 'Καταχωρήθηκε') {
                await client.query('ROLLBACK');
                return res.status(400).json({ message: `Application #${app.id} is not ready to be paid.` });
            }
        }

        // Recalculate totals (similar to create logic)
        let commissionsTotal = 0;
        for (const app of appsCheckResult.rows) {
            const fieldPaymentsQuery = `
                SELECT SUM(cf.commission_amount) as field_commission_total
                FROM field_payments fp
                JOIN company_fields cf ON fp.field_id = cf.field_id
                JOIN applications a ON fp.application_id = a.id AND a.company_id = cf.company_id
                WHERE fp.application_id = $1 AND fp.is_paid_by_company = TRUE
            `;
            const fieldPaymentsResult = await client.query(fieldPaymentsQuery, [app.id]);
            const fieldCommissionTotal = parseFloat(fieldPaymentsResult.rows[0].field_commission_total || 0);

            if (fieldCommissionTotal > 0) {
                commissionsTotal += fieldCommissionTotal;
            } else {
                commissionsTotal += parseFloat(app.total_commission || 0);
            }
        }

        // Calculate bonus (but won't affect calculation since statement is still draft)
        let bonusTotal = 0;

        const clawbacksQuery = "SELECT id, amount FROM clawbacks WHERE user_id = $1 AND is_settled = FALSE FOR UPDATE";
        const clawbacksResult = await client.query(clawbacksQuery, [statement.recipient_id]);
        const clawbacksTotal = clawbacksResult.rows.reduce((sum, cb) => sum + parseFloat(cb.amount), 0);
        const subtotal = commissionsTotal + bonusTotal - clawbacksTotal;

        const userVatQuery = "SELECT is_vat_liable FROM users WHERE id = $1";
        const userVatResult = await client.query(userVatQuery, [statement.recipient_id]);
        const isVatLiable = userVatResult.rows.length > 0 && userVatResult.rows[0].is_vat_liable;

        let vatAmount = 0;
        if (isVatLiable) { vatAmount = subtotal * 0.24; }
        const finalTotalAmount = subtotal + vatAmount;

        // Update statement
        await client.query(
            `UPDATE payment_statements
             SET total_amount = $1, subtotal = $2, vat_amount = $3, bonus_amount = $4, bonus_details = $5
             WHERE id = $6`,
            [finalTotalAmount.toFixed(2), subtotal.toFixed(2), vatAmount.toFixed(2), bonusTotal.toFixed(2), '', id]
        );

        // Delete existing items
        await client.query('DELETE FROM statement_items WHERE statement_id = $1', [id]);

        // Add new items
        for (const appId of application_ids) {
            const fieldPaymentsQuery = `
                SELECT fp.field_id, cf.commission_amount
                FROM field_payments fp
                JOIN company_fields cf ON fp.field_id = cf.field_id AND fp.application_id IN (
                    SELECT id FROM applications WHERE id = $1 AND company_id = cf.company_id
                )
                WHERE fp.application_id = $1 AND fp.is_paid_by_company = TRUE
            `;
            const fieldPaymentsResult = await client.query(fieldPaymentsQuery, [appId]);

            if (fieldPaymentsResult.rows.length > 0) {
                for (const fieldPayment of fieldPaymentsResult.rows) {
                    const itemQuery = "INSERT INTO statement_items (statement_id, application_id, field_id) VALUES ($1, $2, $3)";
                    await client.query(itemQuery, [id, appId, fieldPayment.field_id]);
                }
            } else {
                const itemQuery = "INSERT INTO statement_items (statement_id, application_id) VALUES ($1, $2)";
                await client.query(itemQuery, [id, appId]);
            }
        }

        await client.query('COMMIT');
        res.json({
            message: 'Payment statement updated successfully',
            subtotal,
            vatAmount,
            bonusTotal,
            finalTotalAmount
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error editing payment statement:', err.message);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
};

// --- GET SINGLE PAYMENT STATEMENT ---
const getStatement = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Get statement details with recipient info
        const statementQuery = `
            SELECT
                ps.id,
                ps.recipient_id,
                ps.total_amount,
                ps.payment_status,
                ps.created_at,
                ps.paid_date,
                ps.creator_id,
                u.name as recipient_name,
                ARRAY_AGG(DISTINCT si.application_id) FILTER (WHERE si.application_id IS NOT NULL) as application_ids
            FROM payment_statements ps
            JOIN users u ON ps.recipient_id = u.id
            LEFT JOIN statement_items si ON ps.id = si.statement_id
            WHERE ps.id = $1
            GROUP BY ps.id, u.name
        `;

        const result = await pool.query(statementQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Payment statement not found' });
        }

        const statement = result.rows[0];

        // Check if user has permission (must be creator or admin)
        if (statement.creator_id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to access this statement' });
        }

        res.json(statement);

    } catch (err) {
        console.error('Error fetching payment statement:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- MARK PAYMENT STATEMENT AS PAID ---
const markStatementAsPaid = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        // Check if statement exists and user has permission
        const statementCheck = await pool.query(
            `SELECT id, creator_id, payment_status FROM payment_statements WHERE id = $1`,
            [id]
        );

        if (statementCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Payment statement not found' });
        }

        const statement = statementCheck.rows[0];

        // Check permissions
        if (statement.creator_id !== userId && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'Not authorized to modify this statement' });
        }

        // Check if statement is still in draft status
        if (statement.payment_status !== 'draft') {
            return res.status(400).json({ message: 'Statement is already marked as paid' });
        }

        // Mark as paid
        const result = await pool.query(
            `UPDATE payment_statements
             SET payment_status = 'paid', paid_date = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        res.json({
            message: 'Payment statement marked as paid',
            statement: result.rows[0]
        });

    } catch (err) {
        console.error('Error marking statement as paid:', err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

// --- GENERATE EXCEL FOR A STATEMENT ---
const generateStatementExcel = async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch statement data
        const statementQuery = `
            SELECT ps.*,
                   r.name as recipient_name, r.email as recipient_email, r.phone as recipient_phone
            FROM payment_statements ps
            JOIN users r ON ps.recipient_id = r.id
            WHERE ps.id = $1
        `;
        const statementRes = await pool.query(statementQuery, [id]);
        if (statementRes.rows.length === 0) {
            return res.status(404).send('Statement not found');
        }
        const statement = statementRes.rows[0];

        // Fetch statement items with field-level details
        const itemsQuery = `
            SELECT DISTINCT
                a.id as application_id,
                c.full_name as customer_name,
                comp.name as company_name,
                CASE
                    WHEN si.field_id IS NOT NULL THEN f.label
                    ELSE 'Αίτηση'
                END as item_type,
                CASE
                    WHEN si.field_id IS NOT NULL THEN COALESCE(cf.commission_amount, 0)
                    ELSE COALESCE(a.total_commission, 0)
                END as commission_amount,
                a.id as sort_application_id,
                COALESCE(f.label, 'ZZZZZ') as sort_field_label
            FROM statement_items si
            JOIN applications a ON si.application_id = a.id
            JOIN customers c ON a.customer_id = c.id
            JOIN companies comp ON a.company_id = comp.id
            LEFT JOIN fields f ON si.field_id = f.id
            LEFT JOIN company_fields cf ON si.field_id = cf.field_id AND a.company_id = cf.company_id
            WHERE si.statement_id = $1
            ORDER BY sort_application_id, sort_field_label
        `;
        const itemsRes = await pool.query(itemsQuery, [id]);
        const items = itemsRes.rows;

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Ταμειακή Κατάσταση');

        // Add headers
        worksheet.columns = [
            { header: 'Αριθμός Αίτησης', key: 'application_id', width: 15 },
            { header: 'Πελάτης', key: 'customer_name', width: 30 },
            { header: 'Εταιρία', key: 'company_name', width: 25 },
            { header: 'Τύπος', key: 'item_type', width: 20 },
            { header: 'Προμήθεια (€)', key: 'commission_amount', width: 15 }
        ];

        // Style the header row
        worksheet.getRow(1).eachCell((cell) => {
            cell.font = { bold: true };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE0E0E0' }
            };
        });

        // Add data rows
        items.forEach((item) => {
            worksheet.addRow({
                application_id: item.application_id,
                customer_name: item.customer_name,
                company_name: item.company_name,
                item_type: item.item_type,
                commission_amount: parseFloat(item.commission_amount)
            });
        });

        // Add summary section
        const summaryRowStart = worksheet.lastRow.number + 2;

        worksheet.getCell(`A${summaryRowStart}`).value = 'Σύνολο Προμηθειών:';
        worksheet.getCell(`A${summaryRowStart}`).font = { bold: true };
        worksheet.getCell(`E${summaryRowStart}`).value = parseFloat(statement.subtotal) - parseFloat(statement.bonus_amount || 0);
        worksheet.getCell(`E${summaryRowStart}`).numFmt = '€#,##0.00';

        if (statement.bonus_amount && parseFloat(statement.bonus_amount) > 0) {
            worksheet.getCell(`A${summaryRowStart + 1}`).value = 'Bonus:';
            worksheet.getCell(`A${summaryRowStart + 1}`).font = { bold: true };
            worksheet.getCell(`E${summaryRowStart + 1}`).value = parseFloat(statement.bonus_amount);
            worksheet.getCell(`E${summaryRowStart + 1}`).numFmt = '€#,##0.00';
        }

        worksheet.getCell(`A${summaryRowStart + 2}`).value = 'Υποσύνολο:';
        worksheet.getCell(`A${summaryRowStart + 2}`).font = { bold: true };
        worksheet.getCell(`E${summaryRowStart + 2}`).value = parseFloat(statement.subtotal);
        worksheet.getCell(`E${summaryRowStart + 2}`).numFmt = '€#,##0.00';

        if (statement.vat_amount && parseFloat(statement.vat_amount) > 0) {
            worksheet.getCell(`A${summaryRowStart + 3}`).value = 'ΦΠΑ 24%:';
            worksheet.getCell(`A${summaryRowStart + 3}`).font = { bold: true };
            worksheet.getCell(`E${summaryRowStart + 3}`).value = parseFloat(statement.vat_amount);
            worksheet.getCell(`E${summaryRowStart + 3}`).numFmt = '€#,##0.00';
        }

        worksheet.getCell(`A${summaryRowStart + 4}`).value = 'Σύνολο:';
        worksheet.getCell(`A${summaryRowStart + 4}`).font = { bold: true };
        worksheet.getCell(`E${summaryRowStart + 4}`).value = parseFloat(statement.total_amount);
        worksheet.getCell(`E${summaryRowStart + 4}`).numFmt = '€#,##0.00';

        // Set response headers for Excel file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="tameiaki_katastasi_${id}.xlsx"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Excel Generation Error:", err.message);
        res.status(500).send('Could not generate Excel file');
    }
};

module.exports = {
    createPaymentStatement,
    createClawback,
    getStatements,
    getStatement,
    updateStatementStatus,
    generateStatementPdf,
    generateStatementExcel,
    deletePaymentStatement,
    editPaymentStatement,
    markStatementAsPaid
};