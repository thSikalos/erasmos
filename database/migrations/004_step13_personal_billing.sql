-- Step 13: Personal Applications & Advanced Billing System
-- Run this SQL script in your PostgreSQL database

-- 1. Add is_personal column to applications table (if not exists)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='applications' AND column_name='is_personal') THEN
        ALTER TABLE applications ADD COLUMN is_personal BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Create team_leader_personal_billing_settings table for advanced billing
CREATE TABLE IF NOT EXISTS team_leader_personal_billing_settings (
    id SERIAL PRIMARY KEY,
    team_leader_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Personal application rates
    personal_app_charge DECIMAL(10,2), -- Rate for team leader's personal applications
    
    -- Team application rates (override general settings)
    team_app_charge_override DECIMAL(10,2), -- Override rate for team applications
    
    -- Discount tiers for personal applications (JSON)
    personal_discount_tiers JSON, -- e.g., [{"target": 10, "discount": 5}, {"target": 20, "discount": 10}]
    
    -- Metadata
    effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_admin_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint
    UNIQUE(team_leader_id)
);

-- 3. Create index for better performance
CREATE INDEX IF NOT EXISTS idx_team_leader_personal_billing_team_leader 
ON team_leader_personal_billing_settings(team_leader_id);

-- 4. Add trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger 
                   WHERE tgname = 'update_personal_billing_settings_updated_at') THEN
        CREATE TRIGGER update_personal_billing_settings_updated_at 
        BEFORE UPDATE ON team_leader_personal_billing_settings 
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- 5. Create view for easy billing configuration queries
CREATE OR REPLACE VIEW team_leader_billing_overview AS
SELECT 
    u.id as team_leader_id,
    u.name as team_leader_name,
    u.email as team_leader_email,
    
    -- Current billing settings
    tbs.charge_per_application as team_app_base_rate,
    pbs.team_app_charge_override as team_app_override_rate,
    pbs.personal_app_charge as personal_app_rate,
    pbs.personal_discount_tiers,
    
    -- Calculate effective rates
    COALESCE(pbs.team_app_charge_override, tbs.charge_per_application, bs.setting_value::decimal) as effective_team_rate,
    COALESCE(pbs.personal_app_charge, bs.setting_value::decimal) as effective_personal_rate,
    
    -- Metadata
    pbs.effective_from,
    pbs.updated_at as last_updated
FROM users u
LEFT JOIN team_leader_billing_settings tbs ON u.id = tbs.team_leader_id
LEFT JOIN team_leader_personal_billing_settings pbs ON u.id = pbs.team_leader_id
LEFT JOIN billing_settings bs ON bs.setting_key = 'base_charge_per_application'
WHERE u.role IN ('TeamLeader', 'Admin')
ORDER BY u.name;

-- 6. Insert sample data for existing team leaders (optional)
-- This gives them default personal rates equal to their team rates
INSERT INTO team_leader_personal_billing_settings (team_leader_id, personal_app_charge, created_by_admin_id)
SELECT 
    u.id,
    COALESCE(tbs.charge_per_application, (SELECT setting_value::decimal FROM billing_settings WHERE setting_key = 'base_charge_per_application'), 5.00),
    1 -- Assuming admin user has id = 1
FROM users u
LEFT JOIN team_leader_billing_settings tbs ON u.id = tbs.team_leader_id
LEFT JOIN team_leader_personal_billing_settings pbs ON u.id = pbs.team_leader_id
WHERE u.role IN ('TeamLeader', 'Admin') 
  AND pbs.team_leader_id IS NULL -- Only insert if not already exists
ON CONFLICT (team_leader_id) DO NOTHING;

-- 7. Update existing applications to ensure they have is_personal = FALSE
UPDATE applications SET is_personal = FALSE WHERE is_personal IS NULL;

-- 8. Create function to get billing rate for specific application
CREATE OR REPLACE FUNCTION get_application_billing_rate(
    p_team_leader_id INTEGER,
    p_is_personal BOOLEAN DEFAULT FALSE
) RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_rate DECIMAL(10,2);
    v_base_rate DECIMAL(10,2);
BEGIN
    -- Get base rate from general settings
    SELECT setting_value::decimal INTO v_base_rate 
    FROM billing_settings 
    WHERE setting_key = 'base_charge_per_application';
    
    IF p_is_personal THEN
        -- Get personal application rate
        SELECT COALESCE(personal_app_charge, v_base_rate) INTO v_rate
        FROM team_leader_personal_billing_settings
        WHERE team_leader_id = p_team_leader_id;
    ELSE
        -- Get team application rate (with possible override)
        SELECT COALESCE(pbs.team_app_charge_override, tbs.charge_per_application, v_base_rate) INTO v_rate
        FROM users u
        LEFT JOIN team_leader_billing_settings tbs ON u.id = tbs.team_leader_id
        LEFT JOIN team_leader_personal_billing_settings pbs ON u.id = pbs.team_leader_id
        WHERE u.id = p_team_leader_id;
    END IF;
    
    RETURN COALESCE(v_rate, v_base_rate, 5.00);
END;
$$ LANGUAGE plpgsql;

COMMIT;