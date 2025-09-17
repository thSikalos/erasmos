-- PDF Template System Migration
-- This migration adds support for PDF templates and field mapping per dropdown option

-- PDF Templates table - stores templates for each dropdown option
CREATE TABLE pdf_templates (
    id SERIAL PRIMARY KEY,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    option_value VARCHAR(255) NOT NULL, -- The dropdown option value (e.g., "program_type_1")
    template_name VARCHAR(255) NOT NULL,
    pdf_file_path VARCHAR(500) NOT NULL,
    analysis_status VARCHAR(50) DEFAULT 'pending', -- pending, analyzed, mapped
    placeholders_detected INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique template per company-field-option combination
    UNIQUE(company_id, field_id, option_value)
);

-- PDF Field Mappings table - maps PDF placeholders to company fields
CREATE TABLE pdf_field_mappings (
    id SERIAL PRIMARY KEY,
    pdf_template_id INTEGER NOT NULL REFERENCES pdf_templates(id) ON DELETE CASCADE,
    placeholder VARCHAR(255) NOT NULL, -- [CUSTOMER_NAME], {PHONE}, etc.
    target_field_id INTEGER REFERENCES fields(id) ON DELETE SET NULL, -- Maps to actual form field
    field_type VARCHAR(50) DEFAULT 'text', -- text, checkbox, date, number
    coordinates JSON, -- {x, y, width, height, page} for placement
    confidence_score DECIMAL(3,2) DEFAULT 0.00, -- AI confidence 0.00-1.00
    is_required BOOLEAN DEFAULT true,
    mapping_status VARCHAR(50) DEFAULT 'unmapped', -- unmapped, mapped, verified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique placeholder per template
    UNIQUE(pdf_template_id, placeholder)
);

-- Extend applications table for PDF functionality
ALTER TABLE applications ADD COLUMN IF NOT EXISTS pdf_template_id INTEGER REFERENCES pdf_templates(id);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS pdf_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS pdf_generation_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS signed_pdf_path VARCHAR(500);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS pdf_ready_check TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX idx_pdf_templates_company ON pdf_templates(company_id);
CREATE INDEX idx_pdf_templates_field_option ON pdf_templates(field_id, option_value);
CREATE INDEX idx_pdf_mappings_template ON pdf_field_mappings(pdf_template_id);
CREATE INDEX idx_pdf_mappings_target_field ON pdf_field_mappings(target_field_id);
CREATE INDEX idx_applications_pdf_template ON applications(pdf_template_id);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pdf_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_pdf_templates_updated_at
    BEFORE UPDATE ON pdf_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_template_timestamp();

-- Insert some sample data to test the structure (will be removed later)
COMMENT ON TABLE pdf_templates IS 'Stores PDF templates for each dropdown option of company fields';
COMMENT ON TABLE pdf_field_mappings IS 'Maps PDF placeholders to actual form fields with coordinates and metadata';
COMMENT ON COLUMN pdf_field_mappings.coordinates IS 'JSON object with {x, y, width, height, page} for PDF placement';
COMMENT ON COLUMN pdf_field_mappings.confidence_score IS 'AI-generated confidence score for automatic mapping suggestions';