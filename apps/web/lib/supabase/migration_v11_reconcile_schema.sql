-- Migration v11: Reconcile Schema with Application Reality
-- This migration syncs the deployed production fields back into the schema definitions.

-- 1. Reconcile Users Plan Types & Add Stripe Fields
DO $$ 
DECLARE constraint_name text;
BEGIN
    -- Drop the old constraint safely if it exists
    SELECT conname INTO constraint_name 
    FROM pg_constraint 
    WHERE conrelid = 'public.users'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%plan_type%';
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.users 
ADD CONSTRAINT users_plan_type_check 
CHECK (plan_type IN ('free', 'trialing', 'premium', 'student', 'canceled', 'admin'));

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_current_period_end TIMESTAMPTZ;

-- 2. Add Missing Columns to calendar_events
ALTER TABLE public.calendar_events
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
ADD COLUMN IF NOT EXISTS is_ai_suggested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS energy_level TEXT DEFAULT 'medium' CHECK (energy_level IN ('low', 'medium', 'high'));

-- 3. Update canvas_assignments with external_id
ALTER TABLE public.canvas_assignments
ADD COLUMN IF NOT EXISTS external_id TEXT;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'canvas_assignments_user_external_unique'
    ) THEN
        ALTER TABLE public.canvas_assignments
        ADD CONSTRAINT canvas_assignments_user_external_unique UNIQUE (user_id, external_id);
    END IF;
END $$;

-- 3.5 Unique index for Google Calendar events
CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_google_sync_idx 
  ON public.calendar_events (user_id, source, external_id) 
  WHERE external_id IS NOT NULL;

-- 4. Ensure current_day_plan table is properly defined
CREATE TABLE IF NOT EXISTS public.current_day_plan (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  plan_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.current_day_plan ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own current day plan' AND tablename = 'current_day_plan') THEN
        CREATE POLICY "Users can view own current day plan" ON public.current_day_plan FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upsert own current day plan' AND tablename = 'current_day_plan') THEN
        CREATE POLICY "Users can upsert own current day plan" ON public.current_day_plan FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own current day plan' AND tablename = 'current_day_plan') THEN
        CREATE POLICY "Users can update own current day plan" ON public.current_day_plan FOR UPDATE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 5. Harden the handle_new_user() trigger with SET search_path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
