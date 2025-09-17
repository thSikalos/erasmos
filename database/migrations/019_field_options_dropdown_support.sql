-- Field Options & Dropdown Support Migration
-- This migration adds support for dropdown fields with predefined options

-- Create field_options table to store dropdown options
CREATE TABLE field_options (
    id SERIAL PRIMARY KEY,
    field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    option_value VARCHAR(255) NOT NULL,
    option_label VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure unique options per field
    UNIQUE(field_id, option_value)
);

-- Add indexes for performance
CREATE INDEX idx_field_options_field_id ON field_options(field_id);
CREATE INDEX idx_field_options_active ON field_options(is_active);
CREATE INDEX idx_field_options_order ON field_options(field_id, display_order);

-- Add trigger to ensure dropdown fields have at least one option
CREATE OR REPLACE FUNCTION validate_dropdown_options()
RETURNS TRIGGER AS $$
BEGIN
    -- If field type is changed to dropdown, ensure it has options
    IF NEW.type = 'dropdown' THEN
        -- Check if field has options
        IF NOT EXISTS (
            SELECT 1 FROM field_options
            WHERE field_id = NEW.id AND is_active = true
        ) THEN
            -- This will be enforced at application level
            -- We just log a warning here
            RAISE NOTICE 'Dropdown field % requires at least one option', NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_dropdown_options_trigger
    AFTER UPDATE ON fields
    FOR EACH ROW
    WHEN (NEW.type = 'dropdown')
    EXECUTE FUNCTION validate_dropdown_options();

-- Add some helpful views
CREATE VIEW field_with_options AS
SELECT
    f.*,
    CASE
        WHEN f.type = 'dropdown' THEN
            json_agg(
                json_build_object(
                    'id', fo.id,
                    'value', fo.option_value,
                    'label', fo.option_label,
                    'order', fo.display_order
                ) ORDER BY fo.display_order, fo.option_label
            ) FILTER (WHERE fo.is_active = true)
        ELSE NULL
    END as options
FROM fields f
LEFT JOIN field_options fo ON f.id = fo.field_id AND fo.is_active = true
GROUP BY f.id, f.label, f.type, f.is_commissionable, f.show_in_applications_table;

-- Update existing application_values to handle dropdown selections
-- (No structural changes needed, dropdown values will be stored as option_value strings)

-- Comments for documentation
COMMENT ON TABLE field_options IS 'Stores predefined options for dropdown type fields';
COMMENT ON COLUMN field_options.option_value IS 'Internal value stored in application_values';
COMMENT ON COLUMN field_options.option_label IS 'Human-readable label displayed to users';
COMMENT ON COLUMN field_options.display_order IS 'Order in which options appear in dropdown';
COMMENT ON VIEW field_with_options IS 'Convenient view joining fields with their dropdown options';