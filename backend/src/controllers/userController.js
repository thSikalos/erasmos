const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const path = require('path');
const documentGenerator = require('../utils/documentGenerator');

// --- GET ALL USERS (FOR ADMIN) ---
const getAllUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, parent_user_id, is_vat_liable, has_accepted_terms FROM users WHERE deleted_at IS NULL ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- CREATE A NEW USER (BY ADMIN) ---
const createUser = async (req, res) => {
    try {
        const { name, email, password, role, parent_user_id, is_vat_liable = false } = req.body;
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const newUser = await pool.query(
            "INSERT INTO users (name, email, password, role, parent_user_id, is_vat_liable) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [name, email, hashedPassword, role, parent_user_id || null, is_vat_liable]
        );
        delete newUser.rows[0].password; 
        res.status(201).json(newUser.rows[0]);
    } catch (err) {
        if (err.code === '23505') { return res.status(400).json({ message: 'A user with this email already exists.' }); }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- UPDATE A USER (BY ADMIN) ---
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, parent_user_id, is_vat_liable = false } = req.body;
    try {
        const result = await pool.query(
            `UPDATE users SET name = $1, email = $2, role = $3, parent_user_id = $4, is_vat_liable = $5 
             WHERE id = $6 RETURNING id, name, email, role, parent_user_id, is_vat_liable`,
            [name, email, role, parent_user_id || null, is_vat_liable, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') { return res.status(400).json({ message: 'A user with this email already exists.' }); }
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- SOFT DELETE A USER (BY ADMIN) ---
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("UPDATE users SET deleted_at = NOW() WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) { return res.status(404).json({ message: 'User not found' }); }
        res.json({ message: 'User moved to recycle bin' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- LOGIN USER ---
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) { return res.status(400).json({ message: 'Please enter all fields' }); }
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL', [email]);
        if (userResult.rows.length === 0) { return res.status(400).json({ message: 'Invalid credentials' }); }
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) { return res.status(400).json({ message: 'Invalid credentials' }); }
        
        const payload = { user: { id: user.id, role: user.role, email: user.email, parent_user_id: user.parent_user_id, has_accepted_terms: user.has_accepted_terms } };
        
        jwt.sign(payload, 'mySuperSecretKey123', { expiresIn: '1h' }, (err, token) => {
            if (err) { console.error('JWT SIGNING ERROR:', err); return res.status(500).send('Server Error during token generation'); }
            res.json({ token });
        });
    } catch (err) { 
        console.error('GENERAL LOGIN ERROR:', err.message); 
        res.status(500).send('Server Error'); 
    }
};

// --- ACCEPT TERMS ---
const acceptTerms = async (req, res) => {
    const userId = req.user.id;
    const ipAddress = req.ip;
    const userAgent = req.get('user-agent');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Get current active terms version
        const termsVersionRes = await client.query('SELECT id FROM terms_versions WHERE is_active = TRUE LIMIT 1');
        const termsVersionId = termsVersionRes.rows[0]?.id || 1; // Fallback to version 1
        
        await client.query("UPDATE users SET has_accepted_terms = TRUE WHERE id = $1", [userId]);
        await client.query(
            "INSERT INTO user_agreements (user_id, ip_address, user_agent, terms_version_id) VALUES ($1, $2, $3, $4)",
            [userId, ipAddress, userAgent, termsVersionId]
        );
        await client.query('COMMIT');
        
        // Παίρνουμε τα ενημερωμένα στοιχεία του χρήστη για να φτιάξουμε νέο token
        const updatedUserRes = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        const user = updatedUserRes.rows[0];
        const payload = { user: { id: user.id, role: user.role, email: user.email, has_accepted_terms: user.has_accepted_terms } };
        
        jwt.sign(payload, 'mySuperSecretKey123', { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token }); // Στέλνουμε το νέο, ενημερωμένο token
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
};

// --- GET TEAM FOR A TEAMLEADER ---
const getMyTeam = async (req, res) => {
    const teamLeaderId = req.user.id;
    try {
        const result = await pool.query('SELECT id, name, role FROM users WHERE parent_user_id = $1 AND deleted_at IS NULL ORDER BY name ASC', [teamLeaderId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET A SINGLE USER (FOR FORMS, etc.) ---
const getUserById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT id, name, email, role, parent_user_id, is_vat_liable FROM users WHERE id = $1', [id]);
        if (result.rows.length === 0) { return res.status(404).send('User not found'); }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET USER AGREEMENT (FOR ADMIN) ---
const getUserAgreement = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `SELECT 
                u.id, u.name, u.email, u.has_accepted_terms,
                ua.accepted_at, ua.ip_address, ua.user_agent, ua.terms_version_id,
                tv.version as terms_version, tv.title as terms_title
             FROM users u 
             LEFT JOIN user_agreements ua ON u.id = ua.user_id 
             LEFT JOIN terms_versions tv ON ua.terms_version_id = tv.id
             WHERE u.id = $1`, 
            [id]
        );
        if (result.rows.length === 0) { 
            return res.status(404).json({ message: 'User not found' }); 
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// --- GENERATE AGREEMENT PDF (FOR ADMIN) ---
const generateAgreementPdf = async (req, res) => {
    const { id } = req.params;
    try {
        // Get user's terms acceptance info from new system
        const result = await pool.query(
            `SELECT 
                u.name as user_name, 
                u.email as user_email,
                uta.accepted_at,
                uta.ip_address,
                uta.user_agent,
                t.version as terms_version,
                t.title as terms_title,
                t.content as terms_content,
                t.effective_date
            FROM users u
            LEFT JOIN user_terms_acceptance uta ON u.id = uta.user_id
            LEFT JOIN terms_of_service t ON uta.terms_id = t.id
            WHERE u.id = $1 AND uta.accepted_at IS NOT NULL
            ORDER BY uta.accepted_at DESC
            LIMIT 1`,
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No terms acceptance found for this user' });
        }
        
        const agreement = result.rows[0];
        
        // Prepare data for the new document generator
        const documentData = {
            agreement: agreement,
            userId: id
        };

        // Generate PDF using the new enterprise system
        const doc = await documentGenerator.generatePDF('terms_acceptance', documentData);

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="αποδοχη_ορων_${agreement.user_name.replace(/\s+/g, '_')}_v${agreement.terms_version}.pdf"`);
        
        // Pipe the document to response
        doc.pipe(res);
        doc.end();
        
    } catch (err) {
        console.error('Enterprise PDF Generation Error:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    loginUser,
    createUser,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getMyTeam,
    acceptTerms,
    getUserAgreement,
    generateAgreementPdf
};