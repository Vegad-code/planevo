-- Migration: v20 - Upcoming reminder notification type
-- Description: Backfill upcoming_reminders preference for existing users.

UPDATE notification_preferences
SET types =
  '{"daily_plan": true, "deadline_rescue": true, "upcoming_reminders": true, "weekly_review": true, "account": true, "billing": true, "system": true}'::jsonb
  || COALESCE(types, '{}'::jsonb),
  updated_at = now();

NOTIFY pgrst, 'reload schema';
