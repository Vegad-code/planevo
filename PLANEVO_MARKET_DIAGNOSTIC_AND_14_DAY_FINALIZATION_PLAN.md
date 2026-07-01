# Planevo Market Diagnostic And 14-Day Finalization Plan

> **Historical document — May 2026.** Scores, commands, and positioning in this file are point-in-time.  
> **Current product truth:** [`apps/web/STRATEGY.md`](apps/web/STRATEGY.md), [`README.md`](README.md).  
> Positioning has since shifted to **availability-aware daily planning** and **Adaptive Day Rollover** (not shame-free / AI-first brand).

Date: 2026-05-23
Repo audited: `planevo`
Primary app: `apps/web`
Mobile app: `apps/mobile`

## Executive Verdict

Planevo has a strong wedge: an availability-aware daily planner for students and high performers, with Canvas, Google Calendar, manual tasks, Bruno Chat, daily planning, billing, push scaffolding, and a mobile shell already present.

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
- Recovery loop: missed work rolls forward via **Adaptive Day Rollover** without losing context.
- Mobile utility: the phone experience must show next action, daily plan, notifications, and chat reliably.
- Pricing honesty: sell only working features.
- Privacy confidence: school tokens, calendar tokens, billing, and AI data flows must be clear and secure.

## Current Product Strengths

Planevo already has:

- A clear product angle: **adaptive day recovery** when schedules slip (historical doc also referenced shame-free framing — superseded).
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
- Habits page — **vaulted**.
- Goal architect page — **vaulted**.
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
  - Adaptive Day Rollover
  - Bruno Chat
  - Mobile if actually shipped
- Remove "coming soon" from pricing.
- Ensure domain is canonical:
  - `planevo.app` or `planevo.ai`, not both randomly.
- Add support/contact email.
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

---

## Free Tier Product Definition

### What The Free Tier Is

The free tier is the permanent, assembled version of Planevo for users who are not ready to pay. It is not a nag screen. It is a genuinely useful product that shows the core loop without giving away the AI depth that justifies the subscription.

When a trial ends, the user is automatically downgraded to free. No payment required to stay on free. The Stripe webhook for `customer.subscription.deleted` and `customer.subscription.trial_end` must set `plan_type = 'free'` in the `users` table, not `'canceled'`. Canceled only applies when a previously paying user explicitly cancels a paid subscription.

This distinction matters: a user who never paid and whose trial expired is `free`, not `canceled`. A user who paid and then canceled is `canceled`. These gate differently in middleware.

### Free Tier Feature Set

Task management:
- Unlimited task creation.
- Dashboard shows the 5 most urgent tasks only. A soft wall ("+ 12 more tasks — upgrade to see all") appears below.
- Tasks can be created, completed, and deleted.
- No recurring tasks on free.
- No AI task breakdown on free.
- Source labels (Canvas, manual) are visible.

Daily plan:
- 1 AI-generated daily plan per week (Sunday reset).
- Remaining AI plan generations show a counter: "1 AI plan used this week. Resets Sunday or upgrade for unlimited."
- After the weekly quota is used, the user can still manually drag tasks into a time slot on the calendar.
- Accepted/rejected plan blocks are saved normally so the data model stays consistent.

Bruno Chat:
- 5 messages per day. Counter visible in chat header.
- Bruno uses `gpt-4o-mini` only on free. No tool escalation.
- Bruno can answer questions and create/complete tasks only.
- Bruno cannot move calendar blocks, break down tasks, or accept/reject plan blocks on free.
- After 5 messages, Bruno says: "You've used your 5 free messages today. Upgrade for unlimited planning conversations."

Calendar:
- Full read view of scheduled blocks.
- Cannot drag-reschedule blocks on free. Drag triggers an upgrade prompt.
- Can see Google Calendar events if connected (read sync is cheap).
- Cannot write new calendar blocks from the calendar view on free.

Integrations:
- Google Calendar sync: allowed on free. Read-only. Sync runs once on connect and on manual refresh. No background scheduled sync.
- Canvas LMS sync: not available on free. Settings show the Canvas section with "Available on premium" badge.
- No widget on free.
- No push notification scheduling on free (user can still get account emails).

Weekly review:
- Not sent on free.
- Settings show the toggle grayed out with an upgrade prompt.

Mobile:
- Daily Plan screen shows the current plan (read-only on free beyond 5 tasks).
- Chat screen works with the same 5-message-per-day limit.
- Notification toggle visible but shows "Upgrade to enable smart reminders."

Referral program:
- Free users can still share referral links. A successful referral that converts to a paid plan awards the referrer 14 days of premium, not a cash payout. This gives free users a real incentive to share without costing cash.

Onboarding:
- Free users complete the same onboarding flow as trial users.
- The paywall step shows a 7-day free trial offer. If they skip it, they land on free immediately.
- The first plan is still generated (this is the aha moment — do not skip it).
- After onboarding, the dashboard shows a persistent but non-blocking banner: "7-day free trial available. Try all features."

### Free Tier Cost Model

The only costs Planevo absorbs for a free user:

- 1 AI plan per week × `gpt-4o-mini` at ~$0.0002 per plan call = under $0.01/month/user.
- 5 Bruno messages per day × 30 days × `gpt-4o-mini` = under $0.08/month/user at average token usage.
- Google Calendar sync on connect = negligible API cost.
- Supabase storage and row reads = covered by Supabase free tier at small scale.

Total estimated free user cost: under $0.10/month/user. A free user who refers 1 converting paid user ($10/month) covers 100 free users. The math works.

### Free Tier Schema Changes Required

Add to migration v11 (or a new migration v12 if v11 is already shipped):

```sql
-- Weekly AI plan quota tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_plans_used_this_week INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_plans_week_reset_at TIMESTAMPTZ DEFAULT date_trunc('week', now());

-- Bruno message daily quota tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS bruno_messages_today INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bruno_messages_reset_at DATE DEFAULT CURRENT_DATE;
```

A Supabase cron job or the API route itself checks and resets these counters. Do not rely on client-side state for quota enforcement.

### Free Tier Feature Flag Integration

Update `apps/web/lib/featureFlags.ts` to add plan-aware flags:

```typescript
export function isPlanActive(planType: string): boolean {
  return ['trialing', 'premium', 'student', 'admin'].includes(planType);
}

export function isFreeUser(planType: string): boolean {
  return planType === 'free';
}

export const FREE_TIER_LIMITS = {
  AI_PLANS_PER_WEEK: 1,
  BRUNO_MESSAGES_PER_DAY: 5,
  DASHBOARD_TASKS_VISIBLE: 5,
} as const;
```

### Middleware Gate For Free Tier

The current middleware (`apps/web/lib/supabase/middleware.ts`) only gates on `isActive`. Add a free tier pass-through so free users can access the dashboard without being forced to the pricing page:

```typescript
const isFree = planType === 'free';
// Free users: allow dashboard access, but feature components check plan internally.
// Do not redirect free users to /pricing — they are legitimate users.
```

### Upgrade Prompts

All upgrade prompts must:
- State the specific limit hit ("You've used your 1 free AI plan this week").
- Offer the 7-day trial CTA if the user has never trialed.
- Offer the direct checkout CTA if the user has already trialed.
- Never be modal-blocking. Use inline banners or sheet drawers.

---

## AI Anti-Gravity Model Assignment Matrix

Each day in the 14-day plan is assigned to one or more models. Assignments are based on task complexity, required reasoning depth, and token cost efficiency.

### Model Capability Reference

**Gemini 3 Flash Medium**
Use for: repetitive edits, lint fixes, type annotation corrections, one-file component tweaks, adding `aria-label` attributes, renaming identifiers, adding test file scaffolding, writing SQL migration boilerplate, and any task where the instruction is fully deterministic from the code context.
Do not use for: multi-file architectural decisions, auth logic, AI prompt design, security-sensitive paths.

**Gemini 3 Flash High (thinking enabled)**
Use for: medium-complexity refactors that touch 2–5 files, rewriting React hooks, updating API route validation, normalizing plan types across multiple files, adding PostHog event calls, replacing deprecated Sentry config, writing unit tests with logic, migration files with conditional ALTER TABLE statements.
Do not use for: schema design decisions, Bruno Chat tool design, data model unification, or anything that requires understanding the full product architecture.

**Gemini 3 Pro High (thinking enabled)**
Use for: the unified planning state design (Day 5), auth/billing gate normalization (Day 3), Bruno Chat tool upgrade (Day 8), Google sync upsert logic (Day 4), onboarding real plan generation (Day 9), and any task where the wrong decision creates a data integrity bug.
Do not use for: final architectural sign-off or launch rehearsal orchestration.

**Claude Opus 4.6**
Use for: Day 1 scope freeze decision and launch checklist authorship, Day 5 canonical plan model architectural decision, Day 8 Bruno system prompt rewrite, Day 11 Playwright smoke test design, Day 14 launch rehearsal orchestration and final gate review. Claude Opus 4.6 is the review and sign-off model — it reads the output of other models and confirms correctness before the day is marked done.

### Day-by-Day Model Assignments

Day 1 — Freeze Scope And Repair Baseline:
- Fix lint errors in `apps/web/app/dashboard/page.tsx`: **Gemini 3 Flash Medium**
- Add npm scripts (`typecheck`, `check`): **Gemini 3 Flash Medium**
- Authoring launch checklist and documenting canonical plan source decision: **Claude Opus 4.6**
- Day review and gate check: **Claude Opus 4.6**

Day 2 — Patch Security And Normalize Schema:
- `npm audit fix` and dependency upgrades: **Gemini 3 Flash Medium**
- Writing migration v11 SQL (all missing columns, constraints, `handle_new_user` search_path): **Gemini 3 Flash High**
- Regenerating `types/database.ts` from schema: **Gemini 3 Flash Medium**
- Schema design decisions (which columns are canonical, unique constraint design): **Gemini 3 Pro High**
- Day review: **Claude Opus 4.6**

Day 3 — Fix Auth, Billing, And Plan Gates:
- Implementing `normalizePlanType()` across middleware, layout, sidebar, hook: **Gemini 3 Flash High**
- Stripe webhook idempotency table design: **Gemini 3 Pro High**
- Free tier middleware gate pass-through: **Gemini 3 Flash High**
- Trial-end → free downgrade webhook handler: **Gemini 3 Pro High**
- Day review: **Claude Opus 4.6**

Day 4 — Make Integrations Trustworthy:
- Canvas token masking and replace flow: **Gemini 3 Flash High**
- Google sync upsert logic and `last_synced_at`: **Gemini 3 Pro High**
- Soft-delete on disconnect: **Gemini 3 Flash High**
- Removing Notion/Slack/Monday from visible UI: **Gemini 3 Flash Medium**
- Day review: **Claude Opus 4.6**

Day 5 — Unify Daily Plan State:
- Architectural decision on canonical model: **Claude Opus 4.6** (must go first)
- Refactoring daily plan generation to canonical `calendar_events`: **Gemini 3 Pro High**
- Dashboard next action reading canonical blocks: **Gemini 3 Flash High**
- Mobile next action reading canonical blocks: **Gemini 3 Flash High**
- Accept/reject writing to canonical status and feedback: **Gemini 3 Flash High**
- Day review: **Claude Opus 4.6**

Day 6 — Replace Weak Auto-Scheduling:
- Removing or routing deterministic auto-schedule through AI planner: **Gemini 3 Pro High**
- Conflict validation before insert/update: **Gemini 3 Flash High**
- Undo toast for drag, resize, delete: **Gemini 3 Flash Medium**
- Recurring task minimal model: **Gemini 3 Flash High**
- Day review: **Claude Opus 4.6**

Day 7 — Fix Tasks And Capture:
- Global quick capture component: **Gemini 3 Flash High**
- Keyboard-first capture: **Gemini 3 Flash Medium**
- Source classification fix: **Gemini 3 Flash Medium**
- Rewire or remove task breakdown button: **Gemini 3 Flash Medium**
- Undo for delete and start fresh: **Gemini 3 Flash High**
- Free tier task limit (5 visible in dashboard): **Gemini 3 Flash Medium**
- Day review: **Claude Opus 4.6**

Day 8 — Upgrade Bruno Chat:
- Bruno system prompt rewrite (remove unsupported integrations, align with actual tools): **Claude Opus 4.6**
- Adding `create_calendar_block`, `move_calendar_block`, `accept_block`, `reject_block`, `break_down_task` tools: **Gemini 3 Pro High**
- Moving quota consumption after validation: **Gemini 3 Flash High**
- Free tier Bruno message quota enforcement (5/day): **Gemini 3 Flash High**
- Timeout and retry handling: **Gemini 3 Flash High**
- Day review: **Claude Opus 4.6**

Day 9 — Product UX Polish Pass:
- Standardizing spacing, buttons, cards, empty states across all dashboard pages: **Gemini 3 Flash High**
- Mobile web breakpoints: **Gemini 3 Flash Medium**
- Accessible labels and keyboard paths: **Gemini 3 Flash Medium**
- Reduced-motion preference: **Gemini 3 Flash Medium**
- Upgrade prompt components for free tier walls: **Gemini 3 Flash High**
- Day review: **Claude Opus 4.6**

Day 10 — Mobile Launch Pass:
- Renaming mobile identifiers from `planpilot` to Planevo: **Gemini 3 Flash Medium**
- Requiring production `EXPO_PUBLIC_API_URL`: **Gemini 3 Flash Medium**
- Onboarding/paywall guard in mobile: **Gemini 3 Flash High**
- Wiring notification toggle: **Gemini 3 Flash High**
- Widget app group verification: **Gemini 3 Pro High**
- Day review: **Claude Opus 4.6**

Day 11 — Tests And CI:
- Unit test scaffolding (plan type normalization, date gap finder, conflict validation): **Gemini 3 Flash High**
- API tests with mocked Supabase/OpenAI: **Gemini 3 Pro High**
- Playwright smoke test design and implementation: **Claude Opus 4.6** (smoke test strategy) + **Gemini 3 Flash High** (implementation)
- CI command setup: **Gemini 3 Flash Medium**
- Day review: **Claude Opus 4.6**

Day 12 — Observability And Retention Loops:
- PostHog event taxonomy implementation: **Gemini 3 Flash High**
- Sentry tags for route, feature, plan type: **Gemini 3 Flash Medium**
- Weekly review conditional send logic: **Gemini 3 Flash High**
- Deadline rescue notification wiring: **Gemini 3 Flash High**
- Day review: **Claude Opus 4.6**

Day 13 — Legal, Copy, And Store Truthfulness:
- Replacing privacy/terms/cookies stubs: **Gemini 3 Flash Medium** (integrate policies generated via Termly/Iubenda based on finalized features, cookies, and tracking from prior days)
- Aligning landing page copy: **Claude Opus 4.6** (copy must be precise and honest)
- Removing coming-soon from pricing: **Gemini 3 Flash Medium**
- Sitemap and robots.txt: **Gemini 3 Flash Medium**
- Day review: **Claude Opus 4.6**

Day 14 — Launch Rehearsal:
- Seeding test users: **Gemini 3 Flash Medium**
- Full smoke test run and reporting: **Claude Opus 4.6** (orchestrates, evaluates results)
- Rollback plan documentation: **Claude Opus 4.6**
- Go/no-go decision: **Claude Opus 4.6**

---

## Per-Day Structural Blueprint

This section gives each agent the exact file paths to read, modify, and create for each day. Agents must read listed files before editing. The worktree is dirty — never assume a file's current state matches the plan description.

### Day 1 Structural Blueprint

Files to read first:
- `apps/web/app/dashboard/page.tsx` (contains lint hard errors)
- `apps/web/package.json` (add typecheck and check scripts)
- `package.json` at monorepo root (add root-level scripts)

Files to modify:
- `apps/web/app/dashboard/page.tsx`: fix React hook rule violation (move synchronous `setState` out of `useEffect` by using a ref or initializer pattern, not a workaround). Fix unescaped apostrophes by replacing `'` with `&apos;` or extracting to a variable.
- `apps/web/package.json`: add `"typecheck": "tsc --noEmit"` and `"check": "npm run lint && npm run typecheck && npm run build"`.
- `package.json` (root): add `"typecheck": "npm run typecheck --workspace planevo"` and `"check": "npm run check --workspace planevo"`.

Files to create:
- `LAUNCH_CHECKLIST.md` at repo root documenting: lint gate, typecheck gate, build gate, audit gate, schema gate, integration test matrix, legal gate, analytics gate.

Canonical plan source decision to document before any Day 2+ work:
- `calendar_events` is the canonical source for all scheduled blocks.
- `schedules` table becomes snapshot/history only — no live UI reads from it.
- `current_day_plan` is removed from app code if no migration creates it, or a migration v11 creates it properly.

### Day 2 Structural Blueprint

Files to read first:
- `apps/web/lib/supabase/schema.sql`
- `apps/web/lib/supabase/migration_v10_ghost_blocks_and_plan_types.sql`
- All prior migration files to understand cumulative state.
- `apps/web/types/database.ts`

Files to create:
- `apps/web/lib/supabase/migration_v11_launch_hardening.sql`:
  ```sql
  -- Idempotent: safe to run multiple times
  
  -- 1. Canonical plan type constraint
  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_plan_type_check;
  ALTER TABLE users ADD CONSTRAINT users_plan_type_check
    CHECK (plan_type IN ('free', 'trialing', 'premium', 'student', 'canceled', 'admin'));
  
  -- 2. Missing Stripe columns (if not present)
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_period_end TIMESTAMPTZ;
  
  -- 3. Missing push columns
  ALTER TABLE users ADD COLUMN IF NOT EXISTS push_token TEXT;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS push_enabled BOOLEAN DEFAULT false;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{}';
  
  -- 4. Calendar ghost block columns
  ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'confirmed'
    CHECK (status IN ('pending_ai', 'accepted', 'confirmed', 'completed', 'skipped', 'rescheduled', 'rejected'));
  ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS is_ai_suggested BOOLEAN DEFAULT false;
  ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS energy_level TEXT;
  
  -- 5. Google sync unique constraint
  ALTER TABLE calendar_events DROP CONSTRAINT IF EXISTS calendar_events_user_source_external_id_key;
  ALTER TABLE calendar_events ADD CONSTRAINT calendar_events_user_source_external_id_key
    UNIQUE (user_id, source, external_id)
    DEFERRABLE INITIALLY DEFERRED;
  -- (WHERE external_id IS NOT NULL — use partial index if constraint won't accept NULLs)
  
  -- 6. Canvas external_id
  ALTER TABLE canvas_assignments ADD COLUMN IF NOT EXISTS external_id TEXT;
  
  -- 7. Free tier quota columns
  ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_plans_used_this_week INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS ai_plans_week_reset_at TIMESTAMPTZ DEFAULT date_trunc('week', now());
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bruno_messages_today INTEGER DEFAULT 0;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS bruno_messages_reset_at DATE DEFAULT CURRENT_DATE;
  
  -- 8. Stripe webhook idempotency
  CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    processed_at TIMESTAMPTZ DEFAULT now()
  );
  
  -- 9. Fix handle_new_user search_path
  CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
  AS $$
  BEGIN
    INSERT INTO public.users (id, email, full_name, avatar_url, plan_type, onboarding_complete)
    VALUES (
      new.id,
      new.email,
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'avatar_url',
      'free',
      false
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
  $$;
  ```

Files to modify:
- `apps/web/types/database.ts`: regenerate from Supabase CLI: `npx supabase gen types typescript --local > apps/web/types/database.ts`. If local Supabase is not running, manually add the new columns to the type definitions.
- `apps/web/lib/supabase/schema.sql`: update the baseline to reflect the state after v11.

### Day 3 Structural Blueprint

Files to read first:
- `apps/web/lib/supabase/middleware.ts` (contains stale `isActive` logic)
- `apps/web/app/dashboard/layout.tsx`
- `apps/web/components/dashboard/Sidebar.tsx`
- `apps/web/hooks/use-subscription.ts`
- `apps/web/lib/stripe.ts` (contains `subscriptionStatusToPlanType`)
- `apps/web/app/api/stripe/webhook/route.ts`

Files to modify:
- `apps/web/lib/stripe.ts`: add `normalizePlanType(rawPlanType: string): PlanType` that maps legacy strings (`pro_monthly`, `pro_annual`, `pro`, `team`, `elite`) to canonical values. Add free tier pass-through: `free` returns `free` not `canceled`.
- `apps/web/lib/supabase/middleware.ts`: replace inline `isActive` check with `normalizePlanType` + a new `isPlanAllowed(planType)` function. Add free tier pass-through so free users reach `/dashboard` without redirect to `/pricing`. The only users who should be sent to `/pricing` are those with `plan_type = 'canceled'` who are past their grace period — not free users.
- `apps/web/app/dashboard/layout.tsx`: use `normalizePlanType` when reading plan from profile.
- `apps/web/components/dashboard/Sidebar.tsx`: use `normalizePlanType`. Show upgrade CTA for free users instead of hiding premium features entirely.
- `apps/web/hooks/use-subscription.ts`: use `normalizePlanType`. Expose `isFree`, `isPremium`, `isTrialing` booleans.
- `apps/web/app/api/stripe/webhook/route.ts`: add idempotency check against `stripe_events` table. Add `trial_will_end` handler that sends a reminder email 3 days before trial expires. Add `customer.subscription.trial_end` handler that sets `plan_type = 'free'` (not `canceled`). Add `customer.subscription.deleted` handler that checks if user ever paid — if yes, sets `canceled`; if no (expired trial), sets `free`.

Files to create:
- `apps/web/lib/planType.ts`: single canonical file for `normalizePlanType`, `isPlanActive`, `isFreeUser`, `FREE_TIER_LIMITS`. All other files import from here, not from stripe.ts or inline.

### Day 4 Structural Blueprint

Files to read first:
- `apps/web/lib/canvas.ts` or `apps/web/lib/canvas/` (Canvas token handling)
- `apps/web/lib/actions/` (settings server actions)
- `apps/web/app/dashboard/settings/page.tsx`
- `apps/web/lib/supabase/` (Google token storage)
- `apps/web/app/api/integrations/` (Google sync route)

Files to modify:
- Settings server actions: never return the full stored token value. Return only a masked version: take the last 4 characters of the decrypted token and return `••••${last4}`. The "replace token" flow sends a new token value; the "test token" flow decrypts server-side and pings Canvas API, returns only success/failure.
- Google sync route: change delete-then-insert to an upsert on `(user_id, source, external_id)`. Record `last_synced_at` on the `users` table or a separate `integrations` table. On disconnect, run `UPDATE calendar_events SET deleted_at = now() WHERE user_id = $1 AND source = 'google'` (soft delete).
- Settings page: show Canvas section as gated behind premium for free users (render a locked card with "Canvas LMS sync — available on premium"). Show Google Calendar section for all users (it is allowed on free).

Files to create:
- `apps/web/lib/supabase/migration_v11_launch_hardening.sql`: add `last_google_sync_at TIMESTAMPTZ` and `google_sync_event_count INTEGER` to the `users` table if not already in v11.

### Day 5 Structural Blueprint

Files to read first:
- `apps/web/app/dashboard/daily-plan/page.tsx`
- `apps/web/app/dashboard/page.tsx` (next action source)
- `apps/web/app/dashboard/calendar/page.tsx`
- `apps/web/app/api/ai/daily-plan/route.ts`
- `apps/web/lib/supabase/schema.sql` (calendar_events definition)
- `apps/mobile/` screens for DailyPlan

Files to modify:
- `apps/web/app/api/ai/daily-plan/route.ts`: after AI generates the plan, upsert each block into `calendar_events` with `is_ai_suggested = true` and `status = 'pending_ai'`. Do not insert into `schedules` for live UI. Delete only today's `pending_ai` and `rejected` blocks before inserting new ones — never delete `accepted`, `confirmed`, `completed` blocks.
- `apps/web/app/dashboard/page.tsx`: read "next action" from `calendar_events WHERE status IN ('pending_ai', 'accepted', 'confirmed') AND date = today ORDER BY start_time ASC LIMIT 1`. Remove any reference to `schedules` for next action.
- `apps/web/app/dashboard/daily-plan/page.tsx`: read plan blocks from `calendar_events WHERE is_ai_suggested = true AND date = today`. Render each block with Accept/Reject buttons. Accept sets `status = 'accepted'`; Reject sets `status = 'rejected'` and writes a row to `ai_feedback`. Remove or archive `current_day_plan` references — if the column does not exist in the DB, remove all reads and writes to it.
- `apps/web/app/dashboard/calendar/page.tsx`: read all events from `calendar_events` (AI suggested and manual). Use `status` to visually differentiate ghost blocks (`pending_ai` = dashed border) from confirmed blocks.
- `apps/mobile/` DailyPlan screen: update API call to read from canonical `calendar_events` endpoint.

### Day 6 Structural Blueprint

Files to read first:
- `apps/web/app/dashboard/calendar/page.tsx` (contains the deterministic auto-schedule)
- `apps/web/lib/calendar.ts`

Files to modify:
- `apps/web/app/dashboard/calendar/page.tsx`: remove the "Auto-schedule" button or replace it with a call to `/api/ai/daily-plan`. Never set `task.completed = true` inside the scheduling action. The auto-schedule flow should redirect to or open the Daily Plan page after generation.
- `apps/web/lib/calendar.ts`: add `validateNoConflict(userId, startTime, endTime, excludeEventId?)` function that queries `calendar_events` for overlapping confirmed blocks. Return conflicting event details so the UI can show a warning.
- Calendar drag handler: wrap reschedule in `validateNoConflict`. Show a toast warning if conflict exists; do not block the drag but mark the block as a conflict. After drag completes, wrap the DB update in an undo toast with a 5-second window.

Files to create:
- `apps/web/lib/supabase/migration_v11_launch_hardening.sql`: add `recurrence_rule TEXT` to `tasks` table for minimal recurring task support (RRULE format or a simple `daily|weekly|none` enum for v1).

### Day 7 Structural Blueprint

Files to read first:
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/tasks/page.tsx`
- `apps/web/components/dashboard/` (existing task card components)

Files to create:
- `apps/web/components/dashboard/QuickCapture.tsx`: a floating input or command-bar component. Keyboard shortcut `N` opens it from anywhere on the dashboard. Submits to the existing task creation endpoint. Shows source auto-classified as `manual`. Must work on mobile viewport.

Files to modify:
- `apps/web/app/dashboard/page.tsx`: render `<QuickCapture />` always visible (not behind a modal trigger). Add free tier soft-wall below 5 tasks.
- `apps/web/app/dashboard/tasks/page.tsx`: fix any task breakdown button to either open Bruno Chat with the task pre-filled ("Break down: [task title]") or remove the button entirely if the Bruno Chat tool is not implemented yet on Day 7. Do not leave a broken state.
- Destructive actions ("Start Fresh", "Delete all tasks"): add a confirmation dialog that names exactly what will be deleted, an export-to-clipboard option, and a 10-second undo window.

### Day 8 Structural Blueprint

Files to read first:
- `apps/web/lib/bruno.ts` (Bruno system prompt and tool definitions)
- `apps/web/app/api/ai/chat/route.ts`
- `apps/web/app/dashboard/chat/page.tsx`

Files to modify:
- `apps/web/lib/bruno.ts`: rewrite system prompt. Remove all claims for N8N, GitHub, Slack, Notion, Monday. Remove "Premium plan includes advanced integrations." Add explicit tool capability list that matches only what is implemented. See Claude Opus 4.6 for final copy.
- `apps/web/app/api/ai/chat/route.ts`: add tools:
  - `create_calendar_block`: takes `task_id`, `start_time`, `duration_minutes`, inserts into `calendar_events`.
  - `move_calendar_block`: takes `event_id`, `new_start_time`, updates `calendar_events`.
  - `accept_block`: takes `event_id`, sets `status = 'accepted'`.
  - `reject_block`: takes `event_id`, sets `status = 'rejected'`, writes `ai_feedback`.
  - `break_down_task`: takes `task_id`, returns a structured list of subtasks and writes them to the `tasks` table with `parent_task_id`.
  - Free tier: limit available tools to `create_task`, `complete_task`. Block calendar tools with an in-chat message: "Upgrade to move and schedule blocks with Bruno."
- Free tier quota check: before processing each message, read `bruno_messages_today` and `bruno_messages_reset_at`. If reset date is today and count >= 5, return quota error. If reset date is past, reset counter to 0 then proceed.
- Move AI quota consumption (`usage` field from OpenAI) to after a successful response is streamed. Do not charge quota on failed or empty responses.

### Day 9 Structural Blueprint

Files to read first:
- All files under `apps/web/app/dashboard/` (one pass to audit consistency).
- `apps/web/app/globals.css` (Tailwind base styles).
- `apps/web/components/ui/` (existing UI primitives).

Files to modify:
- `apps/web/app/globals.css`: add `@media (prefers-reduced-motion: reduce)` block that disables transitions and animations globally.
- All dashboard page files: standardize card padding to `p-4 md:p-6`, button radius to `rounded-lg`, heading scale to `text-base font-semibold` for card headers.
- Empty states: every list/table that can be empty must render a non-blank state with a clear CTA. Minimum: icon + one-line description + action button.
- Loading states: every async data fetch must render a skeleton, not a spinner or blank space.
- `apps/web/app/onboarding/page.tsx`: fix fixed `720px × 960px` shell to use `max-w-2xl w-full min-h-screen` for mobile compatibility.

Files to create:
- `apps/web/components/ui/UpgradePrompt.tsx`: reusable component. Props: `feature: string`, `limit?: string`, `hasTrialed: boolean`. Renders inline banner with upgrade or trial CTA. Used on free tier walls throughout the app.
- `apps/web/components/ui/EmptyState.tsx`: reusable component. Props: `icon`, `title`, `description`, `action?`. Used on empty task lists, empty calendar, empty chat history.

### Day 10 Structural Blueprint

Files to read first:
- `apps/mobile/app.json`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/` (all files, grep for `planpilot` to find all rename targets)

Files to modify:
- `apps/mobile/app.json`: replace all `planpilot` scheme/bundle/package values with Planevo equivalents. The scheme should be `planevo`. Bundle ID: `com.planevo.app` (confirm with founder before setting). Android package: `com.planevo.app`.
- `apps/mobile/app/_layout.tsx`: add `EXPO_PUBLIC_API_URL` guard at startup — if the variable is missing and the app is not in development mode, show a fatal error screen.
- `apps/mobile/components/` notifications toggle: wire to `registerForPushNotifications()` on toggle-on, call deregister endpoint on toggle-off.

### Day 11 Structural Blueprint

Files to create:
- `apps/web/__tests__/planType.test.ts`: test `normalizePlanType` with all input values including legacy strings.
- `apps/web/__tests__/scheduleConflict.test.ts`: test `validateNoConflict` with overlapping, adjacent, and non-overlapping intervals.
- `apps/web/__tests__/freeQuota.test.ts`: test weekly AI plan quota reset logic and daily Bruno message reset logic.
- `apps/web/__tests__/stripe.test.ts`: test `subscriptionStatusToPlanType` for all Stripe status values.
- `apps/web/e2e/smoke.test.ts` (Playwright): the minimum smoke test covers: login → dashboard loads with no JS errors → add task via QuickCapture → navigate to Daily Plan → navigate to Calendar → navigate to Chat and send one message.
- `.github/workflows/ci.yml` or `vercel.json` build command: `npm run check --workspace planevo`.

### Day 12 Structural Blueprint

Files to read first:
- `apps/web/lib/posthog.ts`
- `apps/web/lib/email.ts`
- `apps/web/app/api/cron/weekly-review/route.ts`
- `apps/web/app/api/cron/deadline-rescue/route.ts`

Files to modify:
- `apps/web/lib/posthog.ts`: add typed event functions for each event in the taxonomy. Do not call `posthog.capture()` inline — always use a typed wrapper.
- `apps/web/app/api/cron/weekly-review/route.ts`: add guard — only send if user has at least 3 completed tasks in the past 7 days. Only send to users with `plan_type IN ('trialing', 'premium', 'student', 'admin')`. Free users do not receive weekly review.
- `apps/web/app/api/cron/deadline-rescue/route.ts`: add guard — only fire push if user has `push_enabled = true` and `push_token IS NOT NULL`.
- Add `CRON_SECRET` env var check at the top of every cron route. All cron routes must reject requests that do not include `Authorization: Bearer ${CRON_SECRET}` header.

Files to create:
- `apps/web/lib/analytics.ts`: typed PostHog wrapper with all events from the Day 12 taxonomy. Import this everywhere, never raw PostHog.

### Day 13 Structural Blueprint

Files to modify:
- `apps/web/app/privacy/page.tsx`: replace draft/stub with the generated Privacy Policy from Termly or Iubenda (covering the finalized integrations: OpenAI, Supabase, Stripe, PostHog, Sentry, Google Calendar, and Canvas).
- `apps/web/app/terms/page.tsx`: replace draft/stub with the generated Terms of Service from Termly or Iubenda.
- `apps/web/app/cookies/page.tsx`: replace draft/stub or create if missing, containing the generated Cookie Policy from Termly or Iubenda.
- `apps/web/app/page.tsx` (landing): audit every claim. Features listed must match `FEATURES` flags that are `true` in production. Pricing must match current Stripe products.

Files to create:
- `apps/web/app/sitemap.ts`: Next.js sitemap generator returning `['/', '/pricing', '/privacy', '/terms', '/login', '/signup']`.
- `apps/web/public/robots.txt`: allow all, sitemap reference.

### Day 14 Structural Blueprint

No new files. This day runs the verification suite and produces a go/no-go report. Claude Opus 4.6 reads the output of each gate check and determines if the launch criteria in the Launch Gates section are met. If any P0 gate fails, Day 14 becomes a fix day, not a launch day. The 14-day counter restarts only the failed gates, not the entire plan.

---

## Gaps Codex Missed

These items were found in the codebase audit but are not addressed by the 14-day plan above. They are added here so the executing agent is aware of them. Some are Day 1–14 fixes integrated into the structural blueprint above. The remainder are post-launch P2 items.

### Cron Route Authentication Is Missing

All cron routes (`apps/web/app/api/cron/`) do not currently validate a secret. Anyone with the URL can trigger a weekly review email or deadline rescue push notification. Add a `CRON_SECRET` environment variable and validate `Authorization: Bearer ${CRON_SECRET}` on every cron route handler. This is a P0 security fix for Day 1 or Day 2.

### Email Transactional Infrastructure Is Not Confirmed

`apps/web/lib/email.ts` exists but the provider integration (Resend, SendGrid, or Supabase email) is unclear from the file listing alone. Before Day 12 retention loops can fire emails, confirm the email provider is configured, the `FROM` address is verified, and the template format is tested. If not set up, weekly review emails will silently fail.

### Error Boundaries Are Missing From React Component Tree

No `ErrorBoundary` components are wrapping async dashboard sections. In React 19 with Server Components, an uncaught error in a child component can crash the entire page. Add `<Suspense>` with meaningful fallbacks and at least one root-level error boundary in `apps/web/app/dashboard/layout.tsx`.

### Bundle Size Is Not Measured

No `bundle-analyzer` or `@next/bundle-analyzer` configuration exists. The animated hero on the landing page and rich calendar component may be pulling in large dependencies. Before launch, run `ANALYZE=true npm run build --workspace planevo` and confirm no route exceeds 300 kB gzipped JS.

### Content Security Policy Headers Are Missing

`apps/web/next.config.ts` does not set a Content-Security-Policy header. At minimum, add a permissive CSP that blocks inline scripts not from trusted sources and sets `X-Frame-Options: DENY` and `X-Content-Type-Options: nosniff`. This is a P1 security hardening item.

### Account Deletion Flow Is Missing

There is no "Delete my account" action in settings. GDPR and App Store guidelines require this. Add a settings action that: (1) cancels the Stripe subscription if active, (2) deletes all user rows from Supabase tables in dependency order, (3) deletes the Supabase Auth user, (4) logs the deletion event. Show a 48-hour confirmation email before executing.

### Data Export Is Missing

Users have no way to export their tasks, plans, or calendar blocks. Add a settings action that generates a JSON or CSV export of all user data and emails it to the account email address. Required for GDPR compliance and App Store approval.

### Optimistic UI Updates Are Not Implemented

Task completion, task creation via QuickCapture, and block accept/reject all wait for the server response before updating the UI. This makes the app feel slow on mobile. Add optimistic updates using React's `useOptimistic` (available in React 19) for task completion and accept/reject actions.

### AI Brief And Insight Routes Are Not Wired To UI

`apps/web/app/api/ai/brief/route.ts` and `apps/web/app/api/ai/insight/route.ts` exist but are not referenced in any dashboard component found during audit. Either wire them to the "Bruno noticed" dashboard section (insight) and the mobile brief view (brief), or archive them if they are not used. Unused active routes are a surface area risk.

### Referral UI Is Not Wired

`apps/web/lib/referral.ts` exists and the referral schema is in migration v9, but no referral share UI appears in the dashboard or settings pages. The free tier plan in this document adds a referral incentive (14 free premium days). Wire a "Share Planevo" panel in settings that shows the user's referral link and tracks conversions.

### Supabase Connection Pooling Is Not Configured

At launch scale (hundreds of concurrent users), Next.js serverless functions will open many short-lived Supabase connections. Use Supabase's connection pooler (Transaction mode via port 6543) for all API routes. Only the long-running migrations and RLS setup should use the direct connection. This is a P1 infrastructure item for the launch runbook.

### Push Notification Deep Links Are Not Defined

The push notification infrastructure sends token registrations but does not define deep link targets for notification taps. A "deadline rescue" push that opens the app should deep link to the task or daily plan view, not the home screen. Define a `data` payload schema for each notification type and handle it in `apps/mobile/app/_layout.tsx` via `expo-notifications` `addNotificationResponseReceivedListener`.

### SEO And OG Images Are Missing

The landing page has no `<meta property="og:image">`, no `<meta name="description">`, and no structured data. Next.js App Router supports `export const metadata` and `generateMetadata()` in `layout.tsx` and `page.tsx`. Add metadata for: landing page, pricing page, and any public-facing profile or plan share pages. Generate OG images with `@vercel/og` or static images.

### Supabase RLS Free Tier Isolation

Free tier users must not be able to read other users' premium feature data through direct Supabase queries. Confirm RLS policies on `calendar_events`, `tasks`, `canvas_assignments`, and `ai_feedback` enforce `user_id = auth.uid()`. The quota columns (`ai_plans_used_this_week`, `bruno_messages_today`) must be protected by a policy that only allows the row owner to read and the service role to write.

### Mobile App Has Only One Test

`apps/mobile/components/__tests__/StyledText-test.js` is the only test in the mobile app. Before App Store submission, add at minimum: a test for the DailyPlan screen component rendering, a test for the Bruno Chat input component, and a test for the API client base URL guard.

### Landing Page Animated Hero May Hurt LCP

The animated hero component may be delaying Largest Contentful Paint. Before Day 14 launch rehearsal, run a Lighthouse audit on the landing page and confirm LCP is under 2.5 seconds on a simulated 4G connection. If the animation is the bottleneck, add `loading="eager"` to the hero image or replace the animation with a CSS-only transition that does not block paint.

### `NEXT_PUBLIC_` Env Var Audit

All `NEXT_PUBLIC_` prefixed variables are exposed to the browser bundle. Audit every variable in `.env.local` and Vercel environment settings. Confirm none of the following are using the `NEXT_PUBLIC_` prefix: `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `SENTRY_AUTH_TOKEN`. These must be server-only and never prefixed with `NEXT_PUBLIC_`.

### Archived Routes Must Not Become Active Routes

`apps/web/app/_archive/` contains old AI routes (prioritize, decompose, architect, etc.). Verify that Next.js is not treating this directory as a route segment. The underscore prefix `_archive` should prevent routing, but confirm with a build output check that no `/api/_archive/` routes appear. If they do, move the folder outside of the `app/` directory entirely.

### Daily Plan AI Uses GPT-4o-mini, Not Claude

`apps/web/app/api/ai/daily-plan/route.ts` uses OpenAI `gpt-4o-mini`. The CLAUDE.md for this project specifies Claude as the AI provider. This is an intentional architecture decision that must be documented clearly in `STRATEGY.md` or the route file header — it should not appear as an accident to a future agent. If the decision is to keep OpenAI for cost reasons, document it explicitly. If the decision is to switch to Claude, update the route and the `OPENAI_API_KEY` dependency.

---
