CREATE TABLE IF NOT EXISTS public.user_profile_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
    timezone TEXT DEFAULT 'UTC',
    preferred_name TEXT,
    context_type TEXT DEFAULT 'professional', -- 'student', 'professional', 'both'
    school_name TEXT,
    graduation_year TEXT,
    major_role TEXT,
    term_start TIMESTAMPTZ,
    term_end TIMESTAMPTZ,
    default_canvas_url TEXT,
    workload_style TEXT DEFAULT 'balanced', -- 'light', 'balanced', 'intense'
    default_focus_target INTEGER, -- in minutes
    default_task_duration INTEGER, -- in minutes
    preferred_planning_time TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profile_settings ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can view own profile settings" 
ON public.user_profile_settings FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile settings" 
ON public.user_profile_settings FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile settings" 
ON public.user_profile_settings FOR UPDATE 
USING (auth.uid() = user_id);

-- Create updated_at trigger if the function exists
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_modified_column') THEN
    CREATE TRIGGER update_user_profile_settings_modtime
        BEFORE UPDATE ON public.user_profile_settings
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
  END IF;
END $$;
