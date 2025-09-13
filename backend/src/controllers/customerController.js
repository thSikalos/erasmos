const pool = require('../config/db');
const { getEffectiveUserId } = require('../utils/userUtils');

// --- GET CUSTOMERS (ACTIVE ONLY) ---
const getAllCustomers = async (req, res) => {
    const { id: userId, role: userRole } = req.user;
    const { search } = req.query;
    try {
        let query;
        let queryParams = [];
        let baseQuery = `SELECT c.id, c.full_name, c.afm, c.phone, u.name as associate_name 
                         FROM customers c JOIN users u ON c.created_by_user_id = u.id WHERE c.deleted_at IS NULL`;
        
        let whereClauses = [];
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            whereClauses.push(`c.created_by_user_id = ANY($1::int[])`);
            queryParams.push(allUserIds);
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            whereClauses.push(`c.created_by_user_id = ANY($1::int[])`);
            queryParams.push(allUserIds);
        } else {
            // Associate role
            whereClauses.push(`c.created_by_user_id = $1`);
            queryParams.push(userId);
        }
        if (search) {
            whereClauses.push(`(c.full_name ILIKE $${queryParams.length + 1} OR c.afm ILIKE $${queryParams.length + 1})`);
            queryParams.push(`%${search}%`);
        }
        
        query = `${baseQuery} AND ${whereClauses.join(' AND ')} ORDER BY c.full_name ASC`;
        
        const customers = await pool.query(query, queryParams);
        res.json(customers.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET SINGLE CUSTOMER BY ID (Fetches even if soft-deleted for detail view) ---
const getCustomerById = async (req, res) => {
    const { id } = req.params;
    try {
        const customerRes = await pool.query("SELECT * FROM customers WHERE id = $1", [id]);
        if (customerRes.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json(customerRes.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET CUSTOMER BY AFM (Active only) with Applications ---
const getCustomerByAfm = async (req, res) => { 
    const { afm } = req.params;
    const { id: userId, role: userRole } = req.user;
    
    try { 
        const customer = await pool.query("SELECT * FROM customers WHERE afm = $1 AND deleted_at IS NULL", [afm]); 
        if (customer.rows.length === 0) { 
            return res.status(404).json({ message: 'Customer not found' }); 
        }
        
        const customerData = customer.rows[0];
        
        // Get customer's applications with proper permissions
        let applicationsQuery;
        let queryParams = [customerData.id];
        let paramIndex = 2;
        
        const baseQuery = `
            SELECT 
                app.id, app.status, app.created_at, app.total_commission, 
                app.contract_end_date, app.is_paid_by_company,
                co.name as company_name, co.id as company_id,
                u.name as associate_name, u.id as associate_id
            FROM applications app
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            WHERE app.customer_id = $1
        `;
        
        if (userRole === 'Secretary') {
            // Secretary inherits TeamLeader's data access
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            
            if (allUserIds.length > 0) {
                applicationsQuery = `${baseQuery} AND app.user_id = ANY($2::int[]) ORDER BY app.created_at DESC`;
                queryParams.push(allUserIds);
            } else {
                // No team members
                applicationsQuery = `${baseQuery} AND 1=0 ORDER BY app.created_at DESC`; // Return no results
            }
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            
            applicationsQuery = `${baseQuery} AND app.user_id = ANY($2::int[]) ORDER BY app.created_at DESC`;
            queryParams.push(allUserIds);
        } else {
            // Associate role - only own applications
            applicationsQuery = `${baseQuery} AND app.user_id = $2 ORDER BY app.created_at DESC`;
            queryParams.push(userId);
        }
        
        const applicationsResult = await pool.query(applicationsQuery, queryParams);
        
        // Add applications to customer data
        customerData.applications = applicationsResult.rows;
        customerData.applications_count = applicationsResult.rows.length;
        
        res.json(customerData); 
    } catch (err) { 
        console.error('Error in getCustomerByAfm:', err.message); 
        res.status(500).send('Server Error'); 
    } 
};

// --- CREATE A NEW CUSTOMER ---
const createCustomer = async (req, res) => { 
    const creatorUserId = req.user.id; 
    const { afm, full_name, phone, address, notes } = req.body; 
    try { 
        const newCustomer = await pool.query("INSERT INTO customers (afm, full_name, phone, address, notes, created_by_user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *", [afm, full_name, phone, address, notes, creatorUserId]); 
        res.status(201).json(newCustomer.rows[0]); 
    } catch (err) { 
        if (err.code === '23505') { 
            return res.status(400).json({ message: 'A customer with this AFM already exists.' }); 
        } 
        console.error(err.message); 
        res.status(500).send('Server Error'); 
    } 
};

// --- UPDATE CUSTOMER ---
const updateCustomer = async (req, res) => {
    const { id } = req.params;
    const { full_name, phone, address, notes } = req.body;
    try {
        const result = await pool.query(
            "UPDATE customers SET full_name = $1, phone = $2, address = $3, notes = $4 WHERE id = $5 AND deleted_at IS NULL RETURNING *",
            [full_name, phone, address, notes, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found or has been deleted' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- SOFT DELETE A CUSTOMER ---
const deleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "UPDATE customers SET deleted_at = NOW() WHERE id = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found' });
        }
        res.json({ message: 'Customer moved to recycle bin successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET COMMUNICATION LOG ---
const getCommunicationLog = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT cl.*, u.name as user_name FROM communication_log cl
            JOIN users u ON cl.user_id = u.id
            WHERE cl.customer_id = $1
            ORDER BY cl.created_at DESC
        `;
        const log = await pool.query(query, [id]);
        res.json(log.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADD TO COMMUNICATION LOG ---
const addCommunicationLog = async (req, res) => {
    const { id: customer_id } = req.params;
    const { id: user_id } = req.user;
    const { note, method } = req.body;
    try {
        const newLog = await pool.query(
            "INSERT INTO communication_log (customer_id, user_id, note, method) VALUES ($1, $2, $3, $4) RETURNING *",
            [customer_id, user_id, note, method]
        );
        res.status(201).json(newLog.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: GET DELETED CUSTOMERS ---
const getDeletedCustomers = async (req, res) => {
    try {
        const query = `SELECT id, full_name, afm, deleted_at FROM customers WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC`;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: RESTORE A CUSTOMER ---
const restoreCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("UPDATE customers SET deleted_at = NULL WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Customer not found in recycle bin' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: PERMANENTLY DELETE A CUSTOMER ---
const permanentDeleteCustomer = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM customers WHERE id = $1", [id]);
        res.json({ message: 'Customer permanently deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET CUSTOMER APPLICATIONS ---
const getCustomerApplications = async (req, res) => {
    const { id } = req.params;
    const { id: userId, role: userRole } = req.user;
    
    try {
        let applicationsQuery;
        let queryParams = [id];
        
        const baseQuery = `
            SELECT 
                app.id as application_id, app.status, app.created_at, app.total_commission, 
                app.contract_end_date, app.is_paid_by_company,
                co.name as company_name, co.id as company_id,
                u.name as associate_name, u.id as associate_id
            FROM applications app
            JOIN companies co ON app.company_id = co.id
            JOIN users u ON app.user_id = u.id
            WHERE app.customer_id = $1
        `;
        
        if (userRole === 'Secretary') {
            const effectiveUserId = await getEffectiveUserId(req.user);
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [effectiveUserId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [effectiveUserId, ...teamMemberIds];
            
            if (allUserIds.length > 0) {
                applicationsQuery = `${baseQuery} AND app.user_id = ANY($2::int[]) ORDER BY app.created_at DESC`;
                queryParams.push(allUserIds);
            } else {
                applicationsQuery = `${baseQuery} AND 1=0 ORDER BY app.created_at DESC`;
            }
        } else if (userRole === 'TeamLeader' || userRole === 'Admin') {
            const teamMembersResult = await pool.query('SELECT id FROM users WHERE parent_user_id = $1', [userId]);
            const teamMemberIds = teamMembersResult.rows.map(user => user.id);
            const allUserIds = [userId, ...teamMemberIds];
            
            applicationsQuery = `${baseQuery} AND app.user_id = ANY($2::int[]) ORDER BY app.created_at DESC`;
            queryParams.push(allUserIds);
        } else {
            applicationsQuery = `${baseQuery} AND app.user_id = $2 ORDER BY app.created_at DESC`;
            queryParams.push(userId);
        }
        
        const result = await pool.query(applicationsQuery, queryParams);
        res.json(result.rows);
    } catch (err) {
        console.error('Error in getCustomerApplications:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  getCustomerByAfm,
  updateCustomer,
  deleteCustomer,
  getCommunicationLog,
  addCommunicationLog,
  getDeletedCustomers,
  restoreCustomer,
  permanentDeleteCustomer,
  getCustomerApplications
};