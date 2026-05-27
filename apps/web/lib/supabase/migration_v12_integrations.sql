-- Migration v12: Add Integrations Sync Timestamp
-- Adds a last_synced_at column to track when the user's Google Calendar was last synchronized.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS google_calendar_last_synced_at TIMESTAMP WITH TIME ZONE;
