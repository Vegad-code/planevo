# Planevo

**Planevo** is an availability-aware daily planner for students and high-performers. It brings Canvas, Google Calendar, and tasks into one **Daily Plan** built around your real open time — then quietly adapts when your day changes.

Automation (scheduling, gap-filling, reshuffle) runs in the background. The product identity is **your day and your availability**, not "AI planner" or shame-recovery framing.

**Bruno** is the in-app companion who proposes schedule changes; users confirm before anything mutates.

---

## Monorepo layout

| Path | What it is |
|------|------------|
| [`apps/web/`](apps/web/) | Next.js 16 web app (primary product) |
| [`apps/mobile/`](apps/mobile/) | Expo SDK 54 mobile companion |
| [`packages/`](packages/) | Shared packages (`notes-core`, theme, core types) |
| [`supabase/`](supabase/) | Database migrations |
| [`docs/`](docs/) | ADRs, architecture, operational runbooks |
| [`design_handoff_planevo_redesign/`](design_handoff_planevo_redesign/) | Visual redesign reference for landing + app |

The workspace folder is **M1plan**; the product name is **Planevo**.

---

## Documentation index

**Read these before designing the landing page or writing marketing copy:**

1. **[`apps/web/STRATEGY.md`](apps/web/STRATEGY.md)** — Product SSOT: positioning, v1 scope, anti-goals
2. **[`design_handoff_planevo_redesign/README.md`](design_handoff_planevo_redesign/README.md)** — Design tokens, landing/onboarding copy guardrails
3. **[`CLAUDE.md`](CLAUDE.md)** — Engineering SSOT for agents: stack, data models, availability model

**Development:**

- [`apps/web/README.md`](apps/web/README.md) — Web app dev onboarding
- [`apps/mobile/MOBILE_DEVELOPMENT.md`](apps/mobile/MOBILE_DEVELOPMENT.md) — Expo dev workflow
- [`LAUNCH_CHECKLIST.md`](LAUNCH_CHECKLIST.md) — Pre-ship gates

**Architecture:**

- [`docs/adr/`](docs/adr/) — Architecture decision records
- [`docs/architecture/SECURITY_DATA_FLOW.md`](docs/architecture/SECURITY_DATA_FLOW.md)

**Historical / archived plans** (not current product truth):

- [`docs/archive/README.md`](docs/archive/README.md)

---

## Core product concepts

| Term | Meaning |
|------|---------|
| **Daily Plan** | Primary day view; today's `calendar_events` as ordered time blocks |
| **Availability** | Free time = calendar gaps minus avoided windows, bounded by work hours |
| **Adaptive Day Rollover** | Unfinished work moves into today's available slots when the day slips |
| **Vaulted** | Feature flag off, no nav, not marketed (Goals, Habits, Garden of Done, etc.) |

---

## Commands (from `planevo/` root)

```bash
npm run dev       # Web dev server
npm run check     # lint + typecheck + test + build
```

---

## Note for Open Design / landing redesign

Live landing code in [`apps/web/app/page.tsx`](apps/web/app/page.tsx) may still contain legacy copy (e.g. "shame-free daily planner"). **Use `STRATEGY.md` and `design_handoff_planevo_redesign/README.md` as copy source**, not the current production strings.
