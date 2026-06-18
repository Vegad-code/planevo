-- Drop existing MCP tables to rebuild from scratch
DROP TABLE IF EXISTS public.notion_ai_write_audit CASCADE;
DROP TABLE IF EXISTS public.notion_sync_events CASCADE;
DROP TABLE IF EXISTS public.notion_sync_mappings CASCADE;
DROP TABLE IF EXISTS public.notion_sources CASCADE;
DROP TABLE IF EXISTS public.mcp_pending_actions CASCADE;
DROP TABLE IF EXISTS public.mcp_tool_calls CASCADE;
DROP TABLE IF EXISTS public.mcp_connections CASCADE;
DROP TABLE IF EXISTS public.mcp_server_registry CASCADE;
DROP TABLE IF EXISTS public.mcp_oauth_sessions CASCADE;

-- Recreate ChatGPT-style MCP architecture

create table if not exists public.mcp_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  server_url text not null,
  client_id text,
  client_secret_encrypted text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_type text,
  scope text,
  token_expires_at timestamptz,
  status text not null default 'connected',
  connected_at timestamptz not null default now(),
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, provider, server_url)
);

create table if not exists public.mcp_oauth_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  server_url text not null,
  state text not null unique,
  code_verifier_encrypted text not null,
  code_challenge text not null,
  client_id text not null,
  client_secret_encrypted text,
  redirect_uri text not null,
  authorization_endpoint text not null,
  token_endpoint text not null,
  registration_endpoint text,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.mcp_tool_calls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.mcp_connections(id) on delete set null,
  provider text not null,
  server_url text not null,
  tool_name text,
  input_summary text,
  output_summary text,
  risk_level text not null default 'read',
  status text not null,
  error text,
  response_id text,
  approval_request_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.mcp_pending_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.mcp_connections(id) on delete cascade,
  provider text not null,
  server_url text not null,
  tool_name text not null,
  proposed_arguments jsonb not null,
  preview_markdown text,
  risk_level text not null,
  status text not null default 'pending',
  response_id text,
  approval_request_id text,
  expires_at timestamptz not null,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.mcp_connections enable row level security;
alter table public.mcp_oauth_sessions enable row level security;
alter table public.mcp_tool_calls enable row level security;
alter table public.mcp_pending_actions enable row level security;

create policy "Users can read own mcp connection metadata"
on public.mcp_connections
for select
using (auth.uid() = user_id);

create policy "Users can read own mcp tool calls"
on public.mcp_tool_calls
for select
using (auth.uid() = user_id);

create policy "Users can read own pending actions"
on public.mcp_pending_actions
for select
using (auth.uid() = user_id);

create policy "Users can update own pending actions"
on public.mcp_pending_actions
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Service role has full access to mcp_oauth_sessions"
on public.mcp_oauth_sessions
for all
to service_role
using (true)
with check (true);

create index if not exists idx_mcp_connections_user_provider
on public.mcp_connections(user_id, provider);

create index if not exists idx_mcp_oauth_sessions_state
on public.mcp_oauth_sessions(state);

create index if not exists idx_mcp_pending_actions_user_status
on public.mcp_pending_actions(user_id, status);
