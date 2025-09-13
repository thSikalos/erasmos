const pool = require('../config/db');
const ExcelJS = require('exceljs');
const { getEffectiveUserId } = require('../utils/userUtils');
const documentGenerator = require('../utils/documentGenerator');

// --- GET CHART DATA (CORRECTED FOR EMPTY TEAMS) ---
const getChartData = async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { startDate, endDate, associateId, companyId } = req.query;
    try {
        let queryParams = [];
        let whereClauses = [];
        
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
           
            if (allUserIds.length === 0) {
                return res.json({ appsByCompany: [], commissionsByMonth: [] });
            }
            whereClauses.push(`app.user_id = ANY($1::int[])`);
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
           
            if (allUserIds.length === 0) {
                return res.json({ appsByCompany: [], commissionsByMonth: [] });
            }
            whereClauses.push(`app.user_id = ANY($1::int[])`);
            queryParams.push(allUserIds);
        } else {
            // Associate role
            whereClauses.push(`app.user_id = $1`);
            queryParams.push(userId);
        }
       
        if (startDate) { whereClauses.push(`app.created_at >= $${queryParams.length + 1}`); queryParams.push(startDate); }
        if (endDate) { whereClauses.push(`app.created_at <= $${queryParams.length + 1}`); queryParams.push(endDate); }
        if (associateId) { whereClauses.push(`app.user_id = $${queryParams.length + 1}`); queryParams.push(associateId); }
        if (companyId) { whereClauses.push(`app.company_id = $${queryParams.length + 1}`); queryParams.push(companyId); }
       
        const whereString = `WHERE ${whereClauses.join(' AND ')}`;
        const appsByCompanyQuery = ` SELECT co.name as company_name, COUNT(app.id) as count FROM applications app JOIN companies co ON app.company_id = co.id ${whereString} GROUP BY co.name; `;
        const appsByCompanyRes = await pool.query(appsByCompanyQuery, queryParams);
        const commissionsByMonthQuery = ` SELECT TO_CHAR(date_trunc('month', app.created_at), 'YYYY-MM') as month, SUM(app.total_commission) as total FROM applications app ${whereString} GROUP BY date_trunc('month', app.created_at) ORDER BY month ASC; `;
        const commissionsByMonthRes = await pool.query(commissionsByMonthQuery, queryParams);
        res.json({
            appsByCompany: appsByCompanyRes.rows,
            commissionsByMonth: commissionsByMonthRes.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET STATS FOR DASHBOARD CARDS ---
const getDashboardStats = async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    try {
        let userFilter = '';
        let queryParams = [];
        
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            userFilter = `user_id = ANY($1::int[])`;
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            userFilter = `user_id = ANY($1::int[])`;
            queryParams.push(allUserIds);
        } else {
            // Associate role
            userFilter = `user_id = $1`;
            queryParams.push(userId);
        }
        const totalAppsQuery = `SELECT COUNT(*) FROM applications WHERE ${userFilter}`;
        const totalAppsResult = await pool.query(totalAppsQuery, queryParams);
        const totalApplications = parseInt(totalAppsResult.rows[0].count);
        const statusQuery = `SELECT status, COUNT(*) as count FROM applications WHERE ${userFilter} GROUP BY status`;
        const statusResult = await pool.query(statusQuery, queryParams);
        const applicationsByStatus = statusResult.rows;
        const commissionQuery = `SELECT COALESCE(SUM(total_commission), 0) as sum FROM applications WHERE ${userFilter} AND created_at >= date_trunc('month', CURRENT_DATE)`;
        const commissionResult = await pool.query(commissionQuery, queryParams);
        const commissionsThisMonth = parseFloat(commissionResult.rows[0].sum);
        res.json({ totalApplications, applicationsByStatus, commissionsThisMonth });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET DETAILED REPORT WITH FILTERS ---
const getDetailedReport = async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { startDate, endDate, associateId, companyId } = req.query;
    try {
        let queryParams = [];
        let paramIndex = 1;
        let baseQuery = ` FROM applications app JOIN customers cust ON app.customer_id = cust.id JOIN companies co ON app.company_id = co.id JOIN users u ON app.user_id = u.id `;
        let whereClauses = [];
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access  
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $1`, [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            if (allUserIds.length === 0) {
                return res.json({ summary: { total_applications: 0, total_commission: 0 }, details: [] });
            }
            whereClauses.push(`app.user_id = ANY($1::int[])`);
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $1`, [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            if (allUserIds.length === 0) { // Safety check
                return res.json({ summary: { total_applications: 0, total_commission: 0 }, details: [] });
            }
            whereClauses.push(`app.user_id = ANY($1::int[])`);
            queryParams.push(allUserIds);
        } else {
            // Associate role
            whereClauses.push(`app.user_id = $1`);
            queryParams.push(userId);
        }
        if (startDate) { whereClauses.push(`app.created_at >= $${queryParams.length + 1}`); queryParams.push(startDate); }
        if (endDate) { whereClauses.push(`app.created_at <= $${queryParams.length + 1}`); queryParams.push(endDate); }
        if (associateId) { whereClauses.push(`app.user_id = $${queryParams.length + 1}`); queryParams.push(associateId); }
        if (companyId) { whereClauses.push(`app.company_id = $${queryParams.length + 1}`); queryParams.push(companyId); }
        const whereString = `WHERE ${whereClauses.join(' AND ')}`;
        const detailsQuery = ` SELECT app.id, app.created_at, u.name as associate_name, cust.full_name as customer_name, co.name as company_name, app.status, app.total_commission ${baseQuery} ${whereString} ORDER BY app.created_at DESC `;
        const detailsResult = await pool.query(detailsQuery, queryParams);
        const summaryQuery = ` SELECT COUNT(*) as total_applications, COALESCE(SUM(app.total_commission), 0) as total_commission ${baseQuery} ${whereString} `;
        const summaryResult = await pool.query(summaryQuery, queryParams);
        res.json({
            summary: {
                total_applications: parseInt(summaryResult.rows[0].total_applications),
                total_commission: parseFloat(summaryResult.rows[0].total_commission)
            },
            details: detailsResult.rows
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- EXPORT DETAILED REPORT TO EXCEL ---
const exportDetailedReport = async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { startDate, endDate, associateId, companyId } = req.query;

    try {
        let queryParams = [];
        let paramIndex = 1;
        let baseQuery = `
            FROM applications app
            JOIN customers cust ON app.customer_id = cust.id
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
        `;
        let whereClauses = [];

        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access  
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $${paramIndex++}`, [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            whereClauses.push(`app.user_id = ANY($${paramIndex++}::int[])`);
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query(`SELECT id FROM users WHERE parent_user_id = $${paramIndex++}`, [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            whereClauses.push(`app.user_id = ANY($${paramIndex++}::int[])`);
            queryParams.push(allUserIds);
        } else {
            // Associate role
            whereClauses.push(`app.user_id = $${paramIndex++}`);
            queryParams.push(userId);
        }

        if (startDate) {
            whereClauses.push(`app.created_at >= $${paramIndex++}`);
            queryParams.push(startDate);
        }
        if (endDate) {
            whereClauses.push(`app.created_at <= $${paramIndex++}`);
            queryParams.push(endDate);
        }
        if (associateId) {
            whereClauses.push(`app.user_id = $${paramIndex++}`);
            queryParams.push(associateId);
        }
        if (companyId) {
            whereClauses.push(`app.company_id = $${paramIndex++}`);
            queryParams.push(companyId);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const detailsQuery = `
            SELECT app.id, app.created_at, u.name as associate_name, cust.full_name as customer_name, co.name as company_name, app.status, app.total_commission
            ${baseQuery}
            ${whereString}
            ORDER BY app.created_at DESC
        `;
        const detailsResult = await pool.query(detailsQuery, queryParams);

        // Fetch summary data
        const summaryQuery = `
            SELECT COUNT(*) as total_applications, COALESCE(SUM(app.total_commission), 0) as total_commission
            ${baseQuery}
            ${whereString}
        `;
        const summaryResult = await pool.query(summaryQuery, queryParams);

        // Prepare data for the new document generator
        const documentData = {
            details: detailsResult.rows,
            summary: {
                total_applications: parseInt(summaryResult.rows[0].total_applications),
                total_commission: parseFloat(summaryResult.rows[0].total_commission)
            },
            filters: {
                startDate,
                endDate,
                associateId,
                companyId
            }
        };

        // Generate Excel using the new enterprise system
        const workbook = await documentGenerator.generateExcel('reports', documentData);

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=αναλυτικη_αναφορα.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getDashboardStats,
    getDetailedReport,
    exportDetailedReport,
    getChartData
};