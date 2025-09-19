-- Add verification code column to legal_acceptances table
-- This enables manual code verification instead of email links

ALTER TABLE legal_acceptances
ADD COLUMN verification_code VARCHAR(6);

-- Add index for faster verification code lookups
CREATE INDEX idx_legal_acceptances_verification_code
ON legal_acceptances(verification_code);

-- Update comment
COMMENT ON COLUMN legal_acceptances.verification_code IS 'Manual 6-digit verification code for email verification (e.g., A1B2C3)';