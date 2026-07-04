-- Groundwork for the Bruno native tool-approval loop (roadmap P4/P5):
-- persist full UIMessage parts (tool calls, approval states, results) so
-- proposals and approvals survive reloads and server-side history rebuilds.
-- Nullable and unused by current code paths; safe to apply ahead of the
-- feature. Idempotent.

alter table public.bruno_messages
  add column if not exists parts jsonb;

comment on column public.bruno_messages.parts is
  'Full AI SDK UIMessage parts (tool calls, approval states, results). Null for legacy text-only rows.';
