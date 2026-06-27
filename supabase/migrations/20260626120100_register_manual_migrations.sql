-- Idempotent: record migrations that were applied via the SQL editor so CLI history stays in sync.

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20260619120000', 'security_audit_log'),
  ('20260626120000', 'scale_indexes_and_retention')
ON CONFLICT (version) DO NOTHING;
