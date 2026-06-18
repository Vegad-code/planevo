-- Notion Sync V2 Foundation Phase 1 & 2 Migration

-- Phase 1: Schema Mapping Table
CREATE TABLE IF NOT EXISTS integration_source_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_source_id uuid NOT NULL REFERENCES integration_sources(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'notion',

  title_property_id text,
  title_property_name text,

  due_date_property_id text,
  due_date_property_name text,

  status_property_id text,
  status_property_name text,
  status_property_type text,

  priority_property_id text,
  priority_property_name text,
  priority_property_type text,

  assignee_property_id text,
  assignee_property_name text,

  notes_property_id text,
  notes_property_name text,

  completed_property_id text,
  completed_property_name text,

  status_mappings jsonb DEFAULT '{}'::jsonb,
  priority_mappings jsonb DEFAULT '{}'::jsonb,

  import_page_content boolean DEFAULT false,
  import_completed_items boolean DEFAULT false,
  writeback_enabled boolean DEFAULT false,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger for integration_source_mappings updated_at
DROP TRIGGER IF EXISTS integration_source_mappings_updated_at ON integration_source_mappings;
CREATE TRIGGER integration_source_mappings_updated_at
  BEFORE UPDATE ON integration_source_mappings
  FOR EACH ROW
  EXECUTE FUNCTION handle_updated_at();

-- RLS for integration_source_mappings
ALTER TABLE integration_source_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own integration source mappings" ON integration_source_mappings;
CREATE POLICY "Users can manage their own integration source mappings"
  ON integration_source_mappings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Explicit Index for mapping by source
CREATE INDEX IF NOT EXISTS integration_source_mappings_source_idx ON integration_source_mappings (integration_source_id);

-- Phase 2: Robust Sync
-- Add columns to integration_sources
ALTER TABLE integration_sources
  ADD COLUMN IF NOT EXISTS last_successful_sync_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS sync_cursor text,
  ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS sync_error text;

-- Add columns to source_items for normalized payload
ALTER TABLE source_items
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS assignees jsonb DEFAULT '[]'::jsonb;
-- raw_data already exists in source_items from v15 migration and is used for raw_provider_data.
