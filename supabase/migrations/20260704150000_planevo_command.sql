-- Planevo Command — Phase 1 data layer.
-- Source of truth: docs/superpowers/plans/comprehensive.md §16 (Data Model), §16.8 (RLS).
-- Idempotent + re-runnable: create-if-not-exists tables, drop-if-exists policies before create.
-- All new tables are user-owned and carry the four owner RLS policies (§16.8).

-- ---------------------------------------------------------------------------
-- 16.2  command_intake_runs — each user dump + parse attempt.
-- ---------------------------------------------------------------------------
create table if not exists public.command_intake_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  input_mode text not null check (
    input_mode in ('text', 'paste', 'voice', 'source_import', 'share_sheet', 'ocr')
  ),
  raw_text text,
  transcript_text text,
  status text not null default 'pending' check (
    status in ('pending', 'previewed', 'confirmed', 'discarded', 'failed')
  ),
  extraction_model text,
  transcription_model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  audio_seconds integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  confidence numeric(4, 3),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 16.3  responsibility_items — durable responsibility object on the board.
--        Board sections are always computed (§21), never stored as status.
-- ---------------------------------------------------------------------------
create table if not exists public.responsibility_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'unknown',
  status text not null default 'active' check (
    status in ('active', 'waiting', 'done', 'archived', 'discarded')
  ),
  priority text not null default 'normal' check (
    priority in ('low', 'normal', 'high', 'urgent')
  ),
  urgency_score integer not null default 0,
  confidence numeric(4, 3) not null default 1,
  due_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  recurrence_rule text,
  source_type text not null default 'manual',
  source_label text,
  source_external_id text,
  intake_run_id uuid references public.command_intake_runs (id) on delete set null,
  calendar_event_id uuid references public.calendar_events (id) on delete set null,
  source_item_id uuid references public.source_items (id) on delete set null,
  task_id uuid references public.tasks (id) on delete set null,
  needs_review boolean not null default false,
  review_reason text,
  why_it_matters text,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 16.6  responsibility_events — audit log of changes to responsibility items.
-- ---------------------------------------------------------------------------
create table if not exists public.responsibility_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id uuid references public.responsibility_items (id) on delete cascade,
  event_type text not null,
  actor text not null default 'user',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- responsibility_clarifications — pending questions raised by an intake run.
-- (Minimal schema per §16.1; consistent with the plan's spirit — the intake
--  preview surfaces clarificationQuestions that the user can answer/dismiss.)
-- ---------------------------------------------------------------------------
create table if not exists public.responsibility_clarifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  intake_run_id uuid not null references public.command_intake_runs (id) on delete cascade,
  question text not null,
  status text not null default 'pending' check (
    status in ('pending', 'answered', 'dismissed')
  ),
  answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- responsibility_item_links — user-owned item<->item relations (e.g. blocks,
-- duplicate_of). Minimal directed edge; both endpoints must belong to the user
-- (enforced by RLS on the referenced rows + user_id owner policies here).
-- ---------------------------------------------------------------------------
create table if not exists public.responsibility_item_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  from_item_id uuid not null references public.responsibility_items (id) on delete cascade,
  to_item_id uuid not null references public.responsibility_items (id) on delete cascade,
  relation text not null default 'related' check (
    relation in ('related', 'blocks', 'blocked_by', 'duplicate_of', 'subtask_of')
  ),
  created_at timestamptz not null default now(),
  constraint responsibility_item_links_no_self check (from_item_id <> to_item_id),
  constraint responsibility_item_links_unique unique (user_id, from_item_id, to_item_id, relation)
);

-- ---------------------------------------------------------------------------
-- 16.7  Usage logging — extend ai_usage_logs, do not fork it.
--        `feature` already exists (NOT NULL) in the live schema; the guarded
--        add is a safe no-op there. `audio_seconds` is the new column.
-- ---------------------------------------------------------------------------
alter table public.ai_usage_logs
  add column if not exists feature text,
  add column if not exists audio_seconds integer not null default 0;

-- ---------------------------------------------------------------------------
-- Indexes (Phase 1). Note: the plan's command_usage_ledger index is
-- intentionally skipped — that table does not exist (§16.7).
-- ---------------------------------------------------------------------------
create index if not exists idx_responsibility_items_user_status
  on public.responsibility_items (user_id, status);
create index if not exists idx_responsibility_items_user_due_at
  on public.responsibility_items (user_id, due_at);
create index if not exists idx_responsibility_items_user_created_at
  on public.responsibility_items (user_id, created_at);
create index if not exists idx_command_intake_runs_user_created_at
  on public.command_intake_runs (user_id, created_at);

-- FK-lookup helpers for the audit / clarification / link tables.
create index if not exists idx_responsibility_events_user_item
  on public.responsibility_events (user_id, item_id);
create index if not exists idx_responsibility_clarifications_user_run
  on public.responsibility_clarifications (user_id, intake_run_id);
create index if not exists idx_responsibility_item_links_user_from
  on public.responsibility_item_links (user_id, from_item_id);
create index if not exists idx_responsibility_item_links_user_to
  on public.responsibility_item_links (user_id, to_item_id);

-- ---------------------------------------------------------------------------
-- 16.8  RLS — enable + four owner policies on every new user-owned table.
-- ---------------------------------------------------------------------------

-- command_intake_runs
alter table public.command_intake_runs enable row level security;
drop policy if exists "Users can read own command intake runs" on public.command_intake_runs;
create policy "Users can read own command intake runs"
  on public.command_intake_runs for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own command intake runs" on public.command_intake_runs;
create policy "Users can insert own command intake runs"
  on public.command_intake_runs for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own command intake runs" on public.command_intake_runs;
create policy "Users can update own command intake runs"
  on public.command_intake_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete own command intake runs" on public.command_intake_runs;
create policy "Users can delete own command intake runs"
  on public.command_intake_runs for delete
  using (auth.uid() = user_id);

-- responsibility_items
alter table public.responsibility_items enable row level security;
drop policy if exists "Users can read own responsibility items" on public.responsibility_items;
create policy "Users can read own responsibility items"
  on public.responsibility_items for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own responsibility items" on public.responsibility_items;
create policy "Users can insert own responsibility items"
  on public.responsibility_items for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own responsibility items" on public.responsibility_items;
create policy "Users can update own responsibility items"
  on public.responsibility_items for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete own responsibility items" on public.responsibility_items;
create policy "Users can delete own responsibility items"
  on public.responsibility_items for delete
  using (auth.uid() = user_id);

-- responsibility_events
alter table public.responsibility_events enable row level security;
drop policy if exists "Users can read own responsibility events" on public.responsibility_events;
create policy "Users can read own responsibility events"
  on public.responsibility_events for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own responsibility events" on public.responsibility_events;
create policy "Users can insert own responsibility events"
  on public.responsibility_events for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own responsibility events" on public.responsibility_events;
create policy "Users can update own responsibility events"
  on public.responsibility_events for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete own responsibility events" on public.responsibility_events;
create policy "Users can delete own responsibility events"
  on public.responsibility_events for delete
  using (auth.uid() = user_id);

-- responsibility_clarifications
alter table public.responsibility_clarifications enable row level security;
drop policy if exists "Users can read own responsibility clarifications" on public.responsibility_clarifications;
create policy "Users can read own responsibility clarifications"
  on public.responsibility_clarifications for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own responsibility clarifications" on public.responsibility_clarifications;
create policy "Users can insert own responsibility clarifications"
  on public.responsibility_clarifications for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own responsibility clarifications" on public.responsibility_clarifications;
create policy "Users can update own responsibility clarifications"
  on public.responsibility_clarifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete own responsibility clarifications" on public.responsibility_clarifications;
create policy "Users can delete own responsibility clarifications"
  on public.responsibility_clarifications for delete
  using (auth.uid() = user_id);

-- responsibility_item_links
alter table public.responsibility_item_links enable row level security;
drop policy if exists "Users can read own responsibility item links" on public.responsibility_item_links;
create policy "Users can read own responsibility item links"
  on public.responsibility_item_links for select
  using (auth.uid() = user_id);
drop policy if exists "Users can insert own responsibility item links" on public.responsibility_item_links;
create policy "Users can insert own responsibility item links"
  on public.responsibility_item_links for insert
  with check (auth.uid() = user_id);
drop policy if exists "Users can update own responsibility item links" on public.responsibility_item_links;
create policy "Users can update own responsibility item links"
  on public.responsibility_item_links for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
drop policy if exists "Users can delete own responsibility item links" on public.responsibility_item_links;
create policy "Users can delete own responsibility item links"
  on public.responsibility_item_links for delete
  using (auth.uid() = user_id);
