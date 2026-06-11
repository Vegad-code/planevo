-- Add appearance preferences to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS theme text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accent_color text;
