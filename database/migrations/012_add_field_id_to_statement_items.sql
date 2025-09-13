-- Migration: Add field_id column to statement_items table
-- Description: Enables field-level commission tracking in payment statements

-- Add field_id column to statement_items table with proper constraints
ALTER TABLE statement_items
ADD COLUMN IF NOT EXISTS field_id INTEGER REFERENCES fields(id) ON DELETE CASCADE;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_statement_items_field_id ON statement_items(field_id);

-- Create compound index for common queries
CREATE INDEX IF NOT EXISTS idx_statement_items_app_field ON statement_items(application_id, field_id);

-- Add comments for documentation
COMMENT ON COLUMN statement_items.field_id IS 'Optional reference to specific field within application for field-level payments. NULL means application-level payment.';