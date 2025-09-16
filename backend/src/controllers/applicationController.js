const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { getEffectiveUserId } = require('../utils/userUtils');
const documentGenerator = require('../utils/documentGenerator');
const NotificationService = require('../services/notificationService');

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
            const fieldCommissionsRes = await client.query(
                "SELECT ufc.field_id, ufc.amount FROM user_field_commissions ufc JOIN fields f ON ufc.field_id = f.id WHERE ufc.associate_id = $1 AND ufc.field_id = ANY($2::int[]) AND f.is_commissionable = true", 
                [associate_id, fieldIds]
            );
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

    // Send notification for new application (except for personal applications)
    if (!isPersonalRequest && team_leader_id) {
      try {
        const creatorQuery = 'SELECT name FROM users WHERE id = $1';
        const creatorResult = await client.query(creatorQuery, [associate_id]);
        const creatorName = creatorResult.rows[0]?.name || 'Unknown';

        await NotificationService.createNotification(
          NotificationService.NOTIFICATION_TYPES.NEW_APPLICATION,
          {
            application_id: newApplicationId,
            creator_id: associate_id,
            creator_name: creatorName,
            customer_name: customerDetails.full_name,
            company_id: company_id
          }
        );
      } catch (notificationError) {
        console.error('Failed to send new application notification:', notificationError);
        // Don't fail the application creation if notification fails
      }
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
            const fieldCommissionsRes = await client.query(
                "SELECT ufc.field_id, ufc.amount FROM user_field_commissions ufc JOIN fields f ON ufc.field_id = f.id WHERE ufc.associate_id = $1 AND ufc.field_id = ANY($2::int[]) AND f.is_commissionable = true", 
                [associate_id, fieldIds]
            );
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

// --- UPDATE STATUS (with Enterprise Notification System) ---
const updateApplicationStatus = async (req, res) => {
    const { id: applicationId } = req.params;
    const { status: newStatus, reason } = req.body;
    const { id: requesterId, role: requesterRole } = req.user;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Get application details with customer information
        const appRes = await client.query(`
            SELECT a.user_id, a.status, c.full_name as customer_name, u.name as associate_name
            FROM applications a
            JOIN customers c ON a.customer_id = c.id
            JOIN users u ON a.user_id = u.id
            WHERE a.id = $1`, [applicationId]);

        if (appRes.rows.length === 0) {
            throw new Error('Application not found');
        }

        const application = appRes.rows[0];
        const associateId = application.user_id;
        const currentStatus = application.status;
        const customerName = application.customer_name;
        const associateName = application.associate_name;

        const parentRes = await client.query("SELECT parent_user_id FROM users WHERE id = $1", [associateId]);
        const teamLeaderId = parentRes.rows[0]?.parent_user_id;

        // Permission checks
        let isAllowed = false;
        if ((requesterRole === 'TeamLeader' || requesterRole === 'Admin') && requesterId === teamLeaderId) {
            if ((currentStatus === 'Προς Καταχώρηση' || currentStatus === 'Καταχωρήθηκε') &&
                (newStatus === 'Εκκρεμότητα' || newStatus === 'Καταχωρήθηκε')) {
                isAllowed = true;
            }
        }
        if (requesterRole === 'Associate' && requesterId === associateId) {
            if (currentStatus === 'Εκκρεμότητα' && newStatus === 'Προς Καταχώρηση') {
                isAllowed = true;
            }
        }
        if (!isAllowed) {
            return res.status(403).json({ message: "You don't have permission to perform this action." });
        }

        // Update application status
        const result = await client.query(
            "UPDATE applications SET status = $1, pending_reason = $2 WHERE id = $3 RETURNING *",
            [newStatus, (newStatus === 'Εκκρεμότητα' ? reason : null), applicationId]
        );

        // Send enterprise notification for status changes
        if (currentStatus !== newStatus) {
            try {
                await NotificationService.createNotification(
                    NotificationService.NOTIFICATION_TYPES.APPLICATION_STATUS_CHANGE,
                    {
                        application_id: applicationId,
                        original_creator_id: associateId,
                        old_status: currentStatus,
                        new_status: newStatus,
                        customer_name: customerName,
                        associate_name: associateName,
                        changed_by: requesterId,
                        reason: reason
                    }
                );
            } catch (notificationError) {
                console.error('Failed to send status change notification:', notificationError);
                // Don't fail the status update if notification fails
            }
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
                COALESCE(
                    json_agg(DISTINCT
                        jsonb_build_object(
                            'id', f.id,
                            'label', f.label,
                            'value', av.value,
                            'is_commissionable', f.is_commissionable,
                            'commission_amount', COALESCE(ufc.amount, 0),
                            'is_paid', COALESCE(fp.is_paid_by_company, false),
                            'has_clawback', CASE WHEN cb.id IS NOT NULL THEN true ELSE false END,
                            'is_in_statement', CASE WHEN si.id IS NOT NULL THEN true ELSE false END
                        )
                    ) FILTER (WHERE f.id IS NOT NULL),
                    '[]'
                ) as fields
            FROM applications app
            JOIN customers cust ON app.customer_id = cust.id
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            LEFT JOIN application_values av ON app.id = av.application_id
            LEFT JOIN fields f ON av.field_id = f.id
            LEFT JOIN user_field_commissions ufc ON f.id = ufc.field_id AND ufc.associate_id = app.user_id
            LEFT JOIN field_payments fp ON f.id = fp.field_id AND fp.application_id = app.id
            LEFT JOIN clawbacks cb ON fp.id = cb.field_payment_id AND cb.is_settled = false
            LEFT JOIN statement_items si ON si.application_id = app.id AND si.field_id = f.id
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
        console.log('Sample app with fields:', result.rows[0]?.fields);
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

// --- MARK AS UNPAID ---
const markAsUnpaid = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE applications SET is_paid_by_company = FALSE WHERE id = $1 RETURNING *",
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
        // Step 1: Fetch the basic renewal data with user access control
        let userFilter;
        let queryParams = [];
        let paramIndex = 1;
        
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $${paramIndex++}`, [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            
            if (allUserIds.length === 0) {
                return res.status(404).send('No renewals found for the selected criteria.');
            }
            userFilter = `app.user_id = ANY($${paramIndex++}::int[])`;
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $${paramIndex++}`, [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            
            if (allUserIds.length === 0) {
                return res.status(404).send('No renewals found for the selected criteria.');
            }
            userFilter = `app.user_id = ANY($${paramIndex++}::int[])`;
            queryParams.push(allUserIds);
        } else {
            // Associate role
            userFilter = `app.user_id = $${paramIndex++}`;
            queryParams.push(userId);
        }

        // Set up date filter
        let dateFilter = `app.contract_end_date BETWEEN CURRENT_DATE - INTERVAL '7 days' AND CURRENT_DATE + INTERVAL '30 days'`;
        if (startDate && endDate) {
            dateFilter = `app.contract_end_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
            queryParams.push(startDate, endDate);
        }

        // Fetch renewal data
        const renewalsQuery = `
            SELECT app.id as application_id, cust.full_name as customer_name, cust.phone as customer_phone, 
                   co.name as company_name, app.contract_end_date, u.name as associate_name
            FROM applications app
            JOIN customers cust ON app.customer_id = cust.id
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            WHERE ${userFilter} AND ${dateFilter}
            ORDER BY app.contract_end_date ASC
        `;
        const renewalsResult = await pool.query(renewalsQuery, queryParams);
        const renewals = renewalsResult.rows;

        if (renewals.length === 0) {
            return res.status(404).send('No renewals found for the selected criteria.');
        }

        // Step 2: Fetch dynamic field values
        const applicationIds = renewals.map(r => r.application_id);
        const valuesQuery = `
            SELECT av.application_id, f.label, av.value
            FROM application_values av
            JOIN fields f ON av.field_id = f.id
            WHERE av.application_id = ANY($1::int[])
        `;
        const valuesResult = await pool.query(valuesQuery, [applicationIds]);

        // Step 3: Process data for Excel template
        const dynamicHeaders = new Set();
        const valuesByAppId = valuesResult.rows.reduce((acc, row) => {
            if (!acc[row.application_id]) {
                acc[row.application_id] = {};
            }
            acc[row.application_id][row.label] = row.value;
            dynamicHeaders.add(row.label);
            return acc;
        }, {});

        // Combine renewal data with dynamic fields
        const processedRenewals = renewals.map(renewal => {
            const dynamicValues = valuesByAppId[renewal.application_id] || {};
            return { ...renewal, ...dynamicValues };
        });

        // Prepare data for the enterprise document generator
        const documentData = {
            renewals: processedRenewals,
            dynamicHeaders: Array.from(dynamicHeaders),
            filters: { startDate, endDate }
        };

        // Generate Excel using the new enterprise system
        const workbook = await documentGenerator.generateExcel('renewals', documentData);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=ανανεωσεις_συμβολαιων.xlsx');

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Enterprise Export Error:", err.message);
        res.status(500).send('Server Error during export');
    }
};

// --- GET TEAM APPLICATIONS FOR PAYMENT MANAGEMENT ---
const getTeamApplications = async (req, res) => {
    const userId = req.user.id;
    const userRole = req.user.role;
    const { paid_status, status_filter } = req.query; // 'paid', 'unpaid', or 'all' for paid_status, specific status for status_filter

    try {
        // Build user filter based on role
        let userFilter = '';
        let queryParams = [];
        let paramIndex = 1;

        if (userRole === 'TeamLeader' || userRole === 'Admin') {
            // Get team members
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            
            if (allUserIds.length === 0) {
                return res.json([]);
            }
            userFilter = `a.user_id = ANY($${paramIndex}::int[])`;
            queryParams.push(allUserIds);
            paramIndex++;
        } else if (userRole === 'Associate') {
            // Associates can only see their own applications
            userFilter = `a.user_id = $${paramIndex}`;
            queryParams.push(userId);
            paramIndex++;
        } else {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Build payment status filter
        let paymentFilter = '';
        if (paid_status === 'paid') {
            paymentFilter = 'AND a.is_paid_by_company = TRUE';
        } else if (paid_status === 'unpaid') {
            paymentFilter = 'AND a.is_paid_by_company = FALSE';
        }

        // Build status filter
        let statusFilter = '';
        if (status_filter) {
            statusFilter = `AND a.status = $${paramIndex++}`;
            queryParams.push(status_filter);
        }

        const query = `
            SELECT 
                a.id, 
                a.total_commission, 
                a.is_paid_by_company, 
                a.created_at,
                c.full_name as customer_name,
                c.phone as customer_phone,
                comp.name as company_name,
                u.name as associate_name,
                -- Calculate field payment status
                CASE 
                    WHEN COUNT(cf.id) = 0 THEN 'simple'
                    WHEN COUNT(cf.id) = COUNT(CASE WHEN fp.is_paid_by_company = true THEN 1 END) THEN 'fully_paid'
                    WHEN COUNT(CASE WHEN fp.is_paid_by_company = true THEN 1 END) > 0 THEN 'partially_paid'
                    ELSE 'unpaid'
                END as payment_status,
                -- Get displayable field values
                COALESCE(
                    json_object_agg(
                        df.label, av.value
                    ) FILTER (WHERE df.show_in_applications_table = true), 
                    '{}'::json
                ) as display_fields,
                -- Get commissionable field payment info
                COALESCE(
                    json_agg(
                        json_build_object(
                            'field_id', cf.id,
                            'field_label', cf.label,
                            'commission_amount', ufc.amount,
                            'is_paid', COALESCE(fp.is_paid_by_company, false),
                            'has_clawback', CASE WHEN cb.id IS NOT NULL THEN true ELSE false END,
                            'is_in_statement', CASE WHEN si.id IS NOT NULL THEN true ELSE false END
                        )
                    ) FILTER (WHERE cf.id IS NOT NULL),
                    '[]'::json
                ) as commissionable_fields
            FROM applications a
            JOIN customers c ON a.customer_id = c.id
            JOIN companies comp ON a.company_id = comp.id
            JOIN users u ON a.user_id = u.id
            LEFT JOIN application_values av ON a.id = av.application_id
            LEFT JOIN fields df ON av.field_id = df.id
            LEFT JOIN fields cf ON av.field_id = cf.id AND cf.is_commissionable = true
            LEFT JOIN user_field_commissions ufc ON cf.id = ufc.field_id AND ufc.associate_id = a.user_id
            LEFT JOIN field_payments fp ON cf.id = fp.field_id AND fp.application_id = a.id
            LEFT JOIN clawbacks cb ON fp.id = cb.field_payment_id AND cb.is_settled = false
            LEFT JOIN statement_items si ON si.application_id = a.id AND si.field_id = cf.id
            WHERE ${userFilter}
                ${statusFilter}
                ${paymentFilter}
            GROUP BY a.id, a.total_commission, a.is_paid_by_company, a.created_at,
                     c.full_name, c.phone, comp.name, u.name
            ORDER BY a.created_at DESC
        `;

        const result = await pool.query(query, queryParams);
        res.json(result.rows);

    } catch (err) {
        console.error("Error in getTeamApplications:", err.message);
        console.error("Full error:", err);
        res.status(500).send('Server Error');
    }
};

// --- GET COMMISSIONABLE FIELDS FOR AN APPLICATION ---
const getApplicationCommissionableFields = async (req, res) => {
    const { id } = req.params;

    try {
        // Get application with field values
        const appQuery = `
            SELECT a.id, a.field_values, a.user_id, a.company_id, a.total_commission
            FROM applications a
            WHERE a.id = $1
        `;
        const appResult = await pool.query(appQuery, [id]);
        
        if (appResult.rows.length === 0) {
            return res.status(404).json({ message: 'Application not found' });
        }

        const application = appResult.rows[0];
        const fieldValues = application.field_values || {};

        // Get commissionable fields that have values in this application
        const fieldsQuery = `
            SELECT f.id, f.label, f.type
            FROM fields f
            WHERE f.is_commissionable = true
            AND f.id = ANY($1::int[])
        `;

        const fieldIds = Object.keys(fieldValues).map(id => parseInt(id));
        if (fieldIds.length === 0) {
            return res.json([]);
        }

        const fieldsResult = await pool.query(fieldsQuery, [fieldIds]);
        
        // Get commission amounts for these fields
        const commissionsQuery = `
            SELECT ufc.field_id, ufc.amount
            FROM user_field_commissions ufc
            WHERE ufc.associate_id = $1 AND ufc.field_id = ANY($2::int[])
        `;
        
        const commissionsResult = await pool.query(commissionsQuery, [application.user_id, fieldIds]);
        const commissionMap = {};
        commissionsResult.rows.forEach(row => {
            commissionMap[row.field_id] = row.amount;
        });

        // Build response with field details and commission info
        const commissionableFields = fieldsResult.rows
            .filter(field => fieldValues[field.id] && String(fieldValues[field.id]) !== 'false')
            .map(field => ({
                id: field.id,
                label: field.label,
                type: field.type,
                value: fieldValues[field.id],
                commission_amount: commissionMap[field.id] || 0,
                is_paid: false // Will be used for partial payments
            }));

        res.json(commissionableFields);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- FIELD PAYMENT MANAGEMENT ---

// Update field payment status
const updateFieldPaymentStatus = async (req, res) => {
    const { applicationId, fieldId } = req.params;
    const { isPaid } = req.body;
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Check if field payment record exists
            const existingQuery = `
                SELECT id FROM field_payments 
                WHERE application_id = $1 AND field_id = $2
            `;
            const existingResult = await client.query(existingQuery, [applicationId, fieldId]);
            
            let fieldPaymentId;
            
            if (existingResult.rows.length > 0) {
                // Update existing record
                const updateQuery = `
                    UPDATE field_payments 
                    SET is_paid_by_company = $1, paid_at = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE application_id = $3 AND field_id = $4
                    RETURNING id
                `;
                const updateResult = await client.query(updateQuery, [
                    isPaid, 
                    isPaid ? new Date() : null, 
                    applicationId, 
                    fieldId
                ]);
                fieldPaymentId = updateResult.rows[0].id;
            } else {
                // Create new record
                const insertQuery = `
                    INSERT INTO field_payments (application_id, field_id, is_paid_by_company, paid_at)
                    VALUES ($1, $2, $3, $4)
                    RETURNING id
                `;
                const insertResult = await client.query(insertQuery, [
                    applicationId, 
                    fieldId, 
                    isPaid, 
                    isPaid ? new Date() : null
                ]);
                fieldPaymentId = insertResult.rows[0].id;
            }
            
            await client.query('COMMIT');
            
            res.json({ 
                success: true, 
                fieldPaymentId,
                message: `Field payment status updated successfully` 
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Error updating field payment status:', err.message);
        res.status(500).send('Server Error');
    }
};

// Create field-level clawback
const createFieldClawback = async (req, res) => {
    const { applicationId, fieldId } = req.params;
    const { percentage, reason } = req.body;
    const userId = req.user.id;
    
    try {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN');
            
            // Get the field payment record and field commission
            const fieldPaymentQuery = `
                SELECT fp.id, ufc.amount as commission_amount
                FROM field_payments fp
                JOIN fields f ON f.id = fp.field_id
                LEFT JOIN user_field_commissions ufc ON f.id = ufc.field_id AND ufc.associate_id = (
                    SELECT user_id FROM applications WHERE id = $1
                )
                WHERE fp.application_id = $1 AND fp.field_id = $2 AND fp.is_paid_by_company = true
            `;
            const fieldPaymentResult = await client.query(fieldPaymentQuery, [applicationId, fieldId]);
            
            if (fieldPaymentResult.rows.length === 0) {
                return res.status(400).json({ 
                    message: 'Field must be paid before creating a clawback' 
                });
            }
            
            const fieldPaymentId = fieldPaymentResult.rows[0].id;
            const commissionAmount = fieldPaymentResult.rows[0].commission_amount || 0;
            
            // Calculate clawback amount: (commission * percentage / 12)
            const clawbackAmount = (commissionAmount * percentage / 12).toFixed(2);
            
            // Create the clawback
            const clawbackQuery = `
                INSERT INTO clawbacks (user_id, application_id, field_id, field_payment_id, amount, reason)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            const clawbackResult = await client.query(clawbackQuery, [
                userId, 
                applicationId, 
                fieldId, 
                fieldPaymentId, 
                clawbackAmount, 
                reason
            ]);
            
            await client.query('COMMIT');
            
            res.status(201).json({
                success: true,
                clawback: clawbackResult.rows[0],
                message: 'Field clawback created successfully'
            });
            
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
        
    } catch (err) {
        console.error('Error creating field clawback:', err.message);
        res.status(500).send('Server Error');
    }
};

// Get field payments for an application with clawback info
const getApplicationFieldPayments = async (req, res) => {
    const { applicationId } = req.params;
    
    try {
        const query = `
            SELECT 
                f.id as field_id,
                f.label as field_label,
                f.type as field_type,
                fp.id as payment_id,
                fp.is_paid_by_company,
                fp.paid_at,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', c.id,
                            'amount', c.amount,
                            'reason', c.reason,
                            'is_settled', c.is_settled,
                            'created_at', c.created_at
                        )
                    ) FILTER (WHERE c.id IS NOT NULL), 
                    '[]'
                ) as clawbacks
            FROM fields f
            JOIN application_values av ON f.id = av.field_id
            LEFT JOIN field_payments fp ON f.id = fp.field_id AND fp.application_id = $1
            LEFT JOIN clawbacks c ON fp.id = c.field_payment_id AND c.is_settled = false
            WHERE av.application_id = $1 AND f.is_commissionable = true
            GROUP BY f.id, f.label, f.type, fp.id, fp.is_paid_by_company, fp.paid_at
            ORDER BY f.label
        `;
        
        const result = await pool.query(query, [applicationId]);
        res.json(result.rows);
        
    } catch (err) {
        console.error('Error fetching field payments:', err.message);
        res.status(500).send('Server Error');
    }
};

// Get fields that should be displayed in applications table
const getDisplayableFields = async (req, res) => {
    try {
        const query = `
            SELECT id, label, type
            FROM fields 
            WHERE show_in_applications_table = true
            ORDER BY label
        `;
        
        const result = await pool.query(query);
        res.json(result.rows);
        
    } catch (err) {
        console.error('Error fetching displayable fields:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    createApplication,
    getApplications,
    getApplicationById,
    updateApplicationStatus,
    updateApplication,
    markAsPaid,
    markAsUnpaid,
    getRenewals,
    getApplicationComments,
    addApplicationComment,
    exportRenewals,
    getTeamApplications,
    getApplicationCommissionableFields,
    updateFieldPaymentStatus,
    createFieldClawback,
    getApplicationFieldPayments,
    getDisplayableFields
};