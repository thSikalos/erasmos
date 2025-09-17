-- Migration: Add clawback_percentage to clawbacks table
-- Description: Add percentage field (1-12) for clawback calculations and unique constraints

-- Add clawback_percentage column
ALTER TABLE clawbacks
ADD COLUMN clawback_percentage INTEGER
CHECK (clawback_percentage >= 1 AND clawback_percentage <= 12)
DEFAULT 12;

-- Add comment for documentation
COMMENT ON COLUMN clawbacks.clawback_percentage IS 'Clawback percentage in 12ths (1-12, default 12/12)';

-- Add unique constraint to prevent duplicate clawbacks for same field
-- Using partial unique index to only check unsettled clawbacks
CREATE UNIQUE INDEX CONCURRENTLY idx_unique_unsettled_field_clawback
ON clawbacks (application_id, field_id)
WHERE is_settled = false;

-- Add comment for the constraint
COMMENT ON INDEX idx_unique_unsettled_field_clawback IS 'Prevents duplicate active clawbacks for the same application field';

-- Update existing clawbacks to have default percentage (if any exist without it)
UPDATE clawbacks SET clawback_percentage = 12 WHERE clawback_percentage IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE clawbacks ALTER COLUMN clawback_percentage SET NOT NULL;