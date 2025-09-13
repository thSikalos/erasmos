const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { getEffectiveUserId } = require('../utils/userUtils');

const createApplication = async (req, res) => {
  const { company_id, field_values, contract_end_date, customerDetails, is_personal } = req.body;
  const { id: associate_id, role: associate_role } = req.user;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    let customerId = customerDetails.id;
    if (!customerId) {
        if (!customerDetails.afm || !customerDetails.full_name) { throw new Error("AFM and Full Name are required for new customers."); }
        const newCustomerRes = await client.query("INSERT INTO customers (afm, full_name, phone, address, created_by_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id", [customerDetails.afm, customerDetails.full_name, customerDetails.phone, customerDetails.address, associate_id]);
        customerId = newCustomerRes.rows[0].id;
    }
    
    // Η is_personal μπορεί να είναι true μόνο αν ο χρήστης είναι TeamLeader ή Admin
    const isPersonalRequest = (associate_role === 'TeamLeader' || associate_role === 'Admin') && is_personal;
    
    const parentRes = await client.query('SELECT parent_user_id FROM users WHERE id = $1', [associate_id]);
    let team_leader_id = parentRes.rows[0]?.parent_user_id;
    
    // For personal applications by TeamLeader/Admin, they are their own "team leader" for billing
    if (isPersonalRequest && (associate_role === 'TeamLeader' || associate_role === 'Admin')) {
        team_leader_id = associate_id;
    }

    if (!team_leader_id && !isPersonalRequest) {
      throw new Error("Associate does not have a team leader and cannot create non-personal applications.");
    }

    let totalCommission = 0;
    if (!isPersonalRequest) { // Υπολογίζουμε αμοιβές μόνο για τις αιτήσεις συνεργατών
        const baseCommissionRes = await client.query("SELECT amount FROM user_commissions WHERE associate_id = $1 AND company_id = $2", [associate_id, company_id]);
        totalCommission = baseCommissionRes.rows.length > 0 ? parseFloat(baseCommissionRes.rows[0].amount) : 0;
        const fieldIds = Object.keys(field_values).map(id => parseInt(id));
        if (fieldIds.length > 0) {
            const fieldCommissionsRes = await client.query("SELECT field_id, amount FROM user_field_commissions WHERE associate_id = $1 AND field_id = ANY($2::int[])", [associate_id, fieldIds]);
            for(const commissionRule of fieldCommissionsRes.rows) {
                if (field_values[commissionRule.field_id] && String(field_values[commissionRule.field_id]) !== 'false') {
                    totalCommission += parseFloat(commissionRule.amount);
                }
            }
        }
    }
    
    const finalStatus = isPersonalRequest ? 'Καταχωρήθηκε' : 'Προς Καταχώρηση';

    const appQuery = 'INSERT INTO applications (customer_id, user_id, company_id, total_commission, contract_end_date, is_personal, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id';
    const appResult = await client.query(appQuery, [customerId, associate_id, company_id, totalCommission, contract_end_date || null, isPersonalRequest, finalStatus]);
    const newApplicationId = appResult.rows[0].id;

    for (const fieldId in field_values) {
      const dataQuery = 'INSERT INTO application_values (application_id, field_id, value) VALUES ($1, $2, $3)';
      await client.query(dataQuery, [newApplicationId, fieldId, String(field_values[fieldId])]);
    }
    
    await client.query('COMMIT');
    res.status(201).json({ message: 'Application created successfully', applicationId: newApplicationId, totalCommission });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send(err.message);
  } finally {
    client.release();
  }
};

// --- UPDATE AN APPLICATION (for resubmission) ---
const updateApplication = async (req, res) => {
    const { id: applicationId } = req.params;
    const { company_id, field_values, contract_end_date, comment } = req.body;
    const associate_id = req.user.id;
   
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const appCheck = await client.query("SELECT user_id, status FROM applications WHERE id = $1", [applicationId]);
        if (appCheck.rows.length === 0 || appCheck.rows[0].user_id !== associate_id || appCheck.rows[0].status !== 'Εκκρεμότητα') {
            throw new Error("Application cannot be edited.");
        }
        const parentRes = await client.query('SELECT parent_user_id FROM users WHERE id = $1', [associate_id]);
        const team_leader_id = parentRes.rows[0]?.parent_user_id;
        if (!team_leader_id) throw new Error("Associate does not have a team leader.");
       
        const baseCommissionRes = await client.query("SELECT amount FROM user_commissions WHERE associate_id = $1 AND company_id = $2", [associate_id, company_id]);
        let totalCommission = baseCommissionRes.rows.length > 0 ? parseFloat(baseCommissionRes.rows[0].amount) : 0;
       
        const fieldIds = Object.keys(field_values).map(id => parseInt(id));
        if (fieldIds.length > 0) {
            const fieldCommissionsRes = await client.query("SELECT field_id, amount FROM user_field_commissions WHERE associate_id = $1 AND field_id = ANY($2::int[])", [associate_id, fieldIds]);
            for(const commissionRule of fieldCommissionsRes.rows) {
                if (field_values[commissionRule.field_id] && String(field_values[commissionRule.field_id]) !== 'false') {
                    totalCommission += parseFloat(commissionRule.amount);
                }
            }
        }
       
        const appQuery = `
            UPDATE applications
            SET company_id = $1, total_commission = $2, contract_end_date = $3, status = 'Προς Καταχώρηση', pending_reason = NULL
            WHERE id = $4`;
        await client.query(appQuery, [company_id, totalCommission, contract_end_date || null, applicationId]);
        await client.query("DELETE FROM application_values WHERE application_id = $1", [applicationId]);
        for (const fieldId in field_values) {
          const dataQuery = 'INSERT INTO application_values (application_id, field_id, value) VALUES ($1, $2, $3)';
          await client.query(dataQuery, [applicationId, fieldId, String(field_values[fieldId])]);
        }
        if (comment && comment.trim() !== '') {
            await client.query(
                "INSERT INTO application_comments (application_id, user_id, comment) VALUES ($1, $2, $3)",
                [applicationId, associate_id, comment]
            );
        }
       
        await client.query('COMMIT');
        res.status(200).json({ message: 'Application updated and resubmitted successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send(err.message);
    } finally {
        client.release();
    }
};

// --- GET APPLICATION COMMENTS ---
const getApplicationComments = async (req, res) => {
    const { id: applicationId } = req.params;
    try {
        const query = `
            SELECT ac.*, u.name as user_name
            FROM application_comments ac
            JOIN users u ON ac.user_id = u.id
            WHERE ac.application_id = $1
            ORDER BY ac.created_at ASC
        `;
        const result = await pool.query(query, [applicationId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADD APPLICATION COMMENT ---
const addApplicationComment = async (req, res) => {
    const { id: applicationId } = req.params;
    const { id: userId } = req.user;
    const { comment } = req.body;
    try {
        const newComment = await pool.query(
            "INSERT INTO application_comments (application_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *",
            [applicationId, userId, comment]
        );
        res.status(201).json(newComment.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE STATUS (with Notification Trigger) ---
const updateApplicationStatus = async (req, res) => {
    const { id: applicationId } = req.params;
    const { status: newStatus, reason } = req.body;
    const { id: requesterId, role: requesterRole } = req.user;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const appRes = await client.query("SELECT user_id, status FROM applications WHERE id = $1", [applicationId]);
        if (appRes.rows.length === 0) { throw new Error('Application not found'); }
        const application = appRes.rows[0];
        const associateId = application.user_id;
        const currentStatus = application.status;
        const parentRes = await client.query("SELECT parent_user_id FROM users WHERE id = $1", [associateId]);
        const teamLeaderId = parentRes.rows[0]?.parent_user_id;
        let isAllowed = false;
        if ((requesterRole === 'TeamLeader' || requesterRole === 'Admin') && requesterId === teamLeaderId) { if ((currentStatus === 'Προς Καταχώρηση' || currentStatus === 'Καταχωρήθηκε') && (newStatus === 'Εκκρεμότητα' || newStatus === 'Καταχωρήθηκε')) { isAllowed = true; } }
        if (requesterRole === 'Associate' && requesterId === associateId) { if (currentStatus === 'Εκκρεμότητα' && newStatus === 'Προς Καταχώρηση') { isAllowed = true; } }
        if (!isAllowed) { return res.status(403).json({ message: "You don't have permission to perform this action." }); }
       
        const result = await client.query( "UPDATE applications SET status = $1, pending_reason = $2 WHERE id = $3 RETURNING *", [newStatus, (newStatus === 'Εκκρεμότητα' ? reason : null), applicationId] );
        // --- ΔΗΜΙΟΥΡΓΙΑ ΕΙΔΟΠΟΙΗΣΗΣ ---
        if ((requesterRole === 'TeamLeader' || requesterRole === 'Admin')) {
            const message = `Η κατάσταση της αίτησης #${applicationId} άλλαξε σε "${newStatus}".`;
            await client.query( `INSERT INTO notifications (user_id, message, channel, link_url) VALUES ($1, $2, 'in-app', $3)`, [associateId, message, `/application/${applicationId}`]);
        }
       
        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET APPLICATION BY ID ---
const getApplicationById = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT
                app.id as application_id, app.status, app.created_at, app.is_paid_by_company, 
                app.total_commission, app.contract_end_date, app.pending_reason,
                cust.full_name as customer_name, 
                co.id as company_id, co.name as company_name, 
                u.id as associate_id, u.name as associate_name, u.parent_user_id as associate_parent_id,
                COALESCE(json_agg(DISTINCT jsonb_build_object('field_id', f.id, 'label', f.label, 'value', av.value)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
            FROM applications app
            JOIN customers cust ON app.customer_id = cust.id
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            LEFT JOIN application_values av ON app.id = av.application_id
            LEFT JOIN fields f ON av.field_id = f.id
            WHERE app.id = $1
            GROUP BY app.id, cust.full_name, co.id, co.name, u.id, u.name, u.parent_user_id;
        `;
        const result = await pool.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET APPLICATIONS ---
const getApplications = async (req, res) => {
    console.log('=== getApplications called ===');
    const { id: userId, role: userRole } = req.user;
    try {
        let query;
        let queryParams;
        const baseQuery = `
            SELECT
                app.id as application_id, app.status, app.created_at, app.is_paid_by_company, app.total_commission, app.contract_end_date,
                cust.full_name as customer_name, co.name as company_name, u.name as associate_name,
                COALESCE(json_agg(DISTINCT jsonb_build_object('label', f.label, 'value', av.value)) FILTER (WHERE f.id IS NOT NULL), '[]') as fields
            FROM applications app
            JOIN customers cust ON app.customer_id = cust.id
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            LEFT JOIN application_values av ON app.id = av.application_id
            LEFT JOIN fields f ON av.field_id = f.id
        `;
        
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            query = `${baseQuery} WHERE app.user_id = ANY($1::int[]) GROUP BY app.id, cust.full_name, co.name, u.name ORDER BY app.created_at DESC;`;
            queryParams = [allUserIds];
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            query = `${baseQuery} WHERE app.user_id = ANY($1::int[]) GROUP BY app.id, cust.full_name, co.name, u.name ORDER BY app.created_at DESC;`;
            queryParams = [allUserIds];
        } else {
            // Associate role
            query = `${baseQuery} WHERE app.user_id = $1 GROUP BY app.id, cust.full_name, co.name, u.name ORDER BY app.created_at DESC;`;
            queryParams = [userId];
        }
        const result = await pool.query(query, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- MARK AS PAID ---
const markAsPaid = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE applications SET is_paid_by_company = TRUE WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET RENEWALS (CORRECTED FOR EMPTY TEAMS) ---
const getRenewals = async (req, res) => {
    console.log('=== getRenewals function called ===');
    const { id: userId, role: userRole } = req.user;
    const { startDate, endDate } = req.query;
    console.log('getRenewals called with:', { userId, userRole, startDate, endDate });
    try {
        let userFilter;
        let queryParams = [];
        let paramIndex = 1;
        
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $1`, [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
           
            if (allUserIds.length === 0) {
                return res.json([]);
            }
            userFilter = `app.user_id = ANY($${paramIndex++}::int[])`;
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $1`, [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
           
            // ΑΝ δεν υπάρχουν καθόλου χρήστες, επιστρέφουμε κενή λίστα αμέσως για να αποφύγουμε το σφάλμα.
            if (allUserIds.length === 0) {
                return res.json([]);
            }
            userFilter = `app.user_id = ANY($${paramIndex++}::int[])`;
            queryParams.push(allUserIds);
        } else {
            // Associate role
            userFilter = `app.user_id = $${paramIndex++}`;
            queryParams.push(userId);
        }
        let dateFilter = `app.contract_end_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days'`;
        if (startDate && startDate.trim() !== '' && endDate && endDate.trim() !== '') {
            dateFilter = `app.contract_end_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
            queryParams.push(startDate.trim(), endDate.trim());
        }
        const query = `
            SELECT app.id as application_id, cust.full_name as customer_name, cust.phone as customer_phone,
                   co.name as company_name, app.contract_end_date, u.name as associate_name
            FROM applications app
            JOIN customers cust ON app.customer_id = cust.id
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            WHERE ${userFilter} AND ${dateFilter}
            ORDER BY app.contract_end_date ASC;
        `;
        
        console.log('Final query:', query);
        console.log('Query params:', queryParams);
        
        const result = await pool.query(query, queryParams);
        console.log('Query returned', result.rows.length, 'renewals');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- EXPORT RENEWALS TO EXCEL (DYNAMIC VERSION) ---
const exportRenewals = async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { startDate, endDate } = req.query;
    try {
        // Step 1: Fetch the basic renewal data (same as getRenewals)
        let userFilter;
        let queryParams = [];
        let paramIndex = 1;
        if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $${paramIndex++}`, [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            if (allUserIds.length === 0) {
                let workbook = new ExcelJS.Workbook();
                let worksheet = workbook.addWorksheet('Renewals');
                worksheet.columns = [{ header: 'Status', key: 'status', width: 30 }];
                worksheet.addRow({ status: 'No renewals found for the selected criteria.' });
                res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.setHeader('Content-Disposition', 'attachment; filename=' + 'renewals.xlsx');
                await workbook.xlsx.write(res);
                return res.end();
            }
            userFilter = `app.user_id = ANY($${paramIndex++}::int[])`;
            queryParams.push(allUserIds);
        } else {
            userFilter = `app.user_id = $${paramIndex++}`;
            queryParams.push(userId);
        }
        let dateFilter = `app.contract_end_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days'`;
        if (startDate && endDate) {
            dateFilter = `app.contract_end_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
            queryParams.push(startDate, endDate);
        }
        const renewalsQuery = ` SELECT app.id as application_id, cust.full_name as customer_name, cust.phone as customer_phone, co.name as company_name, app.contract_end_date, u.name as associate_name FROM applications app JOIN customers cust ON app.customer_id = cust.id JOIN companies co ON app.company_id = co.id JOIN users u ON app.user_id = u.id WHERE ${userFilter} AND ${dateFilter} ORDER BY app.contract_end_date ASC;`;
        const renewalsResult = await pool.query(renewalsQuery, queryParams);
        const renewals = renewalsResult.rows;
        if (renewals.length === 0) {
            // Handle case with no renewals
            return res.status(404).send('No renewals found for the selected criteria.');
        }
        // Step 2: Fetch all dynamic field values for these specific applications
        const applicationIds = renewals.map(r => r.application_id);
        const valuesQuery = `
            SELECT av.application_id, f.label, av.value
            FROM application_values av
            JOIN fields f ON av.field_id = f.id
            WHERE av.application_id = ANY($1::int[])
        `;
        const valuesResult = await pool.query(valuesQuery, [applicationIds]);
        // Step 3: Process data to be Excel-friendly
        const dataForExcel = [];
        const dynamicHeaders = new Set();
       
        // Group values by application_id
        const valuesByAppId = valuesResult.rows.reduce((acc, row) => {
            if (!acc[row.application_id]) {
                acc[row.application_id] = {};
            }
            acc[row.application_id][row.label] = row.value;
            dynamicHeaders.add(row.label);
            return acc;
        }, {});
        renewals.forEach(renewal => {
            const row = { ...renewal };
            const dynamicValues = valuesByAppId[renewal.application_id] || {};
            for (const header of dynamicHeaders) {
                row[header] = dynamicValues[header] || '';
            }
            dataForExcel.push(row);
        });
        // Step 4: Create the Excel file
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Renewals');
       
        const headers = [
            { header: 'Customer Name', key: 'customer_name', width: 30 },
            { header: 'Phone', key: 'customer_phone', width: 20 },
            { header: 'Company', key: 'company_name', width: 20 },
            { header: 'Associate', key: 'associate_name', width: 30 },
            { header: 'End Date', key: 'contract_end_date', width: 15, style: { numFmt: 'dd/mm/yyyy' } },
        ];
       
        // Add dynamic headers
        dynamicHeaders.forEach(header => {
            headers.push({ header: header, key: header, width: 25 });
        });
        worksheet.columns = headers;
        worksheet.addRows(dataForExcel);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + 'renewals_export.xlsx');
       
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error("Export Error:", err.message);
        res.status(500).send('Server Error during export');
    }
};

module.exports = {
    createApplication,
    getApplications,
    getApplicationById,
    updateApplicationStatus,
    updateApplication,
    markAsPaid,
    getRenewals,
    getApplicationComments,
    addApplicationComment,
    exportRenewals
};