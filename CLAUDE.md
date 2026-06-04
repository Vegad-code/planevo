# Planevo Developer Guidelines (CLAUDE.md)

Planevo is a student-first AI planner that integrates Canvas LMS assignments, Google Calendar, and manual tasks into a cohesive daily plan. The core companion is **Bruno**, an emotionally intelligent, psychologically sophisticated planning assistant.

## Tech Stack

### Monorepo Structure
- **Root**: Coordinates dependencies and scripts for the workspaces.
- **Web App (`apps/web`)**:
  - Framework: Next.js 16 (App Router)
  - Styling: Tailwind CSS 4
  - State Management: Zustand (client-side state), React Query (server-state scaffolding)
  - Database & Auth: Supabase (Postgres & Supabase Auth)
  - AI Integration: Vercel AI SDK (utilizing OpenAI models)
  - UI Components: Radix UI primitives, Framer Motion, Phosphor Icons, React Big Calendar
  - Integrations: Google Calendar OAuth, Canvas LMS Sync
  - Communications: Resend + React Email
  - Observability: Sentry, PostHog
- **Mobile App (`apps/mobile`)**:
  - Framework: React Native (Expo SDK 54)
  - Routing: Expo Router
  - Styling: Native/Custom styles
  - Clients: Supabase client, posthog-react-native, sentry-react-native
- **Core Package (`packages/core`)**:
  - Shared TypeScript types (generated from Supabase schema), helper classes, and client wrappers.

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
- `npm run android` — start Expo development server for Android
- `npm run ios` — start Expo development server for iOS
- `npm run web` — start Expo development server for Web
- `npm run test` — run Jest tests

---

## Core Directory Structure

```
/apps
  /web
    /app              → Next.js App Router (auth, pricing, terms, dashboard, settings, api)
    /components       → UI components (ui, layout, bruno, calendar, dashboard, tasks, onboarding)
    /lib              → Helpers (supabase, ai/bruno, calendar, stripe, email, posthog)
    /types            → Web-specific types
  /mobile
    /app              → Expo Router layouts and screens ((tabs), calendar, chat, settings, tasks)
    /components       → Mobile-specific UI elements
    /lib              → Mobile helpers & push notification configurations
/packages
  /core
    /src
      /types.ts       → Database schema types generated from Supabase
      /supabase-client.ts → Shared supabase client helpers
```

---

## Key Data Models (Supabase Public Schema)

- **`users`**: Profiles, integration tokens (Canvas/Google), onboarding status, Stripe customer/subscription details, and push tokens.
- **`calendar_events`**: Canonical source of truth for all daily plan blocks (status: `pending_ai`, `accepted`, `confirmed`, `completed`, `skipped`, `rescheduled`, `rejected`).
- **`tasks`**: Backlog of manual and imported tasks, including recurrence patterns and estimated completion times.
- **`user_ai_memory`**: Bruno's learned behaviors, planning style, focus hours, break preferences, and tone configurations.
- **`bruno_messages` & `chat_conversations`**: Chat transcript history for Bruno conversations.
- **`canvas_assignments`**: Cache of imported Canvas assignments.
- **`ai_feedback`**: Logs of user accepted/rejected plan suggestions to feed the personalization loop.
- **`schedules`**: Historical snapshot logs of the daily plans (not read for active dashboard rendering).

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

### AI Scheduling & Planning State
- **Canonical Source**: `calendar_events` owns plan scheduling. Do not read schedules from the `schedules` snapshot table for live rendering.
- **Lifecycle Integrity**: Do not mark a task `completed=true` just because it was scheduled.
- **Quota Boundaries**: Enforce free tier bounds: 1 AI daily plan per week, 5 Bruno chat messages per day, and read-only Google Calendar sync.

---

## Bruno Chat AI Personality & Rules

Bruno is a bear-themed planning partner designed for high performers and students:
- **Tone**: Perceptive, grounded, and emotionally intelligent. He uses sparse, natural bear language (e.g., 'wise move') but avoids therapist scripts, wellness platitudes, and generic productivity advice.
- **Truthfulness**: Bruno accepts tradeoffs (e.g., admitting that obsessive work patterns produce short-term gains) and does not force false depth or mindfulness on simple tasks.
- **Tools**: Bruno interacts with the application via function-calling tools:
  - `create_task`, `update_task`, `complete_task`
  - `create_calendar_block`, `move_calendar_block`
  - `accept_block`, `reject_block`
  - `break_down_task`
- **Scope Limits**: Do not claim integrations that are not fully built (e.g., Slack, Notion, Monday, GitHub, N8N) are supported in AI prompts.

---

## Development Phases & Guidelines

For major modifications, refer to [SETTINGS_IMPLEMENTATION_TASKS.md](file:///c:/Users/jabbo/M1plan/planevo/docs/SETTINGS_IMPLEMENTATION_TASKS.md) and the 14-day finalization roadmap. Avoid expanding product scope beyond the student-first planner wedge (Canvas + Google read-only + Daily plan + Bruno chat + Mobile companion).