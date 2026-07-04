-- Bruno chat message feedback (like/dislike) for personalization + training export.

create table if not exists public.bruno_message_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  message_id uuid not null references public.bruno_messages (id) on delete cascade,
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  rating smallint not null check (rating in (-1, 1)),
  correction_text text,
  message_snapshot text,
  user_turn_snapshot text,
  model_route jsonb,
  exported_for_training_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, message_id)
);

create index if not exists idx_bruno_message_feedback_user_created
  on public.bruno_message_feedback (user_id, created_at desc);

create index if not exists idx_bruno_message_feedback_export_pending
  on public.bruno_message_feedback (exported_for_training_at)
  where exported_for_training_at is null;

alter table public.bruno_message_feedback enable row level security;

create policy "Users can read own message feedback"
  on public.bruno_message_feedback
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own message feedback"
  on public.bruno_message_feedback
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own message feedback"
  on public.bruno_message_feedback
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own message feedback"
  on public.bruno_message_feedback
  for delete
  using (auth.uid() = user_id);

-- Private bucket for JSONL training exports (service role writes via cron).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'training-exports',
  'training-exports',
  false,
  52428800,
  array['application/jsonl', 'text/plain', 'application/json']
)
on conflict (id) do nothing;
