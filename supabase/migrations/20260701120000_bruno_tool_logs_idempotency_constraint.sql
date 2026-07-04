-- Bruno proposal/execute idempotency: add a non-partial unique constraint so
-- Supabase upsert(onConflict: 'user_id,idempotency_key') works reliably.

DELETE FROM public.bruno_tool_logs a
USING public.bruno_tool_logs b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.idempotency_key IS NOT NULL
  AND a.idempotency_key = b.idempotency_key;

DROP INDEX IF EXISTS public.bruno_tool_logs_idempotency_idx;
DROP INDEX IF EXISTS public.idx_bruno_tool_logs_user_id_idempotency_key;

ALTER TABLE public.bruno_tool_logs
  DROP CONSTRAINT IF EXISTS bruno_tool_logs_user_id_idempotency_key_key;

ALTER TABLE public.bruno_tool_logs
  ADD CONSTRAINT bruno_tool_logs_user_id_idempotency_key_key
  UNIQUE (user_id, idempotency_key);
