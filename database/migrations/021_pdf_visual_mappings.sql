-- Migration 021: Add PDF Visual Mappings table for position-based field mapping
-- This migration creates a table to store visual mappings for PDF templates

-- Create PDF Visual Mappings table
CREATE TABLE IF NOT EXISTS pdf_visual_mappings (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES pdf_templates(id) ON DELETE CASCADE,
    field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    field_type VARCHAR(50) NOT NULL,
    page_number INTEGER NOT NULL DEFAULT 1,
    position_x DECIMAL(5,2) NOT NULL, -- Percentage from left (0.00 to 100.00)
    position_y DECIMAL(5,2) NOT NULL, -- Percentage from top (0.00 to 100.00)
    width DECIMAL(5,2) NOT NULL DEFAULT 15.00, -- Width as percentage
    height DECIMAL(5,2) NOT NULL DEFAULT 4.00, -- Height as percentage
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT valid_position_x CHECK (position_x >= 0 AND position_x <= 100),
    CONSTRAINT valid_position_y CHECK (position_y >= 0 AND position_y <= 100),
    CONSTRAINT valid_width CHECK (width > 0 AND width <= 100),
    CONSTRAINT valid_height CHECK (height > 0 AND height <= 100),
    CONSTRAINT valid_page_number CHECK (page_number >= 1)
);

-- Create indexes for better performance
CREATE INDEX idx_pdf_visual_mappings_template_id ON pdf_visual_mappings(template_id);
CREATE INDEX idx_pdf_visual_mappings_field_id ON pdf_visual_mappings(field_id);
CREATE INDEX idx_pdf_visual_mappings_page ON pdf_visual_mappings(template_id, page_number);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_pdf_visual_mappings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pdf_visual_mappings_updated_at
    BEFORE UPDATE ON pdf_visual_mappings
    FOR EACH ROW
    EXECUTE FUNCTION update_pdf_visual_mappings_updated_at();

-- Add comments for documentation
COMMENT ON TABLE pdf_visual_mappings IS 'Stores position-based field mappings for PDF templates';
COMMENT ON COLUMN pdf_visual_mappings.template_id IS 'Reference to the PDF template';
COMMENT ON COLUMN pdf_visual_mappings.field_id IS 'Reference to the field to be mapped';
COMMENT ON COLUMN pdf_visual_mappings.field_type IS 'Type of field (text, checkbox, select, etc.)';
COMMENT ON COLUMN pdf_visual_mappings.page_number IS 'Page number where field should be placed (1-based)';
COMMENT ON COLUMN pdf_visual_mappings.position_x IS 'Horizontal position as percentage from left edge';
COMMENT ON COLUMN pdf_visual_mappings.position_y IS 'Vertical position as percentage from top edge';
COMMENT ON COLUMN pdf_visual_mappings.width IS 'Field width as percentage of page width';
COMMENT ON COLUMN pdf_visual_mappings.height IS 'Field height as percentage of page height';
COMMENT ON COLUMN pdf_visual_mappings.is_required IS 'Whether this field is required to be filled';

-- Migration tracking
INSERT INTO migrations (version, description, applied_at)
VALUES ('021', 'Add PDF Visual Mappings table for position-based field mapping', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;