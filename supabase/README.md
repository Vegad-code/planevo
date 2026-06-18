# Planevo database migrations

## Two migration trees (historical)

| Location | Contents |
|----------|----------|
| `supabase/migrations/` | Supabase CLI migrations — apply these to production via `supabase db push` or MCP `apply_migration` |
| `apps/web/lib/supabase/migration_v*.sql` | Legacy manual migrations (v2–v26) — reference only; kept for audit trail |

Production schema was built incrementally via the legacy files. New changes go in **`supabase/migrations/`** only.

## Applying migrations

```bash
# Local (requires Supabase CLI + Docker)
supabase start
supabase db reset   # replays all migrations in supabase/migrations/

# Remote
supabase link --project-ref <your-project-ref>
supabase db push
```

## Baseline note

A full squash of v2–v26 into one baseline migration is deferred — production already has the schema. The CLI migration folder captures **delta changes** from June 2026 onward (MCP/Notion, token RLS, daily metrics, integration backfill).

To generate a fresh baseline from a linked remote when ready:

```bash
supabase db pull baseline --linked --yes
```

## Local development

1. Install [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Copy env vars from the Supabase dashboard into `apps/web/.env.local`
3. `supabase start` then `supabase db reset`
