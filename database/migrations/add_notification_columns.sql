-- Migration: Add missing columns to notifications table
-- Date: 2025-09-16
-- Purpose: Add notification_type and metadata columns for dual notification system

-- Add notification_type column
ALTER TABLE notifications
ADD COLUMN notification_type VARCHAR(100);

-- Add metadata column for storing additional notification data
ALTER TABLE notifications
ADD COLUMN metadata JSONB;

-- Add index on notification_type for better query performance
CREATE INDEX idx_notifications_type ON notifications(notification_type);

-- Add index on user_id and channel combination for faster filtering
CREATE INDEX idx_notifications_user_channel ON notifications(user_id, channel);

-- Update existing notifications to have a default notification_type
UPDATE notifications
SET notification_type = 'legacy_notification'
WHERE notification_type IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification (e.g., new_application, user_registration, etc.)';
COMMENT ON COLUMN notifications.metadata IS 'JSON data containing additional notification context and parameters';