const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const path = require('path');
const documentGenerator = require('../utils/documentGenerator');
const ExcelJS = require('exceljs');

const getBillingSettings = async (req, res) => {
    try {
        const settingsRes = await pool.query("SELECT * FROM billing_settings");
        const tiersRes = await pool.query("SELECT * FROM discount_tiers ORDER BY application_target ASC");
        const customChargesRes = await pool.query("SELECT team_leader_id, charge_per_application FROM team_leader_billing_settings");
        
        // Get personal billing settings
        const personalBillingRes = await pool.query(`
            SELECT team_leader_id, personal_app_charge, team_app_charge_override, personal_discount_tiers 
            FROM team_leader_personal_billing_settings
        `);

        const settings = settingsRes.rows.reduce((acc, row) => { acc[row.setting_key] = row.setting_value; return acc; }, {});
        const customCharges = customChargesRes.rows.reduce((acc, row) => { acc[row.team_leader_id] = row.charge_per_application; return acc; }, {});
        
        // Process personal billing settings
        const personalBilling = personalBillingRes.rows.reduce((acc, row) => {
            acc[row.team_leader_id] = {
                personal_app_charge: row.personal_app_charge,
                team_app_charge_override: row.team_app_charge_override,
                personal_discount_tiers: row.personal_discount_tiers || []
            };
            return acc;
        }, {});

        res.json({ 
            settings, 
            tiers: tiersRes.rows, 
            custom_charges: customCharges,
            personal_billing: personalBilling
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const updateBillingSettings = async (req, res) => {
    const { base_charge_per_application, tiers, custom_charges, personal_billing } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Update base charge
        const query = `INSERT INTO billing_settings (setting_key, setting_value) VALUES ('base_charge_per_application', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1;`;
        await client.query(query, [base_charge_per_application]);
        
        // Update discount tiers
        await client.query('DELETE FROM discount_tiers');
        for(const tier of tiers) {
            if(tier.application_target && tier.discount_percentage) {
                await client.query('INSERT INTO discount_tiers (application_target, discount_percentage) VALUES ($1, $2)', [tier.application_target, tier.discount_percentage]);
            }
        }
        
        // Update team application custom charges
        for(const leaderId in custom_charges) {
            const charge = custom_charges[leaderId];
            if (charge) {
                const customQuery = `
                    INSERT INTO team_leader_billing_settings (team_leader_id, charge_per_application) VALUES ($1, $2)
                    ON CONFLICT (team_leader_id) DO UPDATE SET charge_per_application = $2;`;
                await client.query(customQuery, [leaderId, charge]);
            }
        }
        
        // Update personal billing settings
        if (personal_billing) {
            for(const leaderId in personal_billing) {
                const settings = personal_billing[leaderId];
                if (settings && (settings.personal_app_charge || settings.team_app_charge_override)) {
                    const personalQuery = `
                        INSERT INTO team_leader_personal_billing_settings 
                        (team_leader_id, personal_app_charge, team_app_charge_override, personal_discount_tiers, created_by_admin_id) 
                        VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (team_leader_id) DO UPDATE SET 
                            personal_app_charge = $2, 
                            team_app_charge_override = $3,
                            personal_discount_tiers = $4,
                            updated_at = CURRENT_TIMESTAMP;`;
                    
                    await client.query(personalQuery, [
                        leaderId, 
                        settings.personal_app_charge || null, 
                        settings.team_app_charge_override || null,
                        JSON.stringify(settings.personal_discount_tiers || []),
                        req.user?.id || 1 // Admin user ID
                    ]);
                }
            }
        }
        
        await client.query('COMMIT');
        res.json({ message: 'Settings updated successfully.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

const generateInvoice = async (req, res) => {
    const { team_leader_id, startDate, endDate } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const settingsRes = await client.query("SELECT setting_value FROM billing_settings WHERE setting_key = 'base_charge_per_application'");
        let baseCharge = parseFloat(settingsRes.rows[0]?.setting_value || '0');
        const customChargeRes = await client.query("SELECT charge_per_application FROM team_leader_billing_settings WHERE team_leader_id = $1", [team_leader_id]);
        if (customChargeRes.rows.length > 0) {
            baseCharge = parseFloat(customChargeRes.rows[0].charge_per_application);
        }
        const tiersRes = await client.query("SELECT * FROM discount_tiers ORDER BY application_target DESC");
        const tiers = tiersRes.rows;
        
        const teamRes = await client.query("SELECT id FROM users WHERE parent_user_id = $1", [team_leader_id]);
        const teamIds = teamRes.rows.map(u => u.id);
        if (teamIds.length === 0) throw new Error("This team leader has no associates.");
        
        // Get team applications (associates' applications)
        const teamAppQuery = `
            SELECT id FROM applications 
            WHERE user_id = ANY($1::int[]) AND is_personal = FALSE AND created_at BETWEEN $2 AND $3`;
        const teamAppRes = await client.query(teamAppQuery, [teamIds, startDate, endDate]);
        const teamApplicationCount = teamAppRes.rows.length;
        const teamApplicationIds = teamAppRes.rows.map(app => app.id);

        // Get personal applications (team leader's personal applications)
        const personalAppQuery = `
            SELECT id FROM applications 
            WHERE user_id = $1 AND is_personal = TRUE AND created_at BETWEEN $2 AND $3`;
        const personalAppRes = await client.query(personalAppQuery, [team_leader_id, startDate, endDate]);
        const personalApplicationCount = personalAppRes.rows.length;
        const personalApplicationIds = personalAppRes.rows.map(app => app.id);

        const totalApplicationCount = teamApplicationCount + personalApplicationCount;
        const allApplicationIds = [...teamApplicationIds, ...personalApplicationIds];

        // Get personal billing settings
        const personalBillingRes = await client.query("SELECT personal_app_charge, team_app_charge_override FROM team_leader_personal_billing_settings WHERE team_leader_id = $1", [team_leader_id]);
        const personalSettings = personalBillingRes.rows[0] || {};
        
        // Calculate team applications charge (using override if available)
        const teamAppRate = personalSettings.team_app_charge_override || baseCharge;
        const teamAppBaseCharge = teamApplicationCount * teamAppRate;
        
        // Apply discount to team applications only (based on team app count)
        let teamDiscountApplied = 0;
        for (const tier of tiers) {
            if (teamApplicationCount >= tier.application_target) {
                teamDiscountApplied = parseFloat(tier.discount_percentage);
                break;
            }
        }
        const teamDiscountAmount = teamAppBaseCharge * (teamDiscountApplied / 100);
        const teamSubtotal = teamAppBaseCharge - teamDiscountAmount;

        // Calculate personal applications charge (separate rate, no discounts typically)
        const personalAppRate = personalSettings.personal_app_charge || baseCharge;
        const personalAppBaseCharge = personalApplicationCount * personalAppRate;
        const personalSubtotal = personalAppBaseCharge; // No discounts for personal apps by default

        // Combined totals
        const totalBaseCharge = teamAppBaseCharge + personalAppBaseCharge;
        const totalDiscountAmount = teamDiscountAmount; // Only team apps get discounts
        const subtotal = teamSubtotal + personalSubtotal;
        const tlRes = await client.query("SELECT is_vat_liable FROM users WHERE id = $1", [team_leader_id]);
        const isVatLiable = tlRes.rows[0].is_vat_liable;
        const vatAmount = isVatLiable ? subtotal * 0.24 : 0;
        const totalCharge = subtotal + vatAmount;
        const invoiceQuery = `
            INSERT INTO team_leader_invoices 
            (team_leader_id, start_date, end_date, application_count, base_charge, discount_applied, subtotal, vat_amount, total_charge)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`;
        const invoiceRes = await client.query(invoiceQuery, [team_leader_id, startDate, endDate, totalApplicationCount, totalBaseCharge, teamDiscountApplied, subtotal, vatAmount, totalCharge]);
        const newInvoiceId = invoiceRes.rows[0].id;
        if(allApplicationIds.length > 0) {
            for (const appId of allApplicationIds) {
                await client.query("INSERT INTO invoice_items (invoice_id, application_id) VALUES ($1, $2)", [newInvoiceId, appId]);
            }
        }
        await client.query('COMMIT');
        res.status(201).json(invoiceRes.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).json({ message: err.message });
    } finally {
        client.release();
    }
};

const getInvoices = async (req, res) => {
    try {
        const query = `
            SELECT i.*, u.name as team_leader_name
            FROM team_leader_invoices i
            JOIN users u ON i.team_leader_id = u.id
            ORDER BY i.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const generateInvoicePdf = async (req, res) => {
    const { id } = req.params;
    const adminUserId = req.user.id;
    
    try {
        // Fetch invoice data with team leader details
        const invoiceQuery = `
            SELECT i.*, u.name as team_leader_name, u.email as team_leader_email, u.afm as team_leader_afm
            FROM team_leader_invoices i
            JOIN users u ON i.team_leader_id = u.id
            WHERE i.id = $1
        `;
        const invoiceRes = await pool.query(invoiceQuery, [id]);
        
        if (invoiceRes.rows.length === 0) {
            return res.status(404).send('Invoice not found');
        }
        
        const invoice = invoiceRes.rows[0];

        // Prepare data for the new document generator
        const documentData = {
            invoice: invoice,
            issuerId: adminUserId
        };

        // Generate PDF using the new enterprise system
        const doc = await documentGenerator.generatePDF('invoice', documentData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="timologio_${id}.pdf"`);
        
        // Pipe the document to response
        doc.pipe(res);
        doc.end();

    } catch (err) {
        console.error('Enterprise PDF Generation Error:', err.message);
        res.status(500).send('Could not generate PDF');
    }
};

const generateInvoiceExcel = async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch invoice data with team leader details
        const invoiceQuery = `
            SELECT i.*, u.name as team_leader_name, u.email as team_leader_email, u.afm as team_leader_afm
            FROM team_leader_invoices i
            JOIN users u ON i.team_leader_id = u.id
            WHERE i.id = $1
        `;
        const invoiceRes = await pool.query(invoiceQuery, [id]);

        if (invoiceRes.rows.length === 0) {
            return res.status(404).send('Invoice not found');
        }

        const invoice = invoiceRes.rows[0];

        // Create a new workbook and worksheet (keep English name to avoid corruption but use Greek content)
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Invoice');

        // Add header information using Greek labels
        worksheet.getCell('A1').value = 'ΤΙΜΟΛΟΓΙΟ';
        worksheet.getCell('A1').font = { bold: true, size: 16 };

        worksheet.getCell('A3').value = 'Αριθμός:';
        worksheet.getCell('B3').value = invoice.id;
        worksheet.getCell('A4').value = 'Ημερομηνία:';
        worksheet.getCell('B4').value = new Date(invoice.created_at).toLocaleDateString('el-GR');

        worksheet.getCell('A6').value = 'Team Leader:';
        worksheet.getCell('B6').value = invoice.team_leader_name;
        worksheet.getCell('A7').value = 'Email:';
        worksheet.getCell('B7').value = invoice.team_leader_email;
        worksheet.getCell('A8').value = 'ΑΦΜ:';
        worksheet.getCell('B8').value = invoice.team_leader_afm;

        // Add financial details
        worksheet.getCell('A10').value = 'Περίοδος:';
        worksheet.getCell('B10').value = `${new Date(invoice.start_date).toLocaleDateString('el-GR')} - ${new Date(invoice.end_date).toLocaleDateString('el-GR')}`;

        worksheet.getCell('A12').value = 'Αιτήσεις:';
        worksheet.getCell('B12').value = invoice.application_count;

        worksheet.getCell('A13').value = 'Βάση:';
        worksheet.getCell('B13').value = parseFloat(invoice.base_charge);
        worksheet.getCell('B13').numFmt = '€#,##0.00';

        worksheet.getCell('A14').value = 'Υποσύνολο:';
        worksheet.getCell('B14').value = parseFloat(invoice.subtotal);
        worksheet.getCell('B14').numFmt = '€#,##0.00';

        if (invoice.discount_applied && parseFloat(invoice.discount_applied) > 0) {
            const discountAmount = parseFloat(invoice.base_charge) * (parseFloat(invoice.discount_applied) / 100);
            worksheet.getCell('A15').value = `Έκπτωση (${invoice.discount_applied}%):`;
            worksheet.getCell('B15').value = -discountAmount;
            worksheet.getCell('B15').numFmt = '€#,##0.00';
        }

        worksheet.getCell('A16').value = 'ΦΠΑ 24%:';
        worksheet.getCell('B16').value = parseFloat(invoice.vat_amount);
        worksheet.getCell('B16').numFmt = '€#,##0.00';

        worksheet.getCell('A17').value = 'ΣΥΝΟΛΟ:';
        worksheet.getCell('B17').value = parseFloat(invoice.total_charge);
        worksheet.getCell('B17').numFmt = '€#,##0.00';
        worksheet.getCell('A17').font = { bold: true };
        worksheet.getCell('B17').font = { bold: true };

        // Set column widths
        worksheet.getColumn('A').width = 20;
        worksheet.getColumn('B').width = 25;

        // Set response headers for Excel file
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="timologio_${invoice.id}.xlsx"`);

        // Write to response
        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error('Excel Generation Error:', err.message);
        res.status(500).send('Could not generate Excel file');
    }
};

module.exports = {
    getBillingSettings,
    updateBillingSettings,
    generateInvoice,
    getInvoices,
    generateInvoicePdf,
    generateInvoiceExcel
};