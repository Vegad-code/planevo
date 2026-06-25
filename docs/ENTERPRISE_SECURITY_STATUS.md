# Enterprise Security 10/10 — Implementation Status

**Last updated:** 2026-06-19  
**Plan reference:** `.cursor/plans/enterprise_security_10_10_f714c33d.plan.md` (do not edit the plan file)  
**Audience:** Humans and agents continuing security work on Planevo

This document summarizes what was implemented, how to verify it, and what still requires manual ops or follow-up code.

---

## Executive summary

| Area | Code status | Production-ready? |
|------|-------------|-----------------|
| Dashboard server auth | Done | Yes (after deploy) |
| API Zod validation | Done for all mutating **routes** | Yes |
| Server action Zod | **Partial** | Needs follow-up |
| Origin guard gaps | Done (2 GET routes) | Yes |
| Token encryption / no legacy plaintext | Done in code | Run reencrypt script if old rows exist |
| Audit log + retention crons | Done in code | **Apply migrations + deploy** |
| CI security gates | Done | Enable GitHub secrets + secret scanning |
| E2E security suite | Done | Needs `E2E_TEST_*` secrets in CI |
| Integration tests (Supabase local) | Done | Nightly workflow; not on every PR |

**Bottom line:** Application code for the plan is largely in place. Production “10/10” still depends on **migrations applied**, **env vars set**, **one-off token migration**, and **CI secrets configured**.

---

## Phase 1 — Close exploitable holes

### 1.1 Server-side dashboard auth ✅

| Change | Location |
|--------|----------|
| RSC layout calls `getUser()` → `redirect('/login')` | `apps/web/app/dashboard/layout.tsx` |
| Client shell extracted | `apps/web/app/dashboard/DashboardClientShell.tsx` |
| Onboarding guard | Same layout → `redirect('/onboarding')` |
| Fixed `/auth/login` → `/login` | `apps/web/app/dashboard/settings/calendar/page.tsx` |
| Fixed `return null` → redirect | `settings/danger/page.tsx`, `settings/membership/page.tsx` |

### 1.2 `getSession()` on server ⚠️ Partial

| Done | Gap |
|------|-----|
| `lib/calendar.ts` uses `getUser()` first; `getSession()` only for `provider_token` | Client pages/hooks still use `getSession()` **only to attach Bearer tokens** (acceptable per plan if not used for auth decisions) |

**Client `getSession()` usages (audit only):**  
`app/dashboard/page.tsx`, `daily-plan/page.tsx`, `calendar/page.tsx`, `hooks/useCalendar*.ts`, `components/providers/AppearanceProvider.tsx`

### 1.3 Input validation — API routes ✅ / server actions ⚠️

**API routes:** All mutating `route.ts` handlers use `safeParse` or `parseJsonBody` from `lib/api/schemas.ts`. Enforced by:

```bash
node scripts/ci-route-validation.mjs
```

**Server actions with Zod:**

| File | Status |
|------|--------|
| `settings/profile/actions.ts` | ✅ `profileUpdateSchema` |
| `settings/calendar/actions.ts` | ⚠️ Only `updateCalendarPreferencesAction`; `updatePlanningStyleAction`, `updateBreakPreferencesAction`, `updateFocusWindowsAction` still untyped |
| `settings/notifications/actions.ts` | ❌ No Zod |
| `settings/privacy/actions.ts` | ❌ No Zod (export is read-only; low risk) |
| `settings/bruno/actions.ts` | ⚠️ Uses AI `jsonSchema`, not shared `lib/api/schemas` |
| `settings/danger/actions.ts` | ⚠️ String confirmation only |
| `lib/canvas/actions.ts` | ❌ No Zod on server actions |

**Follow-up for agents:** Extend `lib/api/schemas.ts` and wire remaining server actions; optionally add a CI check analogous to `ci-route-validation.mjs` for `actions.ts` files.

### 1.4 CSRF / origin guard ✅

Added `isAllowedOriginOrBearer` to:

- `app/api/integrations/composio/connections/route.ts`
- `app/api/integrations/google/calendars/route.ts`

Documented in `SECURITY.md`.

### 1.5 Owner email bypass ✅

| Change | Location |
|--------|----------|
| `PLANEVO_OWNER_EMAILS` / `BRUNO_ADMIN_EMAILS` | `lib/auth/owner-emails.ts` |
| Removed hardcoded email | `lib/auth/subscription.ts`, `hooks/use-subscription.ts`, settings pages |

**Env:** Set `PLANEVO_OWNER_EMAILS` in Vercel (see `apps/web/.env.example`).

### 1.6 Fail closed on missing secrets ⚠️ Partial

| Done | Gap |
|------|-----|
| `assertProductionEnv()` + placeholder detection | `lib/env.ts` |
| Function exists | **Not wired at app boot** (e.g. `instrumentation.ts` or root layout import) — add call in production startup |

---

## Phase 2 — Secrets and token safety

### 2.1 Legacy plaintext migration ✅ (code) / ⚠️ (ops)

| Item | Location |
|------|----------|
| Reencrypt script | `scripts/reencrypt-integration-tokens.mjs` |
| `allowLegacyPlaintext` removed | `lib/crypto.ts`, canvas, google-calendar, syncEngine |
| ADR updated | `docs/adr/004-integration-token-encryption.md` |

**Ops required:**

```bash
# Dry run first
ENCRYPTION_KEY=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... \
  node scripts/reencrypt-integration-tokens.mjs --dry-run

# Then apply
node scripts/reencrypt-integration-tokens.mjs
```

### 2.2 Secret rotation runbooks ✅

`docs/SECRET_ROTATION.md` — cross-linked from `SECURITY.md`.

### 2.3 Leak prevention ✅ (CI) / ⚠️ (GitHub settings)

| Item | Location |
|------|----------|
| Secret pattern grep in CI | `scripts/ci-secret-grep.mjs` |
| Docs | `SECURITY.md` |

**Manual:** Enable **GitHub secret scanning** + push protection in repo Settings → Code security.

---

## Phase 3 — Data protection and audit trail

### 3.1 Security audit log ✅ (code) / ⚠️ (migration)

| Item | Location |
|------|----------|
| Migration | `supabase/migrations/20260619120000_security_audit_log.sql` |
| Insert helper | `lib/security-audit.ts` |

**Events logged today:**

| Action | Where |
|--------|-------|
| `auth.sign_in_failed` | `app/api/auth/sign-in/route.ts` |
| `account.delete` | `app/dashboard/settings/danger/actions.ts` |
| `integration.disconnect` | `app/api/integrations/composio/disconnect/route.ts` |
| `stripe.portal_open` | `app/api/stripe/portal/route.ts` |

**Not yet logged (plan mentioned):** password reset, integration connect, settings changes.

### 3.2 Data retention ✅ (code) / ⚠️ (deploy)

| Item | Location |
|------|----------|
| Policy doc | `docs/DATA_RETENTION.md` |
| Cron route | `app/api/cron/data-retention/route.ts` |
| Vercel schedule | `apps/web/vercel.json` — Sundays 03:00 UTC |

**Tables purged:** `bruno_tool_logs` (90d), `mcp_tool_calls` (90d), `notification_deliveries` (180d), `ip_rate_limit_buckets` (7d), `ai_usage_logs` (365d).

**Ops:** Deploy to Vercel so cron is active; verify with valid `CRON_SECRET`.

### 3.3 Structured logging ✅ / ⚠️ Partial coverage

| Item | Location |
|------|----------|
| JSON logger | `lib/logger.ts` |
| Wired paths | Auth sign-in, composio disconnect, account delete |

**Follow-up:** Wire logger + audit on password-reset, integration connect, settings mutations; optional Sentry breadcrumb bridge from same shape.

---

## Phase 4 — Resilience

### 4.1 `resilient-fetch` ⚠️ Partial

| Item | Location |
|------|----------|
| Implementation | `lib/http/resilient-fetch.ts` |
| Wired | Google OAuth token refresh, Canvas connection test |
| **Not wired** | OpenAI, Composio SDK HTTP, Resend, remaining Canvas fetches |

Plan acceptable at minimal scope; extend as needed.

### 4.2 Race hardening ✅ (code) / ⚠️ (migration)

| Item | Location |
|------|----------|
| `consume_ai_usage_admin` RPC | `supabase/migrations/20260619130000_ai_usage_race_hardening.sql` |
| App uses RPC | `lib/auth/rateLimit.ts` |
| Bruno idempotency | `idempotency_key` column + unique index; `app/api/bruno/actions/execute/route.ts` |

### 4.3 Caching ADR ✅

`docs/adr/005-caching-and-invalidation.md`

---

## Phase 5 — Testing

### 5.1 Supabase integration tests ✅

| Item | Location |
|------|----------|
| Tests | `apps/web/integration/security.integration.test.ts` |
| Config | `apps/web/vitest.integration.config.ts` |
| Nightly CI | `.github/workflows/integration.yml` |

Runs only when `INTEGRATION_TEST=1` (local: `supabase start` + `supabase db reset`).

### 5.2 Auth E2E in CI ⚠️

| Done | Needed |
|------|--------|
| CI passes `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | Add secrets in GitHub Actions |
| Smoke tests skip without creds | `apps/web/e2e/smoke.spec.ts` |

### 5.3 Security regression suite ✅

`apps/web/e2e/security.spec.ts` — dashboard redirect, cross-origin 403, sign-in rate limit 429, optional IDOR test (`E2E_OTHER_USER_CONVERSATION_ID`).

### 5.4 Load / chaos ✅

| Item | Location |
|------|----------|
| k6 smoke | `scripts/load/k6-smoke.js` |
| Playbook | `docs/CHAOS_PLAYBOOK.md` |

### 5.5 Coverage gate ✅

`npm run test:coverage` — thresholds on `lib/auth/*`, `lib/crypto.ts`, `lib/api/schemas.ts` (see `apps/web/vitest.config.ts`).

---

## Phase 6 — CI, governance, docs

| Item | Location | Notes |
|------|----------|-------|
| CODEOWNERS | `.github/CODEOWNERS` | |
| PR template | `.github/pull_request_template.md` | Security checklist |
| Husky pre-commit | `.husky/pre-commit` → `npm run check` | **lint-staged not added** (plan mentioned both) |
| OpenAPI drift | `scripts/ci-openapi-drift.mjs` | |
| OpenAPI paths | `docs/openapi.yaml` | Expanded for documented routes |
| Security data flow | `docs/architecture/SECURITY_DATA_FLOW.md` | |
| DR quarterly drill | `docs/DISASTER_RECOVERY.md` | Checklist appended |
| Main CI | `.github/workflows/ci.yml` | audit, secret grep, route validation, openapi drift, coverage, e2e |

---

## Supabase migrations — apply order

These must exist in production for full functionality:

| Migration | Purpose | Production status |
|-----------|---------|-------------------|
| `20260619100000_ip_rate_limit_buckets.sql` | IP rate limits | **Applied** (per prior session) |
| `20260619120000_security_audit_log.sql` | Audit log + RPC | **Verify / apply** |
| `20260619130000_ai_usage_race_hardening.sql` | AI quota RPC + Bruno idempotency | **Verify / apply** |

```bash
# Local
cd planevo && supabase db reset

# Remote — use Supabase CLI or Dashboard SQL migration push
supabase db push
```

After push, regenerate types if needed: `apps/web/types/database.ts` was hand-updated for new RPCs/columns.

---

## Verification checklist (from plan)

Use this before calling security “10/10” in production:

- [ ] `e2e/security.spec.ts` green in CI
- [ ] All API routes have Zod validation (`node scripts/ci-route-validation.mjs`)
- [ ] **Server actions** — not 100%; see Phase 1.3 gaps
- [ ] No `allowLegacyPlaintext` in production code ✅
- [ ] No hardcoded owner emails ✅
- [ ] Dashboard uses server `getUser()` ✅
- [ ] `security_audit_log` records key mutations ⚠️ partial event coverage
- [ ] Retention cron deployed and tested
- [ ] `SECRET_ROTATION.md` exercised once in staging
- [ ] Integration workflow green (nightly)
- [ ] `npm run check` + full CI green
- [ ] `E2E_TEST_*` secrets set for authenticated E2E
- [ ] GitHub secret scanning enabled
- [ ] Reencrypt script run if any plaintext integration tokens remain
- [ ] `PLANEVO_OWNER_EMAILS` set in Vercel

---

## Local verification commands

From `planevo/`:

```bash
# Full app check
npm run check

# Security CI scripts
node scripts/ci-audit.mjs
node scripts/ci-secret-grep.mjs
node scripts/ci-route-validation.mjs
node scripts/ci-openapi-drift.mjs

# Tests + coverage
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef \
  npm run test:coverage --workspace planevo

# E2E (dev server on :3000)
npm run test:e2e --workspace planevo

# Integration (requires Docker + Supabase CLI)
supabase start && supabase db reset --no-seed
INTEGRATION_TEST=1 npm run test:integration --workspace planevo
```

---

## Ops checklist (human)

1. Apply migrations `20260619120000` and `20260619130000` to production Supabase.
2. Set `PLANEVO_OWNER_EMAILS` in Vercel (comma-separated admin emails).
3. Run `scripts/reencrypt-integration-tokens.mjs` if upgrading from plaintext tokens.
4. Add GitHub Actions secrets: `E2E_TEST_EMAIL`, `E2E_TEST_PASSWORD` (optional: `E2E_OTHER_USER_CONVERSATION_ID`).
5. Enable GitHub secret scanning on the repo.
6. Deploy web app so `data-retention` cron is registered (`vercel.json`).
7. Smoke-test cron: `curl -H "Authorization: Bearer $CRON_SECRET" https://planevo.co/api/cron/data-retention`
8. Run quarterly DR drill per `docs/DISASTER_RECOVERY.md`.

---

## Suggested follow-up tasks (for agents)

Priority order:

1. **Wire `assertProductionEnv()`** at production boot (`instrumentation.ts` or similar).
2. **Complete Zod on server actions** — calendar (3 actions), notifications, canvas actions; add CI guard if desired.
3. **Expand audit logging** — password reset, integration connect, settings updates.
4. **Wire `resilientFetch`** to OpenAI/Resend read paths (optional hardening).
5. **Add `lint-staged`** if pre-commit should only lint staged files (plan item; Husky alone is in place).
6. **Session policy doc** — document Supabase JWT/refresh defaults (plan § session expiry).
7. **Webhook throttles** — plan mentioned; not implemented (defer or add Postgres buckets).
8. **Hash chain on `security_audit_log`** — plan listed as optional; not implemented.

---

## Key file index (quick reference)

| Concern | Files |
|---------|-------|
| Auth / rate limits | `lib/auth/`, `app/api/auth/` |
| Schemas | `lib/api/schemas.ts` |
| Crypto | `lib/crypto.ts`, `scripts/reencrypt-integration-tokens.mjs` |
| Audit | `lib/security-audit.ts`, migration `20260619120000_*` |
| Logging | `lib/logger.ts` |
| HTTP resilience | `lib/http/resilient-fetch.ts` |
| CI scripts | `scripts/ci-*.mjs` |
| E2E | `apps/web/e2e/security.spec.ts`, `smoke.spec.ts` |
| Docs | `SECURITY.md`, `docs/SECRET_ROTATION.md`, `docs/DATA_RETENTION.md`, `docs/CHAOS_PLAYBOOK.md`, `docs/architecture/SECURITY_DATA_FLOW.md` |

---

## Related transcripts

Implementation conversation: agent transcript `330803e3-ca42-4f3b-8caa-b7426304ff1e` (search for phase names or file paths).
