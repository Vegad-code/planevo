-- Bruno V2 mode routing, cost logging, and launch-safe Deep access.

ALTER TABLE public.ai_usage_logs
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS mode TEXT,
  ADD COLUMN IF NOT EXISTS route_tier TEXT,
  ADD COLUMN IF NOT EXISTS input_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS output_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS estimated_cost_cents NUMERIC(12, 6),
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'reserved',
  ADD COLUMN IF NOT EXISTS latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ai_usage_logs_status_check'
      AND conrelid = 'public.ai_usage_logs'::regclass
  ) THEN
    ALTER TABLE public.ai_usage_logs
      ADD CONSTRAINT ai_usage_logs_status_check
      CHECK (status IN ('reserved', 'completed', 'failed'));
  END IF;
END;
$$;

CREATE UNIQUE INDEX IF NOT EXISTS ai_usage_logs_request_id_idx
  ON public.ai_usage_logs (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS ai_usage_logs_user_created_idx
  ON public.ai_usage_logs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS ai_usage_logs_feature_user_created_idx
  ON public.ai_usage_logs (feature, user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bruno_route_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  message_id TEXT,
  conversation_id TEXT,
  mode TEXT NOT NULL,
  confidence NUMERIC(4, 3),
  route_source TEXT NOT NULL
    CHECK (route_source IN ('deterministic', 'obvious_mode', 'llm_router', 'fallback')),
  selected_tier TEXT NOT NULL
    CHECK (selected_tier IN ('none', 'standard', 'medium', 'deep')),
  selected_model TEXT,
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  used_deep_credit BOOLEAN NOT NULL DEFAULT FALSE,
  upgrade_card_shown BOOLEAN NOT NULL DEFAULT FALSE,
  safety_status TEXT NOT NULL DEFAULT 'clear',
  estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
  estimated_cost_cents NUMERIC(12, 6),
  latency_ms INTEGER,
  rationale TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id)
);

CREATE INDEX IF NOT EXISTS bruno_route_events_user_created_idx
  ON public.bruno_route_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS bruno_route_events_mode_created_idx
  ON public.bruno_route_events (mode, created_at DESC);

CREATE TABLE IF NOT EXISTS public.bruno_credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  credit_type TEXT NOT NULL CHECK (
    credit_type IN (
      'onboarding_deep',
      'earned_deep',
      'pro_monthly_deep',
      'manual_adjustment'
    )
  ),
  delta INTEGER NOT NULL CHECK (delta <> 0),
  reason TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS bruno_credit_ledger_user_request_idx
  ON public.bruno_credit_ledger (user_id, request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS bruno_credit_ledger_user_created_idx
  ON public.bruno_credit_ledger (user_id, created_at DESC);

ALTER TABLE public.bruno_route_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bruno_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create own AI logs"
  ON public.ai_usage_logs;

DROP POLICY IF EXISTS "Users can insert own AI logs"
  ON public.ai_usage_logs;

DROP POLICY IF EXISTS "Users can read own bruno route events"
  ON public.bruno_route_events;
CREATE POLICY "Users can read own bruno route events"
  ON public.bruno_route_events
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own bruno credit ledger"
  ON public.bruno_credit_ledger;
CREATE POLICY "Users can read own bruno credit ledger"
  ON public.bruno_credit_ledger
  FOR SELECT
  USING (auth.uid() = user_id);

REVOKE INSERT, UPDATE, DELETE
  ON public.ai_usage_logs
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE
  ON public.bruno_route_events
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE
  ON public.bruno_credit_ledger
  FROM anon, authenticated;

INSERT INTO public.bruno_credit_ledger (
  user_id,
  credit_type,
  delta,
  reason,
  request_id
)
SELECT
  users.id,
  'onboarding_deep',
  3,
  'Launch onboarding Deep Bruno grant',
  'launch-onboarding-grant-v1'
FROM public.users
WHERE NOT EXISTS (
  SELECT 1
  FROM public.bruno_credit_ledger ledger
  WHERE ledger.user_id = users.id
    AND ledger.request_id = 'launch-onboarding-grant-v1'
);

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.grant_bruno_onboarding_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.bruno_credit_ledger (
    user_id,
    credit_type,
    delta,
    reason,
    request_id
  )
  VALUES (
    NEW.id,
    'onboarding_deep',
    3,
    'Launch onboarding Deep Bruno grant',
    'launch-onboarding-grant-v1'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS grant_bruno_onboarding_credits
  ON public.users;
CREATE TRIGGER grant_bruno_onboarding_credits
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION private.grant_bruno_onboarding_credits();

CREATE OR REPLACE FUNCTION public.reserve_bruno_deep_access(
  p_user_id UUID,
  p_request_id TEXT,
  p_source TEXT,
  p_monthly_limit INTEGER DEFAULT 150
)
RETURNS TABLE (reserved BOOLEAN, credit_type TEXT)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  available_credits INTEGER;
  existing_type TEXT;
  monthly_balance INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  SELECT ledger.credit_type
  INTO existing_type
  FROM public.bruno_credit_ledger ledger
  WHERE ledger.user_id = p_user_id
    AND ledger.request_id = p_request_id
    AND ledger.delta < 0
  LIMIT 1;

  IF existing_type IS NOT NULL THEN
    RETURN QUERY SELECT TRUE, existing_type;
    RETURN;
  END IF;

  IF p_source NOT IN (
    'onboarding_deep',
    'earned_deep',
    'pro_monthly_deep'
  ) THEN
    RAISE EXCEPTION 'Invalid Bruno credit source';
  END IF;

  IF p_source = 'pro_monthly_deep' THEN
    SELECT COALESCE(SUM(ledger.delta), 0)::INTEGER
    INTO monthly_balance
    FROM public.bruno_credit_ledger ledger
    WHERE ledger.user_id = p_user_id
      AND ledger.credit_type = 'pro_monthly_deep'
      AND date_trunc('month', ledger.created_at AT TIME ZONE 'UTC') =
        date_trunc('month', now() AT TIME ZONE 'UTC');

    IF GREATEST(0, -monthly_balance) >= p_monthly_limit THEN
      RETURN QUERY SELECT FALSE, NULL::TEXT;
      RETURN;
    END IF;
  ELSE
    SELECT COALESCE(SUM(ledger.delta), 0)::INTEGER
    INTO available_credits
    FROM public.bruno_credit_ledger ledger
    WHERE ledger.user_id = p_user_id
      AND ledger.credit_type = p_source;

    IF available_credits <= 0 THEN
      RETURN QUERY SELECT FALSE, NULL::TEXT;
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.bruno_credit_ledger (
    user_id,
    credit_type,
    delta,
    reason,
    request_id
  )
  VALUES (
    p_user_id,
    p_source,
    -1,
    'Deep Bruno request reservation',
    p_request_id
  );

  RETURN QUERY SELECT TRUE, p_source;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_bruno_deep_access(
  p_user_id UUID,
  p_request_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  original_type TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  IF EXISTS (
    SELECT 1
    FROM public.bruno_credit_ledger ledger
    WHERE ledger.user_id = p_user_id
      AND ledger.request_id = p_request_id || ':refund'
  ) THEN
    RETURN TRUE;
  END IF;

  SELECT ledger.credit_type
  INTO original_type
  FROM public.bruno_credit_ledger ledger
  WHERE ledger.user_id = p_user_id
    AND ledger.request_id = p_request_id
    AND ledger.delta = -1
  LIMIT 1;

  IF original_type IS NULL THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.bruno_credit_ledger (
    user_id,
    credit_type,
    delta,
    reason,
    request_id
  )
  VALUES (
    p_user_id,
    original_type,
    1,
    'Deep Bruno reservation refund',
    p_request_id || ':refund'
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION private.grant_bruno_onboarding_credits()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_bruno_deep_access(UUID, TEXT, TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_bruno_deep_access(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.reserve_bruno_deep_access(UUID, TEXT, TEXT, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_bruno_deep_access(UUID, TEXT)
  TO service_role;
