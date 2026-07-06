# Planevo Landing Page — Premium Playbook

**Purpose:** The single source of truth for taking the landing page from "looks like Little Bird" to "feels like a premium product." This is the release gate: the page ships when every item in §10 is checked, not before.

**Companion context:** This doc distills the full UI/UX audit of `components/landing-v2/` (July 2026). File references point at the current implementation.

---

## 1. The core philosophy: steal the discipline, not the costume

We copied Little Bird's *surface*: serif headlines, cream paper, glass nav, dot grid. That's the costume. What actually makes Little Bird, CoFounder, Linear, and Attio feel premium is invisible:

| What they have | What it signals | What we currently do instead |
|---|---|---|
| Proof (testimonials, logos, numbers) | "Other people already trust this" | Zero social proof; we quote ourselves |
| Restraint (one hero moment of motion) | "We're confident; we don't need to perform" | 5+ infinite animation loops running at once |
| One committed typeface with mass | "We have a point of view" | A "closest free match" serif that reads thin |
| Flawless small details (focus rings, contrast, scroll) | "If the landing page is this careful, the product is too" | No focus styles, ~12 contrast failures, anchors jump under the nav |
| Ruthless message consistency | "We know exactly what we are" | Three different slogans across h1 / title / OG |
| Scarcity of everything (links, sections, labels) | "We edited" | 8 nav links, 7 identical feature rows, 15+ mono-caps labels |

**The rule for borrowing from any reference site:** for each element you want to copy, ask *"what job is this doing for them?"* Copy the **job**, then do the job with **our** materials (Bruno, cream/honey/forest palette, student life). Never copy the artifact directly.

Examples of the rule applied:

- Little Bird's pinned scroll quote → the job is *third-party validation with drama*. We copied the drama (200vh scroll-jack) but filled it with a self-quote. Wrong. Either put a **real student's words** in that treatment or delete the treatment.
- Little Bird's serif → the job is *editorial confidence*. Cormorant Garamond is too delicate to do that job. Replace the material, keep the job.
- Attio's connect line → the job is *making a long feature story feel like one journey*. Ours floats in a gutter touching nothing. If the line doesn't visibly connect the story, it isn't doing the job — cut it or anchor it to a real rail.

---

## 2. Positioning & message (fix before pixels)

### One slogan, everywhere
Pick **one** line and use it verbatim in the `<h1>`, `<title>`, OG title, and final CTA echo. Current state is three variants ("keeps up" / "adapts. Never breaks." / "adapts"). Recommendation:

> **A plan that adapts.**

Short, ownable, matches the product truth (adaptive rollover, replan). The rotating-word gimmick can stay *if* it rotates through synonyms of the same idea at a readable pace (see §7) — but the canonical line is fixed.

### Kill the "free" chorus
"Free" currently appears 8+ times (hero badge, hero copy, hero subtext, pricing eyebrow, pricing headline, pricing subtext, FAQ, final CTA). Premium products mention price twice:

1. Hero badge or CTA microcopy: "Free to start · No card"
2. The pricing section itself

Everywhere else, sell the **outcome**: calm, time found, deadlines that land themselves. Repeating "free" reads as "please, we're worried" — the opposite of premium.

### Hero copy ≤ 25 words
Current subhead is 38 words. Target shape:

> For students whose calendars change faster than they can replan. Planevo builds your day around your real availability — and adapts when life happens.

(24 words. Cut "high-performers" from the hero; it dilutes. Keep it for a persona section or ads.)

### Honest links only
Every "Learn more →" currently goes to `/signup`. A premium brand never lies in a link label. Either:
- Relabel: "Try it free →", or
- Build real anchor deep-dives / feature pages and link there.

---

## 3. Social proof — the non-negotiable

**This is the #1 gap. Do not ship without it.** The page currently has zero third-party validation, and its most theatrical section (`AdaptWithYouSection` → `ScrollTextFill`) is Planevo quoting Planevo.

What to do, in order of preference:

1. **Real student testimonials.** 3–6 short quotes with first name, school, year ("Maya · UCLA '27"). Get them from beta users. Even 3 honest quotes beat any animation on this page.
2. **A single hero-adjacent proof strip.** Within one viewport of the hero: "Used by students at UCLA · Berkeley · UT Austin…" (only if true) or a number ("12,400 assignments planned this semester" — pull from real data).
3. **The pinned-quote treatment, earned.** Keep `ScrollTextFill` only if the quote inside it is a *real person's words with attribution*. That's when the drama pays off.
4. **If we have nothing yet:** cut the section entirely and run a 2-week beta push specifically to harvest quotes. Absence of proof > fabricated proof. A fake-feeling testimonial is worse than none.

Also add: App Store / Play Store badges once mobile is live (FAQ already promises a mobile app), and a `FAQPage` + `SoftwareApplication` JSON-LD block for SERP presence.

### 3.1 The zero-users playbook (our current reality)

We have no users yet, so §3 items 1–2 aren't available at launch. **We never fabricate** — no invented quotes, no fake counts, no logos of schools nobody attends. Instead, launch with these honest substitutes, in this order of power:

1. **The product is the proof.** We already have real product UI in the hero demo — the strongest asset a pre-launch startup can have. Push it further: a **"try it without signing up" sandbox** where a visitor types a messy brain-dump into a real capture box on the landing page and watches it become a board. A working demo does the trust-work testimonials would do. Nobody who ships that reads as vaporware.
2. **Convert the self-quote into a signed founder's note.** The `AdaptWithYouSection` quote fails as a *testimonial* (it pretends to be external validation) but succeeds as an honest, **signed founder's note**: "We built Planevo because our own weeks kept falling apart…" — real name, optionally a photo or signature mark. Authenticity converts; borrowed authority repels. The pinned-scroll treatment can stay; only the claim changes.
3. **Integration logos are real logos.** "Works with Canvas · Google Calendar · Notion · Slack · Linear" is a legitimate, truthful credibility strip with recognizable brands. This fills the under-hero logo slot with zero users.
4. **Specificity reads as credibility.** Vague hype needs testimonials to be believed; precise, falsifiable claims don't: "Never schedules over something already on your calendar." "Overdue work rolls forward instead of piling up." "Your captures are never used to train shared models." The FAQ already has this voice — pull it up the page.
5. **Frame emptiness as exclusivity.** "Join the founding cohort" / founding-member pricing makes early scarcity feel intentional rather than absent. Use real numbers only once they exist.
6. **Risk reversal carries trust weight.** No card · cancel anytime · export or delete your data — say it legibly (see the Pro-card contrast fix in §4.3).

**Launch configuration of the proof slot:** founder's note (in the pinned treatment) + integration strip + sandbox demo.

**Upgrade path:** run the 2-week proof harvest *before or immediately after* launch — free Pro for 10–20 students (friends, campus Discord/Reddit, one class group chat) in exchange for honest feedback. Three real quotes with first name + school ("Maya · UCLA '27") is enough to swap the founder's note slot to real testimonials in v1.1. Build the section so the swap is a content change, not a redesign.

---

## 4. Visual identity — how our image should look

### 4.1 The brand in one sentence
**A calm, warm, editorial planner with a bear who has your back.** Not techy-gradient SaaS, not pastel productivity-cute, not academic-sterile. Think: a beautifully typeset field guide, with honey-warm accents and one charming character used sparingly.

### 4.2 Typography (the single highest-leverage change)

- **Replace Cormorant Garamond.** It's delicate, low x-height, and reads "wedding invitation" at 84px. The comment in `app/layout.tsx` admits it's a "closest free match" — that's the definition of costume. Candidates with real display mass:
  - **Fraunces** (variable, `opsz` + `SOFT`/`WONK` axes — warm, confident, free) ← recommended
  - **Instrument Serif** (sharper, more Little-Bird-adjacent)
  - Or license the actual face we want (Meraki-class) if budget allows.
- **Display line-height 1.05–1.1**, never `leading-[1.0]` (currently clips descenders in the hero).
- **Establish a rem-based modular scale** and delete every `text-[Npx]` arbitrary value in `landing-v2/`:
  `12 / 14 / 16 / 18 / 21 / 28 / 36 / 48 / 64 / 88` (px equivalents, expressed in rem via theme tokens). This also fixes the bug where `text-[Npx]` ignores the user's `--font-scale` preference set in `globals.css`.
- **Ration the mono-caps label.** `font-mono uppercase tracking-widest` appears 15+ times (eyebrows, captions, footers, badges, subtexts). Rule going forward: **mono-caps = section eyebrows only.** Everything else is sans, 13–14px, sentence case. A label style only creates hierarchy when it's scarce.

### 4.3 Color

Keep the warm littlebird palette (`#FFFDF5` paper, `#1B1C15` ink, honey, forest) — it's good. Fix the usage:

- **`--color-ink-faint` (#9EA096) is banned for informational text.** It's ~2.9:1 on cream — a WCAG failure — and it's currently on eyebrows, captions, footer headers, copyright, and demo labels. Informational text uses `--color-ink-soft` (#6B6C61, ~5.4:1) or darker. `ink-faint` is for true decoration only.
- **Dark-surface fine print:** nothing below `paper/70` on the ink-colored Pro card (currently `/40` ≈ 2:1 on the risk-reversal line — our most reassuring sentence is illegible).
- **Commit or cut the stage backdrops.** The `StageBackdrop` gradients are so faint they read as dirty-white rectangles in screenshots. Either strengthen the tints into deliberate colored panels (visible border, real presence) or remove them and let cards float on the dot grid.
- **Tokens only.** Replace the raw hexes in `StageBackdrop.tsx` and `BrunoSkillsGrid.tsx` with theme tokens so `data-accent` themes propagate.

### 4.4 Imagery & illustration

- **Bruno is our only character asset — use him like a luxury brand uses a monogram.** Once or twice, beautifully. Current portrait treatment is good; don't sprinkle Bruno faces into every demo chip.
- **Kill or rebuild the forest footer band.** The blurry photographic `forest.png` strip after the footer has no compositional relationship to the page and reads as stock. Options: (a) commission/generate an **illustrated** forest horizon in our exact palette with Bruno silhouetted — a real brand moment; (b) cut it and end on the clean footer. No photography anywhere on this page unless it's a real student's testimonial headshot.
- **Product shots must be legible.** Demos currently render full app UI at ~400px with 10px labels — illegible smudges. Premium product imagery zooms into **one readable moment**: 3 rows at real size, not 8 rows at map scale. Crop tighter everywhere.
- **Asset discipline:** AVIF/WebP sources, no multi-MB PNGs (`bg/forest.png` is 1.9MB; `bruno-idle.mp4` is 2.9MB and appears unused — delete it or use it).
- **OG image is mandatory.** A 1200×630 card: cream paper, dot grid, serif slogan, Bruno mark, honey accent. Every iMessage/Slack/X share currently renders as a bare link — for a student product that spreads socially, this is a growth hole, not just polish.

---

## 5. Page architecture — how the landing page should really look

Current structure: hero → 7 identical zig-zag feature rows → self-quote scroll-jack → Bruno → pricing → FAQ → CTA. That's a feature dump. Target structure (11 → 8 sections, one narrative):

```
1. GlassNav          4–5 links: How it works · Features · Pricing · FAQ  + Sign in / Start free
2. Hero              Slogan + ≤25-word subhead + CTA pair + ONE demo that plays once
3. Proof strip       Schools/numbers/short quotes — within one viewport of the hero
4. Three deep rows   Capture → Board → Plan My Day  (the actual wedge, full zig-zag treatment)
5. Bento grid        Sources · Tasks · Calendar · Notes — one compact 2×2, small cards,
                     each with a cropped, legible product moment
6. Testimonial       The pinned-quote treatment IF we have a real quote; static card otherwise
7. Bruno             Keep roughly as-is (skills grid + tabs) — it's one of the stronger sections
8. Pricing           + annual toggle, promoted .edu offer (see below)
9. FAQ               Keep — the copy here is genuinely good ("Fair questions.")
10. Final CTA        Slogan echo + one button
11. Footer           Clean; forest band only if rebuilt as illustration
```

### Section-specific requirements

**Nav (`GlassNav.tsx`)**
- Cut from 8 links to 4–5. "Command" and "Bruno" are internal jargon; "Command" even points at `#board` (label/target mismatch).
- Add active-section indication on scroll (honey underline or ink weight shift).
- Mobile menu: lock body scroll while open, close on Escape.

**Hero (`HeroSection.tsx`)**
- Demo plays the capture→board flow **once**, then rests on the calm board with a small "Replay" affordance. An infinitely looping demo contradicts a product whose value prop is *calm*.
- The demo card is the hero image — give it more presence: slightly larger radius consistency, one strong shadow, no competing glows behind it.
- Badge: keep "Free to start" pill. Delete the third "Free to sign up · No card required · Pro from $9.99/mo" mono line — fold "No card required" into the primary CTA's microcopy and stop there.

**Feature rows (rows 4 in the map above)**
- Only Capture, Board, Plan My Day get the full `FeatureShowcase` treatment. Vary the internal rhythm between the three (one gets a wider stage, one gets a stat callout) so it doesn't wallpaper.
- Balance the columns: `items-center` on a 300px copy column next to a 600px demo column creates the dead zones visible in screenshots. Match content heights or top-align with intent.
- Connect line: either anchor it as a true left rail with the eyebrow markers attached to the nodes (Attio's actual pattern), or delete it. The current center-gutter line touches nothing.

**Pricing (`PricingSection.tsx`)**
- Add **annual toggle** (2 months free — the most reliable SaaS conversion lever).
- **Promote the .edu offer.** It's our best offer for our core audience and it's currently a 9px mono badge. Give it a first-class treatment: its own line under the Pro price ("$4.99/mo with a .edu email"), legible size, honey accent.
- Raise "Upgrade or cancel any time" to readable contrast — that's risk-reversal copy, not decoration.

**FAQ (`FaqSection.tsx`)**
- Keep structure and copy. Add `FAQPage` JSON-LD. Add a gentle open/close height animation (native `details` currently snaps). Add focus-visible styling on `summary`.

---

## 6. Motion doctrine

**Rule: at rest, the page is still.** Motion happens (a) once on entry per element, (b) in direct response to the user, or (c) in ONE designated hero moment. Currently running simultaneously and forever: hero typewriter (a 14ms `setInterval` ≈ 70 re-renders/sec), rotating headline word, scripted cursor loop, scroll-line measurement on every scroll event, per-section zooms. Constant motion reads as insecure.

Concrete changes:

| Component | Change |
|---|---|
| `CaptureFlowDemo` typewriter | Play once; batch characters via `requestAnimationFrame` (2–3 chars/frame), not a 14ms interval |
| `CommandHeroDemo` loop | One full pass → rest on board → "Replay" button |
| `RotatingWord` | ≥3s interval; fixed width (size to longest word) so the centered h1 never reflows; `aria-hidden` rotator + sr-only static headline |
| `ScrollConnectLine` | Measure node positions on `ResizeObserver` only — never in a scroll listener; keep the `useScroll` line growth |
| `ScrollTextFill` | Only survives with a real quote (§3); shorten track 200vh → ~120vh so users are never trapped in a near-empty viewport |
| `ScrollZoom` / `ScrollReveal` | Fine as-is (once-on-entry) — keep |

Keep the existing `useReducedMotion` fallbacks — they're genuinely well done. But fix the reduced-motion demo fallbacks that render real interactive components (`CommandBoard`, `CommandPreviewPanel`) with `noop` handlers: dead buttons are an accessibility trap. Render a static image or `inert` markup instead.

---

## 7. The detail layer — where "premium" actually lives

These are small, and they are the whole game. If the landing page is this careful, visitors assume the product is too.

- **Global focus styles.** There are currently *zero* `focus-visible` styles in `landing-v2/` and no global ring in `globals.css`. Add: `*:focus-visible { outline: 2px solid var(--color-honey-deep); outline-offset: 2px; }` plus adjusted rings on dark surfaces (Pro card, footer).
- **Anchor behavior.** `scroll-smooth` on `<html>` (the reduced-motion override already exists in `globals.css`) + `scroll-mt-24` on every `id` section so headings never hide under the fixed 60px nav.
- **Tabs semantics.** `BrunoDemoTabs` and `DemoStateDots` use `role="tab"` without arrow-key navigation or `aria-controls` wiring. Either implement the full APG tabs pattern or drop the roles and use plain labeled buttons (simpler, recommended for the dots).
- **Server-render the marketing palette.** The warm palette only exists under `html[data-public="true"]`, set by client-side JS (`lib/appearance/no-flash-script.ts`). No-JS renders, crawler screenshots, and script races show the *dashboard's slate palette* — which is exactly what our own screenshots captured. Move the attribute/class into server-rendered markup (marketing route group layout).
- **Metadata:** add `metadataBase`, OG image, `twitter` card, canonical; delete the `keywords` meta (ignored since 2009); dedupe the near-identical metadata between `app/layout.tsx` and `app/page.tsx`.
- **Housekeeping:** remove `sentry-example-page/` from the deployable app; purge `lint_errors.json`, `server.log`, `canvas_debug.json`, `coverage/`, `playwright-report/` from the repo root of `apps/web`.

---

## 8. How to use reference sites (the method, so we can repeat it)

When studying Little Bird, CoFounder, Linear, Attio, or anything new:

1. **Screenshot the section. Write down the job it does** ("creates trust," "makes a long page feel navigable," "makes the product feel alive"). Not what it looks like — what it *does*.
2. **Check whether we have the raw material to do that job honestly.** A testimonial treatment requires a testimonial. A logos strip requires logos. If we lack the material, the section goes on the "earn it" list — it does NOT get built with placeholder substance.
3. **Translate into our materials:** Fraunces-class serif, cream/honey/forest tokens, Bruno (sparingly), dot grid, real product UI cropped to legible moments.
4. **The 30% rule:** if more than ~30% of a section would be recognizable as the reference site's section, we haven't translated — we've traced. Redo it.
5. **Steal their omissions too.** Notice what premium sites *don't* have: no badge clutter, no five-font stacks, no perpetual motion, no 9px legal-gray text doing important jobs. Restraint is the most copyable thing they own.

---

## 9. Implementation order

**Phase 1 — Trust & correctness (blockers, do first)**
1. Social proof: collect real quotes; add proof strip; fix or cut the self-quote section
2. Contrast pass: retire `ink-faint` from text, fix Pro-card fine print
3. Focus-visible styles, `scroll-mt` + smooth anchors
4. Server-rendered marketing palette (kill the first-paint script dependency)
5. OG image + complete metadata; one slogan across h1/title/OG
6. Honest link labels

**Phase 2 — Premium feel**
7. Typeface swap (Fraunces/Instrument Serif) + display line-height + rem type scale
8. Cut "free" chorus; tighten hero copy ≤25 words
9. Restructure: 3 deep rows + bento; nav to 4–5 links with active state
10. Motion doctrine: demo plays once, kill infinite loops, fix typewriter + scroll measurement
11. Mono-caps rationing

**Phase 3 — Polish**
12. Pricing: annual toggle, promoted .edu offer
13. FAQ JSON-LD + open animation; tabs semantics
14. Stage backdrops: commit or cut; connect line: rail or cut; footer forest: illustrate or cut
15. Asset compression; remove sentry example page and repo debris
16. Crop all product demos to legible moments

**Phase 4 — Verification (the release gate, §10)**

---

## 10. Definition of "flawless" — the release checklist

Ship only when every box is checked:

**Trust**
- [ ] Proof slot filled honestly: either 3+ real attributed testimonials / a verifiable metric, **or** the zero-users configuration from §3.1 (signed founder's note + integration strip + sandbox demo)
- [ ] Nothing on the page pretends to be external validation when it isn't (no unattributed or self-attributed "quotes")
- [ ] Every link label matches its destination

**Craft**
- [ ] Zero WCAG AA contrast failures (audit with axe/Lighthouse — target Lighthouse a11y ≥ 95)
- [ ] Every interactive element has a visible focus state; full page keyboard-navigable
- [ ] Anchors scroll smoothly and land below the nav
- [ ] One typeface decision, one type scale, no `text-[Npx]` arbitrary values in `landing-v2/`
- [ ] At rest (no scrolling, no hovering, 10s after load), nothing on the page is moving
- [ ] `prefers-reduced-motion` produces a fully readable, non-fake-interactive page

**Message**
- [ ] One slogan, verbatim, in h1 / title / OG / final CTA
- [ ] "Free" appears exactly twice
- [ ] Hero subhead ≤ 25 words

**Technical**
- [ ] Warm palette present in server-rendered HTML (view-source check, JS disabled check)
- [ ] OG image renders correctly in iMessage/Slack/X preview debuggers
- [ ] LCP < 2.0s, CLS < 0.05 on throttled mobile (the rotating word must cause zero shift)
- [ ] No asset over 300KB on the landing route; total JS for `/` reviewed
- [ ] FAQ + SoftwareApplication JSON-LD validate
- [ ] Real-device pass: iPhone SE width (320px), iPad, 1440px desktop — no overflow, no dead zones, deliberate whitespace everywhere

**The final test:** show the page to someone for 5 seconds and ask what the product does and whether it looks trustworthy. Then let them scroll with a keyboard only. If both pass, ship it.

---

## 11. Reference library, skills & asset pipeline

### 11.1 Reference sites (apply the §8 method to each)

**Tier 1 — closest to Planevo's soul (warm · calm · planner):**
- **littlebird.ai** — our base. Study its *omissions*: few links, few sections, one motion moment.
- **sunsama.com** — the master of "calm" positioning (our literal value prop); sells a daily ritual, not features.
- **amie.so** — personality + joy in a calendar product; product-as-hero with real UI; user-controlled microinteractions.
- **routine.co** — the whimsy/restraint blend: playful illustration inside a strict minimal grid (the Bruno balance).
- **Rise (rise calendar)** — availability/focus-time copywriting; closest message to "planned into your real free time."

**Tier 2 — craft discipline:**
- **attio.com** — dot grid + timeline rail done right (anchored, touching content); cropped legible product shots.
- **linear.app** — the release-quality bar: focus states, contrast, motion that only responds to the user. Read as a checklist.
- **reflect.app** — single-accent discipline; the model for how honey should behave on cream.
- **anytype.io** — serif/sans split headline used *once* per page; pastel gradients that never touch text.

**Tier 3 — mascot discipline (for Bruno):**
- **posthog.com** — mascots everywhere without childishness: type + real product carry authority, character carries emotion. Study the ratio.
- **duolingo.com** — the rule: the character does *emotional* jobs (encouragement, empty states, delight); the product does *functional* jobs. Bruno never explains a feature; he reacts to your day.

**Galleries for ongoing scanning:** godly.website (filter Productivity + Illustrative + Fun; shows scroll videos), saasframe.io (section-by-section teardowns), landing.love, curated.design, minimal.gallery.

**Trend validation (2026):** editorial display serif (Instrument Serif / Fraunces / Editorial New) with a tight sans (Geist), **one italic accent word per headline**, ≤4 total colors, one signature interaction. Our `RotatingWord` italic is on-trend — it needs the fixed-width + slower-cycle fixes from §6, not removal.

### 11.2 Skill & tool routing for the rebuild

| Task | Tool / skill |
|---|---|
| Validate section structure, type pairing, palette, UX anti-patterns | `ui-ux-pro-max` search (`--domain landing / typography / color / ux / gsap`) |
| Token architecture (type scale, semantic colors) | `design-system` skill + existing `globals.css` tokens |
| Mock the new hero/bento in Figma before code | Figma MCP: `search_design_system` → `generate_figma_design` → `get_design_context` |
| Generate section starting points (pricing, bento, FAQ) | `magic-ui` (@21st-dev/magic MCP), restyled to our tokens |
| Component styling & non-negotiables | `shadcn` + `tailwind` rules, `next-best-practices`, `vercel-react-best-practices` |
| OG image (1200×630) | `banner-design` / `design-html` — compose text in HTML→screenshot, never AI-generated text |
| Post-build critique | `design-review`, `design-shotgun` (multiple directions), `gpt-tasteskill` |

### 11.3 Higgsfield rules (learned from prior sessions)

Prior state: `bruno-idle.mp4` was generated from `bruno.svg` (7.5 of 32 credits) and sits **unused** in `public/landing/`; a "Bruno creates a calendar event" AI video was planned but the same demo now exists in code (`BrunoEventDemo`).

1. **Higgsfield renders the brand layer, never the product layer.** Code renders UI crisper, honest, and free; AI video of fake UI reads as vaporware — the opposite of §3.1 proof.
2. **Approved targets, in priority order:**
   - Illustrated forest footer band (replace stock `forest.png`): our exact palette, Bruno silhouetted → `outpaint_image` to ultra-wide → `upscale_image`.
   - Bruno pose library (4–6 poses: waving, reading, holding calendar, sleeping) for founder's note, empty states, 404 — use `bruno-portrait.png` as character reference (`soul_2` / `nano_banana_pro`), `remove_background` for cutouts. If Bruno recurs across web/mobile/OG, train a **Soul** once on 5–20 approved renders for permanent consistency.
   - OG image *artwork layer only* — slogan text is composited in HTML/code, never generated.
3. **Credit discipline:** preflight with `get_cost: true`; `count: 3–4` variants per job instead of serial re-prompts; `models_explore(action:'recommend')` before model choice; save winning prompts to `docs/BRAND_PROMPTS.md`.
4. **Video restraint:** no more landing-page video purchases (§6: still at rest). Delete `bruno-idle.mp4` or compress <1MB webm for one hover-triggered moment. Save `generate_video` / workflows for post-launch social marketing.
5. **Escape hatch:** Higgsfield `create_website` may generate throwaway *mood-board prototypes* to react against — never the shipped page.
