# Planevo Web App

Availability-aware daily planner for students and high-performers. The web app is the primary Planevo surface: it syncs Canvas and Google Calendar, builds a **Daily Plan** from real open time, and **adaptively reshuffles** when the day changes.

Product positioning lives in [`STRATEGY.md`](STRATEGY.md). Engineering context in [`../../CLAUDE.md`](../../CLAUDE.md).

---

## Current product surfaces

| Route | Purpose |
|-------|---------|
| `/dashboard` | Home: week strip, schedule preview, connection status |
| `/dashboard/daily-plan` | Primary day experience — today's time blocks |
| `/dashboard/tasks` | Task backlog; adaptive reschedule UX |
| `/dashboard/calendar` | Full calendar view |
| `/dashboard/notes` | Notes + flashcards |
| `/dashboard/deep-work` | Focus timer tied to calendar blocks |
| `/dashboard/settings/*` | Profile, integrations, calendar & planning, Bruno, appearance, billing |

**Bruno** opens as a global dock on dashboard routes (`/dashboard/chat` redirects to dashboard).

---

## Core technical concepts

### Availability

Availability is not a separate module. It is inferred from:

- Occupied time in `calendar_events` (manual, Google, Canvas, suggested blocks)
- **Preferred / avoided focus windows** in `user_ai_memory`
- **Work hours** and planning style in settings

`findGaps()` in `lib/calendar.ts` computes free slots; the daily plan generator fills them.

### Daily Plan

Canonical schedule source: **`calendar_events`** (not the `schedules` snapshot table). AI-suggested blocks start as `pending`; user accept → `accepted`.

See `lib/plan/day-plan.ts`, `lib/ai/generate-daily-plan.ts`.

### Adaptive Day Rollover

On app open (or via API), unfinished tasks roll into today without punitive overdue badges. Marketing name: **Adaptive Day Rollover**. Implementation: `/api/schedule/rollover`, reschedule modal in tasks UI.

---

## Vaulted — not in the product

These exist in schema or `_archive/` but are **feature-flagged off** and not in nav:

- Goals / Projects (`PROJECTS`)
- Habits (`HABITS`)
- Garden of Done (`GARDEN_OF_DONE`)
- Focus Mode (`FOCUS_MODE`)
- Goal Architect AI routes (`AI_ARCHITECT`, `AI_DECOMPOSE`, etc.)

See [`lib/featureFlags.ts`](lib/featureFlags.ts).

---

## Development

### Environment variables

Required in `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM` (or `WEEKLY_REVIEW_FROM`)
- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`

### Commands

```bash
npm run dev        # http://localhost:3000
npm run check      # lint + typecheck + test + build
npm run test:e2e   # Playwright
```

Post-deploy email setup: [`docs/NOTIFICATIONS_AUDIT.md`](docs/NOTIFICATIONS_AUDIT.md).

---

## Design reference

Landing and app visual system: [`../../design_handoff_planevo_redesign/README.md`](../../design_handoff_planevo_redesign/README.md).
