-- P0 security hardening:
-- - Hide legacy token/billing columns on public.users from browser clients.
-- - Prevent user-controlled plan/billing/token updates even if grants drift.
-- - Lock MCP pending action mutations to server-side service-role code.
-- - Add MCP constraints/indexes/updated_at triggers for data integrity.

-- Safe profile view for browser reads. Direct users table grants below provide
-- compatibility for existing column-specific queries while blocking select('*')
-- from returning secret-bearing columns.
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
  created_at
FROM public.users
WHERE (select auth.uid()) = id;

REVOKE ALL ON public.users_public FROM anon;
GRANT SELECT ON public.users_public TO authenticated;

-- Remove broad table access that exposed canvas/google/n8n tokens and billing fields.
REVOKE SELECT, UPDATE ON public.users FROM anon, authenticated;

-- Browser clients may read only non-secret profile columns.
GRANT SELECT (
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
  created_at
) ON public.users TO authenticated;

-- Browser clients may update only user-editable profile/preferences columns.
-- Billing, plan, and token columns are server-only.
GRANT UPDATE (
  name,
  avatar_url,
  canvas_url,
  preferred_morning_time,
  onboarding_complete,
  energy_preference,
  google_calendar_connected,
  google_calendar_last_synced_at,
  google_calendar_id,
  google_classroom_connected,
  scheduling_preferences,
  expo_push_token,
  push_notifications_enabled,
  email_notifications_enabled,
  theme,
  accent_color,
  font_size,
  reduce_motion
) ON public.users TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_client_sensitive_user_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
    OR NEW.canvas_token IS DISTINCT FROM OLD.canvas_token
    OR NEW.google_calendar_refresh_token IS DISTINCT FROM OLD.google_calendar_refresh_token
    OR NEW.n8n_webhook_token IS DISTINCT FROM OLD.n8n_webhook_token
    OR NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id
    OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id
    OR NEW.stripe_price_id IS DISTINCT FROM OLD.stripe_price_id
    OR NEW.stripe_current_period_end IS DISTINCT FROM OLD.stripe_current_period_end
    OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
    OR NEW.trial_end IS DISTINCT FROM OLD.trial_end
  THEN
    RAISE EXCEPTION 'Sensitive user fields are server-managed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_client_sensitive_user_updates ON public.users;
CREATE TRIGGER prevent_client_sensitive_user_updates
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.prevent_client_sensitive_user_updates();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
      AND p.pronargs = 0
  ) THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = public;
  END IF;
END $$;

-- Preserve the existing ownership policies, but make the auth requirement explicit.
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- MCP pending actions are approvals generated by the server. Clients can read
-- their own pending approvals, but status/tool/argument mutation is server-only.
DROP POLICY IF EXISTS "Users can update own pending actions" ON public.mcp_pending_actions;
REVOKE UPDATE ON public.mcp_pending_actions FROM anon, authenticated;

DROP POLICY IF EXISTS "Users can read own pending actions" ON public.mcp_pending_actions;
CREATE POLICY "Users can read own pending actions"
ON public.mcp_pending_actions
FOR SELECT
TO authenticated
USING ((select auth.uid()) = user_id);

-- Keep service-role access explicit for environments where grants are tightened.
GRANT ALL ON public.mcp_pending_actions TO service_role;

-- Data integrity checks for MCP status/risk text columns. NOT VALID avoids
-- blocking deployment if legacy rows need cleanup; new rows are checked.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_connections_status_check'
  ) THEN
    ALTER TABLE public.mcp_connections
      ADD CONSTRAINT mcp_connections_status_check
      CHECK (status IN ('connected', 'disconnected', 'expired', 'error')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_tool_calls_risk_level_check'
  ) THEN
    ALTER TABLE public.mcp_tool_calls
      ADD CONSTRAINT mcp_tool_calls_risk_level_check
      CHECK (risk_level IN ('read', 'safe_write', 'dangerous_write')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_tool_calls_status_check'
  ) THEN
    ALTER TABLE public.mcp_tool_calls
      ADD CONSTRAINT mcp_tool_calls_status_check
      CHECK (status IN ('success', 'failed', 'pending', 'approved', 'rejected', 'expired')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_pending_actions_risk_level_check'
  ) THEN
    ALTER TABLE public.mcp_pending_actions
      ADD CONSTRAINT mcp_pending_actions_risk_level_check
      CHECK (risk_level IN ('read', 'safe_write', 'dangerous_write')) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mcp_pending_actions_status_check'
  ) THEN
    ALTER TABLE public.mcp_pending_actions
      ADD CONSTRAINT mcp_pending_actions_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_connection_id
ON public.mcp_tool_calls(connection_id);

CREATE INDEX IF NOT EXISTS idx_mcp_pending_actions_connection_id
ON public.mcp_pending_actions(connection_id);

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_sessions_user_id
ON public.mcp_oauth_sessions(user_id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS mcp_connections_updated_at ON public.mcp_connections;
CREATE TRIGGER mcp_connections_updated_at
BEFORE UPDATE ON public.mcp_connections
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS daily_user_metrics_updated_at ON public.daily_user_metrics;
CREATE TRIGGER daily_user_metrics_updated_at
BEFORE UPDATE ON public.daily_user_metrics
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
