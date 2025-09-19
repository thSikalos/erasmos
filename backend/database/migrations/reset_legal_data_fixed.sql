-- Reset Legal Data for Testing (Fixed Version)
-- This script clears all legal compliance data for a fresh start
-- Use with caution - this will delete all legal acceptances!

-- Start transaction
BEGIN;

-- Remove legal action logs first (due to foreign key constraints)
DELETE FROM legal_action_logs
WHERE user_id IN (
    SELECT id FROM users WHERE email = 'thsikalos@gmail.com'
);

-- Remove legal action logs that reference legal acceptances
DELETE FROM legal_action_logs
WHERE legal_acceptance_id IN (
    SELECT la.id FROM legal_acceptances la
    JOIN users u ON la.user_id = u.id
    WHERE u.email = 'thsikalos@gmail.com'
);

-- Remove user compliance declarations
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

-- Finally remove legal acceptances
DELETE FROM legal_acceptances
WHERE user_id IN (
    SELECT id FROM users WHERE email = 'thsikalos@gmail.com'
);

-- Commit the transaction
COMMIT;

-- Verify the reset - should show no legal acceptances for the user
SELECT
    u.email,
    la.id as acceptance_id,
    la.is_valid,
    la.email_verified,
    la.created_at
FROM users u
LEFT JOIN legal_acceptances la ON u.id = la.user_id
WHERE u.email = 'thsikalos@gmail.com';

-- Show the user still exists but no legal data
SELECT
    u.id,
    u.email,
    u.name,
    COUNT(la.id) as legal_acceptances_count
FROM users u
LEFT JOIN legal_acceptances la ON u.id = la.user_id
WHERE u.email = 'thsikalos@gmail.com'
GROUP BY u.id, u.email, u.name;