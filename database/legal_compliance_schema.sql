-- =============================================
-- ERASMOS LEGAL COMPLIANCE DATABASE SCHEMA
-- =============================================
-- Purpose: Bulletproof legal protection system
-- GDPR Compliance, Audit Trail, Legal Validity
-- Designed for maximum liability protection
-- =============================================

-- Document Versions Table
-- Tracks all versions of legal documents for audit purposes
CREATE TABLE legal_document_versions (
    id SERIAL PRIMARY KEY,
    document_type VARCHAR(50) NOT NULL, -- 'terms_of_service', 'dpa', 'privacy_policy'
    version VARCHAR(10) NOT NULL,
    content TEXT NOT NULL, -- Full document content
    effective_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    is_active BOOLEAN NOT NULL DEFAULT true,
    checksum VARCHAR(64) NOT NULL, -- SHA-256 of content for integrity

    -- Constraints
    CONSTRAINT unique_active_version UNIQUE (document_type, is_active) DEFERRABLE INITIALLY DEFERRED,
    CONSTRAINT valid_document_type CHECK (document_type IN ('terms_of_service', 'dpa', 'privacy_policy', 'user_declarations'))
);

-- Legal Acceptances Table
-- Core table for storing user legal acceptances with maximum audit detail
CREATE TABLE legal_acceptances (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,

    -- Session Information (Critical for legal validity)
    session_id UUID NOT NULL, -- Unique session identifier
    acceptance_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip_address INET NOT NULL, -- User's IP address
    user_agent TEXT NOT NULL, -- Browser information
    geo_location JSONB, -- Optional: country/city for jurisdiction

    -- Document Versions (What exactly was accepted)
    terms_version VARCHAR(10) NOT NULL,
    dpa_version VARCHAR(10) NOT NULL,
    privacy_version VARCHAR(10) NOT NULL,
    declarations_version VARCHAR(10) NOT NULL,

    -- Acceptance Status (Each document individually tracked)
    terms_accepted BOOLEAN NOT NULL DEFAULT false,
    terms_accepted_at TIMESTAMP,
    dpa_accepted BOOLEAN NOT NULL DEFAULT false,
    dpa_accepted_at TIMESTAMP,
    privacy_accepted BOOLEAN NOT NULL DEFAULT false,
    privacy_accepted_at TIMESTAMP,
    declarations_accepted BOOLEAN NOT NULL DEFAULT false,
    declarations_accepted_at TIMESTAMP,

    -- Email Verification (Legal validity enhancement)
    email_verification_required BOOLEAN NOT NULL DEFAULT true,
    email_verification_token UUID UNIQUE,
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verified_at TIMESTAMP,
    email_sent_at TIMESTAMP,

    -- Legal Status
    is_complete BOOLEAN NOT NULL DEFAULT false,
    is_valid BOOLEAN NOT NULL DEFAULT false, -- Only true when email verified
    superseded_by INTEGER REFERENCES legal_acceptances(id), -- For new versions

    -- Audit Fields
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints for data integrity
    CONSTRAINT valid_acceptance_times CHECK (
        terms_accepted_at IS NOT NULL OR terms_accepted = false
    ),
    CONSTRAINT email_verification_logic CHECK (
        (email_verification_required = false) OR
        (email_verification_required = true AND email_verification_token IS NOT NULL)
    )
);

-- User Compliance Declarations Table
-- Detailed storage of user's legal declarations and commitments
CREATE TABLE user_compliance_declarations (
    id SERIAL PRIMARY KEY,
    legal_acceptance_id INTEGER NOT NULL REFERENCES legal_acceptances(id) ON DELETE CASCADE,

    -- Core GDPR Declarations (Critical for liability protection)
    has_legal_authority BOOLEAN NOT NULL DEFAULT false,
    has_legal_authority_details TEXT, -- Optional explanation

    has_obtained_consents BOOLEAN NOT NULL DEFAULT false,
    consent_method TEXT, -- How consents were obtained
    consent_documentation TEXT, -- Reference to consent records

    has_informed_data_subjects BOOLEAN NOT NULL DEFAULT false,
    information_method TEXT, -- How subjects were informed
    information_date DATE, -- When information was provided

    data_is_accurate BOOLEAN NOT NULL DEFAULT false,
    data_accuracy_verification_method TEXT,

    accepts_liability BOOLEAN NOT NULL DEFAULT false,
    understands_obligations BOOLEAN NOT NULL DEFAULT false,
    accepts_billing BOOLEAN NOT NULL DEFAULT false,

    -- Additional Protection Declarations
    confirms_lawful_basis BOOLEAN NOT NULL DEFAULT false,
    lawful_basis_type VARCHAR(50), -- 'consent', 'contract', 'legal_obligation', etc.

    confirms_data_minimization BOOLEAN NOT NULL DEFAULT false,
    confirms_purpose_limitation BOOLEAN NOT NULL DEFAULT false,
    confirms_retention_limits BOOLEAN NOT NULL DEFAULT false,

    -- Data Subject Categories and Types
    data_subject_categories JSONB, -- ['customers', 'employees', 'prospects', etc.]
    personal_data_categories JSONB, -- ['identity', 'contact', 'financial', etc.]
    special_categories_processed BOOLEAN NOT NULL DEFAULT false,
    special_categories_details JSONB, -- If special categories are processed

    -- Business Context
    business_purpose TEXT NOT NULL, -- Why processing is necessary
    retention_period_months INTEGER, -- How long data will be kept

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_lawful_basis CHECK (
        (confirms_lawful_basis = false) OR
        (confirms_lawful_basis = true AND lawful_basis_type IS NOT NULL)
    ),
    CONSTRAINT special_categories_logic CHECK (
        (special_categories_processed = false) OR
        (special_categories_processed = true AND special_categories_details IS NOT NULL)
    )
);

-- Legal Action Log Table
-- Comprehensive audit trail of all legal-related actions
CREATE TABLE legal_action_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    legal_acceptance_id INTEGER REFERENCES legal_acceptances(id),

    -- Action Details
    action_type VARCHAR(50) NOT NULL, -- 'acceptance_started', 'document_viewed', 'email_sent', etc.
    action_description TEXT NOT NULL,
    action_result VARCHAR(20) NOT NULL DEFAULT 'success', -- 'success', 'failure', 'pending'

    -- Technical Details
    ip_address INET,
    user_agent TEXT,
    session_id UUID,
    request_id UUID, -- For correlating with application logs

    -- Context Data
    document_type VARCHAR(50),
    document_version VARCHAR(10),
    additional_data JSONB, -- Flexible storage for action-specific data

    -- Legal Significance
    is_legally_significant BOOLEAN NOT NULL DEFAULT false,
    legal_significance_reason TEXT,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_action_type CHECK (action_type IN (
        'acceptance_started', 'document_viewed', 'document_accepted',
        'email_sent', 'email_verified', 'acceptance_completed',
        'acceptance_superseded', 'compliance_check', 'admin_review'
    ))
);

-- Legal Notifications Table
-- Track all legal notifications sent to users
CREATE TABLE legal_notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    legal_acceptance_id INTEGER REFERENCES legal_acceptances(id),

    -- Notification Details
    notification_type VARCHAR(50) NOT NULL,
    notification_subject TEXT NOT NULL,
    notification_content TEXT NOT NULL,

    -- Delivery Details
    delivery_method VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email', 'in_app', 'sms'
    recipient_address TEXT NOT NULL, -- email address, phone number, etc.

    -- Status Tracking
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,

    delivery_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    delivery_error TEXT,

    -- Legal Significance
    is_required_by_law BOOLEAN NOT NULL DEFAULT false,
    legal_deadline DATE, -- If response is legally required by date

    -- Response Tracking
    response_required BOOLEAN NOT NULL DEFAULT false,
    response_received_at TIMESTAMP,
    response_data JSONB,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_notification_type CHECK (notification_type IN (
        'verification_email', 'acceptance_confirmation', 'terms_update',
        'gdpr_rights_notice', 'breach_notification', 'retention_notice'
    )),
    CONSTRAINT valid_delivery_status CHECK (delivery_status IN (
        'pending', 'sent', 'delivered', 'failed', 'bounced'
    ))
);

-- Data Subject Rights Requests Table
-- Track GDPR rights requests for compliance
CREATE TABLE data_subject_rights_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id), -- The data controller (our user)

    -- Request Details
    request_type VARCHAR(30) NOT NULL,
    request_description TEXT NOT NULL,
    data_subject_email VARCHAR(255) NOT NULL,
    data_subject_name VARCHAR(255),

    -- Verification
    identity_verified BOOLEAN NOT NULL DEFAULT false,
    verification_method TEXT,
    verification_date TIMESTAMP,

    -- Processing
    status VARCHAR(20) NOT NULL DEFAULT 'received',
    assigned_to INTEGER REFERENCES users(id),

    -- Legal Deadlines
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    legal_deadline TIMESTAMP NOT NULL, -- 30 days from receipt
    completed_at TIMESTAMP,

    -- Response
    response_provided BOOLEAN NOT NULL DEFAULT false,
    response_method VARCHAR(20), -- 'email', 'postal', 'secure_download'
    response_data JSONB,
    response_notes TEXT,

    -- Compliance
    deadline_extended BOOLEAN NOT NULL DEFAULT false,
    extension_reason TEXT,
    extension_notification_sent BOOLEAN NOT NULL DEFAULT false,

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_request_type CHECK (request_type IN (
        'access', 'rectification', 'erasure', 'restrict_processing',
        'data_portability', 'object_processing', 'object_automated'
    )),
    CONSTRAINT valid_status CHECK (status IN (
        'received', 'in_progress', 'completed', 'rejected', 'partially_completed'
    ))
);

-- Legal Email Verifications Table
-- Track email verification for legal acceptances
CREATE TABLE legal_email_verifications (
    id SERIAL PRIMARY KEY,
    acceptance_id INTEGER NOT NULL REFERENCES legal_acceptances(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    verification_token VARCHAR(64) NOT NULL,

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'sent', -- 'sent', 'verified', 'failed', 'reminder_sent'
    sent_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP,
    reminder_sent_at TIMESTAMP,

    -- Error handling
    error_message TEXT,

    -- Audit trail
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_verification_token UNIQUE (verification_token),
    CONSTRAINT valid_verification_status CHECK (status IN ('sent', 'verified', 'failed', 'reminder_sent')),

    -- Note: Indexes will be created separately below
);

-- Legal Compliance Metrics Table
-- Track compliance KPIs and metrics
CREATE TABLE legal_compliance_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Acceptance Metrics
    total_users INTEGER NOT NULL DEFAULT 0,
    users_with_valid_acceptance INTEGER NOT NULL DEFAULT 0,
    users_with_expired_acceptance INTEGER NOT NULL DEFAULT 0,
    users_pending_acceptance INTEGER NOT NULL DEFAULT 0,

    -- Email Verification Metrics
    email_verifications_sent INTEGER NOT NULL DEFAULT 0,
    email_verifications_completed INTEGER NOT NULL DEFAULT 0,
    email_verification_rate DECIMAL(5,2),

    -- Rights Requests Metrics
    rights_requests_received INTEGER NOT NULL DEFAULT 0,
    rights_requests_completed INTEGER NOT NULL DEFAULT 0,
    rights_requests_overdue INTEGER NOT NULL DEFAULT 0,
    average_response_time_hours DECIMAL(8,2),

    -- Compliance Health Score (0-100)
    overall_compliance_score DECIMAL(5,2),

    -- Audit
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT unique_metric_date UNIQUE (metric_date),
    CONSTRAINT valid_compliance_score CHECK (
        overall_compliance_score >= 0 AND overall_compliance_score <= 100
    )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Legal Acceptances Indexes
CREATE INDEX idx_legal_acceptances_user_id ON legal_acceptances(user_id);
CREATE INDEX idx_legal_acceptances_session_id ON legal_acceptances(session_id);
CREATE INDEX idx_legal_acceptances_timestamp ON legal_acceptances(acceptance_timestamp);
CREATE INDEX idx_legal_acceptances_validity ON legal_acceptances(is_valid, is_complete);
CREATE INDEX idx_legal_acceptances_email_token ON legal_acceptances(email_verification_token);

-- Action Logs Indexes
CREATE INDEX idx_legal_action_logs_user_id ON legal_action_logs(user_id);
CREATE INDEX idx_legal_action_logs_acceptance_id ON legal_action_logs(legal_acceptance_id);
CREATE INDEX idx_legal_action_logs_timestamp ON legal_action_logs(created_at);
CREATE INDEX idx_legal_action_logs_action_type ON legal_action_logs(action_type);
CREATE INDEX idx_legal_action_logs_significance ON legal_action_logs(is_legally_significant);

-- Rights Requests Indexes
CREATE INDEX idx_rights_requests_user_id ON data_subject_rights_requests(user_id);
CREATE INDEX idx_rights_requests_status ON data_subject_rights_requests(status);
CREATE INDEX idx_rights_requests_deadline ON data_subject_rights_requests(legal_deadline);
CREATE INDEX idx_rights_requests_data_subject ON data_subject_rights_requests(data_subject_email);

-- Notifications Indexes
CREATE INDEX idx_legal_notifications_user_id ON legal_notifications(user_id);
CREATE INDEX idx_legal_notifications_type ON legal_notifications(notification_type);
CREATE INDEX idx_legal_notifications_status ON legal_notifications(delivery_status);

-- =============================================
-- TRIGGERS FOR AUDIT AND AUTOMATION
-- =============================================

-- Update timestamp trigger for legal_acceptances
CREATE OR REPLACE FUNCTION update_legal_acceptance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;

    -- Auto-calculate is_complete when all acceptances are true
    IF NEW.terms_accepted AND NEW.dpa_accepted AND
       NEW.privacy_accepted AND NEW.declarations_accepted THEN
        NEW.is_complete = true;
    END IF;

    -- Auto-calculate is_valid (complete + email verified or not required)
    IF NEW.is_complete AND
       (NEW.email_verified = true OR NEW.email_verification_required = false) THEN
        NEW.is_valid = true;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_acceptance_update_trigger
    BEFORE UPDATE ON legal_acceptances
    FOR EACH ROW
    EXECUTE FUNCTION update_legal_acceptance_timestamp();

-- Auto-log legal actions trigger
CREATE OR REPLACE FUNCTION log_legal_acceptance_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Log acceptance completion
    IF NEW.is_complete = true AND (OLD.is_complete = false OR OLD.is_complete IS NULL) THEN
        INSERT INTO legal_action_logs (
            user_id, legal_acceptance_id, action_type, action_description,
            is_legally_significant, legal_significance_reason,
            session_id, ip_address
        ) VALUES (
            NEW.user_id, NEW.id, 'acceptance_completed',
            'User completed all legal acceptances',
            true, 'Full legal compliance achieved',
            NEW.session_id, NEW.ip_address
        );
    END IF;

    -- Log email verification
    IF NEW.email_verified = true AND (OLD.email_verified = false OR OLD.email_verified IS NULL) THEN
        INSERT INTO legal_action_logs (
            user_id, legal_acceptance_id, action_type, action_description,
            is_legally_significant, legal_significance_reason,
            session_id, ip_address
        ) VALUES (
            NEW.user_id, NEW.id, 'email_verified',
            'Email verification completed',
            true, 'Legal validity confirmed via email',
            NEW.session_id, NEW.ip_address
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER legal_acceptance_logging_trigger
    AFTER UPDATE ON legal_acceptances
    FOR EACH ROW
    EXECUTE FUNCTION log_legal_acceptance_changes();

-- =============================================
-- VIEWS FOR EASY QUERYING
-- =============================================

-- Legal Compliance Status View
CREATE VIEW legal_compliance_status AS
SELECT
    u.id as user_id,
    u.email,
    u.name,
    la.id as acceptance_id,
    la.acceptance_timestamp,
    la.is_complete,
    la.is_valid,
    la.email_verified,
    la.terms_version,
    la.dpa_version,
    la.privacy_version,

    -- Compliance indicators
    CASE
        WHEN la.is_valid = true THEN 'COMPLIANT'
        WHEN la.is_complete = true AND la.email_verified = false THEN 'PENDING_EMAIL'
        WHEN la.id IS NOT NULL THEN 'INCOMPLETE'
        ELSE 'NO_ACCEPTANCE'
    END as compliance_status,

    -- Time calculations
    EXTRACT(DAYS FROM (CURRENT_TIMESTAMP - la.acceptance_timestamp)) as days_since_acceptance,

    -- Email verification status
    CASE
        WHEN la.email_verification_required = false THEN 'NOT_REQUIRED'
        WHEN la.email_verified = true THEN 'VERIFIED'
        WHEN la.email_sent_at IS NOT NULL THEN 'SENT'
        ELSE 'PENDING'
    END as email_status

FROM users u
LEFT JOIN legal_acceptances la ON u.id = la.user_id
    AND la.superseded_by IS NULL  -- Only current acceptance
ORDER BY u.id;

-- Legal Audit Trail View
CREATE VIEW legal_audit_trail AS
SELECT
    log.id,
    log.created_at,
    u.email as user_email,
    log.action_type,
    log.action_description,
    log.is_legally_significant,
    log.ip_address,
    log.session_id,
    la.acceptance_timestamp,
    log.additional_data
FROM legal_action_logs log
LEFT JOIN users u ON log.user_id = u.id
LEFT JOIN legal_acceptances la ON log.legal_acceptance_id = la.id
ORDER BY log.created_at DESC;

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert initial document versions
INSERT INTO legal_document_versions (document_type, version, content, created_by, checksum) VALUES
('terms_of_service', '1.0', 'Initial Terms of Service content', 1, 'placeholder_checksum_1'),
('dpa', '1.0', 'Initial Data Processing Agreement content', 1, 'placeholder_checksum_2'),
('privacy_policy', '1.0', 'Initial Privacy Policy content', 1, 'placeholder_checksum_3'),
('user_declarations', '1.0', 'Initial User Declarations content', 1, 'placeholder_checksum_4');

-- =============================================
-- COMMENTS AND DOCUMENTATION
-- =============================================

COMMENT ON TABLE legal_acceptances IS 'Core table storing user legal acceptances with full audit trail for maximum legal protection';
COMMENT ON TABLE user_compliance_declarations IS 'Detailed user declarations for GDPR compliance and liability protection';
COMMENT ON TABLE legal_action_logs IS 'Comprehensive audit trail of all legal-related actions for compliance and legal defense';
COMMENT ON TABLE data_subject_rights_requests IS 'GDPR rights requests tracking for Article 12-22 compliance';

COMMENT ON COLUMN legal_acceptances.session_id IS 'Unique session identifier for legal validity and audit purposes';
COMMENT ON COLUMN legal_acceptances.ip_address IS 'User IP address at time of acceptance for legal verification';
COMMENT ON COLUMN legal_acceptances.email_verification_token IS 'Token for email verification to enhance legal validity';
COMMENT ON COLUMN legal_acceptances.is_valid IS 'True only when acceptance is complete AND email verified (if required)';

-- =============================================
-- SECURITY AND PERMISSIONS
-- =============================================

-- Grant appropriate permissions (to be customized based on your user roles)
-- GRANT SELECT, INSERT, UPDATE ON legal_acceptances TO app_user;
-- GRANT SELECT, INSERT ON legal_action_logs TO app_user;
-- GRANT SELECT ON legal_compliance_status TO app_user;

-- Prevent accidental deletion of legal records
ALTER TABLE legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_action_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- MAINTENANCE PROCEDURES
-- =============================================

-- Function to generate compliance report
CREATE OR REPLACE FUNCTION generate_compliance_report(start_date DATE, end_date DATE)
RETURNS TABLE (
    metric VARCHAR,
    value DECIMAL,
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        'total_acceptances'::VARCHAR as metric,
        COUNT(*)::DECIMAL as value,
        'Total legal acceptances in period'::TEXT as description
    FROM legal_acceptances
    WHERE acceptance_timestamp::DATE BETWEEN start_date AND end_date

    UNION ALL

    SELECT
        'valid_acceptances'::VARCHAR,
        COUNT(*)::DECIMAL,
        'Valid (complete + verified) acceptances'::TEXT
    FROM legal_acceptances
    WHERE acceptance_timestamp::DATE BETWEEN start_date AND end_date
    AND is_valid = true

    UNION ALL

    SELECT
        'compliance_rate'::VARCHAR,
        ROUND(
            (COUNT(*) FILTER (WHERE is_valid = true) * 100.0 / NULLIF(COUNT(*), 0)), 2
        ),
        'Percentage of valid acceptances'::TEXT
    FROM legal_acceptances
    WHERE acceptance_timestamp::DATE BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- EMAIL VERIFICATION INDEXES
-- =============================================

-- Create indexes for email verification table
CREATE INDEX idx_email_verifications_token ON legal_email_verifications (verification_token);
CREATE INDEX idx_email_verifications_acceptance ON legal_email_verifications (acceptance_id);
CREATE INDEX idx_email_verifications_status ON legal_email_verifications (status);
CREATE INDEX idx_email_verifications_sent_at ON legal_email_verifications (sent_at);