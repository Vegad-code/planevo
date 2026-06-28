-- Onboarding wizard removed; all users should be treated as onboarded.
UPDATE public.users SET onboarding_complete = true WHERE onboarding_complete = false;

ALTER TABLE public.users ALTER COLUMN onboarding_complete SET DEFAULT true;
