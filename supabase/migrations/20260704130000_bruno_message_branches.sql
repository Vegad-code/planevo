-- Bruno message edit branches: turn variants + soft supersede for ChatGPT-style edit history.

alter table public.bruno_messages
  add column if not exists turn_key uuid,
  add column if not exists variant_index int not null default 0,
  add column if not exists is_active_variant boolean not null default true,
  add column if not exists parent_user_message_id uuid references public.bruno_messages (id) on delete set null,
  add column if not exists superseded_at timestamptz;

comment on column public.bruno_messages.turn_key is
  'Stable conversation position across user-message edits; shared by all variants at a turn.';
comment on column public.bruno_messages.variant_index is
  '0-based edit index within turn_key.';
comment on column public.bruno_messages.is_active_variant is
  'When false, this user variant is archived but selectable via version navigation.';
comment on column public.bruno_messages.parent_user_message_id is
  'Assistant rows: the user variant this reply belongs to.';
comment on column public.bruno_messages.superseded_at is
  'Soft-hide rows invalidated by edit or switching to an older variant branch.';

-- Backfill user rows: each user message is its own turn anchor.
update public.bruno_messages
set
  turn_key = id,
  variant_index = 0,
  is_active_variant = true
where message_type = 'user'
  and turn_key is null;

-- Backfill assistant rows: link to the preceding user message in created_at order.
with ordered as (
  select
    id,
    message_type,
    conversation_id,
    created_at,
    lag(case when message_type = 'user' then id end) over (
      partition by conversation_id
      order by created_at asc, id asc
    ) as prev_user_id
  from public.bruno_messages
)
update public.bruno_messages bm
set parent_user_message_id = ordered.prev_user_id
from ordered
where bm.id = ordered.id
  and bm.message_type = 'assistant'
  and bm.parent_user_message_id is null
  and ordered.prev_user_id is not null;

-- One active user variant per turn per conversation.
create unique index if not exists idx_bruno_messages_active_variant_per_turn
  on public.bruno_messages (conversation_id, turn_key)
  where message_type = 'user' and is_active_variant = true and turn_key is not null;

create index if not exists idx_bruno_messages_turn_key
  on public.bruno_messages (conversation_id, turn_key, variant_index);

create index if not exists idx_bruno_messages_parent_user
  on public.bruno_messages (parent_user_message_id)
  where parent_user_message_id is not null;
