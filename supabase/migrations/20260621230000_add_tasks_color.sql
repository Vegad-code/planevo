-- Allow Bruno and users to persist task colors for calendar/backlog display
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS color text;

COMMENT ON COLUMN public.tasks.color IS 'Hex color for visual grouping on calendar/backlog (e.g. #039BE5)';
