-- Migration: Add Push Notifications Support
-- Created: 2025-01-20
-- Description: Adds push notification settings to users table and creates push_subscriptions table

-- Add push notification preference to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT false;

-- Create push_subscriptions table to store browser push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Ensure one subscription per user per endpoint
    UNIQUE(user_id, endpoint)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_created_at ON push_subscriptions(created_at);

-- Add comments for documentation
COMMENT ON COLUMN users.push_notifications_enabled IS 'Whether user has enabled browser push notifications';
COMMENT ON TABLE push_subscriptions IS 'Stores browser push notification subscriptions for each user';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'Push service endpoint URL';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'P256DH key for message encryption';
COMMENT ON COLUMN push_subscriptions.auth IS 'Auth secret for message encryption';
COMMENT ON COLUMN push_subscriptions.user_agent IS 'Browser user agent for debugging purposes';