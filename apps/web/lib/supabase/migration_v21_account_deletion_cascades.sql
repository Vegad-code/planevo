-- Migration v21: Account deletion cascade hardening
-- Ensure deleting a user cannot be blocked by self-referential referral metadata
-- or newer per-user metric tables.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'users'
      AND constraint_name = 'users_referred_by_fkey'
  ) THEN
    ALTER TABLE public.users DROP CONSTRAINT users_referred_by_fkey;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'referred_by'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_referred_by_fkey
      FOREIGN KEY (referred_by)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'daily_user_metrics'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = 'public'
        AND table_name = 'daily_user_metrics'
        AND constraint_name = 'daily_user_metrics_user_id_fkey'
    ) THEN
      ALTER TABLE public.daily_user_metrics DROP CONSTRAINT daily_user_metrics_user_id_fkey;
    END IF;

    ALTER TABLE public.daily_user_metrics
      ADD CONSTRAINT daily_user_metrics_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;
