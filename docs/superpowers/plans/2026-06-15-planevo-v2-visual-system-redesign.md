# Planevo V2 Visual System Redesign Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Redesign Planevo mobile and web into a premium, calm, modern student command center without changing product behavior, backend contracts, or Bruno's confirmation-based action model.

**Architecture:** Add one shared package for platform-neutral design tokens, then map those tokens into separate web and React Native primitives. Migrate one product surface at a time around existing handlers and data flows. Keep web Bruno global and context-aware; keep mobile Bruno in its current tab and use the same visual language for assistant states.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Radix UI, Expo 55, React Native 0.83, Expo Router, Vitest, Jest.

## Scope And Audit Basis

This is a source-level audit and implementation plan. No application code was changed during the audit.

The audit covered:

- Mobile routes in `apps/mobile/app`
- Web routes in `apps/web/app`
- UI components in both app component trees
- Web and mobile theme providers and color tokens
- Navigation, auth UI, onboarding, settings, calendars, tasks, daily plan, and Bruno
- The historical `design_handoff_planevo_redesign`
- Bruno's global copilot blueprint and launch-safe routing constraints
- Existing test commands and package boundaries

The supplied reference screenshots are useful for hierarchy, density, typography, spacing, and calendar treatment. They are inspiration only. Planevo V2 should not copy their layouts, bright project colors, subscription claims, or decorative imagery.

## Current Product Structure

### Mobile

- Expo Router application with five tabs: Plan, Calendar, Tasks, Bruno, and Settings.
- Primary product screens are large route files with presentation, state, and actions colocated.
- Calendar uses `@howljs/calendar-kit`.
- Task editing and rescheduling use sheets and modals rather than a dedicated task-detail route.
- Bruno is a dedicated tab with chat history, quick actions, entitlement notices, proposals, and confirmation cards.
- Auth and onboarding are separate routes. Mobile onboarding is an 11-step product flow.

### Web

- Next.js dashboard with a persistent sidebar and route-specific pages.
- Bruno is correctly mounted as a global overlay through `BrunoProvider` and `BrunoShell`.
- Dashboard, Daily Plan, Tasks, and Calendar each contain substantial one-off styling.
- Calendar uses `react-big-calendar` with drag and drop.
- Settings has its own local primitive layer.
- Auth screens use three visibly different visual systems.
- The landing page closely follows the older mascot-heavy honey and cream handoff.

### Shared System

- The monorepo declares `packages/*`, but no shared design-system package exists.
- Web and mobile duplicate color concepts independently.
- Shared business types and visual semantics are not centralized.
- React components should remain platform-specific; only primitive tokens and semantic names should be shared initially.

## Concise Diagnosis

1. **The current brand layer conflicts with the new direction.** The product is dominated by honey, cream, brown, serif headlines, very heavy weights, and frequent Bruno bear imagery. It feels warm, but also playful and themed rather than calm and premium.
2. **Visual hierarchy is too loud.** Many screens rely on `800` or `900` weights, uppercase microcopy, high-radius pills, dark feature cards, and multiple competing accents.
3. **Primitives are fragmented and partially broken.** Web `Button` and `Card` still use an older brutalist system with 2px borders and offset shadows. Most web pages bypass primitives entirely. Mobile has no real primitive layer.
4. **Tokens drift between platforms.** Web CSS variables, mobile `Colors.ts`, settings tokens, and hardcoded literals all describe overlapping systems differently.
5. **Core screens are monolithic.** Today, Tasks, Chat, and web dashboard pages mix UI structure with data actions. A broad visual rewrite would create unnecessary regression risk.
6. **Navigation has clarity issues.** Mobile Plan and Calendar use the same icon. Web Bruno is correctly global, but some page CTAs still route through the legacy chat URL.
7. **Auth and onboarding are inconsistent.** Login and signup use the mascot-heavy V1 style, while password recovery still exposes older brutalist styles.
8. **Bruno lacks a single assistant visual language.** Avatar, bubbles, entitlement notices, proposal cards, and recovery states use several unrelated styles.
9. **Marketing contains unverified presentation claims.** Trial, price, EDU, unlimited usage, no-card, and placeholder footer links should not survive into V2 unless backed by live configuration and real routes.
10. **The historical design handoff is no longer the product target.** Preserve it for reference, but do not continue implementing its mascot, serif, or honey-first instructions.

## Planevo V2 Design System

### Design Principles

- Calm before clever.
- The plan is the hero, not the assistant.
- One primary action per surface.
- Information density should feel deliberate, not compressed.
- Neutral surfaces carry structure; color communicates state.
- Bruno should feel present through language and interaction, not illustration scale.
- Personalization may change the accent, but must not recolor the entire product.

### Color Tokens

Initial light theme:

| Token | Value | Use |
| --- | --- | --- |
| `canvas` | `#F6F5F2` | App background |
| `surface` | `#FFFFFF` | Primary cards and sheets |
| `surface-subtle` | `#EFEFEC` | Secondary groups and controls |
| `surface-raised` | `#FAFAF8` | Elevated panels |
| `text` | `#20221F` | Primary text |
| `text-secondary` | `#646963` | Supporting text |
| `text-muted` | `#858A84` | Metadata and placeholders |
| `border` | `#DEDFDA` | Default border |
| `border-strong` | `#C8CAC4` | Selected and interactive borders |
| `amber` | `#B7792B` | Primary action and planning emphasis |
| `amber-soft` | `#F2E6D3` | Selected states and gentle callouts |
| `green` | `#667D69` | Success, recovery, and completed states |
| `green-soft` | `#E5ECE5` | Success surfaces |
| `red` | `#B45D57` | Destructive and overdue states |
| `red-soft` | `#F3E2E0` | Destructive surfaces |
| `blue` | `#657B91` | Calendar and external-source semantics |
| `charcoal` | `#1F211F` | High-contrast shell or primary button |

Dark mode should use charcoal neutrals rather than pure black and preserve the same semantic accent relationships.

Existing accent personalization remains a feature. Remap its options to muted, contrast-safe accents while keeping the neutral foundation fixed.

### Typography

- Web product UI: Geist Sans or the existing system sans stack.
- Mobile: native system sans first. Do not add a font dependency in the token phase.
- Mono: timestamps, durations, and compact metadata only.
- Remove Instrument Serif from dashboard and app surfaces.
- Landing may use one restrained display treatment later, but V2 remains sans-first.
- Prefer weights `400`, `500`, `600`, and selective `700`. Retire routine `800` and `900`.

Recommended scale:

| Role | Mobile | Web |
| --- | --- | --- |
| Display | 32/36, 650 | 40/44, 650 |
| Page title | 26/32, 650 | 32/38, 650 |
| Section title | 20/26, 600 | 22/28, 600 |
| Card title | 16/22, 600 | 16/22, 600 |
| Body | 15/22, 400 | 15/23, 400 |
| Label | 13/18, 550 | 13/18, 550 |
| Metadata | 12/16, 500 | 12/16, 500 |

### Spacing, Shape, And Depth

- Spacing scale: `4, 8, 12, 16, 20, 24, 32, 40, 48`.
- Mobile horizontal page inset: `20`.
- Desktop content rhythm: `24` between sections, `32` around major groups.
- Radius scale: `8, 12, 16, 20`.
- Reserve fully rounded pills for chips, toggles, segmented controls, and compact status.
- Use 1px borders.
- Use subtle shadows only on floating or modal surfaces.
- Minimum target size: 44px web, 48px mobile.

### Core Components

Shared semantics, separate platform implementations:

- `AppShell`
- `ScreenHeader` / `PageHeader`
- `Surface`
- `Section`
- `Button`
- `IconButton`
- `FormField`
- `SegmentedControl`
- `StatusChip`
- `SourceChip`
- `TaskRow`
- `TimelineRow`
- `EmptyState`
- `Skeleton`
- `Dialog` / `Sheet`
- `AssistantChip`
- `AssistantMessage`
- `RecoveryCard`
- `ActionProposalCard`
- `EntitlementNotice`

Do not create a cross-platform React component package in V2 phase one.

## Screen-By-Screen Redesign

### Mobile Shell And Navigation

- Keep all five existing tabs and routes.
- Rename Plan visually to Today if product language permits without changing the route.
- Give Today and Calendar distinct icons.
- Replace uppercase 10px labels with readable sentence-case labels.
- Use a clean white or off-white tab surface with a restrained selected state.
- Preserve all test IDs and route names.

### Mobile Today

- Lead with date, greeting, and one compact plan-status line.
- Make the current or next time block the dominant card.
- Present the remaining day as a simple timeline, not a stack of equally prominent cards.
- Reduce connection state to compact source indicators.
- Show progress and workload in one quiet summary row.
- Keep generation, completion, energy, expansion, and navigation handlers unchanged.
- Use Bruno only for a short recovery or recommendation card when relevant.

### Mobile Calendar / Plan

- Preserve `@howljs/calendar-kit`, event interactions, backlog sheet, and auto-schedule behavior.
- Redesign the header, date controls, event colors, current-time line, and empty states.
- Use muted source colors and stronger typography instead of saturated event blocks.
- Make the backlog sheet visually consistent with task rows and action buttons.
- Do not introduce unsupported calendar views or new scheduling behavior.

### Mobile Tasks

- Keep source tabs, hide-completed preference, swipe actions, quick capture, and groups.
- Replace the mascot banner with a compact Bruno insight or recovery card.
- Reduce card nesting and show tasks as clear rows with source, due state, duration, and priority.
- Use color for status only.
- Retain test IDs and mutation handlers.

### Mobile Task Detail

- Evolve the existing edit/reschedule sheet into a reusable, view-first detail sheet.
- Show title, source, due date, duration, priority, notes, and status in a stable hierarchy.
- Keep edit, complete, reschedule, and delete actions wired to current handlers.
- Do not add a new backend route or task schema.
- Reuse this surface from Today, Tasks, and Calendar where current data permits.

### Mobile Bruno

- Keep the dedicated tab and existing chat capabilities.
- Replace large mascot or bear emoji treatment with a 24-32px assistant chip or monogram.
- Standardize user and assistant messages, typing, history, quick actions, entitlement notices, action proposals, and plan previews.
- Keep app actions confirmation-based.
- Give recovery cards a calm green-neutral treatment, not celebratory animation.
- Preserve all metadata parts and entitlement behavior.

### Mobile Supporting Screens

- Settings: simplify card nesting and make sections scannable.
- Deep Work: make the timer the focus, with one primary control and quiet session metadata.
- Canvas connect and blocked states: preserve honest product limitations and existing connection behavior.
- Paywall: redesign only from actual entitlement and pricing data.

### Web Shell And Dashboard

- Preserve sidebar collapse behavior, mobile navigation, auth gate, loaders, quick capture, and global Bruno shell.
- Replace the themed dark sidebar with a compact charcoal or light-neutral command rail.
- Preserve the visible Ask Bruno affordance and `openBruno(currentContext)`.
- Replace serif greeting and four competing stat cards with a clearer desktop hierarchy:
  - Today header
  - Current/next block
  - Remaining schedule
  - Compact workload summary
  - One Bruno recovery or insight surface
- Keep dashboard data queries and actions unchanged.

### Web Daily Plan

- Preserve source synchronization, generation, schedule timeline, backlog, energy controls, and save behavior.
- Align layout and components with mobile Today.
- Use a flexible two-column desktop layout, with timeline primary and utilities secondary.
- Replace one-off buttons and source cards with V2 primitives.
- Where a CTA currently navigates to `/dashboard/chat`, use the existing global Bruno opener without changing the API contract.

### Web Calendar

- Preserve `react-big-calendar`, drag and drop, event creation, event editing, and backlog behavior.
- Restyle the supported calendar wrapper and event renderers rather than replacing the calendar engine.
- Improve day headers, current-time marker, event density, source distinction, and selection states.
- Keep dialogs and quick-add behavior intact.

### Web Tasks And Task Detail

- Preserve source tabs, stats, quick capture, grouping, actions, rescheduling, and responsive menus.
- Align task rows and detail surfaces with mobile.
- Use a sheet or dialog for task detail based on existing page behavior. Do not invent a new route.
- Replace the mascot banner with the shared Bruno insight component.

### Web Bruno Overlay

- Preserve `BrunoProvider`, `BrunoShell`, page context, suggested actions, and confirmation cards.
- Keep `/dashboard/chat` as the safe redirect.
- Reduce the overlay's visual weight and standardize its spacing, messages, cards, input, and status.
- Use a subtle avatar chip. Retain the Bruno name and calm assistant voice.

### Settings

- Consolidate settings primitives with the main V2 system.
- Keep current actions, forms, integration states, and plan checks.
- Remove visual claims such as `EDU VERIFIED` unless they are based on real user data.
- Preserve every existing settings route.

### Auth And Onboarding

- Redesign visual presentation only after core product screens stabilize.
- Keep Supabase calls, callback routes, validation, redirects, and onboarding completion logic unchanged.
- Unify login, signup, forgot password, reset password, and onboarding under one neutral visual system.
- Replace mascot-heavy hero art with product-grounded planning visuals or quiet abstract brand assets.
- Keep integration limitations and permission copy accurate.
- Fix placeholder legal links to point to existing Terms and Privacy routes.

### Landing Page

- Redesign last, using screenshots or recordings of the implemented V2 product.
- Lead with the real daily planning and recovery workflow.
- Use Bruno as a subtle assistant identity, not a full-width character section.
- Build a claim inventory before design:
  - Price
  - Trial length
  - EDU discount
  - Usage limits
  - Payment requirements
  - Supported integrations
- Render claims only from verified product configuration or approved copy.
- Replace placeholder links with real routes or remove them.

## Safe Implementation Order

### Phase 0: Baseline And Visual Contract

1. Capture current mobile and web states for Today, Calendar, Tasks, Bruno, Settings, auth, and landing.
2. Record responsive widths, dark mode, empty, loading, error, and populated states.
3. Create an approved V2 visual contract in Figma before broad screen implementation.
4. Define a component and token acceptance checklist.
5. Commit documentation and test fixtures only.

### Phase 1: Repair Primitives And Add Tokens

**Create:**

- `packages/design-tokens/package.json`
- `packages/design-tokens/src/colors.ts`
- `packages/design-tokens/src/spacing.ts`
- `packages/design-tokens/src/typography.ts`
- `packages/design-tokens/src/index.ts`
- `apps/mobile/components/ui/*`

**Modify:**

- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/components/ui/button.tsx`
- `apps/web/components/ui/card.tsx`
- `apps/web/components/ui/input.tsx`
- `apps/web/components/ui/dialog.tsx`
- `apps/web/components/ui/sheet.tsx`
- `apps/web/components/ui/tabs.tsx`
- `apps/mobile/constants/Colors.ts`
- `apps/mobile/providers/ThemeProvider.tsx`
- `apps/mobile/components/Themed.tsx`

Keep temporary compatibility aliases for old web variables until every screen is migrated.

Verification:

```bash
npm run typecheck --workspace planevo
npm run typecheck --workspace mobile
npm test --workspace planevo -- --run
npm test --workspace mobile -- --runInBand
```

Commit: `feat(design): add Planevo V2 tokens and primitives`

### Phase 2: Mobile Today

**Modify:**

- `apps/mobile/app/(tabs)/_layout.tsx`
- `apps/mobile/app/(tabs)/index.tsx`

**Create or extract:**

- `apps/mobile/components/today/TodayHeader.tsx`
- `apps/mobile/components/today/CurrentBlockCard.tsx`
- `apps/mobile/components/today/TodayTimeline.tsx`
- `apps/mobile/components/today/PlanSummary.tsx`
- `apps/mobile/components/bruno/RecoveryCard.tsx`

Keep data loading and mutations in the route during the first pass. Extract presentation only.

Verification:

```bash
npm run typecheck --workspace mobile
npm test --workspace mobile -- --runInBand
```

Commit: `feat(mobile): redesign Today with Planevo V2`

### Phase 3: Mobile Calendar

**Modify:**

- `apps/mobile/app/(tabs)/calendar.tsx`
- `apps/mobile/components/calendar/MobileCalendar.tsx`

**Create:**

- `apps/mobile/components/calendar/CalendarHeader.tsx`
- `apps/mobile/components/calendar/EventBlock.tsx`
- `apps/mobile/components/calendar/BacklogSheet.tsx`

Verification should cover event press, date changes, backlog actions, and auto-schedule entry.

Commit: `feat(mobile): redesign calendar and planning surfaces`

### Phase 4: Mobile Tasks And Task Detail

**Modify:**

- `apps/mobile/app/(tabs)/tasks.tsx`
- `apps/mobile/components/tasks/QuickCaptureModal.tsx`

**Create:**

- `apps/mobile/components/tasks/TaskRow.tsx`
- `apps/mobile/components/tasks/TaskGroup.tsx`
- `apps/mobile/components/tasks/TaskDetailSheet.tsx`
- `apps/mobile/components/tasks/TaskMetadata.tsx`

Verification should cover complete, edit, reschedule, delete, source filters, hide completed, and quick capture.

Commit: `feat(mobile): redesign tasks and task detail`

### Phase 5: Mobile Bruno Recovery UI

**Modify:**

- `apps/mobile/app/(tabs)/chat.tsx`
- `apps/mobile/components/bruno/BrunoEntitlementNotice.tsx`
- `apps/mobile/components/bruno/PlanDraftCard.tsx`
- `apps/mobile/components/bruno/PlanPreviewModal.tsx`

**Create:**

- `apps/mobile/components/bruno/AssistantAvatar.tsx`
- `apps/mobile/components/bruno/AssistantMessage.tsx`
- `apps/mobile/components/bruno/ActionProposalCard.tsx`

Verification must preserve confirmation gates and metadata rendering.

Commit: `feat(mobile): unify Bruno recovery and assistant states`

### Phase 6: Web Shell And Dashboard

**Modify:**

- `apps/web/app/dashboard/layout.tsx`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/components/dashboard/Sidebar.tsx`
- `apps/web/components/dashboard/ScheduleTimeline.tsx`
- `apps/web/components/dashboard/TaskBacklog.tsx`

Preserve the global Bruno provider and shell architecture.

Verification:

```bash
npm test --workspace planevo -- --run
npm run typecheck --workspace planevo
```

Commit: `feat(web): redesign dashboard shell and Today experience`

### Phase 7: Web Daily Plan, Calendar, Tasks, And Bruno

**Modify:**

- `apps/web/app/dashboard/daily-plan/page.tsx`
- `apps/web/app/dashboard/calendar/page.tsx`
- `apps/web/app/dashboard/tasks/page.tsx`
- `apps/web/components/calendar/*`
- `apps/web/components/tasks/*`
- `apps/web/components/bruno/*`
- `apps/web/components/dashboard/BrunoChatSidebar.tsx`

Do not change Bruno request bodies, routing policy, API routes, or mutation contracts.

Commit by surface:

```text
feat(web): redesign daily plan
feat(web): redesign calendar
feat(web): redesign tasks and task detail
feat(web): unify Bruno overlay states
```

### Phase 8: Settings And Supporting Product Screens

**Modify:**

- `apps/web/app/dashboard/settings/**/page.tsx`
- `apps/web/components/settings/*`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/app/deep-work.tsx`
- `apps/mobile/app/canvas-connect.tsx`
- `apps/mobile/app/blocked.tsx`
- `apps/mobile/app/paywall.tsx`

Keep settings actions and entitlement logic untouched.

Commit: `feat(product): apply Planevo V2 to settings and supporting screens`

### Phase 9: Auth And Onboarding UI

**Modify presentation only:**

- `apps/web/app/login/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/forgot-password/page.tsx`
- `apps/web/app/reset-password/page.tsx`
- `apps/web/app/onboarding/page.tsx`
- `apps/web/components/onboarding/*`
- `apps/mobile/app/login.tsx`
- `apps/mobile/app/onboarding.tsx`
- `apps/mobile/components/onboarding/MobileOnboarding.tsx`

Commit: `feat(auth-ui): redesign authentication and onboarding`

### Phase 10: Landing Page

**Modify:**

- `apps/web/app/page.tsx`
- `apps/web/components/landing/*`
- `apps/web/app/pricing/page.tsx`
- approved marketing assets in `apps/web/public`

Use real V2 product captures and verified claims.

Commit: `feat(marketing): launch Planevo V2 landing experience`

### Phase 11: Cleanup

- Remove compatibility token aliases only after usage reaches zero.
- Remove unused mascot presentation imports from active product surfaces.
- Keep historical handoff files unless separately approved for archival.
- Run full checks and visual regression matrix.

```bash
npm run check --workspace planevo
npm run doctor --workspace mobile
npm run typecheck --workspace mobile
npm test --workspace mobile -- --runInBand
```

Commit: `chore(design): remove V1 visual compatibility layer`

## Files Likely To Change

High-probability paths:

- `packages/design-tokens/**`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/components/ui/**`
- `apps/web/components/dashboard/**`
- `apps/web/components/calendar/**`
- `apps/web/components/tasks/**`
- `apps/web/components/bruno/**`
- `apps/web/components/settings/**`
- `apps/web/components/onboarding/**`
- `apps/web/app/dashboard/**/page.tsx`
- `apps/web/app/login/page.tsx`
- `apps/web/app/signup/page.tsx`
- `apps/web/app/forgot-password/page.tsx`
- `apps/web/app/reset-password/page.tsx`
- `apps/web/app/onboarding/page.tsx`
- `apps/web/app/page.tsx`
- `apps/web/app/pricing/page.tsx`
- `apps/mobile/constants/Colors.ts`
- `apps/mobile/providers/ThemeProvider.tsx`
- `apps/mobile/components/ui/**`
- `apps/mobile/components/calendar/**`
- `apps/mobile/components/tasks/**`
- `apps/mobile/components/bruno/**`
- `apps/mobile/components/onboarding/**`
- `apps/mobile/app/(tabs)/**`
- `apps/mobile/app/login.tsx`
- `apps/mobile/app/onboarding.tsx`
- `apps/mobile/app/deep-work.tsx`

## Files And Areas That Must Not Be Touched

Unless a later phase proves a specific technical necessity:

- `apps/web/app/api/**`
- `apps/web/lib/bruno/**`
- `apps/web/lib/auth/**`
- `apps/web/lib/supabase/**`
- `apps/web/lib/integrations/**`
- `apps/web/lib/services/**`
- `apps/web/app/auth/callback/route.ts`
- `apps/web/lib/auth/rateLimit.ts`
- `apps/mobile/lib/supabase.ts`
- `apps/mobile/providers/AuthProvider.tsx`
- `apps/mobile/types/database.ts`
- `apps/mobile/services/**`
- `apps/mobile/ios/**`
- `apps/mobile/android/**`
- Bruno routing, entitlement, credit, usage, or request-body contracts
- Existing business tests, except where a visual refactor requires a stable selector update

The historical `design_handoff_planevo_redesign` should not be deleted or edited during the redesign. It is evidence of the previous direction, not an active V2 specification.

## Risks And Controls

| Risk | Control |
| --- | --- |
| Monolithic screens lose handlers during extraction | Extract presentation around existing state first; do not rewrite data flow in the same commit |
| Web and mobile drift again | Share primitive tokens and semantic names; maintain a cross-platform component checklist |
| Token migration breaks old pages | Keep temporary CSS aliases and migrate route by route |
| Personal accent settings weaken the brand | Keep neutral surfaces fixed and limit accents to actions and state |
| Calendar behavior regresses | Keep existing calendar libraries and use supported theming and render APIs |
| Bruno becomes generic or disappears | Preserve name, entry points, context banner, messages, recovery cards, and confirmation states |
| Bruno mutations bypass confirmation | Treat existing confirmation contracts as non-negotiable acceptance criteria |
| Marketing repeats fake claims | Require a claim inventory tied to code, configuration, or approved business copy |
| Auth behavior changes during UI work | Restrict auth phases to page markup and styling; do not edit providers, callbacks, or helpers |
| Dark mode becomes an afterthought | Validate every primitive in light and dark before screen migration |
| Accessibility drops with muted colors | Check contrast, focus, motion, type scaling, target sizes, and screen reader labels per phase |
| Review becomes too large | One surface per commit after the token foundation |
| Mobile QA is blocked by native tooling | Run typecheck and Jest first; record Expo Doctor, simulator, CocoaPods, or device blockers explicitly |

## Acceptance Gate For Every Phase

- Existing features remain visible and usable.
- No API, database, auth, or entitlement contract changes.
- No fake integration, price, trial, discount, or usage claim.
- Empty, loading, error, and populated states are accounted for.
- Light and dark mode are checked.
- Keyboard, focus, target size, and contrast are checked.
- Bruno actions still require confirmation.
- Tests and typecheck pass for the affected workspace.
- Visual changes are committed separately from unrelated refactors.

## Definition Of Done

Planevo V2 is complete when mobile and web share the same neutral visual language, core planning surfaces are calm and legible, Bruno is subtle but unmistakable, all current functionality remains intact, auth and marketing are visually consistent, and every public claim reflects real product behavior.
