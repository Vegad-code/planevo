-- Security audit log: append-only operational trail for account and integration mutations.

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS security_audit_log_actor_created_idx
  ON public.security_audit_log (actor_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS security_audit_log_action_created_idx
  ON public.security_audit_log (action, created_at DESC);

ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own security audit rows"
  ON public.security_audit_log
  FOR SELECT
  TO authenticated
  USING (actor_user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies for authenticated — inserts via RPC only.

CREATE OR REPLACE FUNCTION public.insert_security_audit_log(
  p_actor_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_hash TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.security_audit_log (
    actor_user_id,
    action,
    resource_type,
    resource_id,
    metadata,
    ip_hash
  )
  VALUES (
    p_actor_user_id,
    left(coalesce(p_action, 'unknown'), 128),
    p_resource_type,
    p_resource_id,
    coalesce(p_metadata, '{}'::jsonb),
    p_ip_hash
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.insert_security_audit_log FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.insert_security_audit_log TO service_role;
