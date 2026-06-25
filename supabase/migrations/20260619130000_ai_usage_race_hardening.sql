-- Race hardening: atomic AI quota consumption and Bruno action idempotency.

CREATE OR REPLACE FUNCTION public.consume_ai_usage_admin(
  p_user_id UUID,
  p_feature TEXT,
  p_daily_limit INTEGER,
  p_request_id TEXT DEFAULT NULL
)
RETURNS TABLE(allowed BOOLEAN, usage_log_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_id UUID;
  v_feature TEXT;
BEGIN
  v_feature := left(coalesce(p_feature, 'unknown'), 100);

  IF p_daily_limit < 1 THEN
    RETURN QUERY SELECT false, NULL::UUID;
    RETURN;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('ai:' || p_user_id::text || ':' || v_feature));

  IF p_request_id IS NOT NULL THEN
    SELECT id INTO v_id
    FROM public.ai_usage_logs
    WHERE request_id = p_request_id;

    IF v_id IS NOT NULL THEN
      RETURN QUERY SELECT true, v_id;
      RETURN;
    END IF;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
    AND feature = v_feature
    AND created_at > now() - interval '24 hours';

  IF v_count >= p_daily_limit THEN
    RETURN QUERY SELECT false, NULL::UUID;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.ai_usage_logs (user_id, feature, request_id, status)
    VALUES (p_user_id, v_feature, p_request_id, 'reserved')
    RETURNING id INTO v_id;
  EXCEPTION WHEN unique_violation THEN
    IF p_request_id IS NOT NULL THEN
      SELECT id INTO v_id
      FROM public.ai_usage_logs
      WHERE request_id = p_request_id;
      RETURN QUERY SELECT true, v_id;
      RETURN;
    END IF;
    RETURN QUERY SELECT false, NULL::UUID;
    RETURN;
  END;

  RETURN QUERY SELECT true, v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_usage_admin FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage_admin TO service_role;

ALTER TABLE public.bruno_tool_logs
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS bruno_tool_logs_idempotency_idx
  ON public.bruno_tool_logs (user_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
