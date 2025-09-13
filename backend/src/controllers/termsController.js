const pool = require('../config/db');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const { generateTermsPdf } = require('../utils/pdfGenerator');

// --- GET CURRENT TERMS ---
const getCurrentTerms = async (req, res) => {
    try {
        const query = `
            SELECT id, version, title, content, effective_date, created_at
            FROM terms_of_service 
            WHERE is_current = TRUE
            ORDER BY effective_date DESC
            LIMIT 1
        `;
        const result = await pool.query(query);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No current terms of service found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting current terms:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET TERMS HISTORY ---
const getTermsHistory = async (req, res) => {
    try {
        const query = `
            SELECT id, version, title, effective_date, is_current, created_at,
                   u.name as created_by_name
            FROM terms_of_service t
            LEFT JOIN users u ON t.created_by = u.id
            ORDER BY effective_date DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting terms history:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET SPECIFIC TERMS VERSION ---
const getTermsVersion = async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT id, version, title, content, effective_date, is_current, created_at,
                   u.name as created_by_name
            FROM terms_of_service t
            LEFT JOIN users u ON t.created_by = u.id
            WHERE t.id = $1
        `;
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Terms version not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error getting terms version:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- CHECK USER ACCEPTANCE STATUS ---
const getUserAcceptanceStatus = async (req, res) => {
    const { id: userId } = req.user;
    
    try {
        // Get current terms
        const currentTermsQuery = `
            SELECT id, version, effective_date
            FROM terms_of_service 
            WHERE is_current = TRUE
        `;
        const currentTermsResult = await pool.query(currentTermsQuery);
        
        if (currentTermsResult.rows.length === 0) {
            return res.json({ needsAcceptance: false, message: 'No current terms defined' });
        }
        
        const currentTerms = currentTermsResult.rows[0];
        
        // Check if user has accepted current terms
        const acceptanceQuery = `
            SELECT accepted_at
            FROM user_terms_acceptance
            WHERE user_id = $1 AND terms_id = $2
        `;
        const acceptanceResult = await pool.query(acceptanceQuery, [userId, currentTerms.id]);
        
        const hasAccepted = acceptanceResult.rows.length > 0;
        
        res.json({
            needsAcceptance: !hasAccepted,
            currentTerms: currentTerms,
            acceptedAt: hasAccepted ? acceptanceResult.rows[0].accepted_at : null
        });
    } catch (err) {
        console.error('Error checking user acceptance:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- ACCEPT CURRENT TERMS ---
const acceptCurrentTerms = async (req, res) => {
    const { id: userId } = req.user;
    const clientIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    // Enterprise-level audit logging
    console.log('[TERMS_CONTROLLER] Terms acceptance attempt initiated', {
        userId,
        userEmail: req.user.email,
        clientIP,
        userAgent,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
    });
    
    try {
        // Get current terms
        const currentTermsQuery = `
            SELECT id FROM terms_of_service WHERE is_current = TRUE
        `;
        const currentTermsResult = await pool.query(currentTermsQuery);
        
        if (currentTermsResult.rows.length === 0) {
            return res.status(404).json({ message: 'No current terms of service found' });
        }
        
        const termsId = currentTermsResult.rows[0].id;
        
        // Record acceptance (ON CONFLICT DO NOTHING to handle duplicate attempts)
        const acceptQuery = `
            INSERT INTO user_terms_acceptance (user_id, terms_id, accepted_at, ip_address, user_agent)
            VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4)
            ON CONFLICT (user_id, terms_id) DO NOTHING
            RETURNING accepted_at
        `;
        const acceptResult = await pool.query(acceptQuery, [userId, termsId, clientIP, userAgent]);
        
        // Update user record
        const updateUserQuery = `
            UPDATE users 
            SET current_terms_accepted_at = CURRENT_TIMESTAMP,
                needs_terms_acceptance = FALSE,
                has_accepted_terms = TRUE
            WHERE id = $1
            RETURNING *
        `;
        const userResult = await pool.query(updateUserQuery, [userId]);
        const updatedUser = userResult.rows[0];
        
        // Generate new JWT token with updated user data
        const tokenPayload = {
            user: {
                id: updatedUser.id,
                role: updatedUser.role,
                email: updatedUser.email,
                parent_user_id: updatedUser.parent_user_id,
                has_accepted_terms: true
            }
        };
        
        const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Enterprise audit log for successful acceptance
        console.log('[TERMS_CONTROLLER] Terms acceptance completed successfully', {
            userId,
            userEmail: req.user.email,
            termsId,
            clientIP,
            userAgent,
            acceptedAt: acceptResult.rows.length > 0 ? acceptResult.rows[0].accepted_at : new Date(),
            newTokenGenerated: true,
            timestamp: new Date().toISOString()
        });
        
        res.json({ 
            message: 'Terms accepted successfully',
            token: newToken,
            acceptedAt: acceptResult.rows.length > 0 ? acceptResult.rows[0].accepted_at : new Date()
        });
    } catch (err) {
        console.error('Error accepting terms:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: CREATE NEW TERMS VERSION ---
const createTermsVersion = async (req, res) => {
    const { version, title, content, effectiveDate } = req.body;
    const { id: createdBy } = req.user;
    
    try {
        // Insert new version
        const insertQuery = `
            INSERT INTO terms_of_service (version, title, content, effective_date, is_current, created_by)
            VALUES ($1, $2, $3, $4, TRUE, $5)
            RETURNING *
        `;
        const result = await pool.query(insertQuery, [
            version, 
            title, 
            content, 
            effectiveDate || new Date(),
            createdBy
        ]);
        
        const newTerms = result.rows[0];
        
        // Generate PDF for the new terms
        try {
            const pdfResult = await generateTermsPdf(newTerms);
            
            // Store PDF info in database
            const pdfInsertQuery = `
                INSERT INTO terms_pdf_files (terms_id, filename, file_path, file_size, created_at)
                VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                RETURNING *
            `;
            await pool.query(pdfInsertQuery, [
                newTerms.id,
                pdfResult.filename,
                pdfResult.filePath,
                pdfResult.fileSize
            ]);
            
            console.log(`PDF generated for terms version ${version}: ${pdfResult.filename}`);
        } catch (pdfError) {
            console.error('Error generating PDF for terms:', pdfError.message);
            // Don't fail the entire operation if PDF generation fails
        }
        
        // Mark all existing users as needing to accept new terms
        const updateUsersQuery = `
            UPDATE users SET needs_terms_acceptance = TRUE
        `;
        await pool.query(updateUsersQuery);
        
        res.status(201).json(newTerms);
    } catch (err) {
        console.error('Error creating terms version:', err.message);
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Version already exists' });
        }
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: UPDATE TERMS VERSION ---
const updateTermsVersion = async (req, res) => {
    const { id } = req.params;
    const { title, content } = req.body;
    
    try {
        const updateQuery = `
            UPDATE terms_of_service 
            SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `;
        const result = await pool.query(updateQuery, [title, content, id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Terms version not found' });
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating terms version:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: SET CURRENT VERSION ---
const setCurrentVersion = async (req, res) => {
    const { id } = req.params;
    
    try {
        const updateQuery = `
            UPDATE terms_of_service 
            SET is_current = CASE WHEN id = $1 THEN TRUE ELSE FALSE END
            WHERE id = $1 OR is_current = TRUE
        `;
        await pool.query(updateQuery, [id]);
        
        // Mark all users as needing to accept the new current terms
        const updateUsersQuery = `
            UPDATE users SET needs_terms_acceptance = TRUE
        `;
        await pool.query(updateUsersQuery);
        
        res.json({ message: 'Current terms version updated successfully' });
    } catch (err) {
        console.error('Error setting current version:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- ADMIN: GET USER ACCEPTANCE REPORT ---
const getUserAcceptanceReport = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id, u.name, u.email, u.role,
                u.current_terms_accepted_at,
                u.needs_terms_acceptance,
                t.version as accepted_terms_version,
                uta.accepted_at,
                uta.ip_address
            FROM users u
            LEFT JOIN user_terms_acceptance uta ON u.id = uta.user_id
            LEFT JOIN terms_of_service t ON uta.terms_id = t.id AND t.is_current = TRUE
            ORDER BY u.name
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting acceptance report:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- GET TERMS PDF FILES ---
const getTermsPdfFiles = async (req, res) => {
    try {
        const query = `
            SELECT 
                pdf.id, pdf.filename, pdf.file_size, pdf.created_at,
                t.id as terms_id, t.version, t.title, t.effective_date
            FROM terms_pdf_files pdf
            JOIN terms_of_service t ON pdf.terms_id = t.id
            ORDER BY t.effective_date DESC, pdf.created_at DESC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (err) {
        console.error('Error getting PDF files:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- DOWNLOAD TERMS PDF ---
const downloadTermsPdf = async (req, res) => {
    const { id } = req.params;
    
    try {
        const query = `
            SELECT pdf.filename, pdf.file_path, t.version, t.title
            FROM terms_pdf_files pdf
            JOIN terms_of_service t ON pdf.terms_id = t.id
            WHERE pdf.id = $1
        `;
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'PDF file not found' });
        }
        
        const pdfFile = result.rows[0];
        
        // Check if file exists
        if (!fs.existsSync(pdfFile.file_path)) {
            return res.status(404).json({ message: 'PDF file not found on disk' });
        }
        
        // Set appropriate headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${pdfFile.filename}"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(pdfFile.file_path);
        fileStream.pipe(res);
    } catch (err) {
        console.error('Error downloading PDF:', err.message);
        res.status(500).send('Server Error');
    }
};

// --- GENERATE PDF FOR EXISTING TERMS ---
const generatePdfForTerms = async (req, res) => {
    const { id } = req.params;
    
    try {
        // Get terms data
        const termsQuery = `
            SELECT id, version, title, content, effective_date
            FROM terms_of_service
            WHERE id = $1
        `;
        const termsResult = await pool.query(termsQuery, [id]);
        
        if (termsResult.rows.length === 0) {
            return res.status(404).json({ message: 'Terms version not found' });
        }
        
        const terms = termsResult.rows[0];
        
        // Generate PDF
        const pdfResult = await generateTermsPdf(terms);
        
        // Store PDF info in database
        const pdfInsertQuery = `
            INSERT INTO terms_pdf_files (terms_id, filename, file_path, file_size, created_at)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
            RETURNING *
        `;
        const pdfDbResult = await pool.query(pdfInsertQuery, [
            terms.id,
            pdfResult.filename,
            pdfResult.filePath,
            pdfResult.fileSize
        ]);
        
        res.json({
            message: 'PDF generated successfully',
            pdf: pdfDbResult.rows[0],
            fileInfo: {
                filename: pdfResult.filename,
                fileSize: pdfResult.fileSize
            }
        });
    } catch (err) {
        console.error('Error generating PDF:', err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = {
    getCurrentTerms,
    getTermsHistory,
    getTermsVersion,
    getUserAcceptanceStatus,
    acceptCurrentTerms,
    createTermsVersion,
    updateTermsVersion,
    setCurrentVersion,
    getUserAcceptanceReport,
    getTermsPdfFiles,
    downloadTermsPdf,
    generatePdfForTerms
};