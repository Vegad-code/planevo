-- =============================================================================
-- Migration V10: Ghost Blocks, Canvas Identity, Plan Types, and Indexes
-- =============================================================================
-- Run this migration in the Supabase SQL Editor.
-- All operations are idempotent (safe to re-run).

-- ============================================================
-- 1. CALENDAR EVENTS: Add top-level ghost block columns
-- ============================================================
DO $$
BEGIN
  -- Add is_ai_suggested column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_events'
      AND column_name = 'is_ai_suggested'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD COLUMN is_ai_suggested BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_events'
      AND column_name = 'status'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';
  END IF;

  -- Add energy_level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'calendar_events'
      AND column_name = 'energy_level'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD COLUMN energy_level TEXT;
  END IF;
END $$;

-- Add check constraint for status values (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'calendar_events_status_check'
  ) THEN
    ALTER TABLE public.calendar_events
      ADD CONSTRAINT calendar_events_status_check
      CHECK (status IN ('pending', 'accepted', 'rejected', 'confirmed'));
  END IF;
END $$;

-- ============================================================
-- 2. CALENDAR EVENTS: Useful Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_start
  ON public.calendar_events (user_id, start_time);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user_ai_start
  ON public.calendar_events (user_id, is_ai_suggested, start_time)
  WHERE is_ai_suggested = true;

CREATE INDEX IF NOT EXISTS idx_calendar_events_external_id
  ON public.calendar_events (external_id)
  WHERE external_id IS NOT NULL;

-- ============================================================
-- 3. CANVAS ASSIGNMENTS: Fix identity collision across users
-- ============================================================
-- Add external_id to store the raw Canvas ID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canvas_assignments'
      AND column_name = 'external_id'
  ) THEN
    ALTER TABLE public.canvas_assignments
      ADD COLUMN external_id TEXT;
  END IF;

  -- Add description column if missing (used in chat context)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'canvas_assignments'
      AND column_name = 'description'
  ) THEN
    ALTER TABLE public.canvas_assignments
      ADD COLUMN description TEXT;
  END IF;
END $$;

-- Backfill external_id from current id (the raw Canvas ID)
UPDATE public.canvas_assignments
SET external_id = id
WHERE external_id IS NULL;

-- Add unique constraint on (user_id, external_id) for safe multi-user upserts
-- This replaces the old behavior where bare Canvas IDs could collide across users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'canvas_assignments_user_external_unique'
  ) THEN
    ALTER TABLE public.canvas_assignments
      ADD CONSTRAINT canvas_assignments_user_external_unique
      UNIQUE (user_id, external_id);
  END IF;
END $$;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_canvas_assignments_user_id
  ON public.canvas_assignments (user_id);

-- ============================================================
-- 4. PLAN TYPE CONSOLIDATION
-- ============================================================
-- Canonical plan types: free, trialing, premium, student, canceled, admin
-- Legacy values mapped: pro->premium, pro_monthly->premium, pro_annual->premium, team->premium, elite->premium

-- First, migrate any legacy values in the users table
UPDATE public.users SET plan_type = 'premium'
WHERE plan_type IN ('pro', 'pro_monthly', 'pro_annual', 'team', 'elite');

-- Now widen the CHECK constraint to include new canonical values
-- Drop old constraint if it exists, then add new one
DO $$
BEGIN
  -- Try dropping the old constraint (name varies by schema)
  BEGIN
    ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_plan_type_check;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  -- Add the new canonical constraint
  ALTER TABLE public.users
    ADD CONSTRAINT users_plan_type_check
    CHECK (plan_type IN ('free', 'trialing', 'premium', 'student', 'canceled', 'admin'));
END $$;

-- Add Stripe-related columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'stripe_customer_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_customer_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'stripe_subscription_id'
  ) THEN
    ALTER TABLE public.users ADD COLUMN stripe_subscription_id TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE public.users ADD COLUMN subscription_status TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'trial_end'
  ) THEN
    ALTER TABLE public.users ADD COLUMN trial_end TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================================
-- 5. MIGRATE EXISTING GHOST BLOCKS (from metadata to top-level)
-- ============================================================
-- For any existing calendar_events that have is_ai_suggested in metadata but not top-level
UPDATE public.calendar_events
SET is_ai_suggested = true
WHERE is_ai_suggested = false
  AND metadata->>'is_ai_suggested' = 'true';

UPDATE public.calendar_events
SET status = metadata->>'status'
WHERE status = 'confirmed'
  AND metadata->>'status' IS NOT NULL
  AND metadata->>'status' IN ('pending', 'accepted', 'rejected');
