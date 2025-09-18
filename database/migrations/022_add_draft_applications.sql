-- Migration 022: Add draft applications system
-- Date: 2025-01-25

BEGIN;

-- Create draft_applications table for temporary application storage
CREATE TABLE IF NOT EXISTS draft_applications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,

    -- Customer details (stored as JSON for flexibility in draft state)
    customer_details JSONB,

    -- Application data stored as JSON (field_values, etc)
    application_data JSONB NOT NULL DEFAULT '{}',

    -- Optional fields
    contract_end_date DATE,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT draft_application_user_check CHECK (user_id IS NOT NULL)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_draft_applications_user_id ON draft_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_applications_created_at ON draft_applications(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_draft_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_draft_applications_updated_at
    BEFORE UPDATE ON draft_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_draft_applications_updated_at();

-- Add comments
COMMENT ON TABLE draft_applications IS 'Stores draft/temporary applications that users can save before final submission';
COMMENT ON COLUMN draft_applications.user_id IS 'User who created this draft';
COMMENT ON COLUMN draft_applications.customer_details IS 'Customer information stored as JSON (flexible for incomplete data)';
COMMENT ON COLUMN draft_applications.application_data IS 'Application field values and other data stored as JSON';

COMMIT;