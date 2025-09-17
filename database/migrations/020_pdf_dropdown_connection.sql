-- PDF-Dropdown Option Connection Migration
-- This migration creates the connection between dropdown options and PDF templates

-- Add field_option_id to pdf_templates to link directly to dropdown options
ALTER TABLE pdf_templates ADD COLUMN field_option_id INTEGER REFERENCES field_options(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX idx_pdf_templates_field_option_id ON pdf_templates(field_option_id);

-- Update the unique constraint to use field_option_id instead of option_value
ALTER TABLE pdf_templates DROP CONSTRAINT pdf_templates_company_id_field_id_option_value_key;
ALTER TABLE pdf_templates ADD CONSTRAINT unique_template_per_option
    UNIQUE(company_id, field_id, field_option_id);

-- Comments for documentation
COMMENT ON COLUMN pdf_templates.field_option_id IS 'Links PDF template to specific dropdown option';
COMMENT ON CONSTRAINT unique_template_per_option ON pdf_templates IS 'Ensures one PDF template per company-field-option combination';

-- Create a helpful view for dropdown options with their PDF templates
CREATE VIEW dropdown_options_with_pdfs AS
SELECT
    fo.*,
    f.label as field_label,
    f.type as field_type,
    c.name as company_name,
    pt.id as pdf_template_id,
    pt.template_name,
    pt.pdf_file_path,
    pt.analysis_status,
    CASE WHEN pt.id IS NOT NULL THEN true ELSE false END as has_pdf_template
FROM field_options fo
JOIN fields f ON fo.field_id = f.id
LEFT JOIN company_fields cf ON f.id = cf.field_id
LEFT JOIN companies c ON cf.company_id = c.id
LEFT JOIN pdf_templates pt ON fo.id = pt.field_option_id AND c.id = pt.company_id
WHERE fo.is_active = true AND f.type = 'dropdown'
ORDER BY f.label, fo.display_order;

COMMENT ON VIEW dropdown_options_with_pdfs IS 'Shows dropdown options with their associated PDF templates for easy management';