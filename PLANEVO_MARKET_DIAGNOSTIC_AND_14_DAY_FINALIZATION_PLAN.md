# Planevo Market Diagnostic And 14-Day Finalization Plan

Date: 2026-05-23
Repo audited: `planevo`
Primary app: `apps/web`
Mobile app: `apps/mobile`

## Executive Verdict

Planevo has a strong wedge: a shame-free AI daily planner for students and high performers, with Canvas, Google Calendar, manual tasks, Bruno Chat, daily planning, billing, push scaffolding, and a mobile shell already present.

It is not launch-ready yet. The app can compile, but the product is still below the reliability and trust bar set by Motion, Reclaim, Sunsama, Akiflow, Todoist, TickTick, and Morgen. The biggest issue is not "missing more features." The root issue is that Planevo's core promise is split across overlapping data paths, partially wired UI, stale schema, inconsistent plan types, unfinished mobile behavior, and weak verification.

Current market-readiness score: 52/100
Expected score after this 14-day plan: 78/100 to 82/100

Planevo can compete if v1 becomes brutally reliable at one thing:

> Pull in a student's real work, understand their calendar, produce a trustworthy daily plan, and recover calmly when the day changes.

Do not widen scope before this works.

## Diagnostics Run

Codebase and structure:

- Enumerated repo files with `rg --files`.
- Web app surface: 213 files under `apps/web`.
- Mobile app surface: 37 files under `apps/mobile`.
- Found 1 test file: `apps/mobile/components/__tests__/StyledText-test.js`.
- Confirmed many modified files in git status under `apps/web`; this plan assumes a dirty worktree and avoids recommending blind rewrites.

Build and type checks:

- `npm.cmd run build --workspace planevo`: passes after allowing network access for Google Fonts.
- Build warnings:
  - Next.js `middleware` convention is deprecated in favor of `proxy`.
  - Sentry `disableLogger` is deprecated.
  - Sentry `automaticVercelMonitors` is deprecated.
  - Build depends on external Google Fonts fetch unless fonts are vendored or available during build.
- `npx.cmd tsc --noEmit --project apps/web/tsconfig.json`: passes.
- `npx.cmd tsc --noEmit --project apps/mobile/tsconfig.json`: passes.

Lint:

- `npm.cmd run lint --workspace planevo`: fails.
- 6 errors, 85 warnings.
- Hard errors are in `apps/web/app/dashboard/page.tsx`:
  - React hook rule: synchronous `setState` in effect.
  - Multiple unescaped apostrophe errors.
- Warnings include unused variables and widespread `any`.

Security and dependency checks:

- `npm.cmd audit --workspaces --audit-level=moderate`: fails with 25 vulnerabilities.
- High severity:
  - `next@16.2.4` advisories. Suggested fix: `next@16.2.6`.
  - `@xmldom/xmldom` via mobile/iOS tooling.
- Moderate severity:
  - `postcss`, `uuid`, `brace-expansion`, `ws`, and Expo transitive packages.
- `npm.cmd outdated --workspaces`: key updates available:
  - `next` 16.2.4 -> 16.2.6
  - `eslint-config-next` 16.2.4 -> 16.2.6
  - `@supabase/*` 2.105.4 -> 2.106.1
  - `date-fns` 4.1.0 -> 4.3.0
  - Expo SDK 54 is behind latest SDK 56, but that is a larger mobile migration and should not be forced inside the web launch window unless required by security/app store blockers.

Market research sources checked:

- Arahi AI, "Best Time Blocking Apps & Planners for 2026": https://arahi.ai/blog/best-time-blocking-apps-and-planners-2026
- TechRadar, "Best time management app of 2026": https://www.techradar.com/best/best-time-management-solution
- Aftertone, "Best Time-Blocking Apps in 2026": https://www.aftertone.io/guides/best-time-blocking-apps-2026
- Aftertone, "Best AI Time Blocking Apps in 2026": https://www.aftertone.io/guides/best-ai-time-blocking-apps
- Keelify, "The 9 best mindful productivity apps in 2026": https://keelify.com/blog/best-mindful-productivity-apps-2026
- G2 time management/time attendance category pages: https://www.g2.com/software/time-attendance

## 2026 Market Bar

The market is no longer impressed by "AI planner" alone. Users compare against mature products:

- Motion: full AI auto-scheduling, project management, volatile calendar handling.
- Reclaim: defended focus time, habits, smart rescheduling, team calendar intelligence.
- Sunsama: guided daily ritual, calm planning, high trust.
- Akiflow: fast capture, command bar, many integrations, calendar-task workflow.
- Todoist: reliable task capture, filters, recurring tasks, cross-platform trust.
- TickTick: low-cost tasks, habits, Pomodoro, calendar value.
- Morgen: unified calendar/task workspace.

Minimum v1 bar for Planevo:

- Fast capture: user can add a task in under 5 seconds.
- Trustworthy scheduling: no duplicates, no scheduling over hard calendar blocks, no accidental "complete" state.
- Calendar clarity: users understand what Planevo reads, what it writes, and what stays private.
- Recovery loop: missed work rolls forward without shame and without losing context.
- Mobile utility: the phone experience must show next action, daily plan, notifications, and chat reliably.
- Pricing honesty: sell only working features.
- Privacy confidence: school tokens, calendar tokens, billing, and AI data flows must be clear and secure.

## Current Product Strengths

Planevo already has:

- A clear emotional angle: shame-free recovery instead of guilt-based planning.
- A student wedge through Canvas.
- Google Calendar OAuth and sync scaffolding.
- AI daily plan endpoint with schema validation.
- Bruno Chat with function calls for task create/reschedule/complete/delete.
- Supabase RLS across main tables.
- Stripe Checkout, Portal, and webhook scaffolding.
- Mobile Daily Plan and Chat screens.
- Push notification and widget scaffolding.
- Sentry and PostHog integration points.
- Feature flag file to keep scope contained.
- A thoughtful strategy document.

These are real assets. The problem is that several are not production-solid yet.

## Ranked Weak Points And Root Fixes

### P0: Core Planning State Is Fragmented

Evidence:

- Daily Plan writes to `calendar_events`, `schedules`, and `current_day_plan`.
- `current_day_plan` is referenced in `apps/web/app/dashboard/daily-plan/page.tsx`, but it is not present in `apps/web/lib/supabase/schema.sql` or visible migration files.
- Ghost blocks live in `calendar_events`; saved plans live in `schedules`; dashboard reads `schedules`; daily plan page may replace schedule state with ghost blocks.
- Calendar page has a separate "Auto-schedule" path that simply fills 9 AM to 5 PM slots and marks tasks completed when scheduled.

Root cause:

There is no single source of truth for "the user's plan for today." Different pages are acting like owners.

Fix:

- Choose one canonical planning model:
  - `calendar_events` owns scheduled blocks.
  - `schedules` is either a historical snapshot only or removed from live UI.
  - `current_day_plan` is either created with a proper migration or removed.
- Never mark a task complete just because it was scheduled.
- Define lifecycle statuses:
  - `pending_ai`
  - `accepted`
  - `confirmed`
  - `completed`
  - `skipped`
  - `rescheduled`
  - `rejected`
- Dashboard, Daily Plan, Calendar, Mobile, Widget, and Notifications must all read the same source.

Acceptance criteria:

- Generate a plan once, refresh every page, and see the same blocks.
- Accept a block, refresh, and it remains accepted.
- Drag a block on Calendar, return to Dashboard, and next action updates.
- Scheduling a task does not set `completed=true`.

### P0: Build Passes But Lint Fails

Evidence:

- `npm.cmd run lint --workspace planevo` fails with 6 errors.
- Most hard errors are in `apps/web/app/dashboard/page.tsx`.

Root cause:

The repo has no enforced pre-merge quality gate, and React 19 lint rules are catching patterns that were allowed before.

Fix:

- Fix dashboard lint errors.
- Add `typecheck` scripts for web, mobile, and root.
- Add `check` script that runs lint, typecheck, and build.
- Make lint zero-error a launch gate.

Acceptance criteria:

- `npm.cmd run lint --workspace planevo` exits 0.
- `npm.cmd run build --workspace planevo` exits 0.
- `npx.cmd tsc --noEmit --project apps/web/tsconfig.json` exits 0.
- `npx.cmd tsc --noEmit --project apps/mobile/tsconfig.json` exits 0.

### P0: Dependency Security Must Be Patched

Evidence:

- `npm audit` reports 25 vulnerabilities, including high-severity advisories for Next.js.

Root cause:

Core framework and Expo transitive packages are behind current security fixes.

Fix:

- Patch web first:
  - `next` 16.2.4 -> 16.2.6.
  - `eslint-config-next` 16.2.4 -> 16.2.6.
  - Patch `postcss` via safe updates.
- Run `npm audit fix` for non-breaking fixes.
- Review mobile Expo transitive advisories separately; do not blindly force Expo 56 unless the app still builds and runs.

Acceptance criteria:

- `npm audit --workspaces --audit-level=high` exits 0, or remaining high issues are documented as dev-only/mobile-build-only with mitigation.

### P0: Schema And Migrations Are Out Of Sync

Evidence:

- `schema.sql` still constrains `users.plan_type` to `free`, `pro`, `team`, `elite`.
- Later migration v10 uses canonical plan types: `free`, `trialing`, `premium`, `student`, `canceled`, `admin`.
- `schema.sql` lacks later columns such as Stripe fields, push fields, `calendar_events.status`, `calendar_events.is_ai_suggested`, `energy_level`, `canvas_assignments.external_id`, and possibly `current_day_plan`.
- `schema.sql` still defines `handle_new_user()` without `SET search_path`, while strategy says this was hardened.

Root cause:

Migrations evolved, but the baseline schema was not regenerated.

Fix:

- Create one canonical launch schema or a numbered migration v11 that reconciles all deployed fields.
- Regenerate `types/database.ts` from the actual Supabase schema.
- Add migration checklist to the launch runbook.

Acceptance criteria:

- Fresh database can be created from migrations and run all app paths.
- Existing database can apply migrations idempotently.
- App no longer references tables or columns missing from migrations.

### P0: Pricing And Subscription Logic Is Inconsistent

Evidence:

- Strategy says one plan: monthly, annual, student, trial.
- Middleware checks legacy `pro_monthly`, `pro_annual`, `trialing`, `premium`.
- `schema.sql` still allows `pro`, `team`, `elite`.
- Sidebar treats `student` as premium but middleware does not include `student`.
- Stripe price env vars use non-null assertions and can fail late.

Root cause:

Pricing model changed but auth gates, schema, and UI were not fully normalized.

Fix:

- Use `normalizePlanType()` everywhere:
  - middleware
  - dashboard layout
  - subscription hook
  - sidebar
  - API gates
- Include `student` as active.
- Validate Stripe env vars at startup or route entry with helpful errors.
- Add webhook idempotency by storing processed Stripe event IDs.

Acceptance criteria:

- Trialing, premium, student, canceled, free, and admin all route correctly.
- A student plan user is not incorrectly sent back to onboarding.
- Stripe webhook replays do not create duplicate or inconsistent state.

### P0: AI Scheduling Claims Exceed Actual Reliability

Evidence:

- Daily Plan uses AI and writes ghost blocks.
- Calendar Auto-schedule does not use the AI planner; it fills tomorrow from 9 AM to 5 PM and marks tasks complete.
- Bruno Chat prompt says unsupported integrations like N8N, GitHub, and Slack are available on Premium, contradicting strategy and registry status.
- Task breakdown button points to a disabled path and tells users to ask chat.
- Feedback loop mostly updates status; it does not fully train memory or store correction data.

Root cause:

AI features were consolidated, but old UI promises and alternate scheduling paths survived.

Fix:

- Remove or replace the calendar Auto-schedule implementation with the same scheduling engine used by Daily Plan.
- Add calendar event tools to Bruno Chat:
  - create calendar block
  - move calendar block
  - accept/reject suggested block
  - create micro-steps for a task
- Remove claims for unavailable integrations.
- Store accept/reject feedback in `ai_feedback` and update `user_ai_memory`.
- Only consume AI quota after request validation and ideally after a useful response.
- Use `gpt-4o-mini` by default and escalate only when tool complexity requires it.

Acceptance criteria:

- Chat can actually move a scheduled block, not just task due dates.
- "Break down this task" works from task cards.
- AI feedback changes future plans.
- Unsupported integration claims are gone.

### P0: Google Calendar Sync Is Trust-Sensitive

Evidence:

- Google sync cleans and inserts future Google events because there is no unique constraint on `(user_id, external_id, source)`.
- Migration v10 creates index on `external_id`, but not a unique user/source key.
- Settings copy suggests secure storage and schedule ingestion; scopes are read-only.
- Disconnect clears user token but may leave imported Google events unless the user manually clears calendar.

Root cause:

Calendar sync was built as an ingestion path, not yet a trust-managed integration lifecycle.

Fix:

- Add unique constraint on `(user_id, source, external_id)` where `external_id IS NOT NULL`.
- Upsert Google events instead of delete-and-insert.
- On disconnect, soft-delete or hide Google-sourced events.
- Make copy clear:
  - reads event title/time/location
  - does not read attachments
  - does not write to Google Calendar unless write scope is added later
- Add sync status: last synced, event count, failure state.

Acceptance criteria:

- Repeated syncs do not duplicate events.
- Disconnect removes imported Google events from Planevo views.
- Users see when sync last succeeded.

### P1: Token Handling Needs A Launch-Grade Pass

Evidence:

- Encryption helper exists.
- Settings server action returns decrypted Canvas token to the client for editing.
- Mobile and web code check `canvas_token` presence directly.
- `schema.sql` stores token fields as plain text columns.

Root cause:

The app needs token usability for setup, but the current implementation can overexpose secrets to client state.

Fix:

- Never return full stored tokens to the browser after save.
- Show masked token only: `••••abcd`.
- Provide "replace token" flow.
- Keep server-side test/sync actions as the only places that decrypt.
- Confirm all token fields are encrypted before storage.
- Add token rotation instructions.

Acceptance criteria:

- Browser devtools never sees a stored Canvas token after initial submit.
- Settings can test, replace, and disconnect Canvas.

### P1: Onboarding Does Not Yet Deliver The Real "Aha"

Evidence:

- Onboarding has a polished multi-step flow.
- First plan screen is a sample preview with placeholder stats.
- It asks for integrations but can skip them and still reaches paywall.
- Strategy says never show an empty dashboard and first plan should be generated from real task data.

Root cause:

Onboarding is emotionally strong but not yet operationally tied to a real data pull.

Fix:

- If Canvas/Google are connected, generate first real plan before paywall.
- If skipped, create a guided sample task and generate a real internal plan from that.
- Show exact value:
  - assignments found
  - calendar blocks found
  - tasks scheduled
  - conflicts avoided
- Save onboarding completion only after profile, preferences, and initial plan state are consistent.

Acceptance criteria:

- New user reaches Dashboard with at least one real next action or a deliberate sample plan.
- Onboarding works in under 90 seconds on mobile viewport.

### P1: UX Is Attractive But Not Yet Consistent Enough For A Productivity Tool

Evidence:

- Landing, Dashboard, Daily Plan, Calendar, Tasks, Settings, and Mobile use different density and visual conventions.
- Some UI uses large editorial cards where a repeated-use productivity app needs compact control.
- Calendar sidebar is hidden on smaller screens.
- Onboarding uses fixed `720px` by `960px` shell.
- Some controls use text where icons/tooltips would reduce clutter.
- Several settings rows are read-only but look clickable.

Root cause:

The design evolved through multiple concepts instead of one stable product shell.

Fix:

- Create one v1 design contract:
  - dashboard is command center
  - daily plan is plan editor
  - calendar is timeline editor
  - tasks is backlog/capture
  - settings is integration/account control
- Standardize:
  - button radius
  - typography scale
  - card usage
  - empty states
  - loading states
  - destructive action confirmations
- Make mobile web and native mobile paths first-class.
- Add accessibility pass:
  - focus states
  - aria labels
  - keyboard calendar actions
  - contrast
  - reduced motion handling

Acceptance criteria:

- A new user can identify "what should I do now?" within 5 seconds.
- All core flows work at 390px, 768px, and desktop widths.

### P1: Mobile App Is Not Yet A Real Launch Companion

Evidence:

- Mobile Daily Plan and Chat exist.
- API defaults to `http://localhost:3000`.
- `app.json` still uses `planpilot` scheme, bundle ID, and app group.
- Mobile settings toggles are mostly not wired.
- Mobile lacks onboarding and billing.
- Only one template-style test exists.

Root cause:

Mobile is a useful prototype but not fully productized.

Fix:

- Rename all mobile identifiers to Planevo:
  - scheme
  - bundle ID
  - app group
  - widget group
  - Android package if intended.
- Require `EXPO_PUBLIC_API_URL` for non-dev builds.
- Add mobile onboarding continuation or block app until web onboarding is complete.
- Wire notifications toggle to `registerForPushNotifications()`.
- Add mobile settings actions for sync, disconnect, and account.
- Add Expo build smoke checklist.

Acceptance criteria:

- Production mobile build cannot point at localhost.
- User can log in, view today's plan, chat, receive notifications, and see widget data.

### P1: Retention Features Are Half Wired

Evidence:

- Weekly review API and cron route exist.
- Push notification route and Expo notification registration exist.
- Deadline rescue cron exists.
- Dashboard has "Bruno noticed."
- Feedback storage exists but is not consistently used.

Root cause:

Retention loops exist as parts, not as an instrumented lifecycle.

Fix:

- Define event triggers:
  - plan generated
  - plan accepted
  - task completed
  - task slipped
  - rollover happened
  - weekly review sent
  - notification opened
- Make weekly review email only send when enough data exists.
- Make push notifications opt-in and explain value.
- Store notification preferences.

Acceptance criteria:

- A user who creates a plan and misses a task gets one useful recovery nudge.
- Weekly review is not spammy and contains real stats.

### P1: Observability Is Not Actionable Yet

Evidence:

- Sentry and PostHog are installed.
- AI latency diagnostics exist.
- No clear event taxonomy or dashboard thresholds.
- No CI gate.

Root cause:

Instrumentation was added before launch metrics were defined.

Fix:

- Define product analytics events:
  - signup_started
  - onboarding_completed
  - canvas_connected
  - google_connected
  - plan_generated
  - plan_accepted
  - plan_regenerated
  - task_completed
  - chat_tool_used
  - checkout_started
  - subscription_active
- Define reliability alerts:
  - AI route 5xx
  - Google sync failure
  - Stripe webhook failure
  - cron failure
  - plan generation latency above 8s
- Update deprecated Sentry config.

Acceptance criteria:

- Founder can answer D1 retention, D7 retention, trial conversion, and plan generation success rate from dashboards.

### P2: Scope Creep Is Still Visible

Evidence:

- Registry lists Notion, Slack, Monday as coming soon.
- n8n webhook still exists.
- Archived focus, habits, projects, and advanced AI routes remain in repo.
- Chat prompt mentions Premium unsupported integrations.

Root cause:

The strategy says narrow, but the product still hints at a bigger platform.

Fix:

- Hide coming-soon integrations from v1 UI unless used for email capture.
- Remove unsupported integration claims from AI prompts.
- Keep archive folders but ensure they cannot become routes or public UI.
- Replace "Premium plan includes unsupported integrations" with "Not available yet."

Acceptance criteria:

- A user only sees features that work today.

## What Is Missing To Match The Market

Must add or finish for v1:

- Single source of truth for daily plan blocks.
- Reliable conflict-aware scheduling.
- Accept/reject/edit loop for AI blocks.
- Fast task capture from dashboard and tasks page.
- Recurring task basics.
- Undo for destructive actions.
- Real first plan in onboarding.
- Real push notification opt-in and morning reminder.
- Mobile production configuration.
- Security patching.
- CI/check scripts.
- Legal docs beyond stubs.
- Analytics for activation and retention.

Should not add in the next two weeks:

- Team/collaboration.
- Study groups.
- Notion, Slack, Monday.
- More AI endpoints.
- Habits page.
- Goal architect page.
- Full project management.
- Complex themes/personas.
- Free forever tier.

## What Is Weighing The App Down

Remove, hide, or defer:

- Calendar Auto-schedule implementation that does not use the real scheduler.
- Any code path that marks tasks complete when they are merely scheduled.
- `current_day_plan` unless a real migration exists.
- Unsupported "Premium integrations" claims.
- Visible coming-soon integrations in v1 Settings.
- Broken task breakdown button behavior.
- Duplicate AI scheduler copies between `apps/web/lib/ai` and `packages/core/src/ai` unless one package is truly shared.
- Old plan types in middleware and schema.
- Legal stubs before public launch.
- Mobile `planpilot` identifiers.
- Destructive "Start Fresh" actions without undo/export.

## 14-Day Finalization Plan

This plan assumes one focused developer/agent working full time. If two agents are available, split into Product Reliability and UI/Mobile, but keep one owner for schema and data model.

### Day 1: Freeze Scope And Repair Baseline

Goals:

- Make the repo objectively checkable.
- Stop adding features.

Tasks:

- Create `npm` scripts:
  - root `typecheck`
  - root `check`
  - web `typecheck`
  - mobile `typecheck`
- Fix lint hard errors in `apps/web/app/dashboard/page.tsx`.
- Decide the canonical v1 plan source and document it at the top of this file or in `apps/web/ROADMAP.md`.
- Add a launch checklist file if none exists.
- Run and record:
  - lint
  - web typecheck
  - mobile typecheck
  - web build

Acceptance criteria:

- Build, typecheck, and lint all exit cleanly.
- No new feature work starts until P0 data model is clear.

### Day 2: Patch Security And Normalize Schema

Goals:

- Remove known high-risk dependency issues.
- Make database shape match app code.

Tasks:

- Upgrade `next` and `eslint-config-next` to 16.2.6.
- Run safe `npm audit fix`.
- Create migration v11:
  - canonical plan type constraint
  - missing Stripe columns
  - missing push columns
  - missing calendar ghost columns
  - missing `current_day_plan` or remove app references
  - `handle_new_user()` with `SET search_path = public`
  - unique constraint for Google events
- Regenerate `types/database.ts`.
- Update `schema.sql` to match latest launch state.

Acceptance criteria:

- `npm audit --workspaces --audit-level=high` has no unresolved production high issues.
- Fresh Supabase migration path is documented.

### Day 3: Fix Auth, Billing, And Plan Gates

Goals:

- Users route correctly.
- Stripe state is trustworthy.

Tasks:

- Use `normalizePlanType()` in:
  - `apps/web/lib/supabase/middleware.ts`
  - `apps/web/app/dashboard/layout.tsx`
  - `apps/web/components/dashboard/Sidebar.tsx`
  - `apps/web/hooks/use-subscription.ts`
- Ensure `student` is active.
- Validate Stripe price IDs before checkout.
- Add Stripe webhook idempotency table or event-log table.
- Implement robust handling for `customer.subscription.deleted` and `invoice.payment_failed` to downgrade users.
- Add tests or a documented manual matrix for:
  - free
  - trialing
  - premium
  - student
  - canceled
  - admin

Acceptance criteria:

- No active paid user is redirected to onboarding incorrectly.
- Canceled users are gated cleanly.

### Day 4: Make Integrations Trustworthy

Goals:

- Canvas and Google become reliable enough for launch.

Tasks:

- Canvas:
  - stop returning stored full token to client settings
  - add masked token display
  - add replace/disconnect flows
  - confirm encryption on write
- Google:
  - upsert by `(user_id, source, external_id)`
  - record `last_synced_at`
  - soft-delete source events on disconnect
  - show sync count and errors in Settings
- Remove Notion/Slack/Monday from visible v1 UI.

Acceptance criteria:

- Repeated sync does not duplicate events.
- Disconnect visibly removes connection state and imported events.

### Day 5: Unify Daily Plan State

Goals:

- One plan shows everywhere.

Tasks:

- Refactor Daily Plan generation to create or update canonical `calendar_events` blocks.
- Make `schedules` snapshots optional and read-only if kept.
- Remove `current_day_plan` usage or create it fully.
- Dashboard next action reads canonical blocks.
- Mobile next action reads canonical blocks.
- Accept/reject updates canonical status and writes feedback.

Acceptance criteria:

- Dashboard, Daily Plan, Calendar, and Mobile agree after refresh.
- No ghost block duplication.

### Day 6: Replace Weak Auto-Scheduling

Goals:

- Calendar scheduling does not damage trust.

Tasks:

- Remove current deterministic Calendar Auto-schedule or route it through `/api/ai/daily-plan`.
- Stop marking tasks complete on drop/schedule.
- Add conflict validation before insert/update.
- Add undo toast for drag, resize, delete, and schedule.
- Add recurring task minimum viable model:
  - daily
  - weekly
  - custom later

Acceptance criteria:

- Scheduling a backlog task creates a calendar block and keeps the task open until completed.
- Conflicts are blocked or shown as warnings.

### Day 7: Fix Tasks And Capture

Goals:

- Tasks become fast and useful, not a secondary demo.

Tasks:

- Add global quick capture from Dashboard and Tasks.
- Add keyboard-first capture.
- Fix source classification:
  - Canvas
  - Google Calendar
  - manual
  - AI suggested
- Rewire "break down" to Bruno Chat tool or remove button.
- Add undo for delete and start fresh.
- Make destructive actions name exactly what will be deleted.

Acceptance criteria:

- User can add a task in under 5 seconds.
- User can turn a task into a planned block without it disappearing.

### Day 8: Upgrade Bruno Chat From Task Bot To Planning Agent

Goals:

- Bruno can execute the actual core workflow.

Tasks:

- Add tools:
  - create_task
  - update_task
  - complete_task
  - create_calendar_block
  - move_calendar_block
  - accept_block
  - reject_block
  - break_down_task
- Remove unsupported integration claims from prompt.
- Use `gpt-4o-mini` default; escalate only for complex tool chains.
- Add strict API rate limiting (e.g. max 10 requests per hour per user) to protect OpenAI costs.
- Move quota consumption after validation.
- Add second-call timeout and retry handling.
- Persist tool result metadata for audit/debug.

Acceptance criteria:

- "Move my study block to 3 PM" changes the visible plan.
- "Break down my essay" creates subtasks or a structured answer attached to the task.

### Day 9: Product UX Polish Pass

Goals:

- Make the app feel coherent and efficient.

Tasks:

- Standardize shell spacing, buttons, cards, and empty states.
- Make dashboard answer one question: "What should I do now?"
- Make Daily Plan answer: "What is my plan and what changed?"
- Make Calendar answer: "Where does this fit?"
- Make Tasks answer: "What is in my backlog?"
- Improve mobile web breakpoints.
- Add accessible labels and keyboard paths.
- Add reduced-motion preference handling.

Acceptance criteria:

- Core workflows are usable at 390px, 768px, and desktop.
- Repeated-use app pages feel like a tool, not a landing page.

### Day 10: Mobile Launch Pass

Goals:

- Mobile becomes a credible companion.

Tasks:

- Rename mobile identifiers from `planpilot` to Planevo naming if launch identity is final.
- Require production `EXPO_PUBLIC_API_URL`.
- Implement graceful offline handling (error boundaries and "offline" UI states) for poor connectivity.
- Add onboarding/paywall guard.
- Wire notification toggle.
- Verify widget app group matches iOS config.
- Add mobile smoke tests for Daily Plan and Chat.
- Update app icons/splash if old brand remains.

Acceptance criteria:

- Mobile production build cannot call localhost.
- Daily Plan, Chat, Settings, notifications, and widget all run against production config.

### Day 11: Tests And CI

Goals:

- Stop regressions before launch.

Tasks:

- Add unit tests for:
  - plan type normalization
  - date gap finder
  - schedule conflict validation
  - task completion vs scheduling
  - Stripe plan mapping
- Add API tests with mocked Supabase/OpenAI for:
  - daily plan
  - chat tool calls
  - Google sync
  - Stripe webhook
- Add Playwright smoke tests:
  - signup/login mock or test user
  - dashboard loads
  - add task
  - generate plan
  - calendar shows block
  - chat creates task
- Add CI command:
  - install
  - lint
  - typecheck
  - test
  - build

Acceptance criteria:

- A single `npm.cmd run check` or CI workflow catches launch blockers.

### Day 12: Observability And Retention Loops

Goals:

- Make launch measurable.

Tasks:

- Add PostHog event taxonomy.
- Add Sentry tags for route, feature, plan type, auth method.
- Track AI latency and failures by feature.
- Wire weekly review only when enough user data exists.
- Wire deadline rescue with opt-in notification preference.
- Add dashboard for:
  - activation rate
  - plan generation success
  - AI error rate
  - trial conversion
  - D1/D7 retention

Acceptance criteria:

- Founder can tell whether users are activating without reading logs.

### Day 13: Legal, Copy, And Store Truthfulness

Goals:

- No public promise exceeds reality.

Tasks:

- Replace privacy, terms, and cookies stubs.
- Align landing page copy with actual v1:
  - Canvas
  - Google Calendar read
  - Daily Plan
  - No-Shame Rollover
  - Bruno Chat
  - Mobile if actually shipped
- Remove "coming soon" from pricing.
- Ensure domain is canonical:
  - `planevo.app` or `planevo.ai`, not both randomly.
- Add support/contact email.
- Implement an explicit In-App "Delete Account" button and route that wipes user data (App Store requirement).
- Add data export/delete instructions.

Acceptance criteria:

- Public pages only claim what works.
- Legal pages are no longer marked TODO.

### Day 14: Launch Rehearsal

Goals:

- Prove the whole app works with real-world flows.

Tasks:

- Seed test users:
  - new free user
  - trialing user
  - premium user
  - student user
  - canceled user
- Run full smoke test:
  - signup
  - onboarding
  - Canvas test
  - Google sync
  - task capture
  - daily plan
  - accept/reject block
  - drag calendar block
  - chat action
  - checkout
  - portal
  - webhook
  - notification
  - mobile next action
- Prepare rollback:
  - database backup
  - Vercel previous deployment
  - Stripe webhook replay plan
  - feature flag kill switch
- Invite first 10 beta users.

Acceptance criteria:

- No P0 bugs remain.
- Known P1 bugs are documented with owner and deadline.
- First beta users can complete onboarding and use a daily plan without founder intervention.

## Anti-Gravity Execution Pack

Use this as the handoff prompt for the next coding agent:

1. Read this file first.
2. Do not add new product scope.
3. Start with Day 1 and complete each day in order.
4. Before editing, inspect current file contents because the worktree is dirty.
5. After each day, run:
   - `npm.cmd run lint --workspace planevo`
   - `npx.cmd tsc --noEmit --project apps/web/tsconfig.json`
   - `npx.cmd tsc --noEmit --project apps/mobile/tsconfig.json`
   - `npm.cmd run build --workspace planevo`
6. Do not mark a task complete when scheduling it.
7. Do not expose stored Canvas or Google tokens to the client.
8. Do not show unsupported integrations in v1 UI.
9. Keep Bruno's public behavior aligned with actual tools.
10. If a fix requires a schema change, add an idempotent migration and update generated types.

## Launch Gates

Planevo should not launch publicly until:

- Lint passes.
- TypeScript passes for web and mobile.
- Production build passes.
- High-severity production audit issues are resolved or explicitly mitigated.
- Onboarding produces a real or deliberately seeded first plan.
- Dashboard, Daily Plan, Calendar, Mobile, and Widget share the same next-action source.
- Stripe checkout, portal, and webhook are verified.
- Canvas token is not returned to the browser after save.
- Google sync is idempotent.
- Legal pages are not stubs.
- Public copy does not promise unfinished features.
- Analytics can measure activation and retention.

## Final Positioning Recommendation

Do not compete head-on with Motion as "the best AI scheduler." That market is expensive and broad.

Compete as:

> The student-first AI planner that turns Canvas, calendar, and real life into one calm next action.

That is specific, believable, and differentiated. Once that wedge is loved, expand to builders and professionals.
