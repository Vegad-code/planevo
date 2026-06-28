-- Migration: v28 - In-app user notifications inbox
-- Description: Persisted per-user notifications for the in-app notification center.

CREATE TABLE IF NOT EXISTS user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('bruno_insight', 'task', 'event', 'assignment', 'system')),
  title text NOT NULL,
  body text NOT NULL,
  subtitle text,
  href text,
  source_id text NOT NULL,
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('high', 'normal')),
  read_at timestamp with time zone,
  dismissed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id)
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox
  ON user_notifications(user_id, dismissed_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON user_notifications(user_id)
  WHERE dismissed_at IS NULL AND read_at IS NULL;

ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
