-- Notion Rebuild Migration: MCP-First Architecture

-- Create handle_updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. mcp_server_registry
CREATE TABLE IF NOT EXISTS public.mcp_server_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  url text NOT NULL,
  description text,
  auth_type text NOT NULL CHECK (auth_type IN ('none', 'oauth2', 'api_key', 'bearer')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for mcp_server_registry
ALTER TABLE public.mcp_server_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select registered MCP servers" ON public.mcp_server_registry;
CREATE POLICY "Anyone can select registered MCP servers" ON public.mcp_server_registry
  FOR SELECT TO authenticated USING (true);

-- 2. mcp_connections
CREATE TABLE IF NOT EXISTS public.mcp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_id uuid NOT NULL REFERENCES public.mcp_server_registry(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  access_token_encrypted text,
  refresh_token_encrypted text,
  scopes text[],
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mcp_connections_user_server_key UNIQUE (user_id, server_id)
);

-- RLS for mcp_connections
ALTER TABLE public.mcp_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own MCP connections" ON public.mcp_connections;
CREATE POLICY "Users can manage their own MCP connections" ON public.mcp_connections
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. mcp_tool_calls
CREATE TABLE IF NOT EXISTS public.mcp_tool_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid REFERENCES public.mcp_connections(id) ON DELETE SET NULL,
  server_name text NOT NULL,
  tool_name text NOT NULL,
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'pending')),
  risk_level text NOT NULL CHECK (risk_level IN ('read', 'safe_write', 'dangerous_write')),
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for mcp_tool_calls
ALTER TABLE public.mcp_tool_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own MCP tool calls" ON public.mcp_tool_calls;
CREATE POLICY "Users can view their own MCP tool calls" ON public.mcp_tool_calls
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own MCP tool calls" ON public.mcp_tool_calls;
CREATE POLICY "Users can insert their own MCP tool calls" ON public.mcp_tool_calls
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 4. mcp_pending_actions
CREATE TABLE IF NOT EXISTS public.mcp_pending_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.mcp_connections(id) ON DELETE CASCADE,
  tool_name text NOT NULL,
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  risk_level text NOT NULL CHECK (risk_level IN ('read', 'safe_write', 'dangerous_write')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for mcp_pending_actions
ALTER TABLE public.mcp_pending_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own pending actions" ON public.mcp_pending_actions;
CREATE POLICY "Users can manage their own pending actions" ON public.mcp_pending_actions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. notion_sources
CREATE TABLE IF NOT EXISTS public.notion_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.mcp_connections(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('database', 'page')),
  sync_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  last_successful_sync_at timestamptz,
  last_sync_started_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'error')),
  sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notion_sources_connection_external_key UNIQUE (connection_id, external_id)
);

-- RLS for notion_sources
ALTER TABLE public.notion_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notion sources" ON public.notion_sources;
CREATE POLICY "Users can manage their own notion sources" ON public.notion_sources
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. notion_sync_mappings
CREATE TABLE IF NOT EXISTS public.notion_sync_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notion_source_id uuid NOT NULL REFERENCES public.notion_sources(id) ON DELETE CASCADE,
  title_property_id text,
  title_property_name text,
  due_date_property_id text,
  due_date_property_name text,
  status_property_id text,
  status_property_name text,
  priority_property_id text,
  priority_property_name text,
  assignee_property_id text,
  assignee_property_name text,
  completed_property_id text,
  completed_property_name text,
  status_mappings jsonb DEFAULT '{}'::jsonb,
  priority_mappings jsonb DEFAULT '{}'::jsonb,
  import_page_content boolean NOT NULL DEFAULT false,
  import_completed_items boolean NOT NULL DEFAULT false,
  writeback_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notion_sync_mappings_source_key UNIQUE (notion_source_id)
);

-- RLS for notion_sync_mappings
ALTER TABLE public.notion_sync_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own notion sync mappings" ON public.notion_sync_mappings;
CREATE POLICY "Users can manage their own notion sync mappings" ON public.notion_sync_mappings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. notion_sync_events
CREATE TABLE IF NOT EXISTS public.notion_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notion_source_id uuid NOT NULL REFERENCES public.notion_sources(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('success', 'failed', 'running')),
  items_seen integer NOT NULL DEFAULT 0,
  items_created integer NOT NULL DEFAULT 0,
  items_updated integer NOT NULL DEFAULT 0,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

-- RLS for notion_sync_events
ALTER TABLE public.notion_sync_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notion sync events" ON public.notion_sync_events;
CREATE POLICY "Users can view their own notion sync events" ON public.notion_sync_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notion sync events" ON public.notion_sync_events;
CREATE POLICY "Users can insert their own notion sync events" ON public.notion_sync_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 8. notion_ai_write_audit
CREATE TABLE IF NOT EXISTS public.notion_ai_write_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.mcp_connections(id) ON DELETE CASCADE,
  page_id text NOT NULL,
  operation text NOT NULL,
  change_summary text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('safe_write', 'dangerous_write')),
  requires_confirmation boolean NOT NULL DEFAULT false,
  confirmed_at timestamptz,
  tool_call_id uuid REFERENCES public.mcp_tool_calls(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS for notion_ai_write_audit
ALTER TABLE public.notion_ai_write_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notion ai write audits" ON public.notion_ai_write_audit;
CREATE POLICY "Users can view their own notion ai write audits" ON public.notion_ai_write_audit
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notion ai write audits" ON public.notion_ai_write_audit;
CREATE POLICY "Users can insert their own notion ai write audits" ON public.notion_ai_write_audit
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS mcp_server_registry_updated_at ON public.mcp_server_registry;
CREATE TRIGGER mcp_server_registry_updated_at BEFORE UPDATE ON public.mcp_server_registry FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS mcp_connections_updated_at ON public.mcp_connections;
CREATE TRIGGER mcp_connections_updated_at BEFORE UPDATE ON public.mcp_connections FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS mcp_pending_actions_updated_at ON public.mcp_pending_actions;
CREATE TRIGGER mcp_pending_actions_updated_at BEFORE UPDATE ON public.mcp_pending_actions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS notion_sources_updated_at ON public.notion_sources;
CREATE TRIGGER notion_sources_updated_at BEFORE UPDATE ON public.notion_sources FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS notion_sync_mappings_updated_at ON public.notion_sync_mappings;
CREATE TRIGGER notion_sync_mappings_updated_at BEFORE UPDATE ON public.notion_sync_mappings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_mcp_connections_user_id ON public.mcp_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_user_id ON public.mcp_tool_calls(user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_pending_actions_user_id ON public.mcp_pending_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_sources_connection_id ON public.notion_sources(connection_id);
CREATE INDEX IF NOT EXISTS idx_notion_sources_user_id ON public.notion_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_notion_sync_mappings_source ON public.notion_sync_mappings(notion_source_id);
CREATE INDEX IF NOT EXISTS idx_notion_sync_events_source ON public.notion_sync_events(notion_source_id);
CREATE INDEX IF NOT EXISTS idx_notion_ai_write_audit_user ON public.notion_ai_write_audit(user_id);
