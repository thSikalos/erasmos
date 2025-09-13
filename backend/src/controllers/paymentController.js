const pool = require('../config/db');
const documentGenerator = require('../utils/documentGenerator');
const fs = require('fs');
const path = require('path');

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
                END as commission_amount
            FROM statement_items si
            JOIN applications a ON si.application_id = a.id
            JOIN customers c ON a.customer_id = c.id
            JOIN companies comp ON a.company_id = comp.id
            LEFT JOIN fields f ON si.field_id = f.id
            LEFT JOIN company_fields cf ON si.field_id = cf.field_id AND a.company_id = cf.company_id
            WHERE si.statement_id = $1
            ORDER BY a.id, f.label
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
        // Calculate earned bonuses for current month
        let bonusTotal = 0;
        const activeBonusesQuery = `
            SELECT b.*,
                   COALESCE(json_agg(bc.company_id) FILTER (WHERE bc.company_id IS NOT NULL), '[]') as company_ids
            FROM bonuses b
            LEFT JOIN bonus_companies bc ON b.id = bc.bonus_id
            WHERE b.target_user_id = $1
            AND b.is_active = TRUE
            GROUP BY b.id
        `;
        const activeBonusesRes = await client.query(activeBonusesQuery, [recipient_id]);

        for (const bonus of activeBonusesRes.rows) {
            // Check if monthly bonus target is achieved (for current month)
            let appCountQuery;
            let queryParams = [recipient_id];

            if (bonus.company_ids && bonus.company_ids.length > 0) {
                // Bonus applies to specific companies
                appCountQuery = `
                    SELECT COUNT(*)
                    FROM applications
                    WHERE user_id = $1
                    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
                    AND company_id = ANY($2::int[])
                `;
                queryParams.push(bonus.company_ids);
            } else {
                // Bonus applies to all applications
                appCountQuery = `
                    SELECT COUNT(*)
                    FROM applications
                    WHERE user_id = $1
                    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
                `;
            }

            const appCountRes = await client.query(appCountQuery, queryParams);
            const totalAppsThisMonth = parseInt(appCountRes.rows[0].count);

            if (totalAppsThisMonth >= bonus.application_count_target) {
                // Calculate how many applications in this statement qualify for bonus
                // Only count applications from current month that are in this statement
                let bonusEligibleAppsCount = 0;

                for (const appId of application_ids) {
                    const appQuery = `
                        SELECT company_id, created_at
                        FROM applications
                        WHERE id = $1
                        AND user_id = $2
                        AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
                    `;
                    const appRes = await client.query(appQuery, [appId, recipient_id]);

                    if (appRes.rows.length > 0) {
                        const app = appRes.rows[0];

                        if (bonus.company_ids && bonus.company_ids.length > 0) {
                            // Check if app's company is in bonus target companies
                            if (bonus.company_ids.includes(app.company_id)) {
                                bonusEligibleAppsCount++;
                            }
                        } else {
                            // All companies qualify
                            bonusEligibleAppsCount++;
                        }
                    }
                }

                // For continuous monthly bonuses, each qualifying application gets the bonus
                bonusTotal += bonusEligibleAppsCount * parseFloat(bonus.bonus_amount_per_application);
            }
        }
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

        // Collect bonus details for the statement
        let bonusDetails = '';
        if (bonusTotal > 0) {
            // Get bonus breakdown for this statement (current month applications)
            const bonusDetailsQuery = `
                SELECT b.name, COUNT(DISTINCT a.id) as app_count, b.bonus_amount_per_application,
                       COALESCE(
                           (SELECT string_agg(c.name, ', ')
                            FROM companies c
                            WHERE c.id = ANY(
                                SELECT company_id FROM bonus_companies WHERE bonus_id = b.id
                            )
                           ), 'Όλες οι εταιρείες'
                       ) as companies
                FROM bonuses b
                JOIN applications a ON (
                    a.user_id = b.target_user_id
                    AND DATE_TRUNC('month', a.created_at) = DATE_TRUNC('month', CURRENT_DATE)
                    AND a.id = ANY($1::int[])
                    AND (
                        NOT EXISTS(SELECT 1 FROM bonus_companies bc WHERE bc.bonus_id = b.id)
                        OR a.company_id IN (SELECT company_id FROM bonus_companies bc WHERE bc.bonus_id = b.id)
                    )
                )
                WHERE b.target_user_id = $2
                AND b.is_active = TRUE
                GROUP BY b.id, b.name, b.bonus_amount_per_application
            `;
            const bonusDetailsRes = await client.query(bonusDetailsQuery, [application_ids, recipient_id]);

            bonusDetails = bonusDetailsRes.rows.map(bonus =>
                `${bonus.name}: ${bonus.app_count} αιτήσεις αυτόν τον μήνα από ${bonus.companies}`
            ).join('; ');
        }

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