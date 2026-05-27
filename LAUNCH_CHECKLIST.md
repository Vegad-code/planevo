# Planevo Launch Checklist & Architectural Decisions

## Canonical Plan Source Decision (Day 1)
- `calendar_events` is the canonical source for all scheduled blocks.
- `schedules` table becomes snapshot/history only — no live UI reads from it.
- `current_day_plan` is removed from app code (if no migration creates it) or properly migrated.

## Launch Gates

### Code Quality & Security
- [ ] Lint passes with zero errors.
- [ ] TypeScript passes for web and mobile (`typecheck`).
- [ ] Production build passes (`build`).
- [ ] High-severity production audit issues are resolved or explicitly mitigated.

### Feature Completeness & Reliability
- [ ] Onboarding produces a real or deliberately seeded first plan.
- [ ] Dashboard, Daily Plan, Calendar, Mobile, and Widget share the same next-action source (`calendar_events`).
- [ ] Stripe checkout, portal, and webhook are verified (webhook idempotent).
- [ ] Canvas token is properly masked and not returned to the browser after save.
- [ ] Google Calendar sync is idempotent (upsert-based).

### Trust & Legal
- [ ] Legal pages (Privacy, Terms, Cookies) are fully written, not stubs.
- [ ] Public copy correctly matches v1 features and does not promise unfinished features.
- [ ] Analytics (PostHog/Sentry) can accurately measure activation and retention.
  - [ ] Uncomment the development environment opt-out check in [posthog.ts](file:///c:/Users/jabbo/M1plan/planevo/apps/web/lib/posthog.ts) to disable local tracking in production/staging.
