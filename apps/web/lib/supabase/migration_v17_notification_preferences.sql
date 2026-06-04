-- Migration: v17 - Notification Preferences
-- Description: Create a robust notification_preferences table to manage push, email, quiet hours, and types.

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  master_toggle boolean NOT NULL DEFAULT true,
  channels jsonb NOT NULL DEFAULT '{"push": true, "email": true}'::jsonb,
  quiet_hours jsonb NOT NULL DEFAULT '{"enabled": false, "start": "22:00", "end": "08:00", "timezone": "UTC"}'::jsonb,
  types jsonb NOT NULL DEFAULT '{"daily_plan": true, "deadline_rescue": true, "weekly_review": true, "account": true, "billing": true, "system": true}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own notification preferences"
  ON notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON notification_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification preferences"
  ON notification_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

CREATE OR REPLACE FUNCTION set_notification_preferences_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;

-- Add updated_at trigger
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION set_notification_preferences_updated_at();

-- Migrate existing user notification flags to the new table
INSERT INTO notification_preferences (user_id, channels, created_at, updated_at)
SELECT
  id as user_id,
  jsonb_build_object(
    'push', COALESCE(push_notifications_enabled, true),
    'email', COALESCE(email_notifications_enabled, true)
  ) as channels,
  now(),
  now()
FROM users
ON CONFLICT (user_id) DO NOTHING;
