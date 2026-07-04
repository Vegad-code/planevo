-- Migration v31: Bruno Action Reliability
-- Adds stable idempotency keys for proposal verification and execution dedupe.

ALTER TABLE public.bruno_tool_logs
    ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bruno_tool_logs_user_id_idempotency_key
    ON public.bruno_tool_logs(user_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL;
