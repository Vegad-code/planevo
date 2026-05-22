-- Migration v8: Push notification support
-- Adds columns for Expo push token and notification preferences

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS expo_push_token TEXT,
  ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_users_push_token
  ON public.users (expo_push_token)
  WHERE expo_push_token IS NOT NULL AND push_notifications_enabled = true;
