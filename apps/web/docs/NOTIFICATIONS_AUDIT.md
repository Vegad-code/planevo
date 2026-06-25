# Notifications Audit

Last updated: June 17, 2026

## Current Channels

- Email is sent through Resend from `apps/web/lib/email.ts`.
- Push is sent through Expo Push API from the daily notification sweep and test routes.
- SMS/text is intentionally out of scope for now. Current production notification scope is email plus Expo push only.

## Production Scheduling

Automated emails now run through a single Hobby-compatible sweep:

- `GET /api/cron/daily-notifications`
- Vercel Cron schedule:
  - `0 14 * * *` UTC for morning plan, upcoming reminders, and welcome-series catch-up
  - `0 2 * * *` UTC for deadline rescue catch-up
- Weekly review runs inside the Sunday `14:00 UTC` daily sweep.
- Legacy routes (`/api/notifications/push`, `/api/cron/deadline-rescue`, `/api/cron/welcome-series`) delegate to the same sweep for manual testing.

## Required Production Environment

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend SDK sends |
| `EMAIL_FROM` | Preferred sender address (`WEEKLY_REVIEW_FROM` still supported) |
| `CRON_SECRET` | Required for Vercel Cron auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Delivery ledger writes and user iteration |
| `OPENAI_API_KEY` | Weekly review generation |

## Automated Email Types

| Type | When it sends |
| --- | --- |
| `daily_plan` | After the user's local morning time if they have tasks due today |
| `deadline_rescue` | After 6:00 PM local if they still have tasks due today |
| `upcoming_reminders` | After the user's local morning time if they have tasks due in 1-3 days or calendar events in the next 24 hours |
| `weekly_review` | Sundays during the 14:00 UTC sweep for paid plans with recent activity |
| `welcome_series` | Day 1 and day 3 after signup |
| `billing_*` | Stripe webhook events |
| `test_email` | Manual test button in settings |

## Verification

- Focused notification tests: `npm run test --workspace planevo -- lib/__tests__/email.test.ts lib/notifications/__tests__ app/api/cron/daily-notifications/__tests__/route.test.ts`
- Typecheck: `npm run typecheck --workspace planevo`
- Live verifier dry-run: `node scripts/verify-live-notification.mjs`
- Live verifier send: `node scripts/verify-live-notification.mjs --send --user-id <uuid>`
- Settings page now shows last automated email delivery and plain-language skip reasons.

## Supabase Auth Email

Signup confirmation and magic links still require Supabase custom SMTP configured to Resend. See `docs/SUPABASE_EMAIL_TEMPLATES.md`.

## DNS / Domain

Custom-domain sends require verified `planevo.co` DNS in Resend. If manual test email works in production, domain verification is already healthy.

## Post-Deploy Checklist (Emails)

When you deploy the web app to production, run through this list so automated emails are fully wired up:

- [ ] **Deploy the latest web app** — Vercel picks up the new `vercel.json` with two daily cron sweeps (`14:00 UTC` and `02:00 UTC`).
- [ ] **Confirm Vercel environment variables** are set for Production:
  - [ ] `CRON_SECRET` — required; without it every cron returns 401 and no automated emails send
  - [ ] `RESEND_API_KEY`
  - [ ] `EMAIL_FROM` (or legacy `WEEKLY_REVIEW_FROM`)
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `OPENAI_API_KEY` (weekly review only)
- [ ] **Apply Supabase migrations** through `migration_v20_upcoming_reminders.sql` (and earlier notification migrations if not already applied).
- [ ] **Verify Vercel Cron Jobs** in the planevo-web project — both `/api/cron/daily-notifications` schedules should show recent successful invocations after the first day.
- [ ] **Confirm Resend domain** — if Settings → Notifications → “Send test email” works in production, domain verification is healthy.
- [ ] **Optional: Supabase auth SMTP** — configure Resend SMTP in Supabase for signup confirmation and magic links (see `docs/SUPABASE_EMAIL_TEMPLATES.md`). This is separate from app cron emails.
- [ ] **Smoke-test in the app**:
  - [ ] Open Settings → Notifications and confirm your timezone is set (auto-detected on first visit)
  - [ ] Use “Send test email” — should arrive in your inbox
  - [ ] Check the **Email Delivery Status** panel for last automated send and any skip reasons
- [ ] **Seed realistic data for automated sends** (if testing end-to-end):
  - [ ] At least one task **due today** (`todo` / `in_progress`) for morning plan and deadline rescue
  - [ ] Or tasks due in 1–3 days / calendar events in the next 24 hours for upcoming reminders
- [ ] **Wait for the next cron window** — automated emails run at `14:00 UTC` and `02:00 UTC`; confirm new rows appear in `notification_deliveries` for your user.

Once this checklist is complete, production email notifications should be fully operational without further code changes.

## Post-Deploy Checklist (Mobile Push)

- [ ] **Apply Supabase migration** `migration_v21_integration_notification_types.sql` (backfills Canvas, Calendar, and Pro work-tool toggles).
- [ ] **Deploy the latest web app** so daily sweep, source-sweep, post-sync hooks, and `/api/cron/time-sensitive` are live.
- [ ] **Set `CRON_SECRET`** in Vercel Production (required for all cron routes).
- [ ] **Optional: time-sensitive calendar pushes** — call `GET /api/cron/time-sensitive` hourly via Vercel Pro cron or an external scheduler (Hobby plan is limited to two daily crons).
- [ ] **Build and install the mobile app** on a physical device (push does not work in simulators).
- [ ] **Sign in** — token registers automatically via `syncPushNotificationState`.
- [ ] **Settings → Notifications** — enable push, grant OS permission, tap **Send test notification**.
- [ ] **Per-type toggles** — enable Canvas, Calendar, or Pro work digests as needed.
- [ ] **Verify delivery** — check Notification inbox on mobile or `notification_deliveries` rows with `channel = push`.

## Mobile Push Architecture

- Token stored on `users.expo_push_token`; preferences in `notification_preferences`.
- Twice-daily sweep (`/api/cron/daily-notifications`) sends daily plan, deadline rescue, upcoming reminders, and integration digests.
- Post-sync hooks fire after Canvas and Composio sync when new items land.
- Daily cap: 4 pushes per user per local day (overflow suppressed; visible in inbox).
- Deep links: `screen` in push `data` routes to tasks, calendar, chat (with optional `prompt`), or notification inbox.
