-- Migration: Add team_company_access table for controlling company visibility per team
-- Date: 2025-01-18

-- Create the team_company_access table
CREATE TABLE IF NOT EXISTS team_company_access (
    id SERIAL PRIMARY KEY,
    team_leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_team_company UNIQUE (team_leader_id, company_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_company_access_team_leader
ON team_company_access(team_leader_id);

CREATE INDEX IF NOT EXISTS idx_team_company_access_company
ON team_company_access(company_id);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_team_company_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER team_company_access_updated_at
    BEFORE UPDATE ON team_company_access
    FOR EACH ROW EXECUTE PROCEDURE update_team_company_access_updated_at();

-- Insert default access for existing top-level team leaders
-- This ensures backward compatibility by giving existing team leaders access to all companies
INSERT INTO team_company_access (team_leader_id, company_id)
SELECT DISTINCT
    u.id as team_leader_id,
    c.id as company_id
FROM users u
CROSS JOIN companies c
WHERE u.role = 'TeamLeader'
    AND u.parent_user_id IS NULL
    AND u.deleted_at IS NULL
ON CONFLICT (team_leader_id, company_id) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE team_company_access IS 'Controls which companies are visible to each team leader and their subordinates';
COMMENT ON COLUMN team_company_access.team_leader_id IS 'References the top-level team leader (parent_user_id IS NULL)';
COMMENT ON COLUMN team_company_access.company_id IS 'References the company that the team has access to';