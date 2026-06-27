-- Scale: composite indexes, FTS mention search, calendar soft-delete sync, chat/MCP retention helpers

-- ---------------------------------------------------------------------------
-- 1. Calendar soft-delete: keep is_deleted and deleted_at in sync
-- ---------------------------------------------------------------------------
UPDATE public.calendar_events
SET is_deleted = true
WHERE deleted_at IS NOT NULL
  AND (is_deleted IS NULL OR is_deleted = false);

UPDATE public.calendar_events
SET deleted_at = COALESCE(deleted_at, now())
WHERE is_deleted = true
  AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.sync_calendar_events_soft_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted IS DISTINCT FROM OLD.is_deleted THEN
      IF NEW.is_deleted = true AND NEW.deleted_at IS NULL THEN
        NEW.deleted_at := now();
      ELSIF NEW.is_deleted = false THEN
        NEW.deleted_at := NULL;
      END IF;
    ELSIF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
      IF NEW.deleted_at IS NOT NULL THEN
        NEW.is_deleted := true;
      ELSE
        NEW.is_deleted := false;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS calendar_events_soft_delete_sync ON public.calendar_events;
CREATE TRIGGER calendar_events_soft_delete_sync
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_calendar_events_soft_delete();

-- ---------------------------------------------------------------------------
-- 2. Hot-path composite indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_feature_created
  ON public.ai_usage_logs (user_id, feature, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tasks_user_active_created
  ON public.tasks (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_due_active
  ON public.tasks (user_id, due_date)
  WHERE deleted_at IS NULL AND status IN ('todo', 'in_progress');

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_active_start
  ON public.calendar_events (user_id, start_time)
  WHERE is_deleted = false AND status IS DISTINCT FROM 'rejected';

CREATE INDEX IF NOT EXISTS idx_bruno_tool_logs_user_tool_created
  ON public.bruno_tool_logs (user_id, tool_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_schedules_user_date
  ON public.schedules (user_id, date);

CREATE INDEX IF NOT EXISTS idx_note_links_target
  ON public.note_links (target_note_id);

CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_created
  ON public.focus_sessions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_created
  ON public.ai_feedback (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_source_items_user_provider_due
  ON public.source_items (user_id, provider, due_date)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- 3. Mention autocomplete (pg_trgm)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_tasks_title_trgm
  ON public.tasks USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_calendar_events_title_trgm
  ON public.calendar_events USING gin (title gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 4. MCP OAuth session cleanup index
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mcp_oauth_sessions_expires
  ON public.mcp_oauth_sessions (expires_at)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_mcp_oauth_sessions_consumed
  ON public.mcp_oauth_sessions (consumed_at)
  WHERE consumed_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Chat retention index (cron deletes by last_active)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last_active
  ON public.chat_conversations (last_active);

CREATE INDEX IF NOT EXISTS idx_bruno_messages_created_at
  ON public.bruno_messages (created_at);
