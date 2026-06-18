-- Create mcp_oauth_sessions table for transient OAuth state
create table public.mcp_oauth_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  provider text not null,
  server_url text not null,
  state text not null unique,
  code_verifier_encrypted text,
  code_challenge text,
  client_id text,
  client_secret_encrypted text,
  redirect_uri text not null,
  authorization_endpoint text,
  token_endpoint text,
  registration_endpoint text,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  consumed_at timestamp with time zone
);

-- Enable RLS
alter table public.mcp_oauth_sessions enable row level security;

-- Only service role can access this table to keep encrypted secrets safe
create policy "Service role has full access to mcp_oauth_sessions"
  on public.mcp_oauth_sessions
  for all
  to service_role
  using (true)
  with check (true);
