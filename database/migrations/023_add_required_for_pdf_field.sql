-- Migration: Add required_for_pdf field to fields table
-- This field allows admins to specify which fields are required for PDF generation
-- when creating new applications

-- Add the required_for_pdf column to the fields table
ALTER TABLE fields ADD COLUMN required_for_pdf BOOLEAN DEFAULT false NOT NULL;

-- Add a comment to explain the purpose of this field
COMMENT ON COLUMN fields.required_for_pdf IS 'Indicates whether this field is required for PDF generation during application creation';

-- Optional: Update some existing fields to be required for PDF as examples
-- These can be customized based on business requirements
-- UPDATE fields SET required_for_pdf = true WHERE label IN ('Όνομα Πελάτη', 'ΑΦΜ', 'Τηλέφωνο');