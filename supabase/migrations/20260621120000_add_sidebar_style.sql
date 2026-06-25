-- Add sidebar navigation style preference (classic rectangular vs floating pill).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sidebar_style text NOT NULL DEFAULT 'classic'
  CHECK (sidebar_style IN ('classic', 'floating'));

CREATE OR REPLACE VIEW public.users_public
WITH (security_invoker = true) AS
SELECT
  id,
  email,
  name,
  avatar_url,
  canvas_url,
  google_calendar_last_synced_at,
  preferred_morning_time,
  onboarding_complete,
  energy_preference,
  google_calendar_connected,
  google_calendar_id,
  google_classroom_connected,
  scheduling_preferences,
  expo_push_token,
  push_notifications_enabled,
  email_notifications_enabled,
  referral_code,
  referred_by,
  plan_type,
  subscription_status,
  trial_end,
  stripe_customer_id,
  stripe_subscription_id,
  stripe_price_id,
  stripe_current_period_end,
  theme,
  accent_color,
  font_size,
  reduce_motion,
  sidebar_style,
  created_at
FROM public.users
WHERE (select auth.uid()) = id;

GRANT SELECT (sidebar_style) ON public.users TO authenticated;
GRANT UPDATE (sidebar_style) ON public.users TO authenticated;
