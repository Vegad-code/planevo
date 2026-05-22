-- Planevo - User AI Memory (v5)
-- Stores learned user preferences that Bruno can apply across AI features.

CREATE TABLE IF NOT EXISTS public.user_ai_memory (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  preferred_focus_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  avoided_focus_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  break_preference JSONB NOT NULL DEFAULT '{}'::jsonb,
  planning_style JSONB NOT NULL DEFAULT '{}'::jsonb,
  tone_preference JSONB NOT NULL DEFAULT '{}'::jsonb,
  task_detail_preference JSONB NOT NULL DEFAULT '{}'::jsonb,
  recurring_constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
  learned_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  disliked_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  accepted_patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_counters JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_compacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_memory_updated_at
  ON public.user_ai_memory(updated_at);

ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own AI memory" ON public.user_ai_memory;
CREATE POLICY "Users can view own AI memory"
  ON public.user_ai_memory FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own AI memory" ON public.user_ai_memory;
CREATE POLICY "Users can create own AI memory"
  ON public.user_ai_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own AI memory" ON public.user_ai_memory;
CREATE POLICY "Users can update own AI memory"
  ON public.user_ai_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_user_ai_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS user_ai_memory_touch_updated_at ON public.user_ai_memory;
CREATE TRIGGER user_ai_memory_touch_updated_at
  BEFORE UPDATE ON public.user_ai_memory
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_ai_memory_updated_at();
