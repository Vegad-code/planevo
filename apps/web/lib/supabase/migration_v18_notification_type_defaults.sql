-- Migration: v18 - Expand notification type preferences
-- Description: Backfill new notification type switches for existing users.

UPDATE notification_preferences
SET types =
  '{"daily_plan": true, "deadline_rescue": true, "upcoming_reminders": true, "weekly_review": true, "account": true, "billing": true, "system": true}'::jsonb
  || COALESCE(types, '{}'::jsonb),
  updated_at = now();

NOTIFY pgrst, 'reload schema';
