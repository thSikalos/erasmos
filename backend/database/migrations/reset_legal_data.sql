-- Reset Legal Data for Testing
-- This script clears all legal compliance data for a fresh start
-- Use with caution - this will delete all legal acceptances!

-- WARNING: This will remove all legal compliance data!
-- Only use for testing purposes!

-- Remove all legal acceptances for the test user
DELETE FROM user_compliance_declarations
WHERE legal_acceptance_id IN (
    SELECT la.id FROM legal_acceptances la
    JOIN users u ON la.user_id = u.id
    WHERE u.email = 'thsikalos@gmail.com'
);

-- Remove email verifications
DELETE FROM legal_email_verifications
WHERE acceptance_id IN (
    SELECT la.id FROM legal_acceptances la
    JOIN users u ON la.user_id = u.id
    WHERE u.email = 'thsikalos@gmail.com'
);

-- Remove legal acceptances
DELETE FROM legal_acceptances
WHERE user_id IN (
    SELECT id FROM users WHERE email = 'thsikalos@gmail.com'
);

-- Remove legal action logs for the test user
DELETE FROM legal_action_logs
WHERE user_id IN (
    SELECT id FROM users WHERE email = 'thsikalos@gmail.com'
);

-- Optional: Reset all legal data (uncomment if you want to reset everything)
-- WARNING: This will delete ALL legal data for ALL users!
/*
DELETE FROM user_compliance_declarations;
DELETE FROM legal_email_verifications;
DELETE FROM legal_acceptances;
DELETE FROM legal_action_logs;
*/

COMMIT;

-- Verify the reset
SELECT
    u.email,
    la.id as acceptance_id,
    la.is_valid,
    la.email_verified,
    la.created_at
FROM users u
LEFT JOIN legal_acceptances la ON u.id = la.user_id
WHERE u.email = 'thsikalos@gmail.com';

COMMENT IS 'Legal data reset script for testing - removes all legal compliance data for specified user';