# Planevo — PRD / Working Memory

## Product

**Planevo:** availability-aware daily planner for students and high-performers. Builds each day from real calendar gaps and focus windows; **Adaptive Day Rollover** when the day changes. Bruno is the in-app companion; scheduling automation stays in the background.

**Product SSOT:** [`apps/web/STRATEGY.md`](../apps/web/STRATEGY.md)

**Monorepo:**
- `apps/web` — Next.js 16 (App Router) + Supabase + Tailwind v4. Warm cream/honey aesthetic.
- `apps/mobile` — Expo SDK 54 + Supabase.

**Vaulted (not in product):** Goals/Projects, Habits, Garden of Done, Focus Mode, Goal Architect — see `apps/web/lib/featureFlags.ts`.

---

## Session log

### 2026-06 — Documentation alignment

Repositioned docs: day + availability centric; Adaptive Day Rollover; quiet automation; vaulted goals. See `planevo/README.md` and STRATEGY.md decision log.

### 2026-06 — Settings & Appearance audit + full fix

Audited and fixed the appearance/settings system across web + mobile.
- Findings: Appearance page was a stub; dark-on-dark unreadable settings text; two disconnected theme systems; toggles were dead code with no CSS; `animate-fade-in` undefined; mobile "Dark Mode" was fake; mobile used green palette (not brand). See `apps/web/APPEARANCE_AUDIT.md`.
- Web: rebuilt theme engine in `globals.css` (light/dark/sepia + 7 accents + fade-in + font-scale + reduce-motion); `next-themes` owns mode; `AppearanceProvider.tsx` owns accent/text-size/motion; full settings appearance page.
- Mobile: re-skinned to honey/cream + 7 accents; `ThemeProvider.tsx` with secure-store persistence.

---

## Backlog (P1/P2)

- P1: Persist appearance prefs to Supabase profile → sync web↔mobile↔devices.
- P2: Quick theme toggle in dashboard sidebar.
- P2: Per-accent calendar/focus event colors.
- P2: Mobile accent to recolor all static brand color usages.
