-- Planevo — Database Schema Migration
-- Run this in the Supabase SQL Editor to create all tables.

-- ============================================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  plan_type TEXT NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'team', 'elite')),
  avatar_url TEXT,
  canvas_url TEXT,
  canvas_token TEXT,
  preferred_morning_time TIME,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  energy_preference TEXT CHECK (energy_preference IN ('morning', 'afternoon', 'evening')),
  google_calendar_connected BOOLEAN DEFAULT false,
  google_calendar_id TEXT,
  google_calendar_refresh_token TEXT,
  google_classroom_connected BOOLEAN DEFAULT false,
  n8n_webhook_token TEXT,
  scheduling_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TASKS TABLE (Enhanced for AI Life Pilot)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  due_date TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done', 'missed')),
  estimated_minutes INTEGER DEFAULT 30,
  best_time_of_day TEXT DEFAULT 'anytime' CHECK (best_time_of_day IN ('morning', 'afternoon', 'evening', 'anytime')),
  is_ai_suggested BOOLEAN DEFAULT false,
  ai_confidence_score INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_pattern TEXT,
  consistency_score INTEGER,
  energy_level_required TEXT DEFAULT 'medium' CHECK (energy_level_required IN ('low', 'medium', 'high')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  rescheduled_count INTEGER DEFAULT 0,
  last_ai_scheduling_at TIMESTAMPTZ
);

-- ============================================================
-- GOALS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  deadline TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SUBTASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- HABITS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'custom')),
  consistency_score REAL NOT NULL DEFAULT 0
);

-- ============================================================
-- HABIT LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.habit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- SCHEDULES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  schedule_json JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- BRUNO MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bruno_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  conversation_id UUID REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL CHECK (message_type IN (
    'greeting', 'nudge', 'celebration', 'reschedule',
    'weekly_review', 'encouragement', 'tip', 'user', 'bruno', 'assistant'
  )),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI FEEDBACK TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  action TEXT NOT NULL,
  suggestion_json JSONB NOT NULL,
  correction_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CALENDAR EVENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  is_all_day BOOLEAN DEFAULT false,
  color TEXT,
  icon TEXT,
  source TEXT DEFAULT 'manual',
  external_id TEXT,
  recurrence_rule TEXT,
  linked_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  bruno_notes TEXT,
  metadata JSONB DEFAULT '{}',
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CALENDAR PREFERENCES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.calendar_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  default_view TEXT DEFAULT 'day',
  start_hour INTEGER DEFAULT 8,
  end_hour INTEGER DEFAULT 22,
  show_completed BOOLEAN DEFAULT true,
  show_gaps BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CANVAS ASSIGNMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.canvas_assignments (
  id TEXT PRIMARY KEY, -- Canvas uses its own IDs
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_name TEXT,
  due_at TIMESTAMPTZ,
  points_possible REAL,
  html_url TEXT,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CHAT CONVERSATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  last_active TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- (Duplicate table definition removed)

-- ============================================================
-- FOCUS SESSIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  duration_minutes INTEGER NOT NULL,
  was_interrupted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- AI USAGE LOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  feature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER AI MEMORY TABLE
-- ============================================================
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

-- ============================================================
-- RPC: Check AI usage limit
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_user_use_ai(p_user_id UUID, p_feature TEXT, p_limit INTEGER)
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
  AND feature = p_feature
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
  AND feature = p_feature
  AND created_at > now() - interval '24 hours';

  IF v_count >= p_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.ai_usage_logs (user_id, feature)
  VALUES (p_user_id, left(coalesce(p_feature, 'unknown'), 100));

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_subtasks_goal_id ON public.subtasks(goal_id);
CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habit_logs_habit_id ON public.habit_logs(habit_id);
CREATE INDEX idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX idx_schedules_date ON public.schedules(date);
CREATE INDEX idx_bruno_messages_user_id ON public.bruno_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_updated_at ON public.user_ai_memory(updated_at);

-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bruno_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_memory ENABLE ROW LEVEL SECURITY;

-- USERS: Users can only read and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- TASKS: Users can only CRUD their own tasks
CREATE POLICY "Users can view own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- GOALS: Users can only CRUD their own goals
CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own goals"
  ON public.goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own goals"
  ON public.goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own goals"
  ON public.goals FOR DELETE
  USING (auth.uid() = user_id);

-- SUBTASKS: Users can CRUD subtasks belonging to their goals
CREATE POLICY "Users can view own subtasks"
  ON public.subtasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = subtasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

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

CREATE POLICY "Users can delete own subtasks"
  ON public.subtasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.goals
      WHERE goals.id = subtasks.goal_id
      AND goals.user_id = auth.uid()
    )
  );

-- HABITS: Users can only CRUD their own habits
CREATE POLICY "Users can view own habits"
  ON public.habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own habits"
  ON public.habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits"
  ON public.habits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits"
  ON public.habits FOR DELETE
  USING (auth.uid() = user_id);

-- HABIT LOGS: Users can CRUD logs belonging to their habits
CREATE POLICY "Users can view own habit logs"
  ON public.habit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.habits
      WHERE habits.id = habit_logs.habit_id
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own habit logs"
  ON public.habit_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.habits
      WHERE habits.id = habit_logs.habit_id
      AND habits.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own habit logs"
  ON public.habit_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.habits
      WHERE habits.id = habit_logs.habit_id
      AND habits.user_id = auth.uid()
    )
  );

-- SCHEDULES: Users can only CRUD their own schedules
CREATE POLICY "Users can view own schedules"
  ON public.schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.schedules FOR DELETE
  USING (auth.uid() = user_id);

-- BRUNO MESSAGES: Users can CRUD own messages
CREATE POLICY "Users can view own bruno messages"
  ON public.bruno_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own bruno messages"
  ON public.bruno_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bruno messages"
  ON public.bruno_messages FOR DELETE
  USING (auth.uid() = user_id);

-- AI USAGE LOGS: Users can only view their own logs
CREATE POLICY "Users can view own AI logs"
  ON public.ai_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own AI logs"
  ON public.ai_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- USER AI MEMORY: Users can view/create/update own memory
CREATE POLICY "Users can view own AI memory" ON public.user_ai_memory FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own AI memory" ON public.user_ai_memory FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own AI memory" ON public.user_ai_memory FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;

-- AI FEEDBACK: Users can view/create own feedback
CREATE POLICY "Users can view own feedback" ON public.ai_feedback FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own feedback" ON public.ai_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CALENDAR EVENTS: Users can CRUD own events
CREATE POLICY "Users can view own calendar events" ON public.calendar_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own calendar events" ON public.calendar_events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar events" ON public.calendar_events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events FOR DELETE USING (auth.uid() = user_id);

-- CALENDAR PREFERENCES: Users can CRUD own preferences
CREATE POLICY "Users can view own calendar preferences" ON public.calendar_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own calendar preferences" ON public.calendar_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar preferences" ON public.calendar_preferences FOR UPDATE USING (auth.uid() = user_id);

-- CANVAS ASSIGNMENTS: Users can view own assignments
CREATE POLICY "Users can view own canvas assignments" ON public.canvas_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own canvas assignments" ON public.canvas_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- CHAT CONVERSATIONS: Users can CRUD own conversations
CREATE POLICY "Users can view own chat conversations" ON public.chat_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own chat conversations" ON public.chat_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat conversations" ON public.chat_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own chat conversations" ON public.chat_conversations FOR DELETE USING (auth.uid() = user_id);

-- (Duplicate RLS policies removed)

-- FOCUS SESSIONS: Users can view/create own sessions
CREATE POLICY "Users can view own focus sessions" ON public.focus_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own focus sessions" ON public.focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- TRIGGER: Auto-create user profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
