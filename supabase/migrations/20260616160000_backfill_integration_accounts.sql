-- P2: Backfill integration_accounts from legacy users columns, then stop relying on them in app code.

-- Canvas: users.canvas_token + canvas_url → integration_accounts
INSERT INTO public.integration_accounts (
  user_id,
  provider,
  access_token_encrypted,
  metadata,
  status
)
SELECT
  u.id,
  'canvas',
  u.canvas_token,
  jsonb_build_object('canvas_url', u.canvas_url),
  'connected'
FROM public.users u
WHERE u.canvas_token IS NOT NULL
  AND u.canvas_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.user_id = u.id
      AND ia.provider = 'canvas'
  );

-- Google Calendar: users.google_calendar_refresh_token → integration_accounts
INSERT INTO public.integration_accounts (
  user_id,
  provider,
  refresh_token_encrypted,
  status,
  last_synced_at
)
SELECT
  u.id,
  'google_calendar',
  u.google_calendar_refresh_token,
  CASE
    WHEN COALESCE(u.google_calendar_connected, false) THEN 'connected'
    ELSE 'disconnected'
  END,
  u.google_calendar_last_synced_at
FROM public.users u
WHERE u.google_calendar_refresh_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.integration_accounts ia
    WHERE ia.user_id = u.id
      AND ia.provider = 'google_calendar'
  );

-- For existing google rows missing tokens, copy refresh token from users if present
UPDATE public.integration_accounts ia
SET
  refresh_token_encrypted = u.google_calendar_refresh_token,
  status = CASE
    WHEN COALESCE(u.google_calendar_connected, false) THEN 'connected'
    ELSE ia.status
  END,
  last_synced_at = COALESCE(ia.last_synced_at, u.google_calendar_last_synced_at)
FROM public.users u
WHERE ia.user_id = u.id
  AND ia.provider = 'google_calendar'
  AND ia.refresh_token_encrypted IS NULL
  AND u.google_calendar_refresh_token IS NOT NULL;

-- For existing canvas rows missing tokens, copy from users if present
UPDATE public.integration_accounts ia
SET
  access_token_encrypted = u.canvas_token,
  metadata = COALESCE(ia.metadata, '{}'::jsonb) || jsonb_build_object('canvas_url', u.canvas_url),
  status = 'connected'
FROM public.users u
WHERE ia.user_id = u.id
  AND ia.provider = 'canvas'
  AND ia.access_token_encrypted IS NULL
  AND u.canvas_token IS NOT NULL
  AND u.canvas_url IS NOT NULL;
