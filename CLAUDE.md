# Planevo Developer Guidelines (CLAUDE.md)

Planevo is a student-first **daily planner built around availability**. It integrates Canvas LMS assignments, Google Calendar, and manual tasks into a cohesive **Daily Plan** — time blocks placed in real calendar gaps, then adaptively reshuffled when the day changes. Scheduling automation runs quietly in the background; do not describe the product as "AI-first."

**Bruno** is the in-app agentic companion (bear-themed). He runs a native tool loop with an in-conversation approval flow: he proposes actions or multi-step plans, the user confirms, execution results feed back into the same model run.

Product positioning: [`apps/web/STRATEGY.md`](apps/web/STRATEGY.md).

## Planned direction (not yet built)

The approved next major initiative is **Planevo Command** — replacing the Daily Plan tab with a capture-first "responsibility command center" (dump messy text/voice → structured preview → confirm → board). The full spec lives at [`docs/superpowers/plans/comprehensive.md`](docs/superpowers/plans/comprehensive.md). Until Command ships behind its feature flag, Daily Plan remains the live core surface — do not delete or bypass it. When working on Command, that plan document is authoritative for its scope.

---

## Tech Stack

### Monorepo Structure
- **Root**: npm workspaces (`apps/*`, `packages/*`); coordinates scripts.
- **Web App (`apps/web`)**:
  - Framework: Next.js 16 (App Router)
  - Styling: Tailwind CSS 4
  - State Management: Zustand (client-side state), React Query (server-state scaffolding)
  - Database & Auth: Supabase (Postgres & Supabase Auth)
  - AI Integration: Vercel AI SDK v6 (`ai` + `@ai-sdk/openai`) on the OpenAI **Responses API**, gpt-5.4 model family. LangGraph/LangChain was retired in July 2026 — do not reintroduce it.
  - UI Components: Radix UI primitives, Framer Motion, Phosphor Icons, React Big Calendar
  - Integrations: Google Calendar OAuth, Canvas LMS Sync, normalized `source_items` pipeline (Notion/Slack/Linear behind flags)
  - Communications: Resend + React Email
  - Observability: Sentry, PostHog
- **Mobile App (`apps/mobile`)**:
  - Framework: React Native (Expo SDK 54), Expo Router
  - Tabs: Home, Calendar, Chat, Notes, Tasks, Settings
  - Clients: Supabase client, posthog-react-native, sentry-react-native, RevenueCat
- **Packages (`packages/`)**: `nlp-core` (natural-language parsing), `notes-core` (shared notes logic), `theme` (shared theming). There is no `packages/core`.

---

## Commands

### Monorepo (Root) Commands
- `npm run dev` — starts the web workspace dev server (`npm run dev --workspace planevo`)
- `npm run build` — builds all workspaces (`npm run build --workspaces --if-present`)
- `npm run lint` — runs ESLint across all workspaces
- `npm run typecheck` — runs tsc type checking on the web workspace (`npm run typecheck --workspace planevo`)
- `npm run test` — runs tests across all workspaces
- `npm run check` — performs a full verification check (lint + typecheck + test + build)

### Web App (`apps/web`) Commands
- `npm run dev` — start dev server on http://localhost:3000
- `npm run build` — create production build
- `npm run lint` — check code quality with ESLint
- `npm run typecheck` — run TypeScript compilation check (`tsc --noEmit`)
- `npm run test` — run unit/component tests with Vitest (`vitest run`)
- `npm run test:e2e` — run Playwright E2E tests (`playwright test`)
- `npm run check` — run lint, typecheck, unit tests, and build locally

### Mobile App (`apps/mobile`) Commands
- `npm run start` (or `npx expo start`) — start Expo development server
- `npm run android` / `npm run ios` / `npm run web` — platform-specific dev servers
- `npm run test` — run Jest tests

---

## Product Surfaces (live today)

Web dashboard routes (`apps/web/app/dashboard/`), nav in `components/dashboard/sidebar/shared.tsx`:

- **Dashboard home** — hero, today preview, Bruno insight panel (`components/dashboard/home/`)
- **Daily Plan** (`daily-plan/`) — the availability-based plan; core surface until Command ships
- **Tasks** (`tasks/`) — manual + imported task backlog
- **Calendar** (`calendar/`) — React Big Calendar view over `calendar_events`
- **Notes** (`notes/`) — notebooks, note editor, revisions, flashcards review, Bruno organize/note actions
- **Deep Work** (`deep-work/`) — focus timer tied to a task
- **Chat** (`chat/`) — full-screen Bruno conversation (same pipeline as the sidebar/dock)

---

## Core Directory Structure

```
/apps
  /web
    /app              → Next.js App Router (auth, pricing, dashboard/{daily-plan,tasks,calendar,notes,deep-work,chat,settings}, api)
    /components       → UI (ui, layout, bruno, calendar, dashboard, tasks, notes, deep-work, onboarding)
    /lib              → Helpers (supabase, ai, bruno, plan, calendar, canvas, integrations, notes, nlp, stripe, auth, notifications)
    /types            → Web-specific types
  /mobile
    /app              → Expo Router ((tabs): index, calendar, chat, notes, tasks, settings)
    /components       → Mobile-specific UI
    /lib              → Mobile helpers & push notification configuration
/packages
  /nlp-core           → Shared natural-language parsing
  /notes-core         → Shared notes logic
  /theme              → Shared theming
```

---

## Key Data Models (Supabase Public Schema)

- **`users`**: Profiles, integration tokens (Canvas/Google), onboarding status, Stripe customer/subscription details, push tokens, `scheduling_preferences`.
- **`calendar_events`**: Canonical source of truth for all daily plan blocks (status: `pending_ai`, `accepted`, `confirmed`, `completed`, `skipped`, `rescheduled`, `rejected`).
- **`tasks`**: Backlog of manual and imported tasks, including recurrence patterns and estimated completion times.
- **`integration_accounts` / `integration_sources` / `integration_sync_runs` / `source_items`**: Normalized external-source pipeline (Canvas and flag-gated Notion/Slack/Linear items land as `source_items`).
- **`notes` / `notebooks` / `note_revisions` / `note_flashcards` / `note_tag_assignments` / `note_block_refs`**: Notes platform.
- **`user_ai_memory`**: Bruno's learned behaviors, planning style, focus windows, break preferences, tone configuration.
- **`bruno_messages` & `chat_conversations`**: Server-persisted chat history. `bruno_messages.parts` (jsonb) stores UI-message parts including approval-requested state; message branches/feedback have their own tables.
- **`bruno_tool_logs`**: Idempotency-constrained log of Bruno tool executions.
- **`ai_usage_logs`**: Per-call AI usage/cost records (see `lib/bruno/costEstimator.ts`, `usageService.ts`).
- **`canvas_assignments`**: Cache of imported Canvas assignments.
- **`ai_feedback`**: Accepted/rejected plan suggestions feeding personalization.
- **`schedules`**: Historical snapshots of daily plans (never read for live rendering).

---

## How availability works

There is no standalone "availability" feature. Availability is computed from:

1. **Calendar occupancy** — existing `calendar_events` (Google, Canvas, manual, accepted blocks)
2. **Focus windows** — `preferred_focus_windows` and `avoided_focus_windows` in `user_ai_memory`
3. **Work hours / planning style** — max planned minutes, day bounds from `users.scheduling_preferences` and settings

**Pipeline:** `getBrunoMasterContext()` → `findGaps()` (`lib/calendar.ts`) → `generateDailyPlan()` → insert pending AI blocks into `calendar_events` → user accepts on Daily Plan.

Bruno also has a `find_availability` read tool wrapping `findGaps` (per-day free slots, ≤14 days) and is prompted to check it before proposing time blocks.

**Adaptive Day Rollover:** `/api/schedule/rollover` moves overdue incomplete tasks to today and increments `rescheduled_count` without punitive overdue UX.

---

## Engineering Conventions

### TypeScript & Linting
- **Strict TypeScript**: No `any` type is allowed. Define explicit interfaces for component props.
- **Pre-commit Gate**: Ensure `npm run check` passes with **zero lint errors** before proposing commits.

### Backend & Database (Supabase)
- **RLS Enforced**: Row Level Security must be active and tested on all tables. All queries must filter by `user_id = auth.uid()`.
- **Idempotence**: Database migrations (in `supabase/migrations`) must be idempotent and safely roll back.
- **Plan Type Normalization**: Normalize plan types to `free`, `trialing`, `premium`, `student`, `canceled`, or `admin` in middleware and logic.

### Privacy & Token Security
- **No Token Leakage**: Never return raw decrypted tokens (like Canvas API tokens) to the browser.
- **Masking**: Display saved tokens in the UI as masked strings (e.g., `••••abcd`). Manage configuration changes through write-only replace flows.
- **Encryption**: Encrypt all third-party API credentials on the server side prior to DB storage.
- **Rate limiting fails closed**: IP/RPC rate-limit checks reject on infra errors; keep it that way.

### AI Scheduling & Planning State
- **Canonical Source**: `calendar_events` owns plan scheduling. Do not read schedules from the `schedules` snapshot table for live rendering.
- **Lifecycle Integrity**: Do not mark a task `completed=true` just because it was scheduled.
- **Quota Boundaries** (`lib/auth/rateLimit.ts` + `lib/bruno/usagePolicy.ts`):
  - AI requests: free/canceled 5/day + 2/hour; trialing/premium/student 100/day + 20/hour; admin 1000/day.
  - Deep-tier Bruno (`gpt-5.4`) is credit-metered: Pro gets 150/month (`BRUNO_PRO_MONTHLY_DEEP_LIMIT`); free users only via onboarding/earned credits in the credit ledger.
  - Google Calendar sync is read-only on free.
- **Cost discipline**: Every AI call logs to `ai_usage_logs` via `costEstimator`/`usageService`. Keep prompt prefixes stable to preserve the cached-input discount.

---

## Bruno — Agentic Copilot

Bruno's pipeline lives in `apps/web/lib/bruno/` (entry: `handleChatV2.ts`). Full history and rationale: [`docs/BRUNO_AGENT_ROADMAP.md`](docs/BRUNO_AGENT_ROADMAP.md).

### Models (`lib/bruno/modelPolicy.ts`)
- Router: `gpt-5.4-nano` (classification only — never runs a tool loop)
- Standard/Medium: `gpt-5.4-mini`
- Deep: `gpt-5.4` (credit-metered)
- Runs on the OpenAI Responses API with reasoning effort (`low` default, `medium` for deep/planning modes). Never route action-capable tiers back to pre-GPT-5 models.

### Routing & agent loop
- The **LLM router** (`routeMessage.ts`) and **native approval loop** (`agentLoop.ts`) are default-ON (`BRUNO_ROUTING_V2_ENABLED`, `BRUNO_LLM_ROUTER_ENABLED`, `BRUNO_AGENT_LOOP_ENABLED`; env `false` is the kill switch).
- Propose → approve → execute happens inside one model run: write tools carry `needsApproval`, the stream pauses on approval cards, approval resumes the loop, and the structured execution result re-enters the model context so Bruno can chain and report real outcomes.
- **Trust boundary**: on continuation the server accepts only `{approvalId, approved}` validated against approval parts it persisted itself in `bruno_messages.parts`. Never trust client-supplied assistant/tool state.
- Mobile still uses the legacy `/api/bruno/actions/execute` flow (it does not send `agentLoop: true`).

### Tools
- **Write/propose**: `propose_action` (14 action types, per-type required fields enforced at propose time via `superRefine`) and `propose_plan` (`APPLY_PLAN`: ordered multi-step plan ≤20 steps, one confirm, sequential server-side execution with ref-chaining, halt-on-first-failure).
- **Read**: `get_user_context`, `find_availability`, plus task/calendar/canvas/source readers (`readTools.ts`) and note tools (`noteTools.ts`).
- Destructive actions are forced to `riskLevel: high` + `requiresConfirmation`. All mutations remain confirmation-based.
- Date handling goes through the single flexible parser in `lib/bruno/dates.ts` — do not add a second date parser.

### Personality
- **Tone**: Perceptive, grounded, emotionally intelligent. Sparse, natural bear language (e.g., 'wise move'); no therapist scripts, wellness platitudes, or generic productivity advice.
- **Truthfulness**: Accepts tradeoffs; does not force false depth or mindfulness onto simple tasks.
- **Act decisively**: The prompt's ACTION POLICY says act on clear requests, handle compound requests, ask at most one focused question, read before write. Don't reintroduce pre-LLM regex gates or clarification quizzes on the action path.

### Scope Limits
- Composio integrations (Notion, Slack, Linear) are **flag-gated Pro** (`featureFlags.ts`). Do not claim they are v1 core or always available. N8N and other flagged integrations are not shipped for general users.

---

## Vaulted features (not in product)

Per `apps/web/lib/featureFlags.ts`, these are off by default — UI in `app/_archive/` where applicable:

- Goals / Projects (`PROJECTS`)
- Habits (`HABITS`)
- Garden of Done (`GARDEN_OF_DONE`)
- Focus Mode (`FOCUS_MODE`)
- Goal Architect / AI decompose routes (`AI_ARCHITECT`, `AI_DECOMPOSE`, `AI_BREAKDOWN`, etc.)
- Academic Search, Command Center, Omnibox, n8n

Do not add nav entries or marketing copy for vaulted features. Exception: the legacy `COMMAND_CENTER` flag predates and is unrelated to the **Planevo Command** initiative — Command work follows its own plan doc and flags (`PLANEVO_COMMAND_ENABLED`), not this vault list.

---

## Development Phases & Guidelines

Authoritative docs, in order of precedence:

1. [`apps/web/STRATEGY.md`](apps/web/STRATEGY.md) — what Planevo is and is not
2. [`docs/superpowers/plans/comprehensive.md`](docs/superpowers/plans/comprehensive.md) — the Planevo Command transition plan (next major initiative)
3. [`docs/BRUNO_AGENT_ROADMAP.md`](docs/BRUNO_AGENT_ROADMAP.md) — Bruno pipeline state, shipped phases, remaining follow-ups
4. [`docs/SETTINGS_IMPLEMENTATION_TASKS.md`](docs/SETTINGS_IMPLEMENTATION_TASKS.md) — settings work

Outside the Command initiative, avoid expanding scope beyond the current wedge: Canvas + Google Calendar + Daily Plan + Adaptive Day Rollover + Notes + Bruno + mobile companion.
