-- Migration: Add field extensions for Applications Table management
-- Description: Adds field-level payment tracking and applications table configuration

-- 1. Add show_in_applications_table column to fields table
ALTER TABLE fields ADD COLUMN show_in_applications_table BOOLEAN DEFAULT false NOT NULL;

-- 2. Create field_payments table for field-level payment tracking
CREATE TABLE field_payments (
    id SERIAL PRIMARY KEY,
    application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE CASCADE,
    is_paid_by_company BOOLEAN DEFAULT false NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(application_id, field_id)
);

-- 3. Extend clawbacks table to support field-level clawbacks
ALTER TABLE clawbacks ADD COLUMN field_id INTEGER REFERENCES fields(id) ON DELETE SET NULL;
ALTER TABLE clawbacks ADD COLUMN field_payment_id INTEGER REFERENCES field_payments(id) ON DELETE CASCADE;

-- 4. Add indexes for performance
CREATE INDEX idx_field_payments_application_id ON field_payments(application_id);
CREATE INDEX idx_field_payments_field_id ON field_payments(field_id);
CREATE INDEX idx_field_payments_company_paid ON field_payments(is_paid_by_company);
CREATE INDEX idx_clawbacks_field_id ON clawbacks(field_id);
CREATE INDEX idx_clawbacks_field_payment_id ON clawbacks(field_payment_id);
CREATE INDEX idx_fields_show_in_table ON fields(show_in_applications_table);

-- 5. Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_field_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_field_payments_updated_at
    BEFORE UPDATE ON field_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_field_payments_updated_at();

-- 6. Set some default fields to show in applications table (commonly needed fields)
UPDATE fields SET show_in_applications_table = true 
WHERE label ILIKE '%αριθμός%' OR label ILIKE '%κωδικός%' OR label ILIKE '%παροχή%' OR label ILIKE '%κυκλοφοριας%';

-- Comments for documentation
COMMENT ON TABLE field_payments IS 'Tracks payment status for individual commissionable fields within applications';
COMMENT ON COLUMN field_payments.is_paid_by_company IS 'Whether this specific field has been paid by the company';
COMMENT ON COLUMN field_payments.paid_at IS 'Timestamp when this field was marked as paid';
COMMENT ON COLUMN clawbacks.field_id IS 'References specific field if clawback is field-level';
COMMENT ON COLUMN clawbacks.field_payment_id IS 'References specific field payment if clawback is field-level';
COMMENT ON COLUMN fields.show_in_applications_table IS 'Whether this field should be displayed as a column in the applications table';