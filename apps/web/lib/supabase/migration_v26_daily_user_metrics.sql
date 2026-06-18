-- Mirror of supabase/migrations/20260616150000_daily_user_metrics.sql

CREATE TABLE IF NOT EXISTS public.daily_user_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  focus_time_seconds integer NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_planned integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_user_metrics_user_date
  ON public.daily_user_metrics (user_id, date DESC);

ALTER TABLE public.daily_user_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own metrics" ON public.daily_user_metrics;
DROP POLICY IF EXISTS "Users can insert own metrics" ON public.daily_user_metrics;
DROP POLICY IF EXISTS "Users can update own metrics" ON public.daily_user_metrics;

CREATE POLICY "Users can view own metrics"
  ON public.daily_user_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own metrics"
  ON public.daily_user_metrics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own metrics"
  ON public.daily_user_metrics FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
