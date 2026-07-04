-- One integration account row per user+provider (single-account providers like google_calendar).

DELETE FROM public.integration_accounts a
USING public.integration_accounts b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.provider = b.provider
  AND a.provider_account_id IS NULL
  AND b.provider_account_id IS NULL;

DROP INDEX IF EXISTS public.integration_accounts_user_provider_single_idx;

ALTER TABLE public.integration_accounts
  DROP CONSTRAINT IF EXISTS integration_accounts_user_provider_key;

ALTER TABLE public.integration_accounts
  ADD CONSTRAINT integration_accounts_user_provider_key
  UNIQUE (user_id, provider);
