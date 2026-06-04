-- Migration: v19 - Notification delivery ledger
-- Description: Prevent duplicate scheduled notifications when cron jobs retry.

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text NOT NULL,
  channel text NOT NULL CHECK (channel IN ('push', 'email')),
  dedupe_key text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, notification_type, channel, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_sent
  ON notification_deliveries(user_id, sent_at DESC);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification deliveries"
  ON notification_deliveries FOR SELECT
  USING (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
