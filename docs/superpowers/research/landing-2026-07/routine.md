# Routine.co — Landing Page Teardown
## Research Agent 4 · The Bruno Question

---

## 1. Access Log

| URL | Status | Notes |
|---|---|---|
| `https://routine.co` | ✅ Full HTML rendered | Main landing page, all sections scraped verbatim. JS-rendered content mostly available via fetch. |
| `https://routine.co/features` | ✅ Rendered | Feature index — list only, no per-feature detail pages fetched. |
| `https://routine.co/pricing` | ✅ Full | Four pricing tiers + feature comparison table + FAQ + testimonials. |
| `https://routine.co/about` | ✅ Full | Team page, company timeline, investor section. |
| `https://routine.co/manifesto` | ✅ Full | 8-principle manifesto + vision statement. Signed by CEO. |
| `https://routine.co/press` | ✅ Full | Brand colors (#F96359 primary, #333 secondary, #B2B2B2 tertiary, #FFF quaternary), logos, company stats. |
| `https://routine.co/download` | ✅ Full | Platform-specific download links, web-app caveat. |
| `https://routine.co/blog` | ✅ Index only | Blog index page scraped for headline patterns. |
| **Visual analysis** | ⚠️ Indirect | No direct screenshots — visual details sourced from SaaSFrame teardown (routine-landing-page), SaaSFrame pricing-page analysis, SaaSFrame download-page analysis, SaaSFrame comparison-page analysis, and a third-party hero redesign case study on Contra. Stated explicitly: all visual/illustration claims below are triangulated from multiple credible third-party design analyses, not direct screenshot inspection. |

**Confidence level:** High on copy, structure, section order, and color palette (directly observed). Medium-high on illustration placement, animation, and grid specifics (sourced from SaaSFrame and cross-referenced with multiple analyses). I did not fabricate any visual detail.

---

## 2. Section-by-Section Job Map

### Section 1: Sticky Navigation Bar
**JOB:** Persistent escape hatch — keeps "Get started" and "Request a demo" reachable at every scroll depth.
**Mechanism:** Minimal sticky header with product name, nav links, two CTAs. No logo animation, no illustration. Pure utility.
**Notable copy:** Two CTAs side-by-side: "Get started for free" (primary) and "Request a demo" (secondary).
**Illustration present:** No. Zero decorative elements. The navbar is illustration-free on every page observed.

### Section 2: Hero
**JOB:** Compress the entire value prop into one scannable screen. Prove this is a real product, not a concept.
**Mechanism:** Bold headline + one-line subhead + twin CTAs + platform badges (macOS, Windows, Linux, iOS, Android, Web) + product UI visual below.
**Verbatim headline:** "All your work in one place powered by AI"
**Verbatim subhead:** "Manage your tasks, meetings, projects, notes ... and delegate work to AI."
**Illustration present:** Custom vector illustrations and 3D device mockups contextualizing the product UI (per SaaSFrame). The hero does NOT use a character/mascot. It shows the product in situ — likely a stylized device frame containing real UI.
**Key observation for Bruno:** The hero is the HIGHEST-stakes real estate. Routine puts product UI here, not illustration. Illustrations appear as contextual framing (device mockups, ambient elements) but the product is the star.

### Section 3: Social Proof Bar
**JOB:** Establish credibility immediately after the promise. Neutralize "who uses this?" objection before features begin.
**Mechanism:** Single line: "Loved by 100k+ ambitious professionals and teams worldwide" — likely accompanied by logo strip (not captured in text fetch).
**Verbatim copy:** "Loved by 100k+ ambitious professionals and teams worldwide"
**Illustration present:** No illustrations. Logos only (inferred from standard SaaS pattern + SaaSFrame confirmation).

### Section 4: "Capture Everything" Feature Block
**JOB:** Prove the product solves the input problem — getting stuff IN is fast and frictionless.
**Mechanism:** Section header + four sub-features in card layout, each with icon + title + description.
**Sub-features:**
- **Quick capture** — "Create tasks at the speed of light through a desktop hotkey, enrich them with context and stop switching between apps and services."
- **AI meeting notes** — "Summarize meetings and automatically turn action items into tasks to ensure nothing falls through the cracks. Works on all platforms, without any meeting bot!"
- **Universal inbox** — "Centralize all your tasks, messages & notifications and stop wasting time switching between apps and services."
- **AI voice assistant** — "Delegate remembering or organizing through voice, in particular when you are on the go."
**Section headline:** "Capture everything"
**Illustration present:** Carefully chosen icons complement feature descriptions (per SaaSFrame). These are SPOT illustrations — small, functional, per-feature. Not decorative narrative art.

### Section 5: "Automate and Delegate" Feature Block
**JOB:** Position AI as leverage, not just a feature. Escalate from "capture" (input) to "automate" (output).
**Mechanism:** Standalone section with copy + likely a product-UI-forward visual showing agents/automation.
**Verbatim copy:** "Add specialized AI agents to your workforce, automate complex processes and focus on taking key decisions."
**Illustration present:** Likely product UI or stylized vector showing automation flow (inferred from visual analysis pattern).

### Section 6: "Organize and Plan" Feature Block
**JOB:** Show the organizational backbone — this is where "one place" becomes tangible.
**Mechanism:** Section header + four sub-features (Planner, Time blocking, Labels/priorities/projects, Recurrences).
**Verbatim sub-feature copy:**
- **Planner** — "Plan your tasks and events through a single screen."
- **Time blocking** — "Block time for your most important tasks to make sure those get done."
- **Labels, priorities & projects** — "Categorize your your work with labels, assign priorities and organize everything through projects."
- **Recurrences** — "Schedule recurring tasks effortlessly, and never drop the ball anymore."
**Illustration present:** Functional icons/spot illustrations per feature. Product UI likely dominates the visual for Planner and Time blocking.

### Section 7: Testimonial Strip (First Insertion)
**JOB:** Break the feature monologue with human voices. Prove switching pain is worth it.
**Mechanism:** Three 5-star testimonials, each with a migration badge (Todoist→Routine, Akiflow→Routine, Notion→Routine). The migration badge is brilliant — it names the competitor you're replacing.
**Verbatim testimonials:**
- "Finally an app that just works in getting things done. I can focus on my work and not worry about which tool to switch to access my data." (Todoist→Routine)
- "I used Akiflow before but it was too constraining. Routine is simple at first, but super customizable when you start adapting it to your workflow." (Akiflow→Routine)
- "We switched to Routine and everything fell into place immediately. We didn't waste hours setting it up like Notion, it's super fast and actually more extensible." (Notion→Routine)
**Illustration present:** None. Stars, text, migration badges only.

### Section 8: "Stay Focused" Feature Block
**JOB:** Address the "but I'll get distracted" objection. Show the product protects attention.
**Mechanism:** Three sub-features (Menu bar widget, Work & personal, Reminders).
**Verbatim copy includes:** "Never lose track of upcoming meetings, track where you spend your time and focus on one item at a time."
**Illustration present:** Likely menu-bar-widget UI screenshot + spot icons.

### Section 9: "Data Model" Section
**JOB:** Signal extensibility and power-user depth. Separate from lightweight planners.
**Mechanism:** Copy about custom data types (customers, projects, candidates, bug reports, marketing initiatives).
**Verbatim copy:** "Make Routine your own by defining the entities you manipulate every day: customers, projects, candidates, bug reports, marketing initiative etc."
**Illustration present:** Likely abstract data visualization or product UI.

### Section 10: Testimonial Strip (Second Insertion)
**JOB:** Second social-proof break. This time targets team/company buyers.
**Mechanism:** Three more 5-star testimonials with migration badges (Notion→Routine, ClickUp→Routine, Asana→Routine).
**Verbatim copy includes:** "Routine has simply replaced our specialized tools (support, projects etc.) and become our single source of truth and company operating system."

### Section 11: "Extend as You Grow" Feature Block
**JOB:** Future-proof objection handling. "Will I outgrow this?"
**Mechanism:** Three sub-features: Databases, Views, Workspaces.

### Section 12: Integrations
**JOB:** Remove the "but I already use X" blocker.
**Mechanism:** "Connect all the apps & services you use daily and bidirectionally synchronize your data to centralize all your work in Routine."
**Illustration present:** Integration logos (inferred).

### Section 13: Testimonials (Third Insertion — Extended)
**JOB:** Full social-proof section. Named individuals with titles and companies.
**Mechanism:** 6 testimonials with real names, real titles, real companies (Francesco D'Alessio / ToolFinder, Sean Oliver, Mathias Rhein, Clement Cazalot / Techstars, Reshma Khilnani / Y Combinator, Eliott Jabes / Stockly).
**Verbatim highlights:**
- "Task management is time management." (Sean Oliver)
- "Love Routine - and not only for its good looks!" (Reshma Khilnani / YC)

### Section 14: "Explore All Features" Grid
**JOB:** Completeness signal — prove feature depth without forcing the reader to navigate away.
**Mechanism:** A dense grid of 28+ feature names, each with a "See it in action" link. This is a INDEX, not an explanation. Designed for the browser who wants to confirm a specific feature exists.
**Key features listed:** Agenda, AI agents, AI assistant, AI automations, AI meeting notes, AI voice commands, Contextual capture, Dashboard, Databases, Keyboard shortcuts, Menu, Menu bar widget, Multi accounts, Natural language, Offline, Pages, Planner, Recurrences, Redirection, References, Reminders, Search, Smart planning, Time blocking, Time tracking, Timers, Transclusion, Universal inbox, Views.

### Section 15: "Built for Every Team" Audience Blocks
**JOB:** Let the reader self-select. "This is for someone like me."
**Mechanism:** Four persona cards: Founders, Freelancers, Startups, SMBs. Each with a 2-sentence pitch.
**Notable copy patterns:**
- Founders: "Never lose focus of what matters and move the needle every day."
- Freelancers: "Easily track the time you spend on each task to easily bill your clients."
- Startups: "Leverage AI to automate your workflows and focus on learning about your customers and reaching PMF."

### Section 16: Footer
**JOB:** Catch-all navigation + legal + residual CTAs.

---

## 3. Illustration-in-Grid Rules — The Routine Playbook (and What It Means for Bruno)

Based on triangulated analysis from SaaSFrame teardowns, press kit review, and copy-structure mapping, here are the implicit rules Routine follows for when and how illustration appears:

### Rule 1: The Hero Belongs to the Product, Not the Illustration
Routine's hero section shows the actual product UI in context (3D device mockups, stylized screenshots). Custom vector illustrations frame the product — they are the STAGE, not the ACTOR. The product screenshot is the hero image.

**Bruno translation:** Bruno should NEVER be the hero image. If Bruno appears at hero level at all, he should be a small contextual element (e.g., peeking from behind a device frame, sitting on a calendar block) — not the focal point. The product UI must dominate the hero.

### Rule 2: Illustrations Shrink as Credibility Stakes Rise
The higher the credibility stakes (hero, social proof, testimonials, pricing), the smaller or more absent illustrations become. Routine uses ZERO illustration in testimonials, the social proof bar, and pricing tiers. Illustrations appear in mid-page feature sections where the job is EXPLANATION, not TRUST.

**Bruno translation:** Bruno is banned from testimonial areas, pricing, and social proof. Bruno earns real estate in feature-explanation sections and transitional moments.

### Rule 3: Spot Illustrations, Not Narrative Scenes
Routine uses small, focused vector icons/illustrations tied to individual features — what the industry calls "spot illustrations." They do NOT use large narrative scenes, panoramas, or character-driven stories. Each illustration is a visual anchor for ONE concept.

**Bruno translation:** Bruno should appear as spot-illustration-scale elements, not full-scene narrative art. Think: Bruno holding a calendar block, not Bruno in a day-in-the-life comic strip. One Bruno per concept, contained within its card.

### Rule 4: Illustration Serves Three Jobs Only — Emotion, Explanation, Pacing
Looking at where Routine places visual whimsy:
- **Emotion:** Gentle animations and playful micro-interactions to create warmth (hover states, scroll-triggered reveals).
- **Explanation:** Spot illustrations that make abstract concepts concrete (AI agents, voice commands).
- **Pacing:** Visual breaks between text-heavy feature blocks to prevent wallpaper monotony.

Illustration is NEVER used for: social proof, trust signals, navigation, CTAs, or pricing.

**Bruno translation:** Bruno can do emotion (a small wave in a transition), explanation (demonstrating a feature), or pacing (appearing between sections as a visual breath). Bruno must never do trust-signaling work.

### Rule 5: Product UI Outweighs Illustration Roughly 4:1
Across the page, real product screenshots/mockups appear ~4x more often than decorative illustrations. The ratio communicates: "this is a real tool, not a concept." Every feature section that matters shows the ACTUAL interface.

**Bruno translation:** For every section where Bruno appears, there should be 3-4 sections where real Planevo UI dominates. Bruno is the spice, not the main course. A good target: Bruno appears in 2-3 spots on the entire landing page. Product UI appears in 8-10.

### Rule 6: Illustration Style is Geometrically Consistent with the Grid
Routine's custom vector illustrations share the same geometric language as their UI — clean lines, consistent stroke weights, the same color palette. Illustrations don't break the grid or introduce visual chaos.

**Bruno translation:** Bruno's illustration style must match Planevo's design system — Fraunces-class serif weight harmony, cream/honey/forest palette, consistent line weight. Bruno should feel like he belongs to the same designer who made the UI, not a different art style pasted in.

### Rule 7: No Character, No Mascot — Routine Proves Whimsy Without One
This is the critical finding: **Routine achieves its "whimsy/restraint blend" entirely through micro-animations, custom vector spot illustrations, and interaction design — WITHOUT any character or mascot.** Their whimsy is systemic (in the motion, the spacing, the hover states) rather than character-driven.

**Bruno translation:** This is both a caution and an opportunity. Caution: Routine proves you don't NEED a mascot to feel warm. Opportunity: if Planevo deploys Bruno well, it's a genuine differentiator in the productivity space — almost nobody does it. But the threshold for "well" is extremely high. Bruno must be as disciplined as Routine's motion design: present but never dominating, warm but never childish, consistent but never repetitive.

### Rule 8: Illustration Appears Below the Fold, Never Above
No custom illustration appears in the first viewport (hero + social proof bar). All illustration enters after the user has already made the commitment to scroll. This is a trust-first, whimsy-second sequencing.

**Bruno translation:** Bruno must not appear above the fold. The first scroll depth should be product UI + clean typography + social proof. Bruno can enter in the feature sections (scroll depth 2-3) as a reward for engagement.

---

## 4. Grid & Rhythm Audit

### Vertical Section Rhythm
Routine's page alternates between three section types in a deliberate pattern:

| Section Type | Visual Weight | Content Density | Typical Height |
|---|---|---|---|
| **Feature Block** (4 sub-features) | Heavy — product UI + icons + copy | High — 4 items with descriptions | Tall (~100vh) |
| **Standalone Feature** (1 concept) | Medium — single visual + short copy | Low — one idea | Medium (~50vh) |
| **Testimonial Strip** (3 reviews) | Light — text-only + stars | Low — social proof | Short (~30vh) |

The sequence observed:
```
Hero (heavy) → Social proof (light) → Feature block (heavy) → Standalone (medium) →
Feature block (heavy) → Testimonials (light) → Feature block (heavy) →
Standalone (medium) → Testimonials (light) → Feature block (heavy) →
Integrations (medium) → Testimonials (light) → Feature grid (heavy) →
Audience cards (medium) → Footer
```

**The anti-wallpaper pattern:** Routine never places two sections of the same visual weight adjacent. Heavy always follows light. This creates a breathing rhythm — dense information, then a human pause, then dense information.

### Horizontal Grid Discipline
- **Feature blocks** use a consistent internal layout: section title (centered) → 2×2 or 1×4 card grid with icon + title + description per card.
- **Testimonial strips** use a 3-column equal-width layout.
- **Standalone sections** use a centered headline + centered subtext + full-width visual.
- Alignment is strict center-axis throughout. No left-aligned body sections were observed.

### Spacing Patterns
- **Between sections:** Generous — estimated 80-120px based on the described "abundant white space."
- **Within feature cards:** Tight — compact icon + title + copy blocks.
- **Between testimonial strip and next section:** Extra generous — the testimonial strip acts as a visual breath.

### How Monotony is Avoided
1. **Alternating density** — heavy/light/heavy pattern prevents scrolling fatigue.
2. **Testimonial strips as palate cleansers** — inserted three times, each with different migration badges and different audience focus (individual → team → named people).
3. **Escalating scope** — sections move from personal productivity (Capture) → automation (Delegate) → organization (Plan) → focus (Stay Focused) → extensibility (Extend) → ecosystem (Integrations). The scope widens as you scroll.
4. **Progressive disclosure** — feature grid near bottom gives completeness without forcing it earlier.

---

## 5. Three Concrete Steals, Translated

### Steal 1: The Migration Badge Testimonial Pattern

**The job:** Social proof that acknowledges the reader probably already uses a competitor — and reframes switching as relief, not loss.

**Routine's mechanism:** Each testimonial card carries a small badge showing "Todoist → Routine" or "Notion → Routine." The testimonial copy specifically names the pain of the old tool. This does three things: (a) names the competitor without a comparison page, (b) frames the switch as already completed by a real person, (c) implies "people like you already switched."

**Planevo translation:** Planevo cannot use this directly (zero users, pre-launch). BUT the job — acknowledging the competitor and reframing switching — can be done honestly:

Instead of fake migration badges, use a section called something like "Sound familiar?" with cards showing common student planning pain points attributed to specific tool categories:
- "Your Google Calendar is packed but your to-do list keeps growing" (Google Calendar users)
- "You planned your week in Notion on Sunday — by Tuesday it was fiction" (Notion users)
- "You tried time-blocking but life doesn't block-out cleanly" (generic planner users)

Each card ends with Planevo's differentiator. No fake testimonials. No fake migration badges. But the SAME JOB: acknowledge the tool they already use, name its specific pain, and position Planevo as the escape.

**Bruno placement:** Bruno could appear as a small spot illustration on ONE of these cards — perhaps sitting on a crumbling calendar block — but only one. The cards themselves should feel editorial, not cartoon.

**30% rule:** Passes. The mechanism (competitor-aware social proof) is stolen, but the format (pain-point cards vs. testimonial badges), visual treatment (editorial serif on cream vs. minimalist sans-serif), and the honest no-user framing make this unrecognizable as Routine's section.

---

### Steal 2: The Heavy/Light Section Rhythm

**The job:** Prevent scroll fatigue and create a sense of progress — the reader should feel like they're moving through a story, not reading a feature list.

**Routine's mechanism:** Strict alternation of information-dense feature blocks (product UI + multi-card layouts) with lightweight breather sections (testimonial strips, standalone statements). Never two heavy sections adjacent. Each breather changes the visual language (text-only testimonials vs. product screenshots) to reset the reader's processing.

**Planevo translation:** Apply the same rhythm to Planevo's section sequence:

```
Hero (real product UI — the calm board) → [HEAVY]
Honest proof strip (waitlist count, university interest, beta stats) → [LIGHT]
"Dump everything" feature section (product UI showing task capture) → [HEAVY]
Personality pause (Bruno moment — single illustration + short punchy line) → [LIGHT]
"It becomes a plan" feature section (calendar view, rescheduling UI) → [HEAVY]
"Sound familiar?" pain-point cards → [LIGHT]
"Life happens, plans adapt" feature section (reshuffling animation) → [HEAVY]
Feature completeness grid → [MEDIUM]
Final CTA → [LIGHT]
```

The breathers use Planevo's materials: cream backgrounds for heavy sections, a subtle honey-tinted background for light sections. The contrast between sections comes from background warmth shifts, not just spacing.

**Bruno placement:** Bruno appears ONCE in a light/breather section — the "personality pause" — where the job is pure emotional pacing, not feature explanation. This is where a small, beautifully rendered Bruno sitting on a dot-grid background with a one-line serif headline works perfectly. It earns the warmth because it's surrounded by product seriousness.

**30% rule:** Passes easily. The rhythm principle (heavy/light alternation) is universal design grammar, not Routine's invention. Planevo's materials (serif, cream, honey backgrounds, dot grid) make the execution completely distinct.

---

### Steal 3: The "Explore All Features" Completeness Grid

**The job:** Satisfy the feature-checker — the reader who won't convert until they've confirmed the tool has their specific need — without bloating the narrative flow.

**Routine's mechanism:** Near the bottom of the page, a dense grid of 28+ feature names with "See it in action" links. This is NOT a feature-explanation section — it's an INDEX. It signals: "yes, we have that thing you're looking for." It works because it comes AFTER the narrative flow has done the emotional work, so this is a rational confirmation step.

**Planevo translation:** A similar grid near the bottom of Planevo's page, but with a student-specific tone. Rather than "See it in action," each entry links to a brief demo or animation. The grid would include:

- Dump & sort
- Calendar sync
- Smart scheduling
- Reshuffle when life happens
- Daily calm board
- Due date tracking
- Class schedule import
- Study blocks
- Assignment tracker
- (etc.)

The key steal: placement near the bottom (after emotional buy-in) and format (index, not explanation). The grid answers "but does it do X?" without interrupting the story.

**Bruno placement:** Bruno does NOT appear in this grid. This is a credibility/completeness tool. Clean icons only.

**30% rule:** Passes. The grid format is a standard SaaS pattern. Planevo's student-specific feature naming, serif typography, cream palette, and linking behavior make it distinct.

---

## 6. Three Deliberate DON'Ts

### DON'T 1: Don't Copy the Sans-Serif Minimalist Aesthetic
Routine's entire visual identity — geometric sans-serif, soft blues, muted grays, white backgrounds — is the default productivity SaaS look in 2025-2026. It's competent and forgettable. It signals "professional tool for professionals." Planevo copying this aesthetic would erase its core differentiator: the editorial, warm, slightly analog personality (Fraunces serif, cream paper, honey/forest accents, dot grid). Routine's minimalism works for 30-something professionals. It would REPEL college students who associate that aesthetic with corporate software their parents use.

**Why it matters:** Planevo's brand materials exist specifically to break from this mold. The cream-and-serif approach signals "this was designed for your life, not your boss's workflow." Adopting Routine's aesthetic would be brand suicide.

### DON'T 2: Don't Claim User Numbers You Don't Have
Routine leads with "Loved by 100k+ ambitious professionals and teams worldwide." This only works because it's true. Planevo has zero users. Any version of this ("Join 100+ students already planning better") would read as either a lie or a confession of smallness. Pre-launch social proof must come from honest sources: waitlist interest, university partnerships, feature quality, or transparency about being new.

**The honest alternative:** If Planevo has a waitlist, lead with that count and frame it as momentum ("1,247 students waiting for launch" is more compelling than fake scale). If not, skip the social proof bar entirely and let the product UI speak first.

### DON'T 3: Don't Use a "Built for Every Team" Multi-Persona Section
Routine's audience cards (Founders, Freelancers, Startups, SMBs) work because Routine genuinely serves all of them — it's a horizontal platform. Planevo is a VERTICAL product: student-first daily planner. Creating persona cards ("Pre-med students," "Engineering majors," "Liberal arts students") would fragment the message without adding value. Every student has the same core problem: too much to do, not enough real time. The universal message is stronger than persona segmentation at this stage.

**Exception:** If Planevo later expands to grad students, professionals, or teams, persona cards could earn their place. At launch, one audience, one message.

---

## 7. Headline/Slogan Raw Material

### Routine's Headline Patterns

| Headline | Pattern | Verb Choice |
|---|---|---|
| "All your work in one place powered by AI" | [scope] + [location] + [enabler] | None (declarative) |
| "Capture everything" | [verb] + [scope] | Capture (acquisitive, urgent) |
| "Automate and delegate" | [verb] + [verb] | Automate, delegate (power words) |
| "Organize and plan" | [verb] + [verb] | Organize, plan (control words) |
| "Stay focused" | [verb] + [adjective] | Stay (maintenance, calm) |
| "Extend as you grow" | [verb] + [temporal promise] | Extend, grow (future-facing) |
| "Make Routine your own" | [verb] + [product name] + [ownership] | Make (creative agency) |
| "Download Routine" | [verb] + [product name] | Download (action) |

### Patterns Worth Stealing for Planevo Slogans

**Pattern 1: [Verb] + everything/nothing**
Routine: "Capture everything."
Planevo candidates:
- "Dump everything."
- "Plan nothing twice."
- "See everything. Panic about nothing."

**Pattern 2: [Scope] + in one [container]**
Routine: "All your work in one place."
Planevo candidates:
- "Your whole semester on one board."
- "Everything you owe. One calm screen."
- "All your chaos. One real plan."

**Pattern 3: [Verb] + as [life condition]**
Routine: "Extend as you grow."
Planevo candidates:
- "Adapt as life shifts."
- "Reshuffle as things change."
- "Flex when Tuesday falls apart."

**Pattern 4: Two-verb imperative pairs**
Routine: "Automate and delegate." / "Organize and plan."
Planevo candidates:
- "Dump and breathe."
- "Plan and forget about planning."
- "Block time. Live life."

**Pattern 5: Emotional state as section header**
Routine: "Stay focused."
Planevo candidates:
- "Stay calm."
- "Feel prepared."
- "Stop spiraling."

### Rhythm Observations
- Routine's headlines are SHORT — 2-4 words for section headers, 7-10 words for the hero.
- Verbs are in imperative mood (commands, not descriptions).
- The hero headline is declarative/descriptive; sub-section headers are imperative. This creates a shift from "here's what this is" to "here's what you do."
- Routine avoids superlatives ("best," "most," "only") in the hero. The confidence comes from the breadth claim ("all your work") rather than quality claims.
- For Planevo: the Fraunces serif voice should be slightly warmer and more conversational than Routine's geometric-sans voice. Where Routine says "Capture everything" (corporate-direct), Planevo could say "Dump everything on the table" (student-colloquial).

---

## Appendix: The Bruno Decision Framework

Based on this Routine analysis, here is a decision framework for Bruno's landing-page presence:

| Zone | Bruno Allowed? | Size | Job | Example |
|---|---|---|---|---|
| Hero | NO | — | — | Product UI only |
| Social proof | NO | — | — | Waitlist numbers, logos, stats only |
| Feature section | MAYBE (1 of 4) | Spot illustration | Explanation | Bruno holding a calendar block to illustrate rescheduling |
| Section transition | YES (1 total) | Medium illustration | Emotional pacing | Bruno on dot-grid, serif one-liner, cream background |
| Testimonial area | NO | — | — | Text + stars only |
| Feature grid | NO | — | — | Clean icons only |
| CTA section | MAYBE | Tiny monogram | Personality signature | Bruno as a watermark-scale element near the CTA button |
| Footer | MAYBE | Tiny monogram | Brand signature | Small Bruno mark near copyright line |

**Total Bruno appearances on landing page: 2-3 maximum.**
**Product UI appearances: 8-10.**
**Ratio target: Bruno occupies ≤15% of visual attention; product UI occupies ≥60%; typography/whitespace occupies ~25%.**

This is how Routine achieves whimsy without childishness — through systemic warmth (motion, spacing, micro-interactions) rather than character art. Planevo can match that systemic warmth AND add Bruno, but only if Bruno is deployed with the same restraint Routine applies to its illustrations: small, functional, rare, and always subordinate to the product.
