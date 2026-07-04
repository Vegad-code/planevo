-- Security hardening: lock down SECURITY DEFINER RPC functions and pin search_path.
--
-- Context: Supabase advisors 0028/0029 flagged several SECURITY DEFINER functions
-- as executable by the `anon` (unauthenticated) role via /rest/v1/rpc/. The read
-- functions self-check auth.uid(), but the write functions
-- (insert_security_audit_log, consume_ai_usage_admin, consume_ip_rate_limit,
-- increment_daily_user_metric) allowed unauthenticated writes: audit-log forgery,
-- cross-user AI-quota exhaustion, rate-limit bucket poisoning, and metric pollution.
--
-- `service_role` holds its own explicit EXECUTE grant on every function below, so
-- revoking anon/authenticated/public does NOT affect the server-side callers
-- (all three admin functions are invoked only via the service-role admin client).

-- ---------------------------------------------------------------------------
-- Server-only functions: called exclusively via the service-role admin client.
-- Remove anon, authenticated, and PUBLIC. service_role retains its grant.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.insert_security_audit_log(uuid, text, text, text, jsonb, text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_ai_usage_admin(uuid, text, integer, text)               FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_ip_rate_limit(text, integer, integer)                   FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------------
-- Trigger / event-trigger functions: never meant to be called directly via RPC.
-- Triggers fire regardless of caller EXECUTE grants, so this is safe.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user()  FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()  FROM anon, authenticated, PUBLIC;

-- ---------------------------------------------------------------------------
-- User-facing functions: they self-enforce auth.uid() = p_user_id, so keeping
-- `authenticated` is safe. Only remove the unauthenticated (anon/PUBLIC) path.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.can_user_use_ai(uuid, text, integer)                    FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.consume_ai_usage(uuid, text, integer)                   FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_ollie_chat_context(text)                            FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_daily_user_metric(uuid, date, text, integer)  FROM anon, PUBLIC;

-- ---------------------------------------------------------------------------
-- Pin search_path on trigger functions flagged by advisor 0011
-- (function_search_path_mutable). A fixed search_path prevents object-shadowing
-- via a caller-controlled search_path. Bodies reference public objects, so
-- pinning to `public` preserves behavior.
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.protect_user_plan()                        SET search_path = public;
ALTER FUNCTION public.protect_plan_type()                        SET search_path = public;
ALTER FUNCTION public.handle_updated_at()                        SET search_path = public;
ALTER FUNCTION public.set_notification_preferences_updated_at()  SET search_path = public;
ALTER FUNCTION public.update_modified_column()                   SET search_path = public;

-- Trigger-only utility functions: fire via triggers regardless of caller EXECUTE
-- grants, and are never invoked directly by app code. Remove the direct-call
-- (anon/authenticated/PUBLIC) surface; clears advisor 0028 on protect_user_plan.
REVOKE EXECUTE ON FUNCTION public.protect_user_plan()                       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.protect_plan_type()                       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at()                       FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_notification_preferences_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_modified_column()                  FROM anon, authenticated, PUBLIC;
