-- Migration: Add is_active field to users table for team deactivation functionality
-- This allows admins to disable team leaders and their entire teams

-- Add is_active column to users table
ALTER TABLE users
ADD COLUMN is_active BOOLEAN DEFAULT true NOT NULL;

-- Create index for efficient queries on active users
CREATE INDEX idx_users_is_active ON users(is_active);

-- Create index for efficient queries on active users with role
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Update all existing users to be active by default
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Add constraint to ensure is_active is not null
ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN users.is_active IS 'Indicates if user account is active. When false, user cannot login and team members are also deactivated.';

-- Optional: Add a trigger to automatically deactivate team members when team leader is deactivated
-- (We will handle this logic in the application layer for better control and auditing)

-- Create a view for active team hierarchies (useful for reports)
CREATE OR REPLACE VIEW active_team_hierarchy AS
SELECT
    tl.id as team_leader_id,
    tl.name as team_leader_name,
    tl.email as team_leader_email,
    tl.is_active as team_leader_active,
    COUNT(tm.id) as team_member_count,
    COUNT(CASE WHEN tm.is_active = true THEN 1 END) as active_team_members
FROM users tl
LEFT JOIN users tm ON tl.id = tm.parent_user_id
WHERE tl.role IN ('TeamLeader', 'Admin')
GROUP BY tl.id, tl.name, tl.email, tl.is_active
ORDER BY tl.name;

-- Grant permissions on the view
GRANT SELECT ON active_team_hierarchy TO postgres;