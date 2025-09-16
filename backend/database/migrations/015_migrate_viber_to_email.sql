-- Migration: Convert Viber notifications to Email
-- Date: 2025-09-16
-- Description: Update all existing Viber channel notifications to Email channel

-- Step 1: Update all existing 'viber' channel notifications to 'email'
UPDATE notifications
SET channel = 'email'
WHERE channel = 'viber';

-- Step 2: Update any draft notifications that might reference viber
UPDATE notifications
SET status = 'draft',
    channel = 'email',
    notification_type = 'MONTHLY_SUMMARY'
WHERE channel = 'email'
  AND status = 'draft'
  AND notification_type IS NULL;

-- Step 3: Verify the changes
SELECT
    channel,
    status,
    notification_type,
    COUNT(*) as count
FROM notifications
GROUP BY channel, status, notification_type
ORDER BY channel, status;

-- Step 4: Show sample of updated records
SELECT
    id,
    channel,
    status,
    notification_type,
    created_at,
    LEFT(message, 50) || '...' as message_preview
FROM notifications
WHERE channel = 'email'
ORDER BY created_at DESC
LIMIT 10;