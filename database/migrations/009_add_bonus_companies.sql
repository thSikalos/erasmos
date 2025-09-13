-- Migration to add bonus_companies table for many-to-many relationship between bonuses and companies
-- This allows each bonus to target multiple companies for the combined application count target

-- Create the bonus_companies junction table
CREATE TABLE IF NOT EXISTS bonus_companies (
    bonus_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (bonus_id, company_id),
    FOREIGN KEY (bonus_id) REFERENCES bonuses(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bonus_companies_bonus_id ON bonus_companies(bonus_id);
CREATE INDEX IF NOT EXISTS idx_bonus_companies_company_id ON bonus_companies(company_id);

-- Comments for documentation
COMMENT ON TABLE bonus_companies IS 'Junction table linking bonuses to the companies they apply to. Allows each bonus to count applications from multiple selected companies.';
COMMENT ON COLUMN bonus_companies.bonus_id IS 'References the bonus record';
COMMENT ON COLUMN bonus_companies.company_id IS 'References the company that applications will count towards this bonus';