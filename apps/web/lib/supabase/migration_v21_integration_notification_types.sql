-- Migration: v21 - Integration notification preference types
-- Description: Backfill Canvas, Calendar, and Pro work-tool notification toggles.

UPDATE notification_preferences
SET types =
  '{"daily_plan": true, "deadline_rescue": true, "upcoming_reminders": true, "canvas_assignments": false, "calendar_events": true, "work_slack": false, "work_linear": false, "work_notion": false, "weekly_review": true, "account": true, "billing": true, "system": true}'::jsonb
  || COALESCE(types, '{}'::jsonb),
  updated_at = now();

NOTIFY pgrst, 'reload schema';
