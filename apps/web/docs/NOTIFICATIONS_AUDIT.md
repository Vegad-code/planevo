# Notifications Audit

Last updated: June 5, 2026

## Current Channels

- Email is sent through Resend from `apps/web/lib/email.ts`.
- Push is sent through Expo Push API from notification cron/test routes and `apps/web/lib/notifications/expo.ts`.
- SMS/text is intentionally out of scope for now. Current production notification scope is email plus Expo push only.

## Production State Checked

- Supabase project: `wuzignwkynhquevywbyd`.
- Notification migrations through `migration_v19_notification_deliveries.sql` are present.
- `notification_deliveries` is the delivery ledger and is protected by RLS for user SELECT only.
- Server-side delivery writes must use the Supabase service role.
- The guarded live verifier sent one Resend test-sender email to a real Planevo user and inserted a production `notification_deliveries` row.
- Live verification row: `d3dc57de-4e4a-4a51-a509-ccba3229c3d4`.
- Live Resend message: `51f948e2-cab4-4864-ac8c-05813e35e61a`.
- Production sender domain is `planevo.co`, not `planevo.app`.
- `planevo.co` has been added to Resend as domain `aee74289-2be8-4d09-b4a6-55732fed228d`, and is pending DNS verification.
- Production currently has 2 users and 0 stored `expo_push_token` values, so Expo push cannot be live-tested until a physical device registers.
- Vercel project `planevo-web` exists as `prj_iFaH9sZhDzq6CXg7kw88Rikhj0bm`.
- Latest production deployment `dpl_3fBic421CjRkiYMkfoUHQYsVsd37` is `READY` and aliased to `planevo.co`.
- Local `apps/web/vercel.json` declares cron jobs for weekly review, deadline rescue, daily push, and welcome series.

## Fixed Loopholes

- Resend email helpers now return provider message IDs.
- Email helpers now support Resend idempotency keys.
- Raw HTML email paths now escape interpolated values.
- Email paths now include text fallbacks.
- Delivery ledger insert failures now throw instead of being silently swallowed.
- Expo push helper now returns Expo ticket IDs.
- Email/push delivery metadata now records provider and provider IDs where available.
- Cron response counts for daily plan, deadline rescue, and welcome series now reflect logged sends, not merely queued send promises.
- Test email and test push routes now write delivery ledger rows through the service role.
- Stripe billing receipt and payment-failed notifications now dedupe and log email/push delivery attempts.

## Verification

- Focused notification tests: `npm.cmd exec vitest run lib/__tests__/email.test.ts lib/notifications/__tests__`
- Typecheck: `npm.cmd run typecheck --workspace planevo`
- Targeted notification lint: `npm.cmd exec eslint ...`
- Live verifier dry-run: `node scripts/verify-live-notification.mjs`
- Live verifier send: `node scripts/verify-live-notification.mjs --send --resend-test-sender --user-id 215bd6e7-4ed8-44d6-9521-6b8e12ed5117`

## Required Vercel DNS Records for Resend

DNS is hosted by Vercel DNS for `planevo.co`. Add these records in Vercel, then run `node scripts/verify-resend-domain.mjs aee74289-2be8-4d09-b4a6-55732fed228d`.

| Type | Name | Value | Priority | TTL |
| --- | --- | --- | --- | --- |
| TXT | `resend._domainkey` | `p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC0y8tkGrTjetG57lBl7LiHvMHvjBpLaP2TrxkyHT3Y8w6YfHr3vfkSdJucgikhjC7vY91IFK5Mlvit8HM0q/+oVOI5ra5MQWmChfsn5frIZg+O2z24D9J2Ugd+7CG9zixJ6khhpPsczQO06ZIsk2rCIcUkZ+b+KQKJzZzOJ2xt5wIDAQAB` | | Auto |
| MX | `send` | `feedback-smtp.us-east-1.amazonses.com` | 10 | 60 |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` | | 60 |

## Known External Gaps

- Production email from `bruno@planevo.co` cannot send until the Resend DNS records above are added in Vercel DNS.
- Push delivery cannot be proven for users without stored Expo push tokens.
- Mobile push token registration exists in `apps/mobile/lib/notifications.ts`; a physical-device app session must grant notification permission to populate `users.expo_push_token`.
- Vercel env var values could not be read through the available connector, and no local Vercel token/CLI config is available.
- Vercel DNS records are visible in the authenticated dashboard, but automated form input was paused because the active Chrome window detected user input during Computer Use.
