-- bruno_messages had SELECT/INSERT/DELETE policies but no UPDATE, so variant
-- switching (is_active_variant, superseded_at) silently failed via user JWT.

create policy "Users can update own bruno messages"
  on public.bruno_messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
