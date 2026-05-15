-- Migration: Per-Feature Rate Limits
-- Description: Updates the AI usage RPCs to filter by feature, preventing a user hitting the chat limit from being locked out of the Daily Plan generation.

DROP FUNCTION IF EXISTS public.can_user_use_ai(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.can_user_use_ai(p_user_id UUID, p_feature TEXT, p_limit INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
  AND feature = p_feature
  AND created_at > now() - interval '24 hours';

  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.consume_ai_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() OR p_limit < 1 THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT count(*) INTO v_count
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
  AND feature = p_feature
  AND created_at > now() - interval '24 hours';

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, feature)
  VALUES (p_user_id, left(coalesce(p_feature, 'unknown'), 100));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
