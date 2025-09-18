-- Fix: Allow NULL values in field_id column for customer field mappings
-- This removes the NOT NULL constraint to enable customer field support

ALTER TABLE pdf_visual_mappings ALTER COLUMN field_id DROP NOT NULL;