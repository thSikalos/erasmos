-- Add payment status management columns to payment_statements table

ALTER TABLE payment_statements
ADD COLUMN payment_status VARCHAR(20) DEFAULT 'draft' CHECK (payment_status IN ('draft', 'paid')),
ADD COLUMN paid_date TIMESTAMP;

-- Update existing records to have draft status
UPDATE payment_statements SET payment_status = 'draft' WHERE payment_status IS NULL;

-- Make payment_status NOT NULL after setting default values
ALTER TABLE payment_statements ALTER COLUMN payment_status SET NOT NULL;