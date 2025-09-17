-- Migration: Add password reset functionality to users table
-- Date: 2025-09-17
-- Description: Adds password reset token and expiration fields to support "forgot password" functionality

-- Add password reset fields to users table
ALTER TABLE users
ADD COLUMN password_reset_token VARCHAR(255),
ADD COLUMN password_reset_expires TIMESTAMP WITH TIME ZONE;

-- Create index for performance on password reset token lookups
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Create index for cleanup of expired tokens
CREATE INDEX idx_users_password_reset_expires ON users(password_reset_expires) WHERE password_reset_expires IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN users.password_reset_token IS 'Secure token used for password reset verification';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiration timestamp for password reset token (typically 1 hour from creation)';

-- Note: No default values needed as these will be NULL until a password reset is requested