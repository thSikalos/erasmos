-- Migration: Remove Terms of Service Functionality
-- This migration removes all terms of service related tables and columns

-- Drop tables in correct order (foreign key dependencies)
DROP TABLE IF EXISTS user_acceptance_pdfs;
DROP TABLE IF EXISTS user_terms_acceptance;
DROP TABLE IF EXISTS terms_pdf_files;
DROP TABLE IF EXISTS terms_of_service;
DROP TABLE IF EXISTS user_agreements;

-- Remove columns from users table
ALTER TABLE users DROP COLUMN IF EXISTS has_accepted_terms;
ALTER TABLE users DROP COLUMN IF EXISTS current_terms_accepted_at;
ALTER TABLE users DROP COLUMN IF EXISTS needs_terms_acceptance;

-- Drop functions and triggers
DROP TRIGGER IF EXISTS trigger_ensure_single_current_terms ON terms_of_service;
DROP FUNCTION IF EXISTS ensure_single_current_terms();

-- Drop indexes (if they still exist)
DROP INDEX IF EXISTS idx_terms_current;
DROP INDEX IF EXISTS idx_terms_effective_date;
DROP INDEX IF EXISTS idx_user_acceptance_user_id;
DROP INDEX IF EXISTS idx_user_acceptance_terms_id;
DROP INDEX IF EXISTS idx_user_acceptance_accepted_at;