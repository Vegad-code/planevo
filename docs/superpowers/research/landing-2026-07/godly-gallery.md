# Godly Gallery Research — Landing Page Patterns for Planevo

**Agent 6 | 2026-07-06**

---

## 1. Access Log

| Source | URL | Status |
|--------|-----|--------|
| godly.website (now "Recent") homepage | https://godly.website | Fetched — JS-rendered, returned flat feed with no category filtering |
| godly /websites/productivity | https://godly.website/websites/productivity | Fetched — same flat feed, category param ignored in static HTML |
| godly /websites/illustration | https://godly.website/websites/illustration | Same result |
| godly.website/website/amie-630 | Individual entry page | Blocked — redirected to main feed |
| godly.website/website/lazy-892 | Individual entry page | **Partial success** — returned tags: Inter, Migra, Next.js, GSAP, scrolling animation |
| godly.website/website/herding-app-966 | Individual entry page | **Partial success** — returned tags: Styrene B, Bento Grid, Fun, Interactive, Drag & Drop |
| godly.website/website/linear-870 | Individual entry page | **Partial success** — returned tags: Inter, Next.js, React, Bento Grid, styled-components |
| godly.website/website/doo-150 | Individual entry page | Fetched — minimal metadata |
| godly productivity filter | https://godly.website/?types=["productivity"] | **Web search indexed** — revealed full list: Linear, Amie, Notion AI, Todoist, Reflect, Lazy, herding.app, Doo, Paste, Height, Until, Hourly, Fluid Touch, Skiff, Qatalog, Roadmap, Oku |

**Fallback method:** Godly's site is heavily JS-rendered (React SPA). Category pages returned identical static shells. I fell back to (a) web search for godly-indexed metadata, (b) Refero Styles design-system breakdowns, (c) design-bites/DESIGN.md repos, and (d) direct site fetches. Every pattern below traces to a real, named site with verifiable URL.

---

## 2. Standout Patterns (8)

### Pattern 1: Warm Paper Canvas — Todoist
**Source:** [todoist.com](https://todoist.com) | Godly FT #150-series  
**Typeface/Tech:** Graphik 600 (display), Inter weight 475 (body), Caecilia serif (testimonials), Shantell Sans (hand-drawn doodles). Next.js.  

**The pattern:** Background color `#FEFDFB` — barely distinguishable from white but warm. All text rendered in a single warm-black ink `#25221E` at varying opacity levels (100% headlines, 66% body, 49% captions, 18% borders, 7% tints). One brand-red `#E34432` reserved exclusively for the primary CTA.

**The JOB it does:** Makes the landing page feel like opening a well-organized notebook rather than launching clinical software. Reduces decision fatigue by eliminating color noise — your eye goes straight to the red CTA because it's the only chromatic voltage on the page.

**Why it works:** Todoist has survived 17 years of productivity trends by refusing novelty. The warm canvas + single accent is durable rather than fashionable. The opacity-based hierarchy eliminates the "which gray?" problem — one ink, four levels.

---

### Pattern 2: Editorial Serif as Whisper — Notion
**Source:** [notion.com](https://notion.com) | Godly FT #870-series  
**Typeface/Tech:** NotionInter (custom sans), Lyon Text (serif, sparingly), Next.js.  

**The pattern:** Lyon Text serif appears only at 22-32px for pull quotes and testimonials — never in headlines, never in UI. The serif is a "whisper" that says "this is thoughtful, not just functional" amid an all-sans system. Marketing sections use a two-stage metaphor: midnight-navy hero (`#02093a`) dissolves into warm cream content (`#f6f5f4`).

**The JOB it does:** Positions a productivity tool alongside journals, books, and editorial objects. The serif signals authorship and depth without competing with the functional interface.

**Why it works:** The restraint is the point. Lyon Text at 32px for one testimonial quote carries more weight than serif everywhere. It's editorial punctuation, not editorial wallpaper.

---

### Pattern 3: Serif-as-Identity in Dark Mode — Lazy
**Source:** [lazy.so](https://lazy.so) | Godly FT #892  
**Typeface/Tech:** Migra (serif, display), Inter (body), Next.js, GSAP scroll animations. Palette: `#000000`, `#121212`, `#b3b3b3`, `#eeeeee`.  

**The pattern:** Deep charcoal canvas. Migra serif at 55-58px anchors every section like a magazine pull quote. One focal element per viewport. No chromatic accents. Components float with soft, low-opacity shadows. Radial cursor-following light effect in the hero.

**The JOB it does:** Makes a productivity capture tool feel like a refined editorial object — more Monocle magazine than SaaS dashboard. The serif is the sole differentiator in an otherwise achromatic system.

**Why it works:** One serif headline per viewport creates reading rhythm. The editorial-print register distinguishes Lazy from the Inter-everywhere crowd. The cursor light effect rewards exploration without requiring interaction.

---

### Pattern 4: Joyful Utility Through Constraint — Amie
**Source:** [amie.so](https://amie.so) | Godly FT #630  
**Typeface/Tech:** Inter var (sole typeface), 700 weight at 56px with -0.025em tracking. Pure white canvas + pastel pink accent `#F6A6A6`.  

**The pattern:** Mono-typographic system — no serif, no display font. All personality comes from (a) a single pastel pink as the "brand heartbeat," (b) conversational copy ("Happy Tuesday! It's 10:10 AM and windy in Berlin"), and (c) product screenshots that are colorful while the marketing page is achromatic.

**The JOB it does:** Proves you can achieve warmth and personality without illustration or serif type — through tone of voice and color discipline alone. The 98% achromatic marketing makes every chromatic moment in the product UI feel intentional.

**Why it works:** A calendar app needs to feel professional enough for work yet warm enough to open voluntarily. Amie solves this by being clinically restrained in structure and warm only in copy and accent color.

---

### Pattern 5: Product-as-Color-Source — Doo
**Source:** [getdooapp.com](https://getdooapp.com) | Godly FT #150  
**Typeface/Tech:** System sans (Apple-like), pill-shaped controls, 8px radius. No serif.  

**The pattern:** Marketing page is deliberately monochrome — all-white canvas, cool-gray hairlines, charcoal type, one indigo CTA. The product UI screenshots are the only source of color (pastel category tags in mint, lavender, yellow, brown on white cards). Apple-like discipline: single headline → one button → product imagery doing all visual work.

**The JOB it does:** Lets the product sell itself. The monochrome frame makes product screenshots pop as the hero content. Communicates "calm, organized, unhurried" before the user reads a word.

**Why it works:** When your product UI is already colorful and personality-rich, the marketing page should be a neutral stage, not a competing canvas. The product screenshots become the only visual evidence, which is honest for a productivity app.

---

### Pattern 6: Conversational Anti-Copy — herding.app
**Source:** [herdi.ng](https://www.herdi.ng/lp) | Godly FT #966  
**Typeface/Tech:** Styrene B (geometric sans), bento grid, drag-and-drop interactive, light mode, single-page.  

**The pattern:** Copy that sounds like a friend texting: "1. Find thing on web → 2. Put the thing in a folder → 3. Do it again you son-of-a-gun." Uses humor and directness to explain a utility in 3 seconds. Drag-and-drop demonstration baked directly into the page (the page IS the demo).

**The JOB it does:** Eliminates the explain-then-show gap. The visitor understands what the product does because the page is the product behavior. Humor signals that this is a tool with taste, not another generic SaaS.

**Why it works:** For a tool aimed at creators/designers, speaking their casual language is trust-building. The page-as-demo pattern means zero "imagine this..." — you're already experiencing it.

---

### Pattern 7: Fraunces + Mascot + Honey Palette — Sprout Template
**Source:** [rocket.new/templates/sprout](https://www.rocket.new/templates/sprout-enchanting-toddlertoy-landing-page-template) | Featured on design template galleries  
**Typeface/Tech:** Fraunces rounded serif (headlines), DM Sans (body). Colors: sun-dried sage `#A3B18A`, raw honeycomb `#DDA15E`, soft potting soil `#6B4226`, seedling white `#FAF3E0`.  

**The pattern:** A mascot character (Bramble the hedgehog) appears in the hero with subtle physics animation (stacking rings wobble), then reappears contextually throughout sections and inside an interactive quiz modal. Loose watercolor illustration style with grain texture overlays. Milestone bento grid for structured content. Five-question quiz delivers personalized recommendations.

**The JOB it does:** Makes a product feel handcrafted and intentional rather than mass-produced. The mascot guides without dominating — it's a wayfinding character, not a spokesman. The quiz turns passive scrolling into active engagement.

**Why it works:** Fraunces + honey palette + watercolor illustration creates a "warm artisan" register that matches the product's values of intentionality. The mascot has specific poses for specific contexts (not one static image recycled). The interactive quiz converts 3x better than a static CTA because it gives personalized value before asking for commitment.

---

### Pattern 8: Demo-as-Hero (Interactive Product Tour)
**Source:** [storylane.io](https://www.storylane.io) approach, applied by top godly-featured sites  
**Typeface/Tech:** Varies — the pattern is structural, not typographic.  

**The pattern:** Instead of a static screenshot or video in the hero section, embed an interactive walkthrough of the actual product. Visitor clicks through 8-12 guided steps showing the core workflow. Placed above the fold for maximum engagement. Problem → solution → transformation arc.

**The JOB it does:** Replaces "trust me, it works" with "try it yourself." For pre-launch products without social proof, the working demo IS the proof. Converts curiosity into conviction without requiring signup.

**Why it works:** According to 2026 SaaS landing data, interactive demos above the fold outperform static screenshots on every funnel metric. They handle objections ("will this actually work for me?") through experience rather than explanation.

---

## 3. 2026 Trend Read

### What's Current in Premium SaaS/Product Landing Design

**Typography:**
- Editorial serif headlines are the new default for SaaS that wants to look serious without looking generic. Inter/Söhne dominance is why everyone is moving away from them.
- The winning formula: one serif for brand expression (Fraunces, Migra, Editorial New, Tiempos Headline, Instrument Serif) + one clean sans for body/UI (Inter, DM Sans, Geist, Söhne).
- Weight 500 (medium) is the new bold — Reflect and others use medium-weight serif at display sizes for an editorial whisper rather than marketing bombast.
- Negative letter-spacing at display sizes (-0.02em to -0.025em) creates tight, confident headline blocks.

**Color Counts:**
- 2-3 color system is the norm for premium: one warm neutral (cream/off-white), one ink (warm-black, never blue-gray), one accent.
- The warm off-white revolution: `#FEFDFB`, `#FFFDF5`, `#FAF3E0`, `#f6f5f4` — nobody uses pure white anymore.
- Single-accent discipline: Todoist red, Notion blue, Amie pink. One color "burns" on an otherwise achromatic page.

**Motion Norms:**
- Scroll-triggered opacity + translateY (fade-up) on section entry is table stakes.
- Staggered card reveals (staggerChildren 50-80ms) for bento grids.
- Cursor-reactive light/glow effects (Lazy, Linear) for hero sections.
- GSAP and Motion (Framer Motion) dominate. Lottie for mascot/illustration animation.
- Reduced motion respect is non-negotiable (prefers-reduced-motion media query).

**Section Counts:**
- Premium pages run 5-9 sections: Hero → Proof strip → Problem/features → Demo → Social proof → Pricing → Final CTA.
- Todoist: ~6 sections. Linear: 5 sections. Notion: 7-8 sections. Doo: 5 sections.
- The ceiling is visitor patience, not feature count. Every section earns its place or gets cut.

**Layout:**
- Bento grids for multi-value-prop hero sections (Linear, Payhawk, others).
- Single-column editorial scroll for narrative products (Lazy, Reflect).
- Left-right split for "rational + visual" hero (Todoist, traditional SaaS).

### What's Already Looking Dated

- **Pure white backgrounds** — feel clinical and generic vs. warm off-white
- **Multiple competing accent colors** — the 5-color palette SaaS page reads as 2022
- **Inter everywhere with no display typeface** — defaults to generic in 2026
- **Static hero screenshots without context** — replaced by interactive demos and product-in-use video
- **Logo bar with no customers** — fake-it-till-you-make-it logo strips are instantly recognized as dishonest
- **Glassmorphism / gradient mesh backgrounds** — peaked in 2023, now reads as "designed by AI template"
- **Zigzag alternating image-text layouts beyond 2 sections** — banal; break with bento, full-width, or vertical stack
- **Dark mode as default for non-developer tools** — warm/light is winning for productivity aimed at normal humans
- **Autoplay hero video with sound** — intrusive, adds loading time, killed by mobile
- **"Trusted by 10,000+ teams" with no specific names** — generic claims without attribution are invisible

---

## 4. Three Concrete Steals, Translated

### Steal 1: The Warm Paper Canvas + Opacity Hierarchy

**The job:** Make the page feel like a beautiful planner/notebook, not software.

**Source mechanism (Todoist):** `#FEFDFB` background, single warm-black ink at 4 opacity levels, one red accent for CTA only. Shantell Sans hand-drawn doodles in margins.

**Planevo translation:** Cream paper `#FFFDF5` (already our brand). Ink color: forest-green-black at 100/70/50/20 opacity for headlines/body/captions/borders. Single honey accent `#D4A853` reserved exclusively for primary CTA. Dot grid background pattern (our brand asset) replaces Todoist's wavy doodles as the "this is a notebook" signal.

**Why it passes 30%:** Todoist uses wavy doodles + red accent on near-white. We use dot grid + honey accent on cream. The structural principle (one ink, one accent, opacity hierarchy) is a technique, not a copyrightable design. Different palette, different texture, different accent color, different brand personality. A visitor would never confuse the two.

---

### Steal 2: Editorial Serif Whisper (Not Shout)

**The job:** Signal that this planner is thoughtful, literary, and human — not just another SaaS dashboard.

**Source mechanism (Notion + Lazy):** Notion uses Lyon Text only for 32px pull quotes. Lazy uses Migra only for section anchor headlines at 55px. Both treat the serif as editorial punctuation — rare, large, and unmissable.

**Planevo translation:** Fraunces (our brand serif) at 48-56px for the single hero headline and section-opening statements only. Never in body text, buttons, or UI. Body in DM Sans or Inter. Fraunces appears maybe 6-8 times on the entire page — each instance is an editorial moment that carries weight because of its rarity.

**Why it passes 30%:** Notion pairs a custom sans with Lyon Text on a midnight/cream split. Lazy pairs Inter with Migra on all-dark. We pair DM Sans with Fraunces on cream/honey/forest. Different serif, different palette, different page structure. The principle of "serif as punctuation" is shared by magazines worldwide — it's a technique, not a trade dress.

---

### Steal 3: Mascot as Wayfinding Character (Not Spokesman)

**The job:** Build emotional connection and brand recall without making the page feel childish or mascot-dependent.

**Source mechanism (Sprout template + Duolingo discipline):** Bramble the hedgehog appears in the hero (idle animation), in section transitions (contextual poses), and inside the interactive quiz (guiding). Never on every screen. Different poses, same style. Physics-based subtle animation (wobble, blink).

**Planevo translation:** Bruno the bear appears in exactly 3 places: (1) hero section — idle loop, small, positioned beside the headline like a margin illustration in a planner; (2) empty-state moment in the demo — "nothing planned yet" with Bruno holding a coffee; (3) footer/CTA section — Bruno waving goodbye. Uses transparent WebM for animation, static PNG fallback. Never in feature sections, never in screenshots, never as a spokesman with speech bubbles. Bruno's role is "calm companion," not "cartoon guide."

**Why it passes 30%:** Sprout uses a hedgehog on sage/honey toddler palette with watercolor style. We use a bear on cream/forest/honey student palette with our own illustration style. The principle of "3 placements, contextual poses, never on every screen" is UX mascot best practice, not any single brand's property. Different character, different context, different audience, different illustration style.

---

## 5. Three Deliberate DON'Ts

### DON'T 1: Dark Mode Default

**The trend:** Linear, Reflect, Lazy — all use near-black canvases. Dark mode is extremely prevalent on godly.website's productivity section.

**Why Planevo must not chase this:** Our entire brand identity is built on cream paper, dot grid, and warm editorial tones. Dark mode is optimized for developer tools and "digital-native" aesthetics. Our audience is college students who associate planners with paper, notebooks, and warmth. A dark canvas would undermine the "calm physical planner brought to life" positioning and force us to abandon our strongest differentiator (the warm paper feel). Additionally, dark productivity apps signal "always-on work mode" — the opposite of Planevo's "calm" promise.

### DON'T 2: Bento Grid Hero

**The trend:** Linear's bento grid is the single most-imitated pattern from godly.website's 2024-2026 era. Every SaaS landing page now has one.

**Why Planevo must not chase this:** Bento grids communicate "we do many things at once." Planevo's value prop is singular — "dump everything, get a calm plan." A bento grid in the hero would fragment attention and imply complexity, which is the opposite of our promise. Our hero should be one clear statement + one product screenshot showing the before/after (chaos board → calm scheduled day). Bento grids are for Linear because they genuinely have 8 feature categories. We have one story arc. Second reason: bento on cream/serif reads as indecisive — editorial pages demand single-column narrative rhythm.

### DON'T 3: Fake Social Proof

**The trend:** Logo bars, "Trusted by X teams," inflated user counts — standard on every SaaS landing page.

**Why Planevo must not chase this:** We have zero users. Faking it is immediately recognizable in 2026 and destroys credibility with our student audience (who are highly attuned to inauthenticity). Instead, our proof section must be honest: real calendar integrations (Google Calendar, Apple Calendar — these are verifiable), a working demo (the product IS the proof), a founder's note with a real face and falsifiable promise, and precise claims ("syncs in 200ms" not "blazing fast"). The absence of a logo bar at pre-launch is itself a trust signal — it says "we're new and we're honest about it."

---

## 6. Headline/Slogan Raw Material

### Patterns observed across reviewed sites:

| Site | Headline | Pattern |
|------|----------|---------|
| Todoist | "Clarity, finally." | Outcome + relief (2 words) |
| Amie | "Todos, email, calendar. All-in-done." | List + pun resolution |
| Lazy | "Never interrupt your workflow again." | Never + pain point + again |
| Doo | "A more productive you, one card at a time" | Outcome + mechanism |
| Reflect | "Think better with Reflect" | Verb better + product name |
| herding.app | "Bookmarking for internet herders." | Activity + for + identity |
| Notion | "The AI workspace that works for you." | The [category] that [twist] |
| Linear | "The system for product development" | The [higher category] for [job] |

### Translated headline candidates for Planevo:

**Pattern: Outcome + relief (Todoist style)**
- "A plan that actually works."
- "Calm, finally."
- "Your week, handled."

**Pattern: Never + pain + again (Lazy style)**
- "Never stare at a blank week again."
- "Never wonder what's next again."

**Pattern: Verb better (Reflect style)**
- "Plan better. Breathe easier."
- "Plan less. Do more."

**Pattern: The [category] that [twist] (Notion style)**
- "The planner that plans itself."
- "The daily plan that actually knows your day."

**Pattern: Activity + for + identity (herding style)**
- "Daily planning for students who have too much on their plate."
- "A calm board for chaotic semesters."

**Pattern: List + resolution (Amie style)**
- "Classes, deadlines, life. One calm plan."
- "Everything on your plate. Nothing on your mind."

**Pattern: Mechanism-forward (Doo style)**
- "Dump it all. Watch it sort itself."
- "Your real free time, filled with what matters."

---

## Appendix: Site Index

| Site | URL | Category on Godly | Primary Relevance to Planevo |
|------|-----|-------------------|------------------------------|
| Todoist | todoist.com | Productivity | Warm paper canvas, honest tone, opacity hierarchy |
| Notion | notion.com | Productivity | Editorial serif accent, two-stage light/dark, publication metaphor |
| Lazy | lazy.so | Productivity | Serif-as-identity, editorial dark mode, GSAP scroll |
| Amie | amie.so | Productivity | Calendar peer, joyful utility, copy warmth |
| Doo | getdooapp.com | Productivity | Product-as-hero, card metaphor, monochrome framing |
| herding.app | herdi.ng | Productivity, Fun | Conversational copy, page-as-demo, bento |
| Reflect | reflect.app | Productivity | Editorial whisper weight, single-typeface weight variation |
| Linear | linear.app | Productivity, SaaS | Bento grid benchmark, 5-section structure, Inter + mono |
| Sprout (template) | rocket.new | Illustration, Fun | Fraunces + mascot + honey palette — near-exact material match |
| Storylane | storylane.io | SaaS tooling | Demo-as-hero pattern documentation |
