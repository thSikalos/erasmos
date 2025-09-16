-- Migration: Enhance notifications table for Enterprise Notification System
-- Date: 2025-09-15
-- Description: Add missing columns required by NotificationService

-- Step 1: Check if notifications table exists, create if not
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'unread',
    channel VARCHAR(50) NOT NULL,
    link_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add missing columns if they don't exist
DO $$
BEGIN
    -- Add notification_type column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'notifications'
                   AND column_name = 'notification_type') THEN
        ALTER TABLE notifications ADD COLUMN notification_type VARCHAR(50);
    END IF;

    -- Add metadata column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'notifications'
                   AND column_name = 'metadata') THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Step 3: Update existing data to have a default notification type
UPDATE notifications
SET notification_type = 'SYSTEM_ALERT'
WHERE notification_type IS NULL;

-- Step 4: Make notification_type NOT NULL (only if it exists and has data)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'notifications'
               AND column_name = 'notification_type') THEN
        ALTER TABLE notifications ALTER COLUMN notification_type SET NOT NULL;
    END IF;
END $$;

-- Step 5: Create indexes for better performance (if they don't exist)
DO $$
BEGIN
    -- Index for user_id and status
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'notifications'
                   AND indexname = 'idx_notifications_user_status') THEN
        CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
    END IF;

    -- Index for notification_type
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'notifications'
                   AND indexname = 'idx_notifications_type') THEN
        CREATE INDEX idx_notifications_type ON notifications(notification_type);
    END IF;

    -- Index for created_at
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'notifications'
                   AND indexname = 'idx_notifications_created_at') THEN
        CREATE INDEX idx_notifications_created_at ON notifications(created_at);
    END IF;
END $$;

-- Step 6: Add foreign key constraint for user_id (if users table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')
       AND NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                       WHERE table_name = 'notifications'
                       AND constraint_name = 'fk_notifications_user_id') THEN
        ALTER TABLE notifications
        ADD CONSTRAINT fk_notifications_user_id
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 7: Verify the final schema
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
ORDER BY ordinal_position;