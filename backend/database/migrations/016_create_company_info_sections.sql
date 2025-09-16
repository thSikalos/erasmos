-- Migration: Create company_info_sections table for InfoPortal functionality
-- Date: 2025-09-17
-- Description: Creates table to store configurable content sections for each company

-- Create the company_info_sections table
CREATE TABLE company_info_sections (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    section_type VARCHAR(50) NOT NULL DEFAULT 'general',
    title VARCHAR(200) NOT NULL,
    content TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_company_info_sections_company_id ON company_info_sections(company_id);
CREATE INDEX idx_company_info_sections_order ON company_info_sections(company_id, order_index);
CREATE INDEX idx_company_info_sections_active ON company_info_sections(is_active);

-- Add unique constraint to prevent duplicate order_index per company
ALTER TABLE company_info_sections
ADD CONSTRAINT unique_company_order
UNIQUE (company_id, order_index);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_info_sections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_info_sections_updated_at
    BEFORE UPDATE ON company_info_sections
    FOR EACH ROW
    EXECUTE FUNCTION update_company_info_sections_updated_at();

-- Insert default sections for existing companies
INSERT INTO company_info_sections (company_id, section_type, title, content, order_index)
SELECT
    c.id,
    'general',
    'Γενικές Πληροφορίες',
    'Προσθέστε εδώ γενικές πληροφορίες για την εταιρεία ' || c.name || '.',
    1
FROM companies c;

INSERT INTO company_info_sections (company_id, section_type, title, content, order_index)
SELECT
    c.id,
    'products',
    'Προϊόντα & Υπηρεσίες',
    'Περιγράψτε τα προϊόντα και τις υπηρεσίες της εταιρείας ' || c.name || '.',
    2
FROM companies c;

INSERT INTO company_info_sections (company_id, section_type, title, content, order_index)
SELECT
    c.id,
    'procedures',
    'Διαδικασίες',
    'Αναλυτικές διαδικασίες για την εταιρεία ' || c.name || '.',
    3
FROM companies c;

INSERT INTO company_info_sections (company_id, section_type, title, content, order_index)
SELECT
    c.id,
    'contact',
    'Στοιχεία Επικοινωνίας',
    'Στοιχεία επικοινωνίας για την εταιρεία ' || c.name || '.',
    4
FROM companies c;

-- Add comment to table
COMMENT ON TABLE company_info_sections IS 'Stores configurable content sections for each company in the InfoPortal';
COMMENT ON COLUMN company_info_sections.section_type IS 'Type of section: general, products, procedures, contact, etc.';
COMMENT ON COLUMN company_info_sections.order_index IS 'Display order of sections within company tab';
COMMENT ON COLUMN company_info_sections.is_active IS 'Whether this section is visible to users';