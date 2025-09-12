-- Upgrade existing attachments table for S3 support

-- First, backup existing data if any exists
-- Then drop and recreate with enhanced schema

-- Drop existing attachments table (careful - this removes data!)
DROP TABLE IF EXISTS attachments CASCADE;

-- Create new enhanced attachments table  
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    s3_key VARCHAR(500),
    file_size INTEGER NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_category VARCHAR(50) NOT NULL DEFAULT 'document',
    description TEXT,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_attachments_application_id ON attachments(application_id);
CREATE INDEX IF NOT EXISTS idx_attachments_uploaded_by ON attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_attachments_category ON attachments(file_category);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_attachments_updated_at ON attachments;
CREATE TRIGGER trigger_attachments_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_attachments_updated_at();