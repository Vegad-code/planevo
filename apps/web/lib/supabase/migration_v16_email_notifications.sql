-- Migration: Add email_notifications_enabled to users table
-- Description: Adds a boolean flag to control whether a user receives email notifications. Defaults to true.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS email_notifications_enabled boolean DEFAULT true;

-- Ensure the schema cache is refreshed if needed
NOTIFY pgrst, 'reload schema';
