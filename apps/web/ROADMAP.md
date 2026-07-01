# Planevo: Product Roadmap

> **Status:** Living document aligned with [`apps/web/STRATEGY.md`](STRATEGY.md).  
> **Positioning:** Availability-aware daily planner — not AI-first, not goals/habits product.

---

## Shipped (v1 core)

- Google Calendar integration (OAuth + sync)
- Daily Plan built from calendar gaps, tasks, and focus windows
- **Adaptive Day Rollover** — day recovery when schedules slip
- Bruno Chat with propose → confirm → execute tools
- Canvas LMS sync, task backlog, notes
- Stripe billing ($9.99/mo, $79/yr, $4.99 .edu)
- Mobile companion (Expo) — Plan, Calendar, Tasks, Notes, Bruno
- Warm editorial visual system (honey/cream tokens)

---

## Near-term (retention + polish)

- Landing page copy aligned with availability positioning (Open Design)
- Onboarding flow per STRATEGY §9 (<90 seconds)
- Weekly review email (not dashboard widget)
- Push notifications for daily plan readiness
- iOS lock-screen "next action" widget
- Appearance prefs sync web ↔ mobile via Supabase profile

---

## Future (only after v1 metrics hit STRATEGY §11)

- Deeper **availability intelligence** — smarter gap detection, energy-aware block placement
- Study-group / body-doubling tier (different audience, not feature gates)
- B2B / schools (contact sales)

---

## Vaulted — not on roadmap unless users explicitly ask

These remain in codebase behind feature flags; **do not market or plan as next releases:**

- Goals / Projects / Goal Architect
- Habits + streak tracking
- Garden of Done
- Focus Mode (standalone)
- Academic Search, Command Center, Omnibox

See [`apps/web/lib/featureFlags.ts`](apps/web/lib/featureFlags.ts).

---

## Explicit non-goals (next 6 months)

Per STRATEGY §12: no team features, no Notion-style workspace, no tiered pricing, no shame-recovery or AI-first marketing, no goals/habits in launch copy.
