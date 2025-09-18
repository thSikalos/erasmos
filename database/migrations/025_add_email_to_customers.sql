-- Migration: Add email field to customers table
-- This allows storing customer email addresses for PDF mapping and communication

-- Add email column to customers table
ALTER TABLE customers ADD COLUMN email VARCHAR(255);

-- Add index for email lookups (optional but good for performance)
CREATE INDEX idx_customers_email ON customers(email) WHERE email IS NOT NULL;

-- Add comment to document the field
COMMENT ON COLUMN customers.email IS 'Customer email address for communication and PDF mapping';

-- Migration tracking
INSERT INTO migrations (version, description, applied_at)
VALUES ('025', 'Add email field to customers table', CURRENT_TIMESTAMP)
ON CONFLICT (version) DO NOTHING;