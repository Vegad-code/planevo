# Landing Premium Rebuild — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the conference design brief (`docs/superpowers/research/landing-2026-07/design-brief.md`) and playbook (`apps/web/docs/LANDING_PREMIUM_PLAYBOOK.md`) — take the landing page from "Little Bird costume" to premium: honest proof via working demo, WCAG-clean details, editorial Fraunces with mass, motion that plays once and rests, a 3-deep-rows + bento structure, and signed founder credibility.

**Architecture:** All work happens in `apps/web` (Next.js 16 App Router, Tailwind 4, Framer Motion, tokens in `app/globals.css`). Landing components live in `components/landing-v2/`. We change tokens/CSS first (palette scoping, focus, type), then fix motion primitives, then restructure the page, then assets/SEO, then verify with Playwright + axe.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4 (CSS-first tokens), Framer Motion, `next/og` ImageResponse, Playwright + `@axe-core/playwright`, Higgsfield MCP (brand art only).

**Working rules for the executor:**
- Dev server may already be running on `:3000` (check terminals before starting another).
- After every task: `npm run typecheck --workspace planevo` and `npm run lint --workspace planevo` must pass. Commit per task.
- Never use `space-y-*` (use `flex` + `gap-*`); semantic tokens over raw hex; Server Components unless interactivity requires `'use client'`.
- The playbook (`apps/web/docs/LANDING_PREMIUM_PLAYBOOK.md`) is the *why*; the design brief is the *what*; this plan is the *how*. If they conflict, this plan wins.
- **SLOGAN:** Where this plan says "SLOGAN: use the founder-approved slogan," the implementer must use the exact slogan text chosen by the founder from the design brief's three candidates. Do not hardcode a candidate until approved.

**Skill usage map (read the skill BEFORE the phase that names it):**

| When | Skill / tool | How to use it |
|---|---|---|
| Before Task 3 (type scale) & any styling task | `~/.agents/skills/shadcn/SKILL.md` + workspace tailwind rules | Styling conventions, `cn()`, semantic tokens |
| Before Task 8–14 (components/perf) | `~/.agents/skills/vercel-react-best-practices/SKILL.md`, `~/.agents/skills/next-best-practices/SKILL.md` | RSC boundaries, avoiding re-render storms |
| Before Task 13 (bento) — optional | `magic-ui` via @21st-dev/magic MCP (`/ui` generation) | Generate a bento-grid starting point, then restyle with our tokens; do NOT ship its colors/fonts |
| Task 16 (forest band art) | Higgsfield MCP (`models_explore`, `generate_image`, `upscale_image`, `outpaint_image`) | Brand layer ONLY. Follow the exact call script in Task 16 |
| After all tasks | superpowers:verification-before-completion | Run §10 checklist of the playbook |

---

## File structure (what gets created / modified)

```
apps/web/
  app/
    globals.css                     MODIFY  (marketing scope, focus, scroll, type tokens, details anim)
    layout.tsx                      MODIFY  (Fraunces, metadata)
    page.tsx                        MODIFY  (section order, metadata dedupe)
    opengraph-image.tsx             CREATE  (OG card via ImageResponse)
  assets/fonts/Fraunces-SemiBold.ttf CREATE (for OG image)
  components/landing-v2/
    DotGridSurface.tsx              MODIFY  (marketing-scope class)
    GlassNav.tsx                    MODIFY  (4 links, active state, scroll lock)
    Eyebrow.tsx                     CREATE  (the only mono-caps allowed)
    sections/HeroSection.tsx        MODIFY  (copy, CTA, leading)
    sections/ProofStrip.tsx         CREATE  (integration logos + specificity line)
    sections/FoundersNote.tsx       CREATE  (replaces AdaptWithYouSection)
    sections/AdaptWithYouSection.tsx DELETE
    sections/FeatureBento.tsx       CREATE  (Sources/Tasks/Calendar/Notes compact)
    sections/FeatureSources.tsx     DELETE  (folded into bento)
    sections/FeatureTasks.tsx       DELETE
    sections/FeatureCalendar.tsx    DELETE
    sections/FeatureNotes.tsx       DELETE
    sections/PricingSection.tsx     MODIFY  (annual toggle, .edu promotion, contrast)
    sections/FaqSection.tsx         MODIFY  (export FAQS, JSON-LD, focus, faq-item class)
    sections/FinalCta.tsx           MODIFY  (copy — SLOGAN echo)
    sections/FeatureShowcase.tsx    MODIFY  (Eyebrow, link labels, scroll-mt)
    motion/RotatingWord.tsx         MODIFY  (fixed width, sr-only, 3.2s)
    motion/ScrollTextFill.tsx       MODIFY  (120vh track)
    motion/ScrollConnectLine.tsx    MODIFY  (ResizeObserver, 3 nodes)
    demo/CommandHeroDemo.tsx        MODIFY  (play-once + replay)
    demo/CaptureFlowDemo.tsx        MODIFY  (rAF typewriter, single pass)
  e2e/landing-a11y.spec.ts          CREATE  (axe gate)
  public/landing/bg/forest.png     REPLACE (Higgsfield illustration → webp)
  public/landing/bruno-idle.mp4    DELETE
```

---

## Phase 1 — Correctness & trust

### Task 1: Server-render the marketing palette

**Problem:** Warm palette only exists under `html[data-public="true"]`, set by client JS (`lib/appearance/no-flash-script.ts`). First paint / no-JS shows the dashboard's slate palette. Crawlers and OG screenshot tools see the wrong colors.

**Research basis:** Playbook §7 (server-rendered marketing palette), SaaSFrame report (§2: "show the actual product UI" — can't show warm UI if server renders cold).

**Files:**
- Modify: `apps/web/app/globals.css` (~line 215 and ~line 261)
- Modify: `apps/web/components/landing-v2/DotGridSurface.tsx`

- [ ] **Step 1: Extend the palette selectors.** In `globals.css`, change the two selector lines:

```css
/* line ~215 — was: html[data-public="true"] { */
html[data-public="true"],
.marketing-scope {
```

```css
/* line ~261 — was: html[data-public="true"].dark, html[data-public="true"].sepia { */
html[data-public="true"].dark,
html[data-public="true"].sepia,
.dark .marketing-scope,
.sepia .marketing-scope {
```

- [ ] **Step 2: Apply the class in the page shell.** In `DotGridSurface.tsx`, add `marketing-scope` to the `DotGridPage` wrapper div's className:

```tsx
    <div
      className={cn(
        'marketing-scope relative min-h-screen overflow-x-clip bg-[var(--color-paper)] font-sans text-[var(--color-ink)]',
        className,
      )}
    >
```

- [ ] **Step 3: Verify.** With dev server running: `curl -s localhost:3000 | grep -o 'marketing-scope' | head -1` → prints `marketing-scope`. In the browser with JS disabled, the page background must be cream `#FFFDF5`, not white/slate.

- [ ] **Step 4: Commit.** `git add -A && git commit -m "fix(landing): server-render warm marketing palette via .marketing-scope"`

---

### Task 2: Global focus styles + smooth anchors

**Research basis:** Playbook §7 (the detail layer), Littlebird report §3.5 (no scroll-jacking), SaaSFrame §6 (FAQ anchor behavior).

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: All sections with `id` attributes (`FeatureShowcase.tsx`, `PricingSection.tsx`, `FaqSection.tsx`, `BrunoSection.tsx`)

- [ ] **Step 1: Add to `globals.css`** (after the `body` rule, ~line 575):

```css
:where(a, button, summary, input, textarea, select, [tabindex]):focus-visible {
  outline: 2px solid var(--color-honey-deep);
  outline-offset: 2px;
}

html {
  scroll-behavior: smooth;
}
@media (prefers-reduced-motion: reduce) {
  html {
    scroll-behavior: auto;
  }
}
```

- [ ] **Step 2: Add scroll offset to every anchored section.** In `FeatureShowcase.tsx` the `<section id={id}` gets `scroll-mt-24`:

```tsx
    <section id={id} className="scroll-mt-24 px-6 py-16 sm:py-24">
```

Do the same in `PricingSection.tsx` (`id="pricing"`), `FaqSection.tsx` (`id="faq"`), `BrunoSection.tsx` (`id="bruno"`).

- [ ] **Step 3: Verify.** Tab through the page from the address bar — every link/button shows a honey ring. Click a nav anchor — smooth scroll, heading fully visible below the glass nav.

- [ ] **Step 4: Commit.** `git commit -am "fix(landing): global focus-visible ring, smooth scroll, anchor offsets"`

---

### Task 3: Contrast pass

**Research basis:** Playbook §4.3 (WCAG AA), Littlebird report §3.3 (restrained palette with proper contrast).

**Rule:** `--color-ink-faint` (#9EA096, ~2.9:1 on cream) is banned for informational text. Informational text uses `--color-ink-soft` or darker. Dark-surface fine print ≥ `/70`.

**Files:** every file in `components/landing-v2/` matching the greps below.

- [ ] **Step 1: Find offenders.**

```bash
rg -l "ink-faint" apps/web/components/landing-v2
rg -n "paper\)\]/40" apps/web/components/landing-v2
```

- [ ] **Step 2: Apply replacements.** For each match rendering *readable text* (eyebrows, captions, footer headers, copyright, demo labels), replace `text-[var(--color-ink-faint)]` → `text-[var(--color-ink-soft)]`. Leave `ink-faint` ONLY on purely decorative glyphs (the quote marks in `ScrollTextFill`, the unfilled word layer — those are covered by sr-only duplicate).

In `PricingSection.tsx` for the risk-reversal line on the dark Pro card:

```tsx
            <p className="mt-4 text-center font-sans text-[12px] text-[var(--color-paper)]/70">
              Upgrade or cancel any time
            </p>
```

- [ ] **Step 3: Verify.** `rg -n "ink-faint" apps/web/components/landing-v2` — remaining hits must all be decorative. Expected survivors: `ScrollTextFill.tsx` quote marks + gray word layer, `DemoStateDots` inactive dot pill.

- [ ] **Step 4: Commit.** `git commit -am "fix(landing): WCAG AA contrast — retire ink-faint from informational text"`

---

### Task 4: One slogan + complete metadata + OG image

**Research basis:** Playbook §2 (one slogan everywhere), Littlebird §3.4 (no multi-font stacking in meta), SaaSFrame §2 (CTA pair patterns), Godly Pattern 1 (warm paper canvas translates to OG).

**SLOGAN: use the founder-approved slogan** — the exact text goes in h1, `<title>`, OG title, and FinalCta echo. The rotating-word treatment in the hero uses the synonyms specified in the design brief for the chosen slogan.

**Files:**
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/app/page.tsx`
- Create: `apps/web/app/opengraph-image.tsx`
- Create: `apps/web/assets/fonts/Fraunces-SemiBold.ttf`

- [ ] **Step 1: Root metadata** in `layout.tsx` — replace the whole `metadata` export:

```tsx
export const metadata: Metadata = {
  metadataBase: new URL("https://planevo.ai"),
  title: "Planevo — SLOGAN",
  description:
    "For students whose calendars change faster than they can replan. Planevo builds your day around your real availability — and adapts when life happens.",
  authors: [{ name: "Planevo Team" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://planevo.ai",
    siteName: "Planevo",
    title: "Planevo — SLOGAN",
    description:
      "Dump everything on your plate. Planevo turns it into a calm board, then places the work into the real free time on your calendar.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Planevo — SLOGAN",
    description:
      "A calm board of everything on your plate, planned into your real free time.",
  },
};
```

(`keywords` is deleted — ignored by search engines since 2009.)

- [ ] **Step 2: Page metadata** in `page.tsx` — delete the entire `metadata` export block (root covers it).

- [ ] **Step 3: Download the OG font.**

```bash
mkdir -p apps/web/assets/fonts
curl -L -o apps/web/assets/fonts/Fraunces-SemiBold.ttf \
  "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT%2CWONK%2Copsz%2Cwght%5D.ttf"
```

- [ ] **Step 4: Create `apps/web/app/opengraph-image.tsx`** (text composited in code — never AI-generated text):

```tsx
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const alt = 'Planevo — SLOGAN';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const fraunces = await readFile(
    join(process.cwd(), 'assets/fonts/Fraunces-SemiBold.ttf'),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#FFFDF5',
          backgroundImage:
            'radial-gradient(circle, rgba(27,28,21,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontSize: 28,
            color: '#6B6C61',
            letterSpacing: 4,
            textTransform: 'uppercase',
          }}
        >
          Planevo
        </div>
        <div
          style={{
            marginTop: 24,
            fontFamily: 'Fraunces',
            fontSize: 110,
            color: '#1B1C15',
            letterSpacing: -3,
            display: 'flex',
          }}
        >
          {/* SLOGAN: render the founder-approved slogan with the key word in italic honey */}
          A plan that&nbsp;
          <span style={{ fontStyle: 'italic', color: '#B96E2A' }}>adapts.</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 30, color: '#6B6C61', display: 'flex' }}>
          Your plate, planned into your real free time.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Fraunces', data: fraunces, style: 'normal', weight: 600 }],
    },
  );
}
```

- [ ] **Step 5: Verify.** Open `localhost:3000/opengraph-image` — a cream card with dot grid, serif slogan, honey italic word. Then `curl -s localhost:3000 | grep -o 'og:image[^>]*' | head -2` shows the image meta.

- [ ] **Step 6: Commit.** `git commit -am "feat(landing): canonical slogan, complete metadata, code-composited OG image"`

---

### Task 5: Proof strip (zero-users configuration)

**Research basis:** SaaSFrame §3 (cold-start 3-signal proof), design brief (proof strategy), playbook §3.1 item 3 (integration logos), Rise report Steal 3 (trigger-condition falsifiable claims), Godly DON'T 3 (no fake social proof).

**Files:**
- Create: `apps/web/components/landing-v2/sections/ProofStrip.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1: Create `ProofStrip.tsx`** — honest integration logos + one falsifiable promise. Server component, no motion:

```tsx
import {
  GraduationCap,
  CalendarBlank,
  Cube,
  ChatCircle,
  LineSegments,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';

const INTEGRATIONS: Array<{ name: string; icon: Icon }> = [
  { name: 'Canvas', icon: GraduationCap },
  { name: 'Google Calendar', icon: CalendarBlank },
  { name: 'Notion', icon: Cube },
  { name: 'Slack', icon: ChatCircle },
  { name: 'Linear', icon: LineSegments },
];

export function ProofStrip() {
  return (
    <section aria-label="Works with your tools" className="px-6 pb-16 sm:pb-20">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-5">
        <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {INTEGRATIONS.map(({ name, icon: BrandIcon }) => (
            <li
              key={name}
              className="flex items-center gap-2 text-[15px] font-medium text-[var(--color-ink-soft)]"
            >
              <BrandIcon size={20} weight="duotone" aria-hidden />
              {name}
            </li>
          ))}
        </ul>
        <p className="text-center text-[14px] text-[var(--color-ink-soft)]">
          Deadlines sync in by themselves — and Planevo never schedules over
          something already on your calendar.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount it** in `page.tsx` immediately after `<HeroSection />`:

```tsx
        <HeroSection />
        <ProofStrip />
```

(with `import { ProofStrip } from '@/components/landing-v2/sections/ProofStrip';`)

- [ ] **Step 3: Verify** visually at `localhost:3000`, then commit: `git commit -am "feat(landing): honest integration proof strip under hero"`

---

### Task 6: Founder's note (replaces the self-quote)

**Research basis:** Sunsama Steal 3 (values-as-trust through personal letter), playbook §3.1 item 2 (convert self-quote to signed founder's note), Littlebird Steal 3 (proof repositioned), design brief (FoundersNote after bento).

**Files:**
- Create: `apps/web/components/landing-v2/sections/FoundersNote.tsx`
- Modify: `apps/web/components/landing-v2/motion/ScrollTextFill.tsx` (track 200→120vh)
- Delete: `apps/web/components/landing-v2/sections/AdaptWithYouSection.tsx`
- Modify: `apps/web/app/page.tsx`

- [ ] **Step 1:** In `ScrollTextFill.tsx` change `const SCROLL_TRACK_VH = 200;` → `const SCROLL_TRACK_VH = 120;`

- [ ] **Step 2: Create `FoundersNote.tsx`.** Same pinned treatment, honest claim. The attribution is signed "The Planevo Team" (founder's fixed decision).

```tsx
import { ScrollTextFill } from '../motion/ScrollTextFill';

export function FoundersNote() {
  return (
    <ScrollTextFill
      quote="We built Planevo because our own weeks kept falling apart. When your day changes, it shouldn't cost you the plan — it should just move with you."
      attribution="The Planevo Team"
      role=""
    />
  );
}
```

- [ ] **Step 3:** In `page.tsx`, replace the `AdaptWithYouSection` import + usage with `FoundersNote`, then delete `AdaptWithYouSection.tsx`.

- [ ] **Step 4: Verify** the pinned quote now scrolls in ~1.2 viewports and the attribution reads "The Planevo Team". Commit: `git commit -am "feat(landing): convert self-quote to signed founder's note, shorten pin track"`

---

### Task 7: FAQ JSON-LD + honest links + free-chorus cut

**Research basis:** SaaSFrame §6 (FAQ conventions — JSON-LD, CTAs inside answers), playbook §2 (kill the free chorus), playbook §7 (honest link labels), Sunsama report (DON'T 1: don't pretend external validation).

**Files:**
- Modify: `apps/web/components/landing-v2/sections/FaqSection.tsx`
- Modify: `apps/web/components/landing-v2/sections/FeatureShowcase.tsx`
- Modify: `apps/web/components/landing-v2/sections/HeroSection.tsx`, `FinalCta.tsx`

- [ ] **Step 1: Export FAQS and add JSON-LD.** In `FaqSection.tsx`: change `const FAQS` → `export const FAQS`, and inside the returned `<section>` (first child) add:

```tsx
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQS.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />
```

- [ ] **Step 2: Honest link labels.** In `FeatureShowcase.tsx` change the link text `Learn more` → `Try it free`. (All `learnMoreHref` values already point to `/signup`.)

- [ ] **Step 3: Cut the free chorus.** "Free" survives in exactly two places: the hero badge pill and the pricing section.
  - `HeroSection.tsx`: delete the `<p className="mt-4 font-mono ...">Free to sign up · No card required · Pro from $9.99/mo</p>` block entirely.
  - `FinalCta.tsx`: replace the mono subtext line with:

```tsx
        <p className="mt-6 text-[14px] text-[var(--color-ink-soft)]">
          No card required · Cancel anytime
        </p>
```

- [ ] **Step 4: Verify** `rg -c -i "free" apps/web/components/landing-v2/sections/HeroSection.tsx` returns ≤2. Validate JSON-LD: view-source, paste block into https://validator.schema.org. Commit: `git commit -am "feat(landing): FAQ structured data, honest CTAs, cut free repetition"`

---

## Phase 2 — Premium feel

### Task 8: Typeface swap → Fraunces

**Research basis:** Playbook §4.2 (Cormorant is costume), Godly Pattern 2 & 3 (editorial serif as identity), design brief (typography confirmation — Fraunces, never Cormorant).

**Files:**
- Modify: `apps/web/app/layout.tsx`

- [ ] **Step 1: Replace the serif font.** In `layout.tsx`:

```tsx
import { Fraunces, Geist, Geist_Mono } from "next/font/google";

const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});
```

In the `<html>` className replace `${cormorantGaramond.variable}` with `${fraunces.variable}`. Delete the `cormorantGaramond` const and its comment.

- [ ] **Step 2: Fix display leading.** In `HeroSection.tsx` h1: `leading-[1.0]` → `leading-[1.06]`. In `FinalCta.tsx` h2: `leading-[1.05]` → `leading-[1.08]`.

- [ ] **Step 3: Verify.** `npm run typecheck --workspace planevo`; visually confirm headlines render in Fraunces with intact descenders.

- [ ] **Step 4: Commit.** `git commit -am "feat(landing): Fraunces display serif, fixed display leading"`

---

### Task 9: RotatingWord — fixed width, sr-only, slower

**Research basis:** Playbook §6 (motion doctrine — ≥3s interval, fixed width), design brief (CLS < 0.05 gate), Godly §3 (motion norms — reduced-motion respect non-negotiable).

**Files:**
- Modify: `apps/web/components/landing-v2/motion/RotatingWord.tsx` (full replacement)

- [ ] **Step 1: Replace the file contents:**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const WORDS = ['adapts', 'bends', 'listens', 'keeps up'] as const;
const LONGEST = 'keeps up';
const INTERVAL_MS = 3200;

export function RotatingWord() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((n) => (n + 1) % WORDS.length);
    }, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [reduce]);

  if (reduce) {
    return <span className="italic text-[var(--color-honey-deep)]">adapts.</span>;
  }

  return (
    <>
      <span className="sr-only">adapts.</span>
      <span
        aria-hidden
        className="relative inline-grid justify-items-center overflow-hidden pb-[0.12em] align-bottom"
      >
        <span className="invisible col-start-1 row-start-1 whitespace-nowrap italic">
          {LONGEST}.
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={WORDS[index]}
            initial={{ y: '70%', opacity: 0 }}
            animate={{ y: '0%', opacity: 1 }}
            exit={{ y: '-70%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 90, damping: 16 }}
            className="col-start-1 row-start-1 whitespace-nowrap italic text-[var(--color-honey-deep)]"
          >
            {WORDS[index]}.
          </motion.span>
        </AnimatePresence>
      </span>
    </>
  );
}
```

**Note:** The WORDS array must be updated to match the founder-approved slogan's rotating synonyms (design brief specifies options per candidate).

- [ ] **Step 2: Verify.** Two full cycles — headline block must not shift (DevTools → Rendering → Layout Shift Regions shows nothing). VoiceOver reads the static canonical word once.

- [ ] **Step 3: Commit.** `git commit -am "fix(landing): rotating word — zero CLS, sr-only canonical, 3.2s cycle"`

---

### Task 10: Hero copy + CTA

**Research basis:** Playbook §2 (hero copy ≤25 words), Littlebird §7 (sentence rhythm), Sunsama §3 (verb choices), SaaSFrame §2 (CTA pair — one primary, one secondary text).

**SLOGAN: use the founder-approved slogan** for the h1 text.

**Files:**
- Modify: `apps/web/components/landing-v2/sections/HeroSection.tsx`

- [ ] **Step 1: Replace subhead + CTA block:**

```tsx
          <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-[var(--color-ink-soft)] sm:text-[19px]">
            For students whose calendars change faster than they can replan.
            Planevo builds your day around your real availability — and adapts
            when life happens.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-full bg-[var(--color-ink)] px-8 py-3.5 text-center font-sans text-[16px] font-semibold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99] sm:w-auto"
            >
              Start free <span aria-hidden>→</span>
            </Link>
            <Link
              href="#capture"
              className="w-full rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-8 py-3.5 text-center font-sans text-[16px] font-medium text-[var(--color-ink)] transition-colors hover:bg-[var(--color-surface-muted)] sm:w-auto"
            >
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[var(--color-ink-soft)]">No card required</p>
```

(24-word subhead; the old mono price line is already gone from Task 7.)

- [ ] **Step 2: Verify + commit.** `git commit -am "feat(landing): tightened hero copy and CTA microcopy"`

---

### Task 11: Motion doctrine — demo plays once, rAF typewriter

**Research basis:** Playbook §6 (at rest the page is still), Amie DON'T 1 (don't strip all animation — keep the one that proves the product), Rise Appendix (make automation visible but contained), design brief (the ONE motion moment is the hero demo).

**Files:**
- Modify: `apps/web/components/landing-v2/demo/CaptureFlowDemo.tsx`
- Modify: `apps/web/components/landing-v2/demo/CommandHeroDemo.tsx`

- [ ] **Step 1: rAF typewriter.** In `CaptureFlowDemo.tsx`, replace `useTypewriter`:

```tsx
function useTypewriter(text: string, active: boolean, charsPerSecond = 55): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) {
      setCount(0);
      return;
    }
    setCount(0);
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const next = Math.min(text.length, Math.floor(((t - start) / 1000) * charsPerSecond));
      setCount((c) => (next > c ? next : c));
      if (next < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, active, charsPerSecond]);
  return text.slice(0, count);
}
```

Also update the phase timing that assumed 14ms/char — in the `'typing'` case: `await wait(Math.ceil((DUMP_TEXT.length / 55) * 1000) + 600);`

- [ ] **Step 2: Single pass in `CaptureFlowDemo`.** In the `'hold'` case, when there's no `onConfirmed` consumer, stop instead of looping:

```tsx
        case 'hold': {
          if (!onConfirmed) return;
          await wait(400);
          if (cancelled) return;
          setShowPreview(false);
          onPreviewChange?.(false);
          setCursorVisible(false);
          setCursor(REST);
          setPhase('typing');
          break;
        }
```

- [ ] **Step 3: Play-once + Replay in `CommandHeroDemo.tsx`.** Replace the board-stage loop effect and add replay:

```tsx
  const [runId, setRunId] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (reduce || paused || stage !== 'board' || finished) return;
    const id = window.setTimeout(() => {
      setCursorVisible(false);
      setFinished(true);
    }, 2600);
    return () => window.clearTimeout(id);
  }, [stage, reduce, paused, finished]);

  const replay = useCallback(() => {
    setFinished(false);
    setCapturePreview(false);
    setCaptureKey((k) => k + 1);
    setRunId((r) => r + 1);
    setStage('capture');
  }, []);
```

Below `<DemoStateDots ... />` add:

```tsx
      {finished && (
        <button
          type="button"
          onClick={replay}
          className="mx-auto rounded-full border border-[var(--color-line-strong)] bg-[var(--color-paper)] px-4 py-1.5 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
        >
          Replay demo ↺
        </button>
      )}
```

- [ ] **Step 4: Verify.** Load the page, don't touch anything: the demo runs capture → board, then "Replay demo ↺" appears and nothing on the page is moving 10 seconds after load. Commit: `git commit -am "perf(landing): hero demo plays once with replay; rAF typewriter"`

---

### Task 12: ScrollConnectLine — ResizeObserver, no scroll thrash

**Research basis:** Playbook §6 (never measure in scroll listener), design brief (three deep rows only).

**Files:**
- Modify: `apps/web/components/landing-v2/motion/ScrollConnectLine.tsx`

- [ ] **Step 1: Replace the measurement effect** (and shrink `NODE_IDS` to the three surviving deep rows):

```tsx
const NODE_IDS = ['capture', 'board', 'plan'] as const;
```

```tsx
  useEffect(() => {
    function measure() {
      const track = trackRef.current;
      if (!track) return;
      const trackTop = track.getBoundingClientRect().top + window.scrollY;
      const trackHeight = track.offsetHeight;
      const next = NODE_IDS.map((id) => {
        const el = document.getElementById(id);
        if (!el) return { id, top: 0 };
        const rect = el.getBoundingClientRect();
        const center = rect.top + window.scrollY + rect.height / 2 - trackTop;
        return { id, top: Math.min(trackHeight, Math.max(0, center)) };
      });
      setNodes(next);
    }

    measure();
    const ro = new ResizeObserver(measure);
    if (trackRef.current) ro.observe(trackRef.current);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);
```

- [ ] **Step 2: Verify.** Scroll the feature area — line grows smoothly; DevTools Performance shows no per-scroll `getBoundingClientRect` from this component. Commit: `git commit -am "perf(landing): connect line measures on resize, not scroll"`

---

### Task 13: Nav — 4 links, active section, scroll lock

**Research basis:** Playbook §5 (cut from 8 to 4-5), Littlebird §2.1 (only 3 top-level + CTA), design brief (section order dictates nav targets).

**Files:**
- Modify: `apps/web/components/landing-v2/GlassNav.tsx`

- [ ] **Step 1: Replace `NAV_LINKS`:**

```tsx
const NAV_LINKS = [
  { name: 'How it works', href: '#capture' },
  { name: 'Bruno', href: '#bruno' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
];
```

- [ ] **Step 2: Active-section tracking.** Add inside `GlassNav`:

```tsx
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);
```

Render links with active state (honey underline on the active section):

```tsx
        <nav className="hidden items-center justify-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={activeId === link.href.slice(1) ? 'true' : undefined}
              className={cn(
                'font-sans text-[14px] font-medium transition-colors',
                activeId === link.href.slice(1)
                  ? 'text-[var(--color-ink)] underline decoration-[var(--color-honey-deep)] decoration-2 underline-offset-8'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>
```

- [ ] **Step 3: Scroll lock + Escape for the mobile sheet:**

```tsx
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);
```

- [ ] **Step 4: Verify.** Scroll the page — the honey underline follows the visible section. Open the mobile menu at <1024px — background doesn't scroll, Escape closes it. Commit: `git commit -am "feat(landing): 4-link nav with active section, mobile scroll lock"`

---

### Task 14: Structure — bento replaces 4 feature rows

**Research basis:** SaaSFrame §4 (bento conventions — 4-8 cells, size=hierarchy), Routine Steal 2 (heavy/light rhythm), design brief (FeatureBento replaces Sources/Tasks/Calendar/Notes rows).

**Files:**
- Create: `apps/web/components/landing-v2/Eyebrow.tsx`
- Create: `apps/web/components/landing-v2/sections/FeatureBento.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/components/landing-v2/sections/FeatureShowcase.tsx`
- Delete: `sections/FeatureSources.tsx`, `sections/FeatureTasks.tsx`, `sections/FeatureCalendar.tsx`, `sections/FeatureNotes.tsx`

- [ ] **Step 1: Create `Eyebrow.tsx`** — the ONLY sanctioned mono-caps element:

```tsx
import { cn } from '@/lib/utils';

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'mb-4 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--color-ink-soft)]',
        className,
      )}
    >
      {children}
    </p>
  );
}
```

Replace the eyebrow `<p>` in `FeatureShowcase.tsx`, `PricingSection.tsx`, `FaqSection.tsx`, `BrunoSection.tsx` with `<Eyebrow>…</Eyebrow>`. Then sweep remaining mono-caps: every OTHER `font-mono ... uppercase` in `landing-v2/` becomes `text-[13px] text-[var(--color-ink-soft)]` sans.

- [ ] **Step 2: Create `FeatureBento.tsx`:**

```tsx
import {
  GraduationCap,
  ListChecks,
  CalendarBlank,
  Notebook,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';
import { Eyebrow } from '../Eyebrow';
import { ScrollReveal } from '../motion/ScrollReveal';

const CELLS: Array<{
  id: string;
  icon: Icon;
  title: string;
  body: string;
  rows: Array<{ label: string; meta: string }>;
}> = [
  {
    id: 'sources',
    icon: GraduationCap,
    title: 'Canvas deadlines land by themselves',
    body: 'Connect once. Assignments flow onto your board with dates attached.',
    rows: [
      { label: 'Bio lab report', meta: 'Fri' },
      { label: 'Problem set 4', meta: 'Mon' },
    ],
  },
  {
    id: 'tasks',
    icon: ListChecks,
    title: 'A backlog that stays honest',
    body: 'Overdue work quietly rolls forward instead of piling up.',
    rows: [
      { label: 'Algebra quiz review', meta: 'Today' },
      { label: 'English essay draft', meta: 'Jul 14' },
    ],
  },
  {
    id: 'calendar',
    icon: CalendarBlank,
    title: 'The whole week at once',
    body: 'Google Calendar syncs in. Planevo never schedules over it.',
    rows: [
      { label: 'Chemistry lecture', meta: '10:00' },
      { label: 'Soccer practice', meta: '16:00' },
    ],
  },
  {
    id: 'notes',
    icon: Notebook,
    title: 'Notes tied to your day',
    body: 'Notebooks next to your tasks — flashcards in a tap.',
    rows: [
      { label: 'Lab report outline', meta: 'Linked · Thu' },
      { label: 'Key facts → flashcards', meta: '12 cards' },
    ],
  },
];

export function FeatureBento() {
  return (
    <section id="everything-else" className="scroll-mt-24 px-6 py-16 sm:py-24">
      <ScrollReveal className="mx-auto max-w-6xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <Eyebrow>And everything around it</Eyebrow>
          <h2 className="font-serif text-[36px] leading-[1.08] tracking-tight text-[var(--color-ink)] sm:text-[44px]">
            The rest of your system, built in.
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {CELLS.map(({ id, icon: CellIcon, title, body, rows }) => (
            <div
              key={id}
              className="flex flex-col gap-4 rounded-[28px] border border-[var(--color-line)] bg-[var(--color-surface-raised)] p-7 shadow-sm transition-shadow hover:shadow-md"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)]">
                <CellIcon size={22} weight="duotone" />
              </span>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-serif text-[22px] leading-snug tracking-tight text-[var(--color-ink)]">
                  {title}
                </h3>
                <p className="text-[15px] leading-relaxed text-[var(--color-ink-soft)]">{body}</p>
              </div>
              <div className="mt-auto flex flex-col rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-1">
                {rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] py-2.5 last:border-b-0"
                  >
                    <span className="truncate text-[14px] text-[var(--color-ink)]">{row.label}</span>
                    <span className="flex-none text-[12px] tabular-nums text-[var(--color-ink-soft)]">
                      {row.meta}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
```

- [ ] **Step 3: Rewire `page.tsx`** — target order (delete the four old section imports, add `FeatureBento` + `FoundersNote`):

```tsx
      <main>
        <HeroSection />
        <ProofStrip />
        <FeatureConnectTrack>
          <FeatureCapture />
          <FeatureBoard />
          <FeaturePlanMyDay />
        </FeatureConnectTrack>
        <FeatureBento />
        <FoundersNote />
        <BrunoSection />
        <PricingSection />
        <FaqSection />
        <FinalCta />
      </main>
```

Delete `sections/FeatureSources.tsx`, `FeatureTasks.tsx`, `FeatureCalendar.tsx`, `FeatureNotes.tsx`. Run `rg -l "FeatureSources|FeatureTasks|FeatureCalendar|FeatureNotes" apps/web` — must return nothing (fix stragglers: footer links `#sources` → `#everything-else`).

- [ ] **Step 4: Balance the surviving showcase rows.** In `FeatureShowcase.tsx` change grid alignment `items-center` → `items-start lg:items-center` and add `lg:min-h-[420px]` to the copy column wrapper.

- [ ] **Step 5: Verify** at 375px and 1440px: no horizontal overflow, no giant empty regions, bento cells equal height. `npm run typecheck --workspace planevo && npm run lint --workspace planevo`. Commit: `git commit -am "feat(landing): 3 deep rows + bento grid; eyebrow component; mono-caps rationed"`

---

## Phase 3 — Polish & assets

### Task 15: Pricing — annual toggle + promoted .edu offer

**Research basis:** SaaSFrame §5 (toggle mechanics — "Save 2 months" > percentages), Sunsama §4 (one-plan simplicity as ideal but toggle is table stakes), playbook §5 (promote .edu offer).

**Files:**
- Modify: `apps/web/components/landing-v2/sections/PricingSection.tsx` (becomes a client component)

- [ ] **Step 1:** Add `'use client';` at the top, `import { useState } from 'react';`, and inside `PricingSection`:

```tsx
  const [annual, setAnnual] = useState(true);
  const proPrice = annual ? '$7.99' : '$9.99';
  const eduPrice = annual ? '$3.99' : '$4.99';
```

- [ ] **Step 2: Toggle UI** — insert between the section intro and the cards grid:

```tsx
        <div className="mx-auto mb-10 flex w-fit items-center justify-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-1">
          {([
            { key: false, label: 'Monthly' },
            { key: true, label: 'Annual · 2 months free' },
          ] as const).map(({ key, label }) => (
            <button
              key={label}
              type="button"
              aria-pressed={annual === key}
              onClick={() => setAnnual(key)}
              className={
                annual === key
                  ? 'rounded-full bg-[var(--color-paper)] px-4 py-2 text-[13px] font-semibold text-[var(--color-ink)] shadow-sm'
                  : 'rounded-full px-4 py-2 text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]'
              }
            >
              {label}
            </button>
          ))}
        </div>
```

- [ ] **Step 3: Promote .edu.** Replace the 9px badge + fine print inside the Pro card with a first-class offer line under the price:

```tsx
            <div className="mt-4 flex items-baseline gap-1">
              <span className="font-serif text-5xl text-[var(--color-paper)]">{proPrice}</span>
              <span className="font-sans text-sm font-medium text-[var(--color-paper)]/70">/ month</span>
            </div>
            <p className="mt-3 rounded-xl bg-[var(--color-honey)]/15 px-3 py-2 text-[14px] font-medium text-[var(--color-honey)]">
              Students: {eduPrice}/mo with a verified .edu email — same product, half price.
            </p>
```

- [ ] **Step 4: Verify** toggle switches prices, `aria-pressed` correct, contrast of the honey offer ≥4.5:1 on the ink card. Commit: `git commit -am "feat(landing): annual pricing toggle, first-class .edu offer"`

---

### Task 16: Brand art — illustrated forest band via Higgsfield, video cleanup

**Research basis:** Playbook §11.3 (Higgsfield rules), design brief (Bruno silhouette in footer band), Godly Pattern 7 (Fraunces + mascot + honey palette — near-exact material match in Sprout template).

**Files:**
- Replace: `apps/web/public/landing/bg/forest.png` → `forest.webp`
- Modify: `apps/web/components/landing-v2/sections/FooterBrandBand.tsx`
- Delete: `apps/web/public/landing/bruno-idle.mp4`

**Higgsfield rules (playbook §11.3): brand layer only, preflight cost, batch variants.** Exact MCP call script:

- [ ] **Step 1:** `models_explore` with `{ "action": "recommend", "goal": "wide illustrated misty forest horizon, flat editorial illustration, brand palette, no text" }` — use the recommendation.

- [ ] **Step 2:** Preflight: `generate_image` with `params: { model: "<recommended>", get_cost: true, ... }`. If cost > remaining credits, stop and report.

- [ ] **Step 3:** Generate (batch of 3, widest supported ratio):

```json
{
  "params": {
    "model": "<recommended>",
    "count": 3,
    "aspect_ratio": "21:9",
    "prompt": "Minimal editorial flat illustration of a misty forest horizon at dawn, soft layered pine silhouettes in deep forest greens (#2F7958, #1B4835) fading into a warm cream sky (#FFFDF5), gentle honey-amber (#D08741) light glow low on the horizon, tiny silhouette of a small friendly bear standing on a hill in the lower third, generous negative space in the sky, grainy paper texture, no text, no watermark, calm and quiet mood, in the style of modern minimal brand illustration"
  }
}
```

- [ ] **Step 4:** Pick the best of 3 (criteria: palette match, bear readable at 200px tall, sky ≥50% of frame). `outpaint_image` to extend horizontally if needed; `upscale_image` to 4K.

- [ ] **Step 5:** Download, convert, install:

```bash
curl -L -o /tmp/forest-raw.png "<rawUrl>"
npx --yes sharp-cli -i /tmp/forest-raw.png -o apps/web/public/landing/bg/forest.webp --format webp --quality 82 resize 2560
rm apps/web/public/landing/bg/forest.png
```

Update `FooterBrandBand.tsx`: `src="/landing/bg/forest.webp"`. Confirm ≤300KB.

- [ ] **Step 6: Video cleanup.** `bruno-idle.mp4` (2.9MB) is unused — verify with `rg -l "bruno-idle" apps/web`, then `rm apps/web/public/landing/bruno-idle.mp4`.

- [ ] **Step 7:** Convert `bruno-portrait.png` to webp: `npx --yes sharp-cli -i apps/web/public/landing/bruno-portrait.png -o apps/web/public/landing/bruno-portrait.webp --format webp --quality 85` and update the `src` in `BrunoSkillsGrid.tsx`. Save the winning forest prompt to `apps/web/docs/BRAND_PROMPTS.md`.

- [ ] **Step 8: Commit.** `git commit -am "feat(landing): illustrated brand forest band, asset compression, remove unused video"`

---

### Task 17: FAQ open animation + stage backdrop decision

**Research basis:** SaaSFrame §6 (FAQ: accordion is table stakes, smooth height), playbook §5 (commit or cut backdrops).

**Files:**
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/landing-v2/sections/FaqSection.tsx`
- Modify: `apps/web/components/landing-v2/StageBackdrop.tsx`

- [ ] **Step 1: Animate `<details>`** — add to `globals.css`:

```css
details.faq-item::details-content {
  block-size: 0;
  overflow: hidden;
  transition: block-size 0.28s ease, content-visibility 0.28s allow-discrete;
  interpolate-size: allow-keywords;
}
details.faq-item[open]::details-content {
  block-size: auto;
}
```

Add `faq-item` to the `<details>` className in `FaqSection.tsx`.

- [ ] **Step 2: Commit to the stage backdrops.** In `StageBackdrop.tsx` strengthen the tints ~2× and add a hairline border:

```tsx
const GRADIENT_CLASS: Record<StageBackdropVariant, string> = {
  sky: 'bg-[linear-gradient(180deg,#DCEAF2_0%,#FFFDF5_100%)]',
  meadow: 'bg-[linear-gradient(180deg,#D3E4D9_0%,#FFFDF5_100%)]',
  neutral: 'bg-[linear-gradient(180deg,#EFE3C4_0%,#FFFDF5_100%)]',
};
```

On the wrapper div: `className={cn('absolute inset-0 border border-[var(--color-line)]', GRADIENT_CLASS[variant], className)}`.

- [ ] **Step 3: Verify + commit.** FAQ opens with smooth slide. Stages read as deliberate colored panels. `git commit -am "polish(landing): animated FAQ, committed stage backdrops"`

---

## Phase 4 — Verification gate

### Task 18: Automated a11y gate + full checklist

**Research basis:** Playbook §10 (the release checklist — every box checked before ship), design brief (page is still after 10s, CLS < 0.05).

**Files:**
- Create: `apps/web/e2e/landing-a11y.spec.ts`

- [ ] **Step 1: Write the axe test:**

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('landing page accessibility', () => {
  test('no serious/critical WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact ?? ''),
    );
    expect(
      blocking,
      blocking.map((v) => `${v.id}: ${v.nodes.length} nodes`).join('\n'),
    ).toEqual([]);
  });

  test('keyboard: first tab lands on a visible focus ring', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      return getComputedStyle(el).outlineStyle;
    });
    expect(outline).not.toBe('none');
  });

  test('page is still at rest after demo completes', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(12_000);
    const h1a = await page.locator('h1').boundingBox();
    await page.waitForTimeout(3_000);
    const h1b = await page.locator('h1').boundingBox();
    expect(h1a?.width).toBe(h1b?.width);
  });
});
```

- [ ] **Step 2: Run it.** `npm run test:e2e --workspace planevo -- landing-a11y` → all pass. Fix any axe violations it surfaces.

- [ ] **Step 3: Run the playbook §10 checklist manually:** JS-disabled palette check, OG preview in a share debugger, Lighthouse (a11y ≥95, CLS <0.05, LCP <2.0s throttled), 320px/768px/1440px passes, "free" count ≤2, slogan consistency, 5-second + keyboard-only user test.

- [ ] **Step 4: Final commit.** `git commit -am "test(landing): a11y + stillness gates for the premium rebuild"`

---

## Self-review: task ordering dependencies

- **Task 1** (palette) is a prerequisite for all visual verification — do first.
- **Task 5** (ProofStrip) and **Task 6** (FoundersNote) create components mounted in **Task 14** (page structure) — they must exist before 14.
- **Task 7** (free-chorus cut) modifies HeroSection which **Task 10** also modifies — execute 7 before 10 to avoid merge conflicts.
- **Task 8** (Fraunces) changes the font variable referenced by **Task 9** (RotatingWord) — execute 8 first.
- **Task 12** (ConnectLine NODE_IDS shrink) aligns with **Task 14** (page structure removes 4 rows) — if executed before 14, the extra IDs resolve harmlessly to `top: 0`.
- **Task 13** (nav links) must match the section IDs created in **Task 14** — execute 13 before or same-commit as 14.
- **Task 14** depends on Tasks 5, 6, 13 being complete (it references `ProofStrip`, `FoundersNote`, and the reduced nav).
- **Task 16** (Higgsfield) is independent of all code tasks — can run in parallel.
- **Task 17** (FAQ animation) requires Task 7's `faq-item` class addition — Task 7 adds the JSON-LD but should also add the class at that point.
- **Task 18** is the terminal gate — runs after all other tasks.

**Critical path:** 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18.

Tasks 15, 16, and 17 are parallelizable after Task 14 completes. Task 16 (Higgsfield art) can run any time as it only touches assets.
