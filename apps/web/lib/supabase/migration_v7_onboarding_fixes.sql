-- Drop and recreate energy preference constraint to allow 'night' and 'chaos'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_energy_preference_check;
ALTER TABLE public.users ADD CONSTRAINT users_energy_preference_check CHECK (energy_preference IN ('morning', 'afternoon', 'evening', 'night', 'chaos'));

-- Drop and recreate plan type constraint to allow pro_monthly, pro_annual, trialing, premium, canceled, admin, student
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_plan_type_check CHECK (plan_type IN ('free', 'pro_monthly', 'pro_annual', 'trialing', 'premium', 'canceled', 'admin', 'student'));

-- Re-declare trigger function with search_path set to public to prevent search path hijacking
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
