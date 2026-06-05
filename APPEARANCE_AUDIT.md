# Planevo — Settings & Appearance Audit + Fixes

Date: June 2026 · Scope: Web (`apps/web`) + Mobile (`apps/mobile`)

---

## 1. What was wrong (findings)

### 🔴 Critical
1. **Appearance page was a non-functional stub.** `settings/appearance/page.tsx` literally rendered *"Appearance settings coming soon."* yet it was advertised in the settings sidebar, search registry and keywords as a real feature.
2. **Unreadable dark-on-dark settings text.** The settings shell (`bg-settings-bg`, sidebar) was hardwired to a near‑black palette (`--color-bg-dark: #09090b`), while every settings *page* hardcoded dark ink text (`text-[#2A2118]`) — i.e. dark text on a near‑black panel. Headings like "Notifications", "Bruno preferences", "Appearance" were effectively invisible.
3. **Two competing theme systems that never connected.**
   - Root layout used `next-themes` (`attribute="class"`, toggles `.dark`/`.light`).
   - `ThemeToggle.tsx` (light/dark/sepia) used a *different* mechanism: `data-theme` attribute + its own `localStorage('theme')`.
   - `ColorSchemeToggle.tsx` (5 accents) used yet another: `data-theme-color` + `localStorage('theme-color')`.
   - **Neither toggle was imported anywhere** — both were dead code.

### 🟠 Broken-but-listed features
4. **No CSS backed the toggles.** `globals.css` had no `[data-theme]` selectors, no `.dark` rule, and zero CSS for any of the 5 advertised color schemes (forest/aqua/violet/crimson/midnight). So even if shown, dark mode, sepia, and *every* accent did nothing.
5. **`animate-fade-in` was never defined** but used in 20+ components → entrance animations silently no-op.
6. **Mobile "Dark Mode" row was static display text** ("System") — toggled nothing; mobile theme followed the OS only, with no user control or persistence.
7. **Mobile brand mismatch.** `constants/Colors.ts` was a **green "Forest"** palette (`#5d8a66`) despite a comment claiming it matched the web — web is honey/cream.

### 🟡 Consistency / polish
8. **Dashboard ignored theme** — `dashboard/layout.tsx` hardcoded a cream background regardless of mode, while settings forced dark → the app looked half‑light/half‑dark.
9. **Confusing token naming** — variables named `--color-*-dark` were overridden by `.light`/`.sepia`, making the system hard to reason about.

---

## 2. How it was fixed

### Web
- **Rebuilt the theme engine in `globals.css`:**
  - `light` (Honey/Cream, default) · `dark` (warm Espresso) · `sepia` (Parchment) — applied as a class on `<html>` by `next-themes`. Theme classes now override the **brand surface + text tokens** (cream/paper/ink/lines) so the **entire app** (dashboard, settings, calendar) re-themes coherently.
  - Settings semantic tokens now **follow the active theme** instead of being permanently dark → readable in every mode.
  - Added `@keyframes fade-in` + `--animate-fade-in` so existing entrance animations work.
  - Added a user UI‑scale variable (`--font-scale`) and a `reduce-motion` global rule.
- **Unified state via providers:**
  - `next-themes` now owns the **mode** (`themes={['light','dark','sepia']}`, `defaultTheme="light"`, `enableSystem`).
  - New `AppearanceProvider` owns **accent + text size + reduced motion**, persisted to `localStorage`, with a **no‑flash inline `<head>` script** so preferences apply before first paint.
- **Rewrote the two dead components** to actually work: `ThemeToggle` (cycles via next-themes), `ColorSchemeToggle` (accent picker wired to `AppearanceProvider`).
- **Built a full Appearance page**: Theme cards (Light/Dark/Sepia/System) with live mini‑previews, accent swatches, text‑size control, reduce‑motion switch, a live UI preview, and Reset.
- **Fixed readability** across all settings pages: replaced hardcoded `text-[#2A2118]`/`text-[#8a7b66]`/`bg-white`/borders with theme tokens.

### Mobile
- Re‑skinned `constants/Colors.ts` to the **honey/cream brand** (now matches web) + exported 7 accent schemes.
- New `providers/ThemeProvider.tsx`: mode (System/Light/Dark) + accent, **persisted with `expo-secure-store`**; `hooks/useTheme` re‑exports it (no consumer changes needed).
- `_layout.tsx` now drives React‑Navigation theme from the user's choice.
- Settings screen: the dead "Dark Mode" row is replaced by a working **Appearance** section (theme segmented control + accent swatches).

---

## 3. New colors added (accent palette)

All tuned to sit harmoniously on cream / sepia / espresso and keep Bruno's fur on‑brand:

| Accent | Primary | Deep | Soft |
|---|---|---|---|
| **Honey** (default) | `#D08741` | `#B96E2A` | `#F5DCB8` |
| Terracotta | `#C9663B` | `#A84E28` | `#F3D7C5` |
| Amber | `#DDA02C` | `#BC8216` | `#F7E6BE` |
| Rosewood | `#C2675C` | `#9E4D44` | `#F4D8D2` |
| Sage | `#6F9266` | `#557049` | `#DCE7D5` |
| Ocean | `#3E8194` | `#2C6072` | `#CDE3E8` |
| Plum | `#9A5F84` | `#784765` | `#ECDCE7` |

Plus full mode palettes — Dark (espresso `#16110C`/`#221B14`, text `#F7EFE1`) and Sepia (parchment `#F4EAD2`/`#FBF3DF`, ink `#3A2F1F`).

---

## 4. Further improvement ideas (backlog)
- Persist appearance prefs to the user profile (Supabase) so they sync across devices/web↔mobile.
- Add a quick theme toggle in the dashboard sidebar for discoverability.
- Per‑accent tuned focus/calendar event colors.
- Expand mobile accent to recolor all `Colors.brand[*]` static references (currently accent drives the tint surfaces).
