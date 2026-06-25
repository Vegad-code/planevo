# Planevo Disaster Recovery, RTO/RPO, and Incident Response

This document defines recovery objectives and the operational runbook for production incidents affecting Planevo.

## Recovery Objectives

| Tier | Scope | RTO (Recovery Time Objective) | RPO (Recovery Point Objective) |
|------|-------|--------------------------------|------------------------------|
| **P0** | Database (Supabase Postgres) | 4 hours | 1 hour (PITR granularity on Pro tier) |
| **P1** | Web app (Vercel) | 1 hour | 0 (stateless deploy rollback) |
| **P2** | Mobile app (Expo/EAS) | 24 hours | 0 (client binaries; OTA if enabled) |
| **P3** | Third-party integrations (Stripe, Resend, OpenAI) | Vendor-dependent | Vendor-dependent |

**RTO** = maximum acceptable downtime before service is restored.  
**RPO** = maximum acceptable data loss measured in time.

Database recovery procedures are detailed in [DATABASE_RECOVERY.md](./DATABASE_RECOVERY.md).

---

## Incident Severity Levels

| Level | Definition | Example | Initial response |
|-------|------------|---------|------------------|
| **SEV-1** | Complete outage or data loss risk | Supabase unreachable, auth down for all users | Page on-call, begin DR within 15 minutes |
| **SEV-2** | Major feature degraded | Bruno chat failing, Stripe webhooks failing | Triage within 30 minutes |
| **SEV-3** | Partial degradation | Single integration sync failing | Fix in business hours |
| **SEV-4** | Minor / cosmetic | UI glitch, non-blocking error | Backlog |

---

## Incident Response Runbook

### 1. Detect and triage (0–15 min)

1. Confirm the alert in **Sentry** (errors) and **Vercel** (deploy/runtime).
2. Check **Supabase Dashboard** → Database health, Auth, and API logs.
3. Assign an incident lead and post status in the team channel.
4. Classify severity (SEV-1 through SEV-4).

### 2. Stabilize (15–60 min)

**Web app failure**
- Roll back to last known-good Vercel deployment (Production → Deployments → Promote previous).
- Verify `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and Stripe keys in Vercel env.

**Database corruption or accidental deletion**
- Stop writes if needed (disable cron jobs in `vercel.json` or pause Vercel crons).
- Begin PITR restore per [DATABASE_RECOVERY.md](./DATABASE_RECOVERY.md).
- Target restore timestamp: last known-good moment **before** the incident (RPO ≤ 1h).

**Auth outage**
- Check Supabase Auth status page and JWT expiry settings (`supabase/config.toml`).
- Verify middleware and `getUser()` paths are not failing due to env misconfiguration.

**Stripe / billing**
- Check Stripe Dashboard → Webhooks for delivery failures.
- Replay failed events after fixing the webhook endpoint.
- Do not manually duplicate subscription state without checking `stripe_webhook_events` idempotency table.

### 3. Recover and verify (1–4 hours)

1. Restore database to a **new** Supabase project via PITR (never overwrite production in place).
2. Validate row counts for `users`, `calendar_events`, `tasks`.
3. Swap Vercel and mobile env vars to the restored project.
4. Redeploy web app; smoke-test login, dashboard, daily plan, Bruno chat.
5. Re-enable crons only after core paths pass.

### 4. Post-incident (within 48 hours)

- Write a brief postmortem: timeline, root cause, action items.
- Update this runbook or ADRs if architecture changed.
- Schedule monthly PITR verification per DATABASE_RECOVERY.md §3.

---

## Communication Templates

**User-facing (SEV-1/2):**  
"We're investigating an issue affecting [feature]. Your data is safe. We'll update you within [time]."

**Resolved:**  
"The incident is resolved. If you still see issues, sign out and back in or contact support."

---

## Related Documents

- [DATABASE_RECOVERY.md](./DATABASE_RECOVERY.md) — PITR and manual backup steps
- [docs/adr/](./adr/) — Architecture decisions affecting recovery boundaries
- [apps/web/docs/NOTIFICATIONS_AUDIT.md](../apps/web/docs/NOTIFICATIONS_AUDIT.md) — Notification ops

---

## Quarterly DR drill checklist

Run in **staging** at least once per quarter. Record date and owner in the team channel.

- [ ] **Database PITR:** Restore a point-in-time snapshot to a throwaway Supabase branch/project; verify `users` and `tasks` row counts match expectations.
- [ ] **Vercel rollback:** Deploy a known-good git tag; confirm `/` and `/login` respond; roll forward to `main`.
- [ ] **Cron auth:** Call `/api/cron/data-retention` with valid and invalid `CRON_SECRET`; expect 200 / 401.
- [ ] **Integration decrypt:** Connect Google or Canvas in staging; run sync; confirm no decrypt errors in logs.
- [ ] **Account deletion:** Delete test user; confirm auth user removed and audit log row present.
- [ ] **Secret rotation dry-run:** Walk through [SECRET_ROTATION.md](./SECRET_ROTATION.md) for one non-production secret.

