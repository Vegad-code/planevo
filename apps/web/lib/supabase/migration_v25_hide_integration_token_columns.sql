-- Mirror of supabase/migrations/20260616140000_hide_integration_token_columns.sql

CREATE OR REPLACE VIEW public.integration_accounts_public
WITH (security_invoker = false) AS
SELECT
  id,
  user_id,
  provider,
  provider_account_id,
  display_name,
  scopes,
  expires_at,
  metadata,
  status,
  last_synced_at,
  last_error,
  created_at,
  updated_at
FROM public.integration_accounts
WHERE user_id = auth.uid();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mcp_connections'
      AND column_name = 'provider'
  ) THEN
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.mcp_connections_public
      WITH (security_invoker = false) AS
      SELECT
        id,
        user_id,
        provider,
        server_url,
        status,
        connected_at,
        disconnected_at,
        token_expires_at,
        scope,
        token_type,
        created_at,
        updated_at
      FROM public.mcp_connections
      WHERE user_id = auth.uid()
    $view$;
  ELSE
    EXECUTE $view$
      CREATE OR REPLACE VIEW public.mcp_connections_public
      WITH (security_invoker = false) AS
      SELECT
        id,
        user_id,
        server_id,
        status,
        scopes,
        expires_at,
        metadata,
        created_at,
        updated_at
      FROM public.mcp_connections
      WHERE user_id = auth.uid()
    $view$;
  END IF;
END $$;

DROP POLICY IF EXISTS "Users can read own mcp connection metadata" ON public.mcp_connections;
DROP POLICY IF EXISTS "Users can manage their own MCP connections" ON public.mcp_connections;
DROP POLICY IF EXISTS "Users can manage their own integration accounts" ON public.integration_accounts;

REVOKE ALL ON public.integration_accounts FROM authenticated, anon;
REVOKE ALL ON public.mcp_connections FROM authenticated, anon;

GRANT SELECT ON public.integration_accounts_public TO authenticated;
GRANT SELECT ON public.mcp_connections_public TO authenticated;
