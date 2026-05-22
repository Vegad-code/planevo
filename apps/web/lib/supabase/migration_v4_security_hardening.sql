-- Planevo - AI security hardening (v4)
-- Adds atomic quota consumption and tightens cross-table ownership checks.

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_plan_type_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_plan_type_check
  CHECK (plan_type IN ('free', 'pro', 'team', 'elite'));

CREATE OR REPLACE FUNCTION public.can_user_use_ai(p_user_id UUID, p_limit INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RETURN false;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
  AND created_at > now() - interval '24 hours';

  RETURN v_count < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.consume_ai_usage(
  p_user_id UUID,
  p_feature TEXT,
  p_limit INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() OR p_limit < 1 THEN
    RETURN false;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_user_id::text));

  SELECT count(*) INTO v_count
  FROM public.ai_usage_logs
  WHERE user_id = p_user_id
  AND created_at > now() - interval '24 hours';

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, feature)
  VALUES (p_user_id, left(coalesce(p_feature, 'unknown'), 100));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.can_user_use_ai(UUID, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_ai_usage(UUID, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_user_use_ai(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(UUID, TEXT, INTEGER) TO authenticated;

DROP POLICY IF EXISTS "Users can create own subtasks" ON public.subtasks;
CREATE POLICY "Users can create own subtasks"
  ON public.subtasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = subtasks.goal_id
      AND goals.user_id = auth.uid()
    )
    AND (
      subtasks.task_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Users can update own subtasks" ON public.subtasks;
CREATE POLICY "Users can update own subtasks"
  ON public.subtasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = subtasks.goal_id
      AND goals.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = subtasks.goal_id
      AND goals.user_id = auth.uid()
    )
    AND (
      subtasks.task_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.tasks
        WHERE tasks.id = subtasks.task_id
        AND tasks.user_id = auth.uid()
      )
    )
  );
