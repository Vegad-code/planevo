-- Migration: Add enhanced memory columns to user_ai_memory
-- These columns support the AI Planning Draft Mode feature:
--   task_duration_preferences: Learned preferred durations for task categories
--   task_time_preferences: Learned preferred times of day for task types
--   task_grouping_preferences: Learned habit stacking / grouping patterns

ALTER TABLE user_ai_memory
ADD COLUMN IF NOT EXISTS task_duration_preferences jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS task_time_preferences jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS task_grouping_preferences jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN user_ai_memory.task_duration_preferences IS 'Learned preferred durations (minutes) for specific task categories';
COMMENT ON COLUMN user_ai_memory.task_time_preferences IS 'Learned preferred time-of-day slots for specific task types';
COMMENT ON COLUMN user_ai_memory.task_grouping_preferences IS 'Learned habit stacking patterns (tasks user groups together)';
