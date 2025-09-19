-- Fix email verification constraint to support both token and code systems
-- Remove old constraint and add new one that works with verification_code

-- Drop the old constraint
ALTER TABLE legal_acceptances
DROP CONSTRAINT email_verification_logic;

-- Add new constraint that supports both email_verification_token AND verification_code
ALTER TABLE legal_acceptances
ADD CONSTRAINT email_verification_logic
CHECK (
    email_verification_required = false
    OR (
        email_verification_required = true
        AND (
            email_verification_token IS NOT NULL
            OR verification_code IS NOT NULL
        )
    )
);

-- Add comment to explain the new logic
COMMENT ON CONSTRAINT email_verification_logic ON legal_acceptances IS
'Ensures that when email verification is required, either email_verification_token (legacy) or verification_code (new system) is provided';