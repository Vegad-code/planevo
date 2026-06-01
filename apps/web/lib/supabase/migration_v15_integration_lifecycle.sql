-- Phase 5 Integration Lifecycle Migration

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. integration_accounts
CREATE TABLE IF NOT EXISTS integration_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('canvas', 'google_calendar', 'notion', 'slack', 'linear')),
  provider_account_id text,
  display_name text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scopes text[],
  expires_at timestamptz,
  metadata jsonb,
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- Unique constraints for integration_accounts
ALTER TABLE integration_accounts ADD CONSTRAINT integration_accounts_id_user_id_key UNIQUE (id, user_id);
CREATE UNIQUE INDEX integration_accounts_user_provider_account_idx ON integration_accounts (user_id, provider, provider_account_id) WHERE provider_account_id IS NOT NULL;
CREATE UNIQUE INDEX integration_accounts_user_provider_single_idx ON integration_accounts (user_id, provider) WHERE provider_account_id IS NULL;

-- 2. integration_sources
CREATE TABLE IF NOT EXISTS integration_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('calendar', 'course', 'database', 'channel')),
  external_id text NOT NULL,
  name text NOT NULL,
  sync_enabled boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_integration_sources_account FOREIGN KEY (account_id, user_id) REFERENCES integration_accounts(id, user_id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX integration_sources_account_external_idx ON integration_sources (account_id, external_id);

-- 3. source_items
CREATE TABLE IF NOT EXISTS source_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('canvas', 'google_calendar', 'notion', 'slack', 'linear')),
  source_id uuid REFERENCES integration_sources(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('assignment', 'issue', 'event', 'message')),
  title text NOT NULL,
  description text,
  due_date timestamptz,
  url text,
  raw_data jsonb,
  imported_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  imported_event_id uuid REFERENCES calendar_events(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX source_items_user_provider_external_idx ON source_items (user_id, provider, external_id);

-- 4. integration_sync_runs
CREATE TABLE IF NOT EXISTS integration_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL,
  provider text NOT NULL CHECK (provider IN ('canvas', 'google_calendar', 'notion', 'slack', 'linear')),
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed')),
  started_at timestamptz NOT NULL DEFAULT NOW(),
  finished_at timestamptz,
  items_seen integer NOT NULL DEFAULT 0,
  items_created integer NOT NULL DEFAULT 0,
  items_updated integer NOT NULL DEFAULT 0,
  error_message text,
  CONSTRAINT fk_sync_runs_account FOREIGN KEY (account_id, user_id) REFERENCES integration_accounts(id, user_id) ON DELETE CASCADE
);

-- 5. integration_waitlist_requests
CREATE TABLE IF NOT EXISTS integration_waitlist_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('canvas', 'google_calendar', 'notion', 'slack', 'linear')),
  created_at timestamptz NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX waitlist_requests_user_provider_idx ON integration_waitlist_requests (user_id, provider);

-- Triggers for updated_at
CREATE TRIGGER integration_accounts_updated_at BEFORE UPDATE ON integration_accounts FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER integration_sources_updated_at BEFORE UPDATE ON integration_sources FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER source_items_updated_at BEFORE UPDATE ON source_items FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Explicit Indexes
CREATE INDEX integration_accounts_user_provider_idx ON integration_accounts (user_id, provider);
CREATE INDEX integration_sources_user_account_idx ON integration_sources (user_id, account_id);
CREATE INDEX source_items_user_provider_deleted_idx ON source_items (user_id, provider, deleted_at);
CREATE INDEX integration_sync_runs_user_provider_started_idx ON integration_sync_runs (user_id, provider, started_at DESC);
CREATE INDEX waitlist_requests_user_idx ON integration_waitlist_requests (user_id);

-- RLS Policies
ALTER TABLE integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_waitlist_requests ENABLE ROW LEVEL SECURITY;

-- integration_accounts
CREATE POLICY "Users can manage their own integration accounts" ON integration_accounts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- integration_sources
CREATE POLICY "Users can manage their own integration sources" ON integration_sources
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- source_items
CREATE POLICY "Users can manage their own source items" ON source_items
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- integration_sync_runs
CREATE POLICY "Users can view their own sync runs" ON integration_sync_runs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sync runs" ON integration_sync_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sync runs" ON integration_sync_runs
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sync runs" ON integration_sync_runs
  FOR DELETE USING (auth.uid() = user_id);

-- integration_waitlist_requests
CREATE POLICY "Users can manage their own waitlist requests" ON integration_waitlist_requests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
