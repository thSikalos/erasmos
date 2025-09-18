const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// =============================================
// LEGAL COMPLIANCE API ROUTES
// =============================================
// Purpose: Bulletproof legal protection system
// GDPR Compliance, Audit Trail, Legal Validity
// Maximum liability protection for Θεολόγης
// =============================================

// Legal Action Logger Middleware
const logLegalAction = async (req, actionType, description, isSignificant = false) => {
    try {
        const userId = req.user?.id || null;
        const userAgent = req.get('User-Agent') || '';
        const ipAddress = req.ip || req.connection.remoteAddress || '';
        const geoData = await getGeoLocation(ipAddress);

        await pool.query(`
            INSERT INTO legal_action_logs (
                user_id, action_type, action_description, ip_address,
                user_agent, additional_data, is_legally_significant,
                created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        `, [
            userId, actionType, description, ipAddress,
            userAgent, JSON.stringify(geoData), isSignificant
        ]);

        if (isSignificant) {
            console.log(`🚨 SIGNIFICANT LEGAL ACTION: ${actionType} - ${description}`);
        }
    } catch (error) {
        console.error('Failed to log legal action:', error);
    }
};

// =============================================
// ADMIN LEGAL DASHBOARD ROUTES
// =============================================

// GET /api/legal/admin/dashboard - Comprehensive Legal Dashboard
router.get('/admin/dashboard', authMiddleware, async (req, res) => {
    try {
        await logLegalAction(req, 'ADMIN_DASHBOARD_ACCESS', 'Admin accessed legal compliance dashboard', true);

        // Get comprehensive legal compliance metrics
        const [
            totalUsers,
            totalAcceptances,
            validAcceptances,
            expiredAcceptances,
            pendingAcceptances,
            pendingVerifications,
            auditTrailCount,
            recentAcceptances,
            complianceStats,
            rightsRequests
        ] = await Promise.all([
            // Total users
            pool.query('SELECT COUNT(*) as count FROM users'),

            // Total legal acceptances
            pool.query('SELECT COUNT(*) as count FROM legal_acceptances'),

            // Valid acceptances (complete and verified)
            pool.query('SELECT COUNT(*) as count FROM legal_acceptances WHERE is_valid = true'),

            // Expired acceptances (you might need to define expiration logic)
            pool.query('SELECT COUNT(*) as count FROM legal_acceptances WHERE is_complete = true AND is_valid = false'),

            // Users without any legal acceptance
            pool.query(`
                SELECT COUNT(*) as count
                FROM users u
                LEFT JOIN legal_acceptances la ON u.id = la.user_id
                WHERE la.id IS NULL
            `),

            // Pending email verifications
            pool.query(`
                SELECT
                    lev.*,
                    u.name as user_name,
                    u.email as user_email,
                    la.id as acceptance_id
                FROM legal_email_verifications lev
                LEFT JOIN legal_acceptances la ON lev.acceptance_id = la.id
                LEFT JOIN users u ON la.user_id = u.id
                WHERE lev.status = 'sent'
                ORDER BY lev.sent_at DESC
                LIMIT 20
            `),

            // Total audit trail entries
            pool.query('SELECT COUNT(*) as count FROM legal_action_logs'),

            // Recent acceptances
            pool.query(`
                SELECT
                    la.*,
                    u.name as user_name,
                    u.email as user_email
                FROM legal_acceptances la
                LEFT JOIN users u ON la.user_id = u.id
                ORDER BY la.acceptance_timestamp DESC
                LIMIT 20
            `),

            // Compliance statistics by document type - simplified for now
            pool.query(`
                SELECT
                    'overall' as document_type,
                    COUNT(*) as acceptance_count,
                    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_count
                FROM legal_acceptances
            `),

            // Rights requests (if any exist)
            pool.query(`
                SELECT * FROM data_subject_rights_requests
                ORDER BY received_at DESC
                LIMIT 10
            `)
        ]);

        // Calculate compliance metrics
        const totalUsersCount = parseInt(totalUsers.rows[0].count);
        const totalValidAcceptances = parseInt(validAcceptances.rows[0].count);
        const totalExpiredAcceptances = parseInt(expiredAcceptances.rows[0].count);
        const totalPendingAcceptances = parseInt(pendingAcceptances.rows[0].count);
        const totalPendingVerifications = pendingVerifications.rows.length;

        // Calculate email verification rate
        const emailVerificationRate = totalUsersCount > 0
            ? ((totalValidAcceptances / totalUsersCount) * 100).toFixed(1)
            : 0;

        // Calculate overall compliance score
        const overallComplianceScore = totalUsersCount > 0
            ? Math.round((totalValidAcceptances / totalUsersCount) * 100)
            : 0;

        // Generate compliance alerts (simplified for now)
        const complianceAlerts = [];
        if (totalExpiredAcceptances > 0) {
            complianceAlerts.push({
                severity: 'high',
                title: 'Ληγμένες Αποδοχές',
                description: `${totalExpiredAcceptances} χρήστες με ληγμένες αποδοχές`,
                created_at: new Date().toISOString()
            });
        }
        if (totalPendingAcceptances > totalUsersCount * 0.1) {
            complianceAlerts.push({
                severity: 'medium',
                title: 'Χαμηλό Ποσοστό Αποδοχής',
                description: `${totalPendingAcceptances} χρήστες χωρίς νομική αποδοχή`,
                created_at: new Date().toISOString()
            });
        }

        const dashboardData = {
            overview: {
                totalUsers: totalUsersCount,
                usersWithValidAcceptance: totalValidAcceptances,
                usersWithExpiredAcceptance: totalExpiredAcceptances,
                usersPendingAcceptance: totalPendingAcceptances,
                emailVerificationRate: parseFloat(emailVerificationRate),
                overallComplianceScore: overallComplianceScore
            },
            recentAcceptances: recentAcceptances.rows,
            pendingVerifications: pendingVerifications.rows,
            rightsRequests: rightsRequests.rows,
            complianceAlerts: complianceAlerts
        };

        res.json(dashboardData);

    } catch (error) {
        console.error('Legal dashboard error:', error);
        await logLegalAction(req, 'ADMIN_DASHBOARD_ERROR', `Dashboard access failed: ${error.message}`, true);
        res.status(500).json({
            error: 'Failed to load legal dashboard',
            message: error.message
        });
    }
});

// =============================================
// HELPER FUNCTIONS
// =============================================

async function getCurrentDocumentVersions() {
    try {
        const result = await pool.query(`
            SELECT document_type, version, created_at, is_active
            FROM legal_document_versions
            WHERE is_active = true
            ORDER BY document_type, version DESC
        `);
        return result.rows;
    } catch (error) {
        console.error('Error getting document versions:', error);
        return [];
    }
}

async function getGeoLocation(ipAddress) {
    // Simplified geolocation - in production, use a proper service
    try {
        // Remove this in production and use actual geo service
        return {
            country: 'GR',
            region: 'Attica',
            city: 'Athens',
            ip: ipAddress
        };
    } catch (error) {
        console.error('Geolocation failed:', error);
        return null;
    }
}

// Email verification function placeholder
function sendVerificationEmailPlaceholder(email, token, userName) {
    console.log(`Email verification disabled. Would send to: ${email} with token: ${token}`);
    return Promise.resolve({ success: true, message: 'Email verification disabled' });
}

module.exports = router;