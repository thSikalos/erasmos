-- Migration: Terms of Service System
-- Creates comprehensive terms management and user acceptance tracking

-- Terms of Service versions table
CREATE TABLE IF NOT EXISTS terms_of_service (
    id SERIAL PRIMARY KEY,
    version VARCHAR(20) NOT NULL UNIQUE, -- e.g., "1.0", "1.1", "2.0"
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL, -- Full terms content in markdown/plain text
    effective_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN DEFAULT FALSE, -- Only one version can be current
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User terms acceptance tracking
CREATE TABLE IF NOT EXISTS user_terms_acceptance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_id INTEGER NOT NULL REFERENCES terms_of_service(id) ON DELETE CASCADE,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    -- Prevent duplicate acceptances
    UNIQUE(user_id, terms_id)
);

-- Terms PDF storage for legal compliance
CREATE TABLE IF NOT EXISTS terms_pdf_files (
    id SERIAL PRIMARY KEY,
    terms_id INTEGER NOT NULL REFERENCES terms_of_service(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path to stored PDF file
    file_size INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(terms_id) -- One PDF per terms version
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_terms_current ON terms_of_service(is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_terms_effective_date ON terms_of_service(effective_date);
CREATE INDEX IF NOT EXISTS idx_user_acceptance_user_id ON user_terms_acceptance(user_id);
CREATE INDEX IF NOT EXISTS idx_user_acceptance_terms_id ON user_terms_acceptance(terms_id);
CREATE INDEX IF NOT EXISTS idx_user_acceptance_accepted_at ON user_terms_acceptance(accepted_at);

-- Trigger to ensure only one current version exists
CREATE OR REPLACE FUNCTION ensure_single_current_terms()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        -- Set all other versions to false
        UPDATE terms_of_service 
        SET is_current = FALSE 
        WHERE id != NEW.id AND is_current = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_current_terms
    BEFORE INSERT OR UPDATE ON terms_of_service
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_current_terms();

-- Add terms acceptance tracking to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_terms_accepted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_terms_acceptance BOOLEAN DEFAULT FALSE;

-- Update existing users to require terms acceptance
UPDATE users SET needs_terms_acceptance = TRUE WHERE has_accepted_terms = FALSE OR has_accepted_terms IS NULL;

-- Insert initial terms version (placeholder - will be updated with actual content)
INSERT INTO terms_of_service (version, title, content, is_current, created_by, effective_date)
VALUES (
    '1.0',
    'Όροι Χρήσης Υπηρεσίας "Έρασμος"',
    'Αρχικό περιεχόμενο όρων χρήσης - θα ενημερωθεί με το πλήρες κείμενο',
    TRUE,
    1, -- Admin user
    CURRENT_TIMESTAMP
);

COMMENT ON TABLE terms_of_service IS 'Stores all versions of terms of service with version control';
COMMENT ON TABLE user_terms_acceptance IS 'Tracks which users have accepted which terms versions';
COMMENT ON TABLE terms_pdf_files IS 'Stores PDF files for each terms version for legal compliance';
COMMENT ON COLUMN users.needs_terms_acceptance IS 'Flag to force users to accept new terms on next login';