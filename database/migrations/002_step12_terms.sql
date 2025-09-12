-- Step 12: Terms & Conditions System Database Migration
-- Run this SQL script in your PostgreSQL database

-- 1. Add has_accepted_terms column to users table
ALTER TABLE users 
ADD COLUMN has_accepted_terms BOOLEAN DEFAULT FALSE;

-- 2. Create user_agreements table for tracking acceptance proof
CREATE TABLE user_agreements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45), -- Supports both IPv4 and IPv6
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX idx_user_agreements_user_id ON user_agreements(user_id);
CREATE INDEX idx_user_agreements_accepted_at ON user_agreements(accepted_at);

-- Optional: Update existing users if needed (uncomment if you want all existing users to have terms accepted)
-- UPDATE users SET has_accepted_terms = TRUE WHERE created_at < CURRENT_TIMESTAMP;

COMMIT;