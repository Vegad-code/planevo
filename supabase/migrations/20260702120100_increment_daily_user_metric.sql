-- Atomic daily metric increments (avoids lost updates under concurrent clients).

CREATE OR REPLACE FUNCTION public.increment_daily_user_metric(
  p_user_id uuid,
  p_date date,
  p_column text,
  p_delta integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_column NOT IN ('focus_time_seconds', 'tasks_completed', 'tasks_planned') THEN
    RAISE EXCEPTION 'invalid metric column: %', p_column;
  END IF;

  INSERT INTO public.daily_user_metrics (
    user_id,
    date,
    focus_time_seconds,
    tasks_completed,
    tasks_planned
  )
  VALUES (
    p_user_id,
    p_date,
    CASE WHEN p_column = 'focus_time_seconds' THEN GREATEST(0, p_delta) ELSE 0 END,
    CASE WHEN p_column = 'tasks_completed' THEN GREATEST(0, p_delta) ELSE 0 END,
    CASE WHEN p_column = 'tasks_planned' THEN GREATEST(0, p_delta) ELSE 0 END
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    focus_time_seconds = daily_user_metrics.focus_time_seconds + CASE
      WHEN p_column = 'focus_time_seconds' THEN GREATEST(0, p_delta) ELSE 0
    END,
    tasks_completed = daily_user_metrics.tasks_completed + CASE
      WHEN p_column = 'tasks_completed' THEN GREATEST(0, p_delta) ELSE 0
    END,
    tasks_planned = daily_user_metrics.tasks_planned + CASE
      WHEN p_column = 'tasks_planned' THEN GREATEST(0, p_delta) ELSE 0
    END,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.increment_daily_user_metric(uuid, date, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_daily_user_metric(uuid, date, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_daily_user_metric(uuid, date, text, integer) TO service_role;
