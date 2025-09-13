-- Migration to convert bonuses from period-based to continuous monthly bonuses
-- Remove start_date and end_date, add created_at for tracking when bonus was created

-- Add created_at column first
ALTER TABLE bonuses
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update created_at for existing records (set to current time as fallback)
UPDATE bonuses SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- Make created_at not null
ALTER TABLE bonuses
ALTER COLUMN created_at SET NOT NULL;

-- Drop the date columns
ALTER TABLE bonuses
DROP COLUMN IF EXISTS start_date,
DROP COLUMN IF EXISTS end_date;

-- Update comments
COMMENT ON TABLE bonuses IS 'Continuous monthly bonuses for associates. When active, bonus is earned every month the target is achieved.';
COMMENT ON COLUMN bonuses.application_count_target IS 'Number of applications needed per month to earn the bonus';
COMMENT ON COLUMN bonuses.bonus_amount_per_application IS 'Bonus amount earned per qualifying application when monthly target is achieved';
COMMENT ON COLUMN bonuses.is_active IS 'Whether this bonus is currently active and being calculated';
COMMENT ON COLUMN bonuses.created_at IS 'When this bonus was created';