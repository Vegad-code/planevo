-- IP-based rate limiting for auth-sensitive endpoints (service_role only)

CREATE TABLE IF NOT EXISTS public.ip_rate_limit_buckets (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bucket_key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_ip_rate_limit_buckets_key_window
  ON public.ip_rate_limit_buckets (bucket_key, window_start DESC);

ALTER TABLE public.ip_rate_limit_buckets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ip_rate_limit_buckets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_ip_rate_limit(
  p_bucket_key TEXT,
  p_max_attempts INTEGER,
  p_window_seconds INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INTEGER;
BEGIN
  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.ip_rate_limit_buckets (bucket_key, window_start, attempt_count)
  VALUES (p_bucket_key, v_window_start, 1)
  ON CONFLICT (bucket_key, window_start)
  DO UPDATE SET attempt_count = public.ip_rate_limit_buckets.attempt_count + 1
  RETURNING attempt_count INTO v_count;

  RETURN v_count <= p_max_attempts;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ip_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_ip_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;
