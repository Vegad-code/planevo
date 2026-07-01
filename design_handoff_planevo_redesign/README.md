# Planevo — Visual Redesign Handoff

## Overview

This package contains a full visual redesign for **Planevo**, an availability-aware daily planner for students and high-performers (per [`apps/web/STRATEGY.md`](../apps/web/STRATEGY.md)). It replaces the legacy brutalist visual system with a **warm, editorial, availability-first** aesthetic.

The product builds each day around **real calendar gaps and focus windows**, then **adaptively reshuffles** when the day changes. Automation stays in the background — not "AI planner" marketing.

The redesign covers three surfaces:

1. **Landing page** — public marketing site
2. **App pages** — dashboard, daily plan, tasks, calendar, settings (logged-in product)
3. **Onboarding flow** — 8-screen sign-up to first-plan flow, with animated mascot

**Mascot:** **Bruno (bear)**. Ollie/PlanPilot renames are complete in production code; do not reintroduce old branding.

### Positioning guardrails (read before writing copy)

- **Do:** day, availability, open time, adaptive reshuffle, Daily Plan, Adaptive Day Rollover
- **Do not:** "AI planner" / "AI co-pilot" as headline; shame-free / guilt-free as brand identity
- **Do not:** Goals, Habits, Garden of Done, or Goal Architect in marketing — **vaulted**, not shipped
- **Bruno:** warm companion who proposes changes; user confirms — not the product category

---

## About the Design Files

The files in this bundle are **design references created in HTML/JSX prototypes**. They show the intended look, layout, copy, and behavior — but they are **NOT production code to copy directly**.

The goal is to **recreate these designs in the existing Planevo Next.js codebase** (`apps/web/`) using its established patterns:

- Next.js 16 App Router with React Server Components where appropriate
- Tailwind CSS for styling (replace the inline-style objects in the prototypes)
- TypeScript (`.tsx`) instead of `.jsx`
- The existing component organization under `apps/web/components/`
- The existing `@phosphor-icons/react` library for icons (replace emoji where used)
- The existing Framer Motion dependency for any complex animations (the prototypes use plain CSS keyframes)

The HTML files are **interactive prototypes you can open in a browser** to verify intended behavior — particularly Bruno's animations and the onboarding flow interactions.

---

## Fidelity

**High-fidelity (hi-fi).** All colors, typography, spacing, border radii, and motion are final. Recreate pixel-perfectly.

---

## Files in this package

| File | What it is |
| --- | --- |
| `01_Landing_Page.html` | Self-contained landing page — open in browser to view |
| `02_App_Pages.html` | Design canvas containing 5 app screens side-by-side |
| `03_Onboarding.html` | Design canvas containing the 8 onboarding screens with live Bruno animations |
| `components/app-screens.jsx` | React components for all app screens (Dashboard, DailyPlan, Tasks, Calendar, Settings) |
| `components/onboarding-screens.jsx` | React components for all 8 onboarding screens + animated `Bruno` component |
| `components/design-canvas.jsx` | Canvas wrapper used to preview screens side-by-side — **do not ship**, reference only |

---

## Design Tokens (use these exactly)

### Colors

Add these to `tailwind.config.ts` under `theme.extend.colors`:

```ts
{
  cream:    '#F2E8D2',        // Page background
  'cream-2':'#E8DCC0',        // Hover/secondary surface
  paper:    '#FBF6EA',        // Card surface (slightly warmer than cream)
  ink:      '#1A140D',        // Primary text + dark surfaces (hero card, sidebar)
  'ink-2':  '#2A2118',        // Hover state on ink
  'ink-soft':  '#4A3F32',     // Secondary text
  'ink-faint': '#8A7B66',     // Tertiary text / disabled

  bruno:       '#8B5A2B',     // Bear body (mascot)
  'bruno-deep':'#6B4423',     // Bear ears + emotional-beat dark surfaces (letter card, side cards)
  'bruno-light':'#C99A5F',    // Bear ear inner
  belly:       '#E8C896',     // Bear muzzle/belly

  honey:       '#D08741',     // Primary CTA, accents
  'honey-deep':'#B96E2A',     // Honey hover / italic accent text in headlines
  'honey-soft':'#F5DCB8',     // Honey tag backgrounds

  sage:       '#6B8B69',      // Success states, "synced", "now"
  'sage-soft':'#D8E2D6',      // Sage tag backgrounds

  rose:       '#C56B5E',      // Canvas LMS color, conflict/blocked states, danger
  'rose-soft':'#F5D5D0',      // Rose tag backgrounds

  blue:       '#5B8DCF',      // Google Calendar color
  'blue-soft':'#D5E3F2',
}
```

Line/border colors:
```ts
'line':       'rgba(26, 20, 13, 0.10)',  // soft borders on cards
'line-strong':'rgba(26, 20, 13, 0.18)',  // visible borders
```

### Typography

Three fonts via `next/font/google`:

```ts
// apps/web/app/layout.tsx
import { Instrument_Serif, Geist, Geist_Mono } from 'next/font/google';

const serif = Instrument_Serif({
  subsets: ['latin'], weight: ['400'], style: ['normal', 'italic'],
  variable: '--font-serif',
});
const sans = Geist({
  subsets: ['latin'], weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});
const mono = Geist_Mono({
  subsets: ['latin'], weight: ['400', '500'],
  variable: '--font-mono',
});
```

**Usage rules:**
- **Serif (Instrument Serif)** → All headlines, hero titles, page titles, card titles, big numbers in stats. Always with italic accent words colored `honey-deep`.
- **Sans (Geist)** → All body copy, form inputs, buttons, secondary text.
- **Mono (Geist Mono)** → Eyebrows (`STEP 01 / 08`, `MONDAY · MAY 18`), timestamps, status pills, stat labels — anything that should feel "system-spec".

### Typography scale

| Use | Family | Size | Line height | Letter-spacing | Weight |
| --- | --- | --- | --- | --- | --- |
| Hero display | Serif | 108px | 0.92 | -0.025em | 400 |
| Section H1 | Serif | 80px | 0.94 | -0.025em | 400 |
| Page title | Serif | 56px | 0.96 | -0.025em | 400 |
| Onboarding title | Serif | 46px | 1.04 | -0.02em | 400 |
| Card title | Serif | 22-32px | 1.0-1.2 | -0.01 to -0.02em | 400 |
| Body large | Sans | 19px | 1.55 | normal | 400 |
| Body | Sans | 15-17px | 1.5-1.55 | normal | 400 |
| Body small | Sans | 13-14px | 1.4-1.55 | normal | 400-500 |
| Eyebrow | Mono | 11-12px | 1 | 0.16-0.18em | 400-500, UPPERCASE |
| Micro/timestamp | Mono | 10-11px | 1 | 0.06-0.1em | 400 |

### Spacing & geometry

- Card border radius: **14-22px** (small cards 14, medium 18, hero/marketing cards 22-32)
- Pill button radius: **999px**
- Page horizontal padding: **32-72px** depending on surface
- Section vertical padding: **60-120px** on landing; **24-40px** on app pages
- Grid gaps: **8-24px** scaled to context

### Shadows

- Card resting: `0 1px 0 rgba(26,20,13,0.04)` (almost none — use border for separation)
- Plan widget on dark hero: `0 30px 80px -20px rgba(0,0,0,0.5), 0 8px 24px -8px rgba(0,0,0,0.3)`
- Honey button: `0 1px 0 #B96E2A` (subtle pressed-edge feel)

---

## Surface 1: Landing Page

**File:** `01_Landing_Page.html`

**Structure (top to bottom):**

1. **Nav** — sticky on cream, brand on left, link cluster center, "Sign in" + dark pill CTA "Start free →" on right
2. **Hero card** — **dark ink card with 32px radius** containing:
   - Left: eyebrow pill ("Introducing Planevo · Plans around your real day"), serif headline "Plans that *bend.* Never break.", subhead (Canvas + calendar + to-dos → one Daily Plan; Bruno reshuffles when life intervenes), honey CTA "Start your 14 days free →" + ghost link "Watch the 60-second tour", mono trust line
   - Right: A **real-looking Daily Plan widget** (paper card with 5 time-blocked rows, one struck-through-and-moved, one "NEW" highlighted) + a **Bruno speech bubble overlay** explaining the reshuffle
3. **Trust strip** — "Quietly planning days at" + university names in alternating italic/roman serif
4. **Magic moment section** — "Adaptive Day Rollover · When the day changes". Headline "When plans slip, *we adapt.*" Two-column **before/after** card (paper bg) showing the same day's calendar before (with `CONFLICT`/`BLOCKED` red rose badges) and 38 seconds later (with `+ ADDED` and `MOVED` honey badges). Big circular `→` divider between them.
5. **Three pillars** — Connect / Plan / Chat. Each pillar is a paper card with mono "— 01" index, serif title with italic accent, body, then a **mini live preview** of the surface (sync source list / mini timeline / mini chat with input mock).
6. **Letter from Bruno** — full-bleed `bruno-deep` brown card. Left: 220×260 Bruno portrait (belly-colored frame). Right: eyebrow ("A note from Bruno" in honey), 56px serif "When the day falls apart, *we rebuild around what's left.*", two paragraphs on availability and adaptive reshuffle, italic "— Bruno" signature in honey.
7. **Pricing** — paper card, 64px serif "Everything Bruno does. *$9.99 a month.*" + 2-column perks list. Right side: dark ink "price tag" card with `.EDU SAVES 50%` honey tag, $9.99 amount in 76px serif, honey CTA, $4.99 .edu note.
8. **Final CTA** — centered, 140px serif "Let Bruno *plan it.*"
9. **Footer** — 4-column (brand + tagline / Product / For you / Company) with copyright + status line

**Critical interactions:**
- The "MOVED" task row in the hero plan has `text-decoration: line-through` with rose color
- The "NEW" task row has a honey "NEW" pill positioned absolutely above its top-left corner
- All buttons: subtle `translateY(-1px)` on hover

---

## Surface 2: App Pages

**File:** `02_App_Pages.html` (canvas) · components in `app-screens.jsx`

**Shared chrome:** Every app screen has a **240px dark sidebar** on the left:
- Brand at top (Bruno mark + "Planevo" wordmark)
- "WORKSPACE" eyebrow + 4 nav items (Dashboard, Daily Plan, Tasks, Calendar)
- Active nav: honey text + `rgba(208,135,65,0.12)` background + 6×6 honey dot on right
- "Ask Bruno" card (transparent on dark, paper button with ⌘K hint)
- Settings link + user card at the bottom (32×32 honey avatar, name, "14 days · trial" plan label)

### 2.1 Dashboard

**Purpose:** Single-screen overview. Surfaces ONE next action (per strategy §4 painkiller list).

**Layout:**
1. Page header: mono eyebrow "MONDAY · MAY 18 · 6:15 PM", serif "Good evening, *Anthony.*", subhead, right side source pills (Canvas/Calendar) — divider under header
2. **Hero card** (ink dark, 22px radius, 2-column):
   - Left: Bruno mark + "BRUNO · 2 MIN AGO" mono + italic serif "Tonight is for the light stuff." → big serif "Your *next move* is a 25-minute read." → body → honey "Start focus block →" + ghost "See full plan"
   - Right: **time block widget** (paper card with progress bar, "NOW · 6:15 PM" + "● FOCUS", title, source meta, 38% honey progress bar, "9 MIN IN · 16 LEFT" / "BRUNO: NEXT IS A STRETCH") + **up next** translucent panel with 3 short rows
3. **Stats row** (4 paper cards): "Done today 4", "Focus time 2h 14m", "Open tasks 9", "Streak 11d" — each with a colored 7px tone dot, mono label, 44px serif number, mono sub
4. **Detail row** (2-col):
   - Left (1.5fr): "This week" paper card with mono day + task list, "Move" pill button per row
   - Right (1fr): **Bruno-deep brown card** "BRUNO NOTICED" with a serif insight ("Your Tuesday *mornings* are your most productive — 73% of deep work happens before noon.") + honey "Open chat with Bruno" CTA

### 2.2 Daily Plan

**Purpose:** Full day timeline + sources view.

**Layout:** 1.7fr / 1fr two-column grid below the page header.

- **Left:** Timeline card with mono "YOUR DAY · 6 BLOCKS" + serif "9:00 AM *—* 9:30 PM" + Day/Week chips. Six time rows, each with:
  - 70px-wide time + duration (mono)
  - 4px source-colored vertical bar (rose=Canvas, blue=Calendar, honey=Bruno task)
  - Title + mono tag line ("DEEP WORK · MORNING SHARP" etc.)
  - "● NOW" honey pill on current row (which also has honey-tinted background)
  - "✓ DONE" sage label on completed rows (with strike-through)

- **Right column** (3 stacked cards):
  1. **Energy** card — paper, Low/Medium/High segmented buttons + advisory body
  2. **Sources pulled** card — paper, 3 rows (Canvas/Google Calendar/Tasks) with colored 26×26 icon, count, "✓ 2M AGO" sage
  3. **Bruno note** card — bruno-deep brown, mark + body + cream "Keep tomorrow morning" CTA

### 2.3 Tasks

**Purpose:** Cross-source task list with Bruno-priority sort.

**Layout:**
- Header with right-side **consistency widget** ("73% consistency / 11d streak" paper pill) + dark "+ Add task" CTA
- Filter bar: All/Canvas/Calendar/Personal pills + "SORT" + "Bruno priority ↓"
- **Bruno banner** (ink dark): Bruno mark + italic serif "Your *History essay* moved up — Thursday creeps up faster than you think." + "Why?" honey ghost button
- **3 task groups** (Today / This week / Later), each a paper card with:
  - Serif group title + mono count + mono note
  - Task rows: 22×22 checkbox, title, mono meta line (`● Source · due Day · ~Xm`), priority tag (rose=high, honey=medium, sage=low), `···` action button

### 2.4 Calendar

**Purpose:** Unified week view with backlog.

**Layout:** 1fr / 280px two-column.

- **Left:** Paper week grid (Mon-Fri), 9 AM-6 PM rows, 60px per hour. Events are colored blocks (canvas=rose-bg, calendar=blue-bg, task=honey-bg) with a 3px left border in the dot color. Today (Mon) column has a **honey "NOW" line** at 11:15 with a dot on the left edge. Moved/Added events get mono badges inside.
- **Right column:**
  1. **Backlog card** — "3 items waiting" + 3 unscheduled rows with grab handle + 4×28 honey indicator
  2. **Bruno auto-schedule card** — bruno-deep brown, "Want me to schedule the backlog?" + honey CTA

### 2.5 Settings

**Purpose:** Sub-nav + content panel pattern.

**Layout:** 260px / 1fr two-column.

- **Left subnav card** (paper, 16px radius):
  - Workspace card at top: 40×40 honey avatar with initials, serif name, mono ".EDU VERIFIED"
  - 8 section links (Profile, Sources & Integrations, Bruno preferences, Appearance, Notifications, Membership, Data & privacy, Danger zone)
  - Active item: `cream` background + `honey-deep` text + 3×16 honey marker on the left edge
  - Membership shows honey "Trial · 11d" badge
  - Danger zone is rose color
  - Bruno-deep brown "Tip" card at bottom

- **Right content panel:**
  - Section head (serif title + body)
  - Then **settings blocks** (paper, 18px radius), each with:
    - Block head: mono eyebrow + serif title with italic accent + body
    - Block body: rows OR integration card grid

  **Integration cards** (3-up grid, used for Canvas/Calendar/Notion/Slack etc.):
  - Cream background, 14px radius
  - 36×36 colored icon top-left (source brand color)
  - Status pill top-right: CONNECTED (sage-soft bg) / AVAILABLE (cream-2 bg) / COMING SOON (cream-2 bg + 0.6 opacity)
  - Name (15px bold), description (12px), meta line, action buttons (Manage+Disconnect / Connect → / Notify me)

  **Settings rows** (used for toggles + time chips):
  - Label + 12px description on left, control on right
  - **Toggle:** 38×22 pill, sage when on, paper handle
  - **Time chips:** pill row of mono-text options, dark-active state

---

## Surface 3: Onboarding (8 screens with animated Bruno)

**File:** `03_Onboarding.html` (canvas) · components in `onboarding-screens.jsx`

### Critical: The flow is reduced from 16 → 8 screens

The old onboarding (16 steps with fear-mongering copy like "208 hours lost", "drowning", "panic mode") **must be retired**. Per strategy §9, onboarding completes in **<90 seconds** with **warm, day-pattern self-ID tone** (not shame-recovery framing).

### Screen list

| # | Name | Lever | Key copy |
| --- | --- | --- | --- |
| 1 | Welcome | Self-identification | "Hi, I'm *Bruno.* Want me to plan your week?" — Google + email signup |
| 2 | Identity | Day-pattern self-ID | "Which of these sound *familiar?*" — options about shifting schedules, packed weeks, replanning friction (not guilt/shame framing) |
| 3 | Name | Personalization | "What should I *call* you?" — single input with live Bruno greeting |
| 4 | Energy | Personalization | "When does your brain *actually* work?" — Morning/Afternoon/Night/Varies |
| 5 | Canvas | Wow moment | "Let me read your *Canvas.*" — connect form + explicit permission scopes |
| 6 | Calendar | Wow moment | "Now your *calendar.*" — Google OAuth + scopes |
| 7 | First plan | Sunk cost | "Your first *plan*, Anthony." — 4-stat summary + real plan card |
| 8 | Trial | Loss-aversion + transparency | "Keep Bruno *on your side.*" — pricing + auto-detected .edu rate |

### Shared chrome

- 24px top padding · "← Back" left, "STEP 01 / 08" mono right
- 4px progress track on cream with honey fill, animated (0.6s ease)
- Bottom: 🔒 SECURE · PLANEVO mono micro-text

### Bruno animation system (CRITICAL — this is what makes it feel alive)

The `Bruno` component (in `onboarding-screens.jsx`) is a fully animated SVG character. **Move the keyframes block into `globals.css`** and the component into `apps/web/components/onboarding/Bruno.tsx`.

**Animations (CSS keyframes, all in `onboarding-screens.jsx` lines ~46-100):**

| Keyframe | Duration | Used when |
| --- | --- | --- |
| `bruno-idle` | 3.4s ease-in-out infinite | Always — gentle breathing bob |
| `bruno-blink` | 5s infinite | Always — eye scaleY blink with right-eye stagger |
| `bruno-bounce-react` | 0.7s cubic-bezier(.34,1.56,.64,1) | When user clicks a checkbox/option |
| `bruno-tilt` | 1.6s ease-in-out infinite | While user is typing in name input |
| `bruno-wave` | 1.1s ease-in-out infinite | Welcome screen (paw wave) |
| `bruno-peek` | 0.6s cubic-bezier(.34,1.56,.64,1) | Mount animation on Canvas screen |
| `bruno-pop` | 0.6s cubic-bezier(.34,1.56,.64,1) | Mount on First Plan and Trial screens |

**Mood states** (eye/mouth variants in SVG):
- `normal` — open eyes, gentle smile
- `happy` — closed-arc smiling eyes, open mouth grin
- `thinking` — eyes look up/right, small mouth, sparkles above ear
- `curious` — wider eyes, "o" mouth
- `sleepy` — closed-arc eyes
- `celebrating` — happy + rose cheek blushes

**Reaction trigger pattern (React):**

```tsx
const [reactBump, setReactBump] = useState(0);
// ... on user action:
setReactBump(b => b + 1);
// ... pass to Bruno:
<Bruno mood="curious" react={reactBump} />
```

Inside Bruno, a `useEffect` on `react` increments a key that re-mounts the bounce animation cleanly each time.

**Per-screen Bruno wiring:**

| Screen | Mood | Animation | Reaction trigger |
| --- | --- | --- | --- |
| 1 Welcome | `happy` | wave paw (always) | n/a |
| 2 Identity | `curious` | bounce on each select | every checkbox toggle |
| 3 Name | `thinking`→`happy` | tilt while typing | onChange in input + 700ms timeout |
| 4 Energy | dynamic per option (`happy`/`normal`/`sleepy`/`curious`) | bounce on each select | option change |
| 5 Canvas | `curious` | `peek` animation on mount | n/a |
| 6 Calendar | `thinking` | sparkles above ears | n/a |
| 7 First plan | `happy` | `pop` animation on mount | n/a |
| 8 Trial | `celebrating` | `pop` + cheek blushes | n/a |

### Live speech bubble (`BrunoBubble` component)

Bruno's lines **type out character-by-character** at 22ms/char, then drop a "— BRUNO" mono signature. Re-types each time the `text` prop changes (e.g. when count of selected items changes on screen 2).

Two tones:
- `cream` (default) — paper bg + 3px honey left border
- `dark` — bruno-deep brown bg, paper text, honey "— BRUNO" sub

### Screen 1 (Welcome) — specifics

- Centered layout
- Bruno (140px) in paper card frame, waving
- 46px serif "Hi, I'm *Bruno.* Want me to plan your week?"
- Body
- Paper signup card at bottom: mono "START FREE · 14 DAYS", ink "Continue with Google" pill with G circle, ghost "Continue with email", legal microcopy

### Screen 2 (Identity) — specifics

- Top row: 72px Bruno (curious) + title block right
- 5 multi-select option rows (paper, 14px radius), checked = 2px honey border + `translateX(2px)`, 22px rounded-square checkbox
- Bruno bubble (dark) below, text changes with count: 0 → "Tap whichever ones ring true"; 1-2 → "You're not alone, by the way."; 3+ → "Oof — you're not lazy, that's a system problem. I can fix that."
- Honey CTA "That's me · continue" with mono helper showing count

### Screen 3 (Name) — specifics

- Centered Bruno (120px) — `thinking` mood + `tilt` animation while typing, `happy` when idle
- Title + input (2px honey border, serif text 26px)
- Live bubble greeting beneath: "Hey {name} — nice to meet you. I'll keep things light unless you tell me otherwise."
- Typing timer: 700ms after last keystroke = back to happy/idle

### Screen 4 (Energy) — specifics

- Top row: 80px Bruno + title block
- 4 single-select option rows (paper, 14px radius), each with 44×44 emoji icon, serif name, body, mono hours on right
- Selected → 2px honey border + `scale(1.01)`
- Bruno's mood updates live to match selection (morning=happy, afternoon=normal, night=sleepy, varies=curious)

### Screen 5 (Canvas) — specifics

- Top row: 80px Bruno (curious, `peek` animation)
- Title block
- Connection card (paper, 18px radius): Canvas LMS row with 38×38 rose icon, URL meta, ink "Connect →" button
- **Permission scope card** below (cream bg, 12px radius):
  - "I'LL READ" eyebrow + 3 sage-check rows (course names, due dates, schedule)
  - "I WON'T READ" eyebrow + 2 rose-× rows (essays/grades, messages)
- Skip link below, then honey CTA with "Encrypted in transit & at rest" mono helper

### Screen 6 (Calendar) — specifics

Same pattern as Canvas. Bruno is `thinking` mood. Bottom bruno-deep speech bubble: "I'll look for empty windows between your classes and slot in the right work — never on top of your calendar."

### Screen 7 (First plan) — specifics

- Top row: 76px Bruno (happy, `pop`)
- Title + body
- **4 summary stats** (grid): "23 ITEMS READ" / "6 BLOCKS PLANNED" (honey) / "2h 30m DEEP FOCUS" (sage) / "1 DUE THIS WEEK" (rose) — each with 26px serif number + mono micro label
- **Tomorrow plan card** (paper): head with serif date + sage "● BRUNO BUILT THIS" mono, then 4 plan rows (mono time, 3px source-colored bar, title, mono tag, mono duration)
- CTA "Looks good — keep going"

### Screen 8 (Trial) — specifics

- Centered Bruno (86px, celebrating + pop)
- Title block
- **Ink dark price card:**
  - Left: honey eyebrow "PLANEVO · ALL OF IT" + 40px serif "$0 · 14 days" + mono "THEN $9.99/MO · CANCEL ANY TIME"
  - Right: honey-tinted eduTag with ".EDU DETECTED" + serif "$4.99/mo"
  - Border divider, then 2-col perks list with honey checks
- **Monthly/Annual tab pill** (paper bg, ink active) with honey "SAVE 34%" tag on Annual
- Honey CTA "Start my 14 days free" + helper

---

## Implementation order (recommended)

1. **Tailwind tokens + fonts** — Drop the color palette into `tailwind.config.ts`, swap fonts via `next/font`. Verify on the existing landing page first to confirm colors render correctly.
2. **Bruno component** — Port `Bruno`, `BrunoBubble`, and animation keyframes into `apps/web/components/onboarding/`. Verify all 6 keyframes + 6 mood states work.
3. **Onboarding screens** — Port 8 screens one at a time. These are the highest strategic priority (strategy §9).
4. **Dashboard** — Port the dashboard from `app-screens.jsx`. This is the painkiller surface (strategy §16 Painkiller Visibility Rule).
5. **Daily Plan, Tasks, Calendar, Settings** — Port one at a time, sharing the `Sidebar` component.
6. **Landing page** — Port last; it's mostly static markup once tokens are in place.

---

## What to remove from the existing codebase

Per the new design system, **delete or feature-flag-off**:

- All references to "Ollie" the owl mascot — already replaced with Bruno in production
- All references to "PlanPilot" branding — already removed
- `OllieAvatar` and `OllieBubble` components — replace with `Bruno` + `BrunoBubble`
- The brutalist style elements: chunky `border-2 border-surface-900 shadow-[Npx_Npx_0_0_var(--surface-900)]` boxes, all-caps `tracking-widest font-black` body copy, the rotation hover transforms
- The 16-step onboarding flow with fear-based copy ("208 hours lost", "drowning", "panic mode") — replace with the 8-screen flow
- The brutalist hue swatches in Settings (FOREST/AQUA/VIOLET/CRIMSON/MIDNIGHT) — Appearance section reduces to: light/dark toggle + 3-4 curated accent options

---

## Open questions for the developer

1. **Bruno illustration** — The component currently uses simple geometric SVG (circles + ellipses). The design intent is for a real illustrator to deliver Bruno artwork. Until then, the SVG is good enough — but plan for a swap to an SVG sprite or Lottie file in the future.
2. **The empty Settings sections** — The current handoff details only Sources & Integrations. Profile, Bruno preferences, Appearance, Notifications, Membership, Data & privacy, and Danger zone are subnav stubs that need their own pass once the pattern is in place.
3. **Mobile** — The prototypes are designed at 720-1440px desktop widths. Mobile responsive (and the React Native Expo app) is the next design pass; not in this handoff.

---

## Reference: How to view the prototypes

Open the three HTML files in any browser. They are fully interactive:
- `01_Landing_Page.html` — scroll to see all sections
- `02_App_Pages.html` — pan/zoom the canvas with mouse drag + scroll, click an artboard's expand icon for full-screen
- `03_Onboarding.html` — click checkboxes/options, type in the name field to see Bruno's animations
