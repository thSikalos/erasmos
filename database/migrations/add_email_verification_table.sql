-- Migration: Add Email Verification Table
-- Purpose: Support for email verification in legal acceptance process
-- Date: $(date)

-- Legal Email Verifications Table
-- Track email verification for legal acceptances
CREATE TABLE IF NOT EXISTS legal_email_verifications (
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
    CONSTRAINT valid_verification_status CHECK (status IN ('sent', 'verified', 'failed', 'reminder_sent'))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON legal_email_verifications (verification_token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_acceptance ON legal_email_verifications (acceptance_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_status ON legal_email_verifications (status);
CREATE INDEX IF NOT EXISTS idx_email_verifications_sent_at ON legal_email_verifications (sent_at);

-- Add email verification columns to legal_acceptances if they don't exist
ALTER TABLE legal_acceptances
ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR(64),
ADD COLUMN IF NOT EXISTS email_verification_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- Create index on email verification token
CREATE INDEX IF NOT EXISTS idx_legal_acceptances_email_token ON legal_acceptances (email_verification_token);

-- Update existing records to require email verification (optional - depends on business requirements)
-- UPDATE legal_acceptances SET email_verification_required = true WHERE email_verification_required IS NULL;

-- Comment: This migration adds the necessary infrastructure for email verification
-- of legal acceptances, providing a secure audit trail and verification workflow.