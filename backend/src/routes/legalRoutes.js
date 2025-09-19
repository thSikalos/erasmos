const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const EmailService = require('../services/emailService');

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
// USER LEGAL COMPLIANCE ROUTES
// =============================================

// GET /api/legal/status - Check user's legal compliance status
router.get('/status', authMiddleware, async (req, res) => {
    console.log('🔍 [LEGAL_STATUS] API call received for user:', req.user?.id, req.user?.email);
    try {
        const userId = req.user.id;

        // Check if user has any legal acceptance
        const acceptanceResult = await pool.query(`
            SELECT
                id,
                is_valid,
                is_complete,
                email_verified,
                terms_accepted,
                dpa_accepted,
                privacy_accepted,
                declarations_accepted,
                acceptance_timestamp,
                email_verification_required
            FROM legal_acceptances
            WHERE user_id = $1
            AND superseded_by IS NULL
            ORDER BY acceptance_timestamp DESC
            LIMIT 1
        `, [userId]);

        const hasAcceptance = acceptanceResult.rows.length > 0;
        const acceptance = hasAcceptance ? acceptanceResult.rows[0] : null;

        // Determine compliance status
        let complianceStatus = 'not_started';
        let requiresAction = true;
        let nextAction = 'legal_acceptance';

        if (hasAcceptance) {
            if (acceptance.is_valid) {
                complianceStatus = 'compliant';
                requiresAction = false;
                nextAction = null;
            } else if (acceptance.is_complete && !acceptance.email_verified && acceptance.email_verification_required) {
                complianceStatus = 'pending_email_verification';
                requiresAction = true;
                nextAction = 'email_verification';
            } else if (!acceptance.is_complete) {
                complianceStatus = 'incomplete';
                requiresAction = true;
                nextAction = 'complete_acceptance';
            }
        }

        const statusResponse = {
            userId: userId,
            complianceStatus: complianceStatus,
            requiresAction: requiresAction,
            nextAction: nextAction,
            hasAcceptance: hasAcceptance,
            acceptance: acceptance ? {
                id: acceptance.id,
                isValid: acceptance.is_valid,
                isComplete: acceptance.is_complete,
                emailVerified: acceptance.email_verified,
                acceptanceTimestamp: acceptance.acceptance_timestamp,
                individualAcceptances: {
                    terms: acceptance.terms_accepted,
                    dpa: acceptance.dpa_accepted,
                    privacy: acceptance.privacy_accepted,
                    declarations: acceptance.declarations_accepted
                }
            } : null,
            message: getComplianceMessage(complianceStatus)
        };

        await logLegalAction(req, 'COMPLIANCE_STATUS_CHECK', `User compliance status checked: ${complianceStatus}`, false);

        res.json(statusResponse);

    } catch (error) {
        console.error('Legal status check error:', error);
        await logLegalAction(req, 'COMPLIANCE_STATUS_ERROR', `Status check failed: ${error.message}`, true);
        res.status(500).json({
            error: 'Failed to check legal compliance status',
            message: error.message
        });
    }
});

// POST /api/legal/acceptance - Create new legal acceptance
router.post('/acceptance', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            acceptances,
            declarations,
            sessionId,
            userAgent
        } = req.body;

        // Get IP address from request
        const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';

        // Generate verification code
        const emailService = new EmailService();
        const verificationCode = emailService.generateVerificationCode();

        // Also generate a token for backward compatibility
        const emailVerificationToken = require('uuid').v4();

        // Determine if email verification is required (default: true)
        const emailVerificationRequired = true;

        // Create the legal acceptance record
        const insertResult = await pool.query(`
            INSERT INTO legal_acceptances (
                user_id,
                session_id,
                acceptance_timestamp,
                ip_address,
                user_agent,
                geo_location,
                terms_version,
                dpa_version,
                privacy_version,
                declarations_version,
                terms_accepted,
                terms_accepted_at,
                dpa_accepted,
                dpa_accepted_at,
                privacy_accepted,
                privacy_accepted_at,
                declarations_accepted,
                declarations_accepted_at,
                email_verification_required,
                email_verification_token,
                verification_code,
                email_verified,
                is_complete,
                is_valid,
                created_at,
                updated_at
            ) VALUES (
                $1, $2, NOW(), $3, $4, $5, $6, $7, $8, $9,
                $10, CASE WHEN $10 THEN NOW() ELSE NULL END,
                $11, CASE WHEN $11 THEN NOW() ELSE NULL END,
                $12, CASE WHEN $12 THEN NOW() ELSE NULL END,
                $13, CASE WHEN $13 THEN NOW() ELSE NULL END,
                $14, $15, $16, false,
                CASE WHEN $10 AND $11 AND $12 AND $13 THEN true ELSE false END,
                false,
                NOW(), NOW()
            )
            RETURNING id, verification_code, email_verification_token
        `, [
            userId,
            sessionId || require('uuid').v4(),
            ipAddress,
            userAgent || req.get('User-Agent') || '',
            JSON.stringify({ country: 'GR', region: 'Unknown', city: 'Unknown', ip: ipAddress }),
            '1.0', // terms_version
            '1.0', // dpa_version
            '1.0', // privacy_version
            '1.0', // declarations_version
            acceptances?.termsOfService || false,
            acceptances?.dataProcessingAgreement || false,
            acceptances?.privacyPolicy || false,
            acceptances?.userDeclarations || false,
            emailVerificationRequired,
            emailVerificationToken,
            verificationCode
        ]);

        const acceptanceId = insertResult.rows[0].id;

        // Store user compliance declarations if provided
        if (declarations && Object.keys(declarations).length > 0) {
            await pool.query(`
                INSERT INTO user_compliance_declarations (
                    legal_acceptance_id,
                    has_legal_authority,
                    has_legal_authority_details,
                    has_obtained_consents,
                    consent_method,
                    has_informed_data_subjects,
                    information_method,
                    data_is_accurate,
                    data_accuracy_verification_method,
                    accepts_liability,
                    understands_obligations,
                    accepts_billing,
                    confirms_lawful_basis,
                    lawful_basis_type,
                    confirms_data_minimization,
                    confirms_purpose_limitation,
                    confirms_retention_limits,
                    data_subject_categories,
                    personal_data_categories,
                    special_categories_processed,
                    business_purpose,
                    retention_period_months,
                    created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, NOW()
                )
            `, [
                acceptanceId,
                declarations.hasLegalAuthority || false,
                declarations.legalAuthorityDetails || null,
                declarations.hasObtainedConsents || false,
                declarations.consentMethod || null,
                declarations.hasInformedDataSubjects || false,
                declarations.informationMethod || null,
                declarations.dataIsAccurate || false,
                declarations.dataAccuracyMethod || null,
                declarations.acceptsLiability || false,
                declarations.understandsObligations || false,
                declarations.acceptsBilling || false,
                declarations.confirmsLawfulBasis || false,
                declarations.lawfulBasisType || null,
                declarations.confirmsDataMinimization || false,
                declarations.confirmsPurposeLimitation || false,
                declarations.confirmsRetentionLimits || false,
                JSON.stringify(declarations.dataSubjectCategories || []),
                JSON.stringify(declarations.personalDataCategories || []),
                declarations.specialCategoriesProcessed || false,
                declarations.businessPurpose || '',
                declarations.retentionPeriodMonths || null
            ]);
        }

        // Create email verification record
        await pool.query(`
            INSERT INTO legal_email_verifications (
                acceptance_id,
                email,
                verification_token,
                status,
                sent_at,
                ip_address,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, 'sent', NOW(), $4, NOW(), NOW())
        `, [
            acceptanceId,
            req.user.email,
            emailVerificationToken, // Keep using token for verification table for compatibility
            ipAddress
        ]);

        // Log the action
        await logLegalAction(req, 'LEGAL_ACCEPTANCE_CREATED',
            `User created legal acceptance with ID ${acceptanceId}`, true);

        // Response
        res.status(201).json({
            success: true,
            message: 'Legal acceptance recorded successfully',
            acceptanceId: acceptanceId,
            emailVerificationRequired: emailVerificationRequired,
            verificationCode: verificationCode
        });

    } catch (error) {
        console.error('Legal acceptance creation error:', error);
        await logLegalAction(req, 'LEGAL_ACCEPTANCE_ERROR',
            `Failed to create legal acceptance: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to record legal acceptance',
            message: error.message
        });
    }
});

// POST /api/legal/send-verification - Send verification email
router.post('/send-verification', authMiddleware, async (req, res) => {
    try {
        const { verificationCode } = req.body;
        const userId = req.user.id;

        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                error: 'Verification code is required'
            });
        }

        // Find the acceptance record to get the acceptance ID
        const acceptanceResult = await pool.query(`
            SELECT id FROM legal_acceptances
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        if (acceptanceResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No legal acceptance found for this user'
            });
        }

        const acceptanceId = acceptanceResult.rows[0].id;

        // Send the actual verification email using EmailService
        try {
            const emailService = new EmailService();
            await emailService.sendLegalVerificationEmail(
                req.user.email,
                verificationCode,
                acceptanceId
            );

            // Log the action
            await logLegalAction(req, 'EMAIL_VERIFICATION_SENT',
                `Verification email sent with code: ${verificationCode} to ${req.user.email}`, false);

            console.log(`[LEGAL] Verification email sent to: ${req.user.email} with code: ${verificationCode}`);

            res.json({
                success: true,
                message: 'Verification email sent successfully',
                email: req.user.email,
                acceptanceId: acceptanceId
            });
        } catch (emailError) {
            console.error('[LEGAL] Failed to send verification email:', emailError);

            // Log the email failure
            await logLegalAction(req, 'EMAIL_VERIFICATION_ERROR',
                `Failed to send verification email: ${emailError.message}`, true);

            // Return success but with a warning - the legal acceptance was saved
            res.json({
                success: true,
                message: 'Legal acceptance saved, but verification email could not be sent. Please contact support.',
                email: req.user.email,
                acceptanceId: acceptanceId,
                emailWarning: emailError.message
            });
        }

    } catch (error) {
        console.error('Send verification email error:', error);
        await logLegalAction(req, 'EMAIL_VERIFICATION_ERROR',
            `Failed to send verification email: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to send verification email',
            message: error.message
        });
    }
});

// POST /api/legal/resend-verification - Resend verification email with rate limiting
router.post('/resend-verification', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Find the latest acceptance for this user
        const acceptanceResult = await pool.query(`
            SELECT id, verification_code
            FROM legal_acceptances
            WHERE user_id = $1
            AND email_verified = false
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId]);

        if (acceptanceResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No pending email verification found'
            });
        }

        const acceptance = acceptanceResult.rows[0];
        const acceptanceId = acceptance.id;

        // Generate a NEW verification code (latest code wins policy)
        const emailService = new EmailService();
        const newVerificationCode = emailService.generateVerificationCode();

        // Update the acceptance record with the new verification code
        await pool.query(`
            UPDATE legal_acceptances
            SET verification_code = $1, updated_at = NOW()
            WHERE id = $2
        `, [newVerificationCode, acceptanceId]);

        console.log(`[LEGAL] Generated new verification code for resend: ${newVerificationCode} (previous code invalidated)`);

        // Check rate limiting - max 3 resends per 24 hours
        const resendCheckResult = await pool.query(`
            SELECT COUNT(*) as resend_count
            FROM legal_email_verifications
            WHERE acceptance_id = $1
            AND status = 'sent'
            AND sent_at > NOW() - INTERVAL '24 hours'
        `, [acceptanceId]);

        const resendCount = parseInt(resendCheckResult.rows[0].resend_count);
        if (resendCount >= 3) {
            return res.status(429).json({
                success: false,
                error: 'Maximum resend attempts reached. Please wait 24 hours before trying again.',
                retryAfter: '24 hours'
            });
        }

        // Send the verification email using EmailService with the NEW code
        try {
            await emailService.sendLegalVerificationEmail(
                req.user.email,
                newVerificationCode,
                acceptanceId
            );

            // Log the resend action
            await logLegalAction(req, 'EMAIL_VERIFICATION_RESENT',
                `Verification email resent (attempt ${resendCount + 1}) with new code ${newVerificationCode} for acceptance ID: ${acceptanceId}`, false);

            console.log(`[LEGAL] Verification email resent to: ${req.user.email} (attempt ${resendCount + 1}) with new code: ${newVerificationCode}`);

            res.json({
                success: true,
                message: 'Verification email resent successfully with new code',
                email: req.user.email,
                acceptanceId: acceptanceId,
                verificationCode: newVerificationCode,
                attemptsRemaining: 3 - (resendCount + 1)
            });
        } catch (emailError) {
            console.error('[LEGAL] Failed to resend verification email:', emailError);

            // Log the email failure
            await logLegalAction(req, 'EMAIL_VERIFICATION_RESEND_ERROR',
                `Failed to resend verification email: ${emailError.message}`, true);

            res.status(500).json({
                success: false,
                error: 'Failed to resend verification email',
                message: emailError.message
            });
        }

    } catch (error) {
        console.error('Resend verification email error:', error);
        await logLegalAction(req, 'EMAIL_VERIFICATION_RESEND_ERROR',
            `Resend verification failed: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to resend verification email',
            message: error.message
        });
    }
});

// POST /api/legal/verify-email - Verify email with token (deprecated - kept for compatibility)
router.post('/verify-email', authMiddleware, async (req, res) => {
    try {
        const { verificationToken } = req.body;
        const userId = req.user.id;

        if (!verificationToken) {
            return res.status(400).json({
                success: false,
                error: 'Verification token is required'
            });
        }

        // Find the verification record
        const verificationResult = await pool.query(`
            SELECT lev.*, la.id as acceptance_id
            FROM legal_email_verifications lev
            LEFT JOIN legal_acceptances la ON lev.acceptance_id = la.id
            WHERE lev.verification_token = $1 AND la.user_id = $2 AND lev.status = 'sent'
        `, [verificationToken, userId]);

        if (verificationResult.rows.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid or expired verification token'
            });
        }

        const verification = verificationResult.rows[0];

        // Update verification status
        await pool.query(`
            UPDATE legal_email_verifications
            SET status = 'verified', verified_at = NOW(), updated_at = NOW()
            WHERE id = $1
        `, [verification.id]);

        // Update legal acceptance as email verified and valid
        await pool.query(`
            UPDATE legal_acceptances
            SET email_verified = true, is_valid = true, updated_at = NOW()
            WHERE id = $1
        `, [verification.acceptance_id]);

        // Log the action
        await logLegalAction(req, 'EMAIL_VERIFICATION_COMPLETED',
            `Email verification completed for acceptance ID: ${verification.acceptance_id}`, true);

        res.json({
            success: true,
            message: 'Email verification completed successfully',
            acceptanceId: verification.acceptance_id
        });

    } catch (error) {
        console.error('Email verification error:', error);
        await logLegalAction(req, 'EMAIL_VERIFICATION_ERROR',
            `Email verification failed: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to verify email',
            message: error.message
        });
    }
});

// POST /api/legal/verify-code - Verify email with manual code
router.post('/verify-code', authMiddleware, async (req, res) => {
    try {
        const { verificationCode } = req.body;
        const userId = req.user.id;

        if (!verificationCode) {
            return res.status(400).json({
                success: false,
                error: 'Verification code is required'
            });
        }

        // Validate code format (6 characters, alternating letters and numbers)
        const codePattern = /^[A-Z][0-9][A-Z][0-9][A-Z][0-9]$/;
        if (!codePattern.test(verificationCode)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid verification code format'
            });
        }

        // Find the acceptance record with this verification code
        const acceptanceResult = await pool.query(`
            SELECT id, created_at, email_verified
            FROM legal_acceptances
            WHERE user_id = $1
            AND verification_code = $2
            AND email_verified = false
            ORDER BY created_at DESC
            LIMIT 1
        `, [userId, verificationCode]);

        if (acceptanceResult.rows.length === 0) {
            await logLegalAction(req, 'EMAIL_VERIFICATION_FAILED',
                `Invalid verification code attempt: ${verificationCode}`, true);

            return res.status(400).json({
                success: false,
                error: 'Invalid verification code'
            });
        }

        const acceptance = acceptanceResult.rows[0];

        // Check if code has expired (24 hours)
        const now = new Date();
        const createdAt = new Date(acceptance.created_at);
        const hoursDifference = (now - createdAt) / (1000 * 60 * 60);

        if (hoursDifference > 24) {
            await logLegalAction(req, 'EMAIL_VERIFICATION_FAILED',
                `Expired verification code attempt: ${verificationCode}`, true);

            return res.status(400).json({
                success: false,
                error: 'Verification code has expired. Please request a new one.'
            });
        }

        // Update legal acceptance as email verified and valid
        await pool.query(`
            UPDATE legal_acceptances
            SET email_verified = true, is_valid = true, updated_at = NOW()
            WHERE id = $1
        `, [acceptance.id]);

        // Update verification status in legal_email_verifications table
        // Note: We update all records for this acceptance_id since we're using verification_code now
        await pool.query(`
            UPDATE legal_email_verifications
            SET status = 'verified', verified_at = NOW(), updated_at = NOW()
            WHERE acceptance_id = $1 AND status = 'sent'
        `, [acceptance.id]);

        // Log the successful action
        await logLegalAction(req, 'EMAIL_VERIFICATION_COMPLETED',
            `Email verification completed with code for acceptance ID: ${acceptance.id}`, true);

        res.json({
            success: true,
            message: 'Email verification completed successfully',
            acceptanceId: acceptance.id
        });

    } catch (error) {
        console.error('Code verification error:', error);
        await logLegalAction(req, 'EMAIL_VERIFICATION_ERROR',
            `Code verification failed: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to verify code',
            message: error.message
        });
    }
});

// =============================================
// ADMIN LEGAL DASHBOARD ROUTES
// =============================================

// GET /api/legal/admin/dashboard - Comprehensive Legal Dashboard
router.get('/admin/dashboard', authMiddleware, async (req, res) => {
    try {
        const { from, to } = req.query;

        // Set default date range if not provided
        const fromDate = from || '2024-01-01';
        const toDate = to || new Date().toISOString().split('T')[0];

        console.log(`[LEGAL] Admin dashboard access with date range: ${fromDate} to ${toDate}`);

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

            // All non-compliant users (pending email verifications + users without any legal acceptance)
            pool.query(`
                -- Users with pending email verification
                SELECT
                    la.id as acceptance_id,
                    la.verification_code,
                    la.created_at as sent_at,
                    u.name as user_name,
                    u.email,
                    'pending_verification' as status,
                    la.email_verification_required,
                    la.email_verified
                FROM legal_acceptances la
                LEFT JOIN users u ON la.user_id = u.id
                WHERE la.email_verification_required = true
                AND la.email_verified = false
                AND la.is_complete = true
                AND la.superseded_by IS NULL

                UNION ALL

                -- Users without any legal acceptance
                SELECT
                    NULL as acceptance_id,
                    NULL as verification_code,
                    u.password_changed_at as sent_at,
                    u.name as user_name,
                    u.email,
                    'no_acceptance' as status,
                    false as email_verification_required,
                    false as email_verified
                FROM users u
                LEFT JOIN legal_acceptances la ON u.id = la.user_id AND la.superseded_by IS NULL
                WHERE la.id IS NULL

                ORDER BY sent_at DESC
                LIMIT 50
            `),

            // Total audit trail entries
            pool.query('SELECT COUNT(*) as count FROM legal_action_logs'),

            // Recent acceptances (including status info)
            pool.query(`
                SELECT
                    la.*,
                    u.name as user_name,
                    u.email as user_email,
                    CASE
                        WHEN la.is_valid = true THEN 'COMPLIANT'
                        WHEN la.email_verified = true THEN 'EMAIL VERIFIED'
                        WHEN la.is_complete = true AND la.email_verification_required = true THEN 'PENDING VERIFICATION'
                        WHEN la.is_complete = true THEN 'COMPLETED'
                        ELSE 'INCOMPLETE'
                    END as status_display
                FROM legal_acceptances la
                LEFT JOIN users u ON la.user_id = u.id
                WHERE la.superseded_by IS NULL
                ORDER BY la.acceptance_timestamp DESC
                LIMIT 20
            `),

            // Compliance statistics - enhanced
            pool.query(`
                SELECT
                    'overall' as document_type,
                    COUNT(*) as total_acceptances,
                    COUNT(CASE WHEN is_valid = true THEN 1 END) as compliant_count,
                    COUNT(CASE WHEN email_verified = true THEN 1 END) as verified_count,
                    COUNT(CASE WHEN is_complete = true AND email_verified = false THEN 1 END) as pending_verification_count,
                    COUNT(CASE WHEN is_complete = false THEN 1 END) as incomplete_count,
                    ROUND(
                        (COUNT(CASE WHEN is_valid = true THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)), 2
                    ) as compliance_rate
                FROM legal_acceptances
                WHERE superseded_by IS NULL
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
        console.error('Error stack:', error.stack);

        try {
            await logLegalAction(req, 'ADMIN_DASHBOARD_ERROR', `Dashboard access failed: ${error.message}`, true);
        } catch (logError) {
            console.error('Failed to log dashboard error:', logError);
        }

        res.status(500).json({
            error: 'Failed to load legal dashboard',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
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

function getComplianceMessage(status) {
    const messages = {
        'not_started': 'Χρειάζεται ολοκλήρωση της νομικής αποδοχής για πρόσβαση στην εφαρμογή.',
        'incomplete': 'Η νομική αποδοχή είναι ημιτελής. Παρακαλώ ολοκληρώστε όλα τα βήματα.',
        'pending_email_verification': 'Η νομική αποδοχή έχει ολοκληρωθεί. Απαιτείται επιβεβαίωση email.',
        'compliant': 'Η νομική συμμόρφωση είναι πλήρης. Έχετε πλήρη πρόσβαση στην εφαρμογή.'
    };
    return messages[status] || 'Άγνωστη κατάσταση νομικής συμμόρφωσης.';
}

// Email verification function placeholder
function sendVerificationEmailPlaceholder(email, token, userName) {
    console.log(`Email verification disabled. Would send to: ${email} with token: ${token}`);
    return Promise.resolve({ success: true, message: 'Email verification disabled' });
}

// =============================================
// INDIVIDUAL CONTRACT EXPORT ROUTES
// =============================================

// GET /api/legal/contract/:acceptanceId - Export individual signed contract as PDF
router.get('/contract/:acceptanceId', authMiddleware, async (req, res) => {
    try {
        const { acceptanceId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        console.log(`[LEGAL] Generating signed contract PDF for acceptance ID: ${acceptanceId}`);

        // Get the acceptance record with user details
        const acceptanceResult = await pool.query(`
            SELECT
                la.*,
                u.name as user_name,
                u.email as user_email,
                u.address as user_address,
                u.afm as user_afm,
                u.phone as user_phone,
                ucd.has_legal_authority,
                ucd.has_obtained_consents,
                ucd.has_informed_data_subjects,
                ucd.data_is_accurate,
                ucd.accepts_liability,
                ucd.understands_obligations,
                ucd.accepts_billing,
                ucd.confirms_lawful_basis,
                ucd.lawful_basis_type,
                ucd.business_purpose,
                ucd.retention_period_months,
                ucd.data_subject_categories,
                ucd.personal_data_categories,
                ucd.special_categories_processed
            FROM legal_acceptances la
            LEFT JOIN users u ON la.user_id = u.id
            LEFT JOIN user_compliance_declarations ucd ON la.id = ucd.legal_acceptance_id
            WHERE la.id = $1
            AND (la.user_id = $2 OR $3 = 'admin')
        `, [acceptanceId, userId, userRole]);

        if (acceptanceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Legal acceptance not found or access denied'
            });
        }

        const acceptance = acceptanceResult.rows[0];

        // Check if contract is complete and valid
        if (!acceptance.is_complete || !acceptance.email_verified) {
            return res.status(400).json({
                success: false,
                error: 'Contract is not fully executed - missing email verification'
            });
        }

        // Generate the signed contract PDF
        const documentGenerator = require('../utils/documentGenerator');
        const contractData = {
            acceptance: acceptance,
            user: {
                name: acceptance.user_name,
                email: acceptance.user_email,
                address: acceptance.user_address,
                afm: acceptance.user_afm,
                phone: acceptance.user_phone
            },
            digitalSignature: {
                timestamp: acceptance.acceptance_timestamp,
                ipAddress: acceptance.ip_address,
                userAgent: acceptance.user_agent,
                sessionId: acceptance.session_id,
                verificationCode: acceptance.verification_code,
                emailVerifiedAt: acceptance.email_verified_at
            },
            declarations: {
                hasLegalAuthority: acceptance.has_legal_authority,
                hasObtainedConsents: acceptance.has_obtained_consents,
                hasInformedDataSubjects: acceptance.has_informed_data_subjects,
                dataIsAccurate: acceptance.data_is_accurate,
                acceptsLiability: acceptance.accepts_liability,
                understandsObligations: acceptance.understands_obligations,
                acceptsBilling: acceptance.accepts_billing,
                confirmsLawfulBasis: acceptance.confirms_lawful_basis,
                lawfulBasisType: acceptance.lawful_basis_type,
                businessPurpose: acceptance.business_purpose,
                retentionPeriodMonths: acceptance.retention_period_months,
                dataSubjectCategories: acceptance.data_subject_categories,
                personalDataCategories: acceptance.personal_data_categories,
                specialCategoriesProcessed: acceptance.special_categories_processed
            }
        };

        const pdfDoc = await documentGenerator.generatePDF('signed_legal_contract', contractData);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="legal-contract-${acceptance.user_email}-${acceptanceId}.pdf"`);

        pdfDoc.pipe(res);
        pdfDoc.end();

        // Log the export action
        await logLegalAction(req, 'SIGNED_CONTRACT_EXPORTED',
            `Signed legal contract exported for acceptance ID: ${acceptanceId}`, true);

    } catch (error) {
        console.error('Signed contract export error:', error);
        await logLegalAction(req, 'SIGNED_CONTRACT_EXPORT_ERROR',
            `Failed to export signed contract: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to generate signed contract',
            message: error.message
        });
    }
});

// =============================================
// ADMIN EXPORT ROUTES
// =============================================

// GET /api/legal/admin/export - Export legal compliance report
router.get('/admin/export', authMiddleware, async (req, res) => {
    try {
        const { from, to, format = 'xlsx' } = req.query;

        // Basic date validation
        const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
        const toDate = to ? new Date(to) : new Date(); // Now

        console.log(`[LEGAL] Exporting legal compliance report from ${fromDate} to ${toDate}, format: ${format}`);

        // Gather comprehensive legal data
        const legalData = await gatherLegalComplianceData(fromDate, toDate);

        // Generate document using DocumentGenerator
        const documentGenerator = require('../utils/documentGenerator');

        if (format === 'pdf') {
            const pdfDoc = await documentGenerator.generatePDF('legal_compliance', legalData);

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="legal-compliance-report-${from}-${to}.pdf"`);

            pdfDoc.pipe(res);
            pdfDoc.end();
        } else {
            // Default to Excel
            const workbook = await documentGenerator.generateExcel('legal_compliance', legalData);

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="legal-compliance-report-${from}-${to}.xlsx"`);

            await workbook.xlsx.write(res);
            res.end();
        }

        // Log the export action
        await logLegalAction(req, 'LEGAL_EXPORT_GENERATED',
            `Legal compliance report exported (${format}) for period ${fromDate.toISOString()} to ${toDate.toISOString()}`, true);

    } catch (error) {
        console.error('Legal export error:', error);
        await logLegalAction(req, 'LEGAL_EXPORT_ERROR',
            `Failed to export legal compliance report: ${error.message}`, true);
        res.status(500).json({
            success: false,
            error: 'Failed to generate legal compliance report',
            message: error.message
        });
    }
});

// Helper function to gather comprehensive legal compliance data
async function gatherLegalComplianceData(fromDate, toDate) {
    try {
        // Get all legal acceptances within date range
        const acceptancesResult = await pool.query(`
            SELECT
                la.*,
                u.name as user_name,
                u.email as user_email,
                u.created_at as user_registration_date,
                ucd.has_legal_authority,
                ucd.has_obtained_consents,
                ucd.has_informed_data_subjects,
                ucd.data_is_accurate,
                ucd.accepts_liability,
                ucd.understands_obligations,
                ucd.accepts_billing,
                ucd.confirms_lawful_basis,
                ucd.lawful_basis_type,
                ucd.business_purpose,
                ucd.retention_period_months
            FROM legal_acceptances la
            LEFT JOIN users u ON la.user_id = u.id
            LEFT JOIN user_compliance_declarations ucd ON la.id = ucd.legal_acceptance_id
            WHERE la.created_at >= $1 AND la.created_at <= $2
            ORDER BY la.created_at DESC
        `, [fromDate, toDate]);

        // Get audit trail for the period
        const auditTrailResult = await pool.query(`
            SELECT
                lal.*,
                u.email as user_email
            FROM legal_action_logs lal
            LEFT JOIN users u ON lal.user_id = u.id
            WHERE lal.created_at >= $1 AND lal.created_at <= $2
            ORDER BY lal.created_at DESC
            LIMIT 1000
        `, [fromDate, toDate]);

        // Get comprehensive user status
        const usersStatusResult = await pool.query(`
            SELECT
                u.id,
                u.name,
                u.email,
                u.created_at,
                COUNT(la.id) as legal_acceptance_count,
                MAX(la.created_at) as latest_acceptance_date,
                CASE
                    WHEN COUNT(la.id) = 0 THEN 'NO ACCEPTANCE'
                    WHEN MAX(la.is_valid) = true THEN 'COMPLIANT'
                    WHEN MAX(la.email_verified) = true THEN 'EMAIL VERIFIED'
                    WHEN MAX(la.is_complete) = true THEN 'PENDING VERIFICATION'
                    ELSE 'INCOMPLETE'
                END as legal_status,
                CASE
                    WHEN MAX(la.email_verified) = true THEN 'VERIFIED'
                    WHEN MAX(la.email_verification_required) = true THEN 'PENDING'
                    ELSE 'NOT REQUIRED'
                END as email_verification_status,
                CASE
                    WHEN COUNT(la.id) = 0 THEN 'No legal acceptance started'
                    WHEN MAX(la.is_valid) = false AND MAX(la.email_verified) = false THEN 'Email verification pending'
                    ELSE 'None'
                END as compliance_issues
            FROM users u
            LEFT JOIN legal_acceptances la ON u.id = la.user_id AND la.superseded_by IS NULL
            GROUP BY u.id, u.name, u.email, u.created_at
            ORDER BY u.created_at DESC
        `);

        // Calculate statistics
        const stats = {
            totalAcceptances: acceptancesResult.rows.length,
            completedAcceptances: acceptancesResult.rows.filter(a => a.is_valid).length,
            pendingVerifications: acceptancesResult.rows.filter(a => !a.email_verified && a.email_verification_required).length,
            usersWithoutAcceptance: usersStatusResult.rows.filter(u => u.legal_acceptance_count == 0).length,
            incompleteAcceptances: acceptancesResult.rows.filter(a => !a.is_complete).length,
            fromDate: fromDate.toISOString().split('T')[0],
            toDate: toDate.toISOString().split('T')[0],
            complianceRate: acceptancesResult.rows.length > 0 ?
                Math.round((acceptancesResult.rows.filter(a => a.is_valid).length / acceptancesResult.rows.length) * 100) : 0
        };

        return {
            stats,
            acceptances: acceptancesResult.rows,
            auditTrail: auditTrailResult.rows,
            usersStatus: usersStatusResult.rows
        };

    } catch (error) {
        console.error('Error gathering legal compliance data:', error);
        throw error;
    }
}

module.exports = router;