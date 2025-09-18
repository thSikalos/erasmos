-- Migration: Add support for customer fields in PDF visual mappings
-- This adds a column to identify customer data fields that don't reference the fields table

-- Add column to support customer field mappings
ALTER TABLE pdf_visual_mappings
ADD COLUMN is_customer_field BOOLEAN DEFAULT false NOT NULL;

-- Add column to store customer field identifier for customer fields
ALTER TABLE pdf_visual_mappings
ADD COLUMN customer_field_id VARCHAR(50);

-- Update the field_id constraint to allow NULL for customer fields
ALTER TABLE pdf_visual_mappings
DROP CONSTRAINT pdf_visual_mappings_field_id_fkey;

-- Add new constraint that allows NULL field_id only when is_customer_field is true
ALTER TABLE pdf_visual_mappings
ADD CONSTRAINT pdf_visual_mappings_field_id_fkey
    FOREIGN KEY (field_id) REFERENCES fields(id) ON DELETE CASCADE
    DEFERRABLE INITIALLY DEFERRED;

-- Add check constraint to ensure proper customer field configuration
ALTER TABLE pdf_visual_mappings
ADD CONSTRAINT check_customer_field_config
    CHECK (
        (is_customer_field = false AND field_id IS NOT NULL AND customer_field_id IS NULL)
        OR
        (is_customer_field = true AND field_id IS NULL AND customer_field_id IS NOT NULL)
    );

-- Add index for customer field queries
CREATE INDEX idx_pdf_visual_mappings_customer_field ON pdf_visual_mappings(template_id, is_customer_field);

-- Add comments
COMMENT ON COLUMN pdf_visual_mappings.is_customer_field IS 'True if this maps to a customer data field (name, phone, etc.)';
COMMENT ON COLUMN pdf_visual_mappings.customer_field_id IS 'Customer field identifier (customer_name, customer_afm, etc.) when is_customer_field is true';