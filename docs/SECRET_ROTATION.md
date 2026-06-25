# Secret rotation runbook

Operational steps for rotating Planevo server secrets without downtime where possible.

## General order

1. Provision the new secret in a secure store (1Password / Vercel draft env).
2. Run any data migration scripts (token re-encryption) in a maintenance window if required.
3. Update Vercel production + preview env vars.
4. Redeploy the web app.
5. Revoke the old secret at the provider.
6. Verify auth, integrations, crons, and webhooks in staging first when possible.

---

## `ENCRYPTION_KEY` (AES-256-GCM for integration tokens)

**Impact:** All `integration_accounts` ciphertext becomes unreadable until re-encrypted.

1. Generate a new 32-byte key: `openssl rand -hex 32`
2. **Maintenance window:** set `LEGACY_ENCRYPTION_KEY` to the old key and `ENCRYPTION_KEY` to the new key (if dual-key support is added) **or** decrypt with old key and re-encrypt with new in one pass:
   - Export rows with service role
   - Decrypt with old key locally
   - Run `node scripts/reencrypt-integration-tokens.mjs` after temporarily setting only the new key on plaintext source (preferred: custom one-off script with both keys)
3. Update `ENCRYPTION_KEY` in Vercel for all environments.
4. Redeploy.
5. Run integration smoke tests (Google Calendar sync, Canvas connect).
6. Remove old key from all stores.

See ADR-004 and `scripts/reencrypt-integration-tokens.mjs`.

---

## `CRON_SECRET`

**Impact:** Vercel Cron routes return 401 until updated.

1. Generate: `openssl rand -base64 32`
2. Update Vercel env `CRON_SECRET`.
3. Redeploy (cron invocations send `Authorization: Bearer <CRON_SECRET>`).
4. Trigger `/api/cron/data-retention` manually from Vercel dashboard or curl to confirm 200.

---

## `SUPABASE_SERVICE_ROLE_KEY`

**Impact:** All server-side admin DB operations fail.

1. Supabase Dashboard → Project Settings → API → rotate service role key (or create new project key if provider supports it).
2. Update Vercel + GitHub Actions secrets.
3. Redeploy.
4. Verify Bruno chat, integration sync, account deletion, and crons.

---

## `STRIPE_WEBHOOK_SECRET`

**Impact:** Stripe events not processed until endpoint secret matches.

1. Stripe Dashboard → Developers → Webhooks → select endpoint → Roll secret.
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel.
3. Redeploy.
4. Send test event from Stripe; confirm 200 on `/api/stripe/webhook`.

---

## OAuth client secrets (Google, Composio)

**Impact:** New OAuth connections fail; existing refresh tokens usually keep working until revoked.

1. Create new client secret in provider console.
2. Update Vercel env (`GOOGLE_CLIENT_SECRET`, `COMPOSIO_*` as applicable).
3. Redeploy.
4. Test connect + disconnect flow in staging.
5. Delete old secret in provider console.

---

## Cross-links

- [SECURITY.md](../SECURITY.md)
- [ADR-004: Integration token encryption](./adr/004-integration-token-encryption.md)
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
