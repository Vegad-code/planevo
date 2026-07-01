# Planevo V3 UI/UX Scale Redesign Plan: "Liquid Precision"

> **PLANNING/DISCOVERY — June 2026.** See positioning guardrails in [`2026-06-15-planevo-v3-comprehensive-redesign-plan.md`](2026-06-15-planevo-v3-comprehensive-redesign-plan.md) and [`apps/web/STRATEGY.md`](../../apps/web/STRATEGY.md).

**Goal:** Execute a comprehensive, ecosystem-wide redesign of the Planevo Web App, Mobile App, and Landing Page. The objective is to elevate the product to a premium, highly trustworthy, and visually cohesive standard inspired by top-tier modern applications.

---

## 1. Foundational Research & Design Philosophy

To achieve the quality of your Dribbble reference pictures, we must adopt specific, industry-proven design paradigms. This section breaks down the research into how successful brands accomplish this.

### A. Cross-Platform Consistency: The Todoist & Notion Paradigms
- **The Todoist Paradigm (Consistency Through Focus):** Todoist maintains a rigid, predictable structural layout across mobile and web. The mental model never changes: what is a list on mobile is a list on the web; what opens a sheet on mobile opens a side-panel on the web. 
- **The Notion Paradigm (Consistency Through Primitives):** Notion uses a block-based system. We will borrow their approach to typography and spacing, ensuring that a "Task Card" uses the exact same padding, font size proportions, and border radii regardless of the device.
- **Our Approach:** Planevo will adopt absolute structural parity. Mobile and Web will no longer be treated as cousins; they will be twins. If an action requires three taps on mobile, it should require no more than three clicks on the web. 

### B. High-Performance Aesthetics: The Linear Standard
- **The Linear Standard:** Linear's UI feels incredibly fast because of its minimalism, high-contrast text, and "developer-first" aesthetic. 
- **Implementation:** 
  - Eradicate "bloat" and decorative shadows. 
  - Rely on 1px ultra-light borders (e.g., `border-gray-200` in light mode, `border-white/10` in dark mode).
  - Use high-contrast, premium typography (Geist, Inter, or SF Pro). 
  - **No serif fonts in the product interface.** Serifs will be strictly avoided to maintain a modern, "tool-like" feel.

### C. Apple's "Liquid Glass" (VisionOS Glassmorphism)
- **What it is:** A dynamic, contextual material system. Unlike early glassmorphism that just blurred backgrounds, Apple's Liquid Glass relies on a flat, content-driven base layer with translucent control layers (nav bars, sidebars, modals) floating above.
- **Implementation:** 
  - Keep the z-index hierarchy incredibly flat. 
  - Use `backdrop-blur` heavily on fixed navigation elements. 
  - In light mode, glass materials will use `bg-white/80` (never fully opaque or too transparent).
  - Text placed over glass *must* maintain a 4.5:1 contrast ratio.

### D. Landing Page Trust & Purposeful Animation
- **Why the current page fails:** "Vibe code," mascot-heavy designs, and unverified claims erode trust. Modern consumers are highly skeptical. 
- **Building Trust:** 
  - Show, don't tell. The hero section must feature the *actual app interface*, not abstract illustrations.
  - Remove Bruno as the "face" of the brand. Bruno transitions into the "Intelligent Engine" (a subtle monogram or sleek icon) that works in the background.
- **The Rules of Animation:**
  - **When to animate:** To confirm an action (a button scale-up to 1.02x on hover), to guide the eye down the page (staggered scroll reveals 300-500ms), or to explain a complex feature (a clean Lottie animation of a drag-and-drop workflow).
  - **When NOT to animate:** Never use chaotic floating shapes, never loop endless GIFs that tank page performance, and never delay the user from reading the primary Call to Action.

---

## 2. Core Visual Tokens (Shared System)

Before touching any code in the web or mobile phases, a unified design system must be established in the monorepo (`packages/design-tokens`).

### Color Palette (High-Contrast Neutral)
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `bg-canvas` | `#F9FAFB` (Gray 50) | `#030712` (Gray 950) | Base app background |
| `bg-surface` | `#FFFFFF` | `#111827` (Gray 900) | Cards, Modals, Lists |
| `bg-glass` | `rgba(255, 255, 255, 0.8)` | `rgba(17, 24, 39, 0.8)` | Sticky navs, overlays (with backdrop-blur) |
| `text-primary` | `#0F172A` (Slate 900) | `#F8FAFC` (Slate 50) | Headers, primary data |
| `text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Descriptions, timestamps |
| `border-subtle` | `#E2E8F0` (Slate 200) | `#1E293B` (Slate 800) | Dividers, card borders |
| `brand-accent` | `#000000` (High contrast) | `#FFFFFF` | Primary buttons, active states |

### Typography & Spacing
- **Font:** Switch completely to a modern sans-serif (e.g., SF Pro for Apple native, Inter/Geist for Web). 
- **Radius:** Standardize on rounded, friendly but professional corners: `12px` for inner cards, `16px` or `24px` for outer containers/modals.
- **Spacing:** Strict 4px grid (4, 8, 12, 16, 24, 32, 48, 64).

---

## 3. Phase 1: The Web App Redesign

The web dashboard must evolve from a dense, separated layout into a fluid, unified canvas. 

### Structural Layout
1. **The Liquid Sidebar:**
   - The left sidebar will use the `bg-glass` token with a `backdrop-blur-xl`. It should float slightly over the canvas background. 
   - Icons must be updated to a sharp, modern SVG set (e.g., Lucide or Heroicons). No emojis.
2. **The Command Center (Daily Plan):**
   - The main view will adopt a split-pane layout. 
   - Left pane: The continuous timeline of the day. 
   - Right pane (or slide-over panel): Task backlog.
   - *This directly mimics the mobile "Today" view, ensuring parity.*
3. **Floating Header:**
   - The top header containing the date, search, and user profile will be sticky, utilizing the Liquid Glass effect so content scrolls visibly underneath it.

### UI Components Redesign
- **Task Rows:** Move away from isolated "boxes." Use edge-to-edge list rows separated by 1px `border-subtle`. This reduces visual noise.
- **Calendar View:** Adopt a clean, minimal grid without heavy cell borders. Events should be pills with a subtle left-border accent color, rather than solid blocks of saturated color.
- **Bruno Integration:** Bruno moves from a disruptive mascot to a sleek, floating "Command Palette" (Cmd+K style) or a subtle chat side-panel.

---

## 4. Phase 2: The Mobile App Redesign

Mobile must feel like the exact same product as the web app, simply optimized for a smaller viewport and touch targets.

### Structural Layout
1. **Liquid Navigation:**
   - The bottom tab bar and top headers will use Expo's `<BlurView>` to perfectly replicate the web app's glassmorphism.
2. **The "Today" Tab:**
   - **Hero Section:** A large, beautifully rounded card (24px radius) displaying the *current ongoing task*.
   - **Timeline:** Scrolling down reveals the rest of the day, matching the Web App's continuous flow.
3. **Gestures & Interactions (Micro-animations):**
   - Implement 120Hz-smooth swipe-to-complete gestures on task rows.
   - Haptic feedback is mandatory for all structural actions (completing a task, rescheduling).

### Achieving Web Parity
- **Task Detail Sheet:** Tapping a task on mobile will open a bottom sheet. This sheet will contain the *exact same data hierarchy* and *exact same iconography* as the web app's side-panel. 
- **Bruno Tab:** The dedicated Bruno tab becomes a clean, professional chat interface. We will use system typography, tight message bubbles, and remove oversized illustrations.

---

## 5. Phase 3: The Landing Page Redesign

This is where trust is established. We will completely overhaul the page to eliminate "vibe code" and position Planevo as a premium, reliable tool.

### Eradicating False Claims & "Vibe Code"
- **Absolute Truth:** The page will only list features that are actively deployed and working perfectly.
- **Pricing:** Crystal clear pricing tiers. No "EDU" discounts mentioned unless there is a functional, automated flow for students to claim it. 
- **Mascot Reduction:** Bruno is not the hero. The user's productivity is the hero. Bruno is positioned as the sleek AI engine that powers the experience.

### Layout & Visuals
1. **The Hero Section (Show, Don't Tell):**
   - **Visual:** A massive, high-resolution mockup or, preferably, an auto-playing, high-framerate HTML5 video of the *actual V3 interface* in action. 
   - **Copy:** "Command your day with liquid precision." (Or similar high-impact, benefit-driven copy).
   - **CTA:** A high-contrast `brand-accent` button.
2. **Social Proof (The Trust Layer):**
   - Immediately below the fold, place authentic user reviews, App Store ratings, or logos of teams using Planevo. 
3. **Feature Bento Box:**
   - Use a popular, modern "Bento Box" grid layout to showcase key features. Each box uses the Liquid Glass aesthetic (`bg-surface` with subtle borders). 
   - Highlight the cross-platform parity: Show a mobile screen and web screen side-by-side in perfect sync.
4. **Purposeful Animation Implementation:**
   - **Scroll-driven reveals:** As the user scrolls to the Bento Box, the cards fade up and in (using `framer-motion` or CSS transitions, ~400ms ease-out). 
   - **Interactive Elements:** Hovering over a feature card slightly lifts it (`transform: translateY(-2px) scale(1.01)`) with a subtle glow, proving the site is alive and responsive.

---

## 6. Execution Roadmap

1. **Phase 0:** Lock in the Design Tokens (Colors, Typography, Spacing) in `packages/design-tokens`.
2. **Phase 1:** Apply tokens to Web App Primitives (Buttons, Cards, Inputs).
3. **Phase 2:** Overhaul Web App Layouts (Dashboard, Calendar, Tasks).
4. **Phase 3:** Replicate UI strictly in React Native / Expo for Mobile.
5. **Phase 4:** Build the new Landing Page using the verified V3 design language.
