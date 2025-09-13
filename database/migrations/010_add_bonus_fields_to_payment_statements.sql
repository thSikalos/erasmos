-- Migration to add bonus fields to payment_statements table

-- Add bonus amount column
ALTER TABLE payment_statements
ADD COLUMN IF NOT EXISTS bonus_amount NUMERIC(10,2) DEFAULT 0 NOT NULL;

-- Add bonus details column for detailed breakdown
ALTER TABLE payment_statements
ADD COLUMN IF NOT EXISTS bonus_details TEXT;

-- Create index on bonus_amount for potential queries
CREATE INDEX IF NOT EXISTS idx_payment_statements_bonus_amount ON payment_statements(bonus_amount);

-- Comments for documentation
COMMENT ON COLUMN payment_statements.bonus_amount IS 'Total bonus amount earned in this payment statement period';
COMMENT ON COLUMN payment_statements.bonus_details IS 'Detailed breakdown of bonus achievements (e.g., "Winter Bonus: 5 applications from Company A, Company B")';