# Planevo — PRD / Working Memory

## Product
Planevo: proactive AI planner ("Bruno") for students/high-performers. Monorepo:
- `apps/web` — Next.js (App Router) + Supabase + Tailwind v4. Warm cream/honey "Bruno" aesthetic.
- `apps/mobile` — Expo/React Native + Supabase.
NOTE: Local supervisor (backend/frontend/mongo) is the default template and does NOT run this monorepo. Web needs Supabase env to run; not available in this workspace, so live preview / E2E here is not possible. Verified via lint + tsc.

## Session log
### 2026-06 — Settings & Appearance audit + full fix
Audited and fixed the appearance/settings system across web + mobile.
- Findings: Appearance page was a stub; dark-on-dark unreadable settings text; two disconnected theme systems; toggles were dead code with no CSS; `animate-fade-in` undefined; mobile "Dark Mode" was fake; mobile used green palette (not brand). See `/app/APPEARANCE_AUDIT.md`.
- Web: rebuilt theme engine in `globals.css` (light/dark/sepia + 7 accents + fade-in + font-scale + reduce-motion); `next-themes` owns mode; new `components/providers/AppearanceProvider.tsx` owns accent/text-size/motion with no-flash script; rewrote `ui/ThemeToggle.tsx` + `ui/ColorSchemeToggle.tsx`; built full `dashboard/settings/appearance/page.tsx`; token-ized all settings pages for readability.
- Mobile: re-skinned `constants/Colors.ts` to honey/cream + 7 accents; new `providers/ThemeProvider.tsx` (mode+accent, expo-secure-store persistence); `hooks/useTheme` re-exports it; `_layout.tsx` drives nav theme; `(tabs)/settings.tsx` has working Appearance section.

## Status: implemented, lint + typecheck clean. NOT runtime-tested (no Supabase env in workspace).

## Backlog (P1/P2)
- P1: Persist appearance prefs to Supabase profile → sync web↔mobile↔devices.
- P2: Quick theme toggle in dashboard sidebar.
- P2: Per-accent calendar/focus event colors.
- P2: Mobile accent to recolor all static `Colors.brand[*]` usages.
