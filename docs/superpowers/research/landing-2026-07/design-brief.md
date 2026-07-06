# Planevo Landing Page — Conference Design Brief

**Conference Chair Synthesis · July 6, 2026**
**Status:** Final — all decisions binding. No hedging.

---

## The Reconciled Direction

Planevo's landing page is a **single-pass narrative** that earns trust through a working demo (not words alone), restrains itself to one moment of motion, and positions the product as the calm answer to student chaos — without borrowing authority it hasn't earned.

---

## Final Section Order (11 zones, one story)

| # | Section | Job | Key call |
|---|---------|-----|----------|
| 1 | **GlassNav** | Persistent escape hatch — 4 links + CTA | Reduced from 8 links |
| 2 | **Hero** | Land the feeling + prove the product in one viewport | Demo-as-hero; headline is emotional, demo is proof |
| 3 | **ProofStrip** | "This works in your world" | Integration logos + falsifiable claim (zero-users config) |
| 4 | **Three Deep Rows** (Capture → Board → Plan My Day) | The full wedge explained through progressive trust | Each row = one step; connect line ties them |
| 5 | **FeatureBento** (2×2: Sources · Tasks · Calendar · Notes) | "Yes, it has that" — completeness without bloat | Replaces 4 full showcase rows |
| 6 | **FoundersNote** (scroll-pinned) | Honest credibility; signed personal trust | Replaces the self-quote |
| 7 | **BrunoSection** (tabs + skills grid) | Personality + AI depth; the one section with warmth | Bruno's home; nowhere else above this |
| 8 | **PricingSection** | Convert interest into action | Annual toggle + first-class .edu offer |
| 9 | **FaqSection** | Objection handling; SEO via JSON-LD | 7 questions, animated accordion |
| 10 | **FinalCta** | Slogan echo + one button | Single action, no competing CTAs |
| 11 | **Footer + ForestBand** | Site map + brand art moment | Illustrated forest horizon (Higgsfield) |

**Emotional arc:** Promise → Proof → Explanation → Completeness → Trust → Personality → Decision → Reassurance → Action → Departure.

---

## Hero Decision: Demo-as-Hero (Product UI Above the Fold)

**The call:** The hero shows both — editorial headline AND working product demo in the same viewport. Not words-only, not demo-only.

**Why:**

Littlebird's words-only hero works because they have $11M in funding, an established user base, and brand recognition (Littlebird report §2.2, §3.2). They can afford to delay proof. We cannot. We have zero users and zero brand equity.

For a pre-launch product, the working demo IS the social proof (SaaSFrame §3, Godly Pattern 8, Amie DON'T 3: "don't bury the unique mechanic"). The adaptive scheduling must be the hero, not something discovered on scroll 3. Rise's death proved: invisible automation doesn't retain — users must SEE the magic.

**Implementation:** Fraunces serif headline with rotating italic word occupies the top portion; directly below, the demo card plays the capture → board flow ONCE, then rests. This is the "product speaking to you" pattern (Amie old site) translated to our materials.

**What it's NOT:** It's not a full-screen video. It's not an embedded interactive walkthrough. It's a styled, play-once demonstration nested within a typographic hero — words frame it, demo proves it.

---

## Motion Doctrine: The ONE Moment

**The one motion moment:** The hero demo playing its single pass (capture → board → plan placement). After ~8 seconds, the page is still.

**Reconciliation:**
- Amie's pivot taught us: animation spectacle kills conversion when it becomes the product. Their viral site was beautiful but they rolled it back for a "document-like" page. We take the lesson: motion serves the product demo, not decoration. (Amie report §6, DON'T 1)
- Rise's death taught us: invisible automation doesn't retain — users must see the value happen. So the demo MUST be animated, showing tasks flowing into calendar slots. (Rise report §7, Appendix)
- The playbook doctrine: "at rest, the page is still." Motion happens once on entry, then stops. (Playbook §6)

**Result:** One animated demo pass. RotatingWord cycles slowly (3.2s) as ambient text motion — this is NOT the "moment," it's a living-page signal like Littlebird's breathing-cadence elements. Everything else: scroll-reveals on entry (one-shot), FAQ accordion on click (user-triggered), hover states (direct response). No infinite loops. No autoplay video. The rAF typewriter plays once. After 10 seconds of idle, nothing on the page is moving.

---

## Bruno Placement Rules

Derived from Routine report (§3: Illustration-in-Grid Rules) + Godly (Pattern 7: Sprout mascot discipline):

| Zone | Bruno allowed? | Max size | Rationale |
|------|---------------|----------|-----------|
| Hero | **NO** | — | Product UI is the star (Routine Rule 1) |
| ProofStrip | **NO** | — | Trust zone — logos only (Routine Rule 2) |
| Deep feature rows | **NO** | — | Product UI does the explaining |
| Bento | **NO** | — | Clean icons only (Routine Rule 3) |
| FoundersNote | **NO** | — | Credibility zone (Routine Rule 2) |
| **BrunoSection** | **YES** | Full section | His home — tabs, skills grid, portrait |
| Pricing | **NO** | — | Decision zone |
| FAQ | **NO** | — | Rational zone |
| FinalCta | **MAYBE** | Tiny monogram | Personality signature only |
| **FooterBand** | **YES** | Silhouette in landscape | The brand art moment |

**Total appearances:** 2 sections (BrunoSection + footer silhouette). Optional: monogram watermark in FinalCta.
**Visual attention budget:** ≤15% of total page. Product UI: ≥60%. Typography/whitespace: ~25%.

---

## Copy Voice Rules

The Planevo voice is: **low-volume, present-tense, student-specific, outcome-anchored, and quietly confident.** It speaks like a calm upperclassman who figured something out, not a marketer or a therapist.

### Constraints
- Sentences ≤20 words (headlines ≤8)
- No exclamation points in body copy
- No "AI" in the hero — the product does, not "AI does"
- No superlatives (best, fastest, most powerful)
- No hustle verbs (crush, hack, optimize, supercharge, leverage)
- "Free" appears exactly twice on the page (hero badge + pricing section)
- Second person "you/your" dominates; "we" only in the founder's note

### 5 Verbatim Voice Examples

1. **"Deadlines sync in by themselves — and Planevo never schedules over something already on your calendar."**
   — Falsifiable claim, trigger-condition pattern (Rise), concrete mechanism, no adjectives.

2. **"When Tuesday explodes, Wednesday already adjusted."**
   — Trigger-condition (Rise Steal 3) + temporal poetry (Sunsama "End each day feeling successful"). Student-scale humor without profanity.

3. **"A backlog that stays honest. Overdue work quietly rolls forward instead of piling up."**
   — Personification of the tool (Littlebird "Gets to know you"), specific mechanism, "quietly" is the hero adverb (Rise phrase #3: "silently help you have better days").

4. **"No card required · Cancel anytime"**
   — Ultra-short risk reversal (Sunsama repeats "no credit card" 4x). Two clauses, no full sentences needed. Permission to try.

5. **"We built Planevo because our own weeks kept falling apart."**
   — First person plural, honest admission, no hype. The founder's note voice: personal, specific, slightly self-deprecating (Sunsama Steal 3: values-as-trust).

---

## Proof Strategy (Zero Users)

We never fabricate. The proof hierarchy (SaaSFrame §3, playbook §3.1):

1. **The product is the proof.** The hero demo plays once, showing real UI doing the real thing. (Strongest asset for pre-launch — Godly Pattern 8, Amie's "product speaking to you")
2. **Integration logos are real logos.** Canvas, Google Calendar, Notion, Slack, Linear — verifiable technical capability.
3. **Falsifiable claims replace vague authority.** "Never schedules over something already on your calendar." "Syncs in by themselves." Specific, testable, honest.
4. **Signed founder's note replaces fake testimonials.** The scroll-pinned treatment survives — only the substance changes from self-quote to personal letter.
5. **Absence of proof IS a trust signal.** No logo bar, no "trusted by" count, no star ratings. Gen Z students detect startup bullshit instantly (Godly DON'T 3, Routine DON'T 2).

**Upgrade path:** After launch, 3 real student quotes (first name + school + year) replace the founder's note slot.

---

## Typography Confirmation

- **Display:** Fraunces (variable, `opsz` + `SOFT` + `WONK` axes) — warm, confident, editorial mass. Never Cormorant Garamond (too delicate). Never Meraki or Test Söhne (Littlebird's faces — DON'T 2).
- **Body/UI:** Geist Sans — already in the stack, clean, modern.
- **Mono:** Geist Mono — rationed to section eyebrows ONLY.
- **Display line-height:** 1.05–1.08 (never 1.0 — clips descenders).
- **Fraunces usage:** Hero h1, section-opening h2s, FinalCta h2. Approximately 6-8 instances on the entire page. Each is an editorial moment. Body never uses serif.

## Color Confirmation

- **Paper:** `#FFFDF5` (our cream — lighter and cooler than Littlebird's `#f3edda`)
- **Ink:** `#1B1C15` (warm near-black) at 100/70/50/20 opacity levels
- **Honey accent:** `--color-honey-deep` for CTAs, focus rings, active states
- **Forest green:** For integration icons, checkmarks, success states
- **Single-accent discipline:** Honey is the ONE "burning" color on an otherwise cream/ink page (Todoist/Amie model)
- **Banned:** `--color-ink-faint` for any readable text (2.9:1 fails WCAG)

---

## Three Slogan Candidates

### Rank 1: "A plan that adapts."

**Exact h1 text:** `A plan that` _adapts._

**Rotating italic words:** adapts → bends → listens → keeps up

**Rationale:** Four words. Names the single differentiator (adaptation) that no competitor owns. Sunsama owns "calm," Amie owns "without a bot," Littlebird owns "Remember everything." "Adapts" is unclaimed territory. The statement is falsifiable — the product either reshuffles or it doesn't. Littlebird's "Remember everything" proves that 2-4 word declarative slogans with a totalizing verb carry maximum editorial weight. Rise's failure proves the adaptation must be named, not hidden.

**Treatment:** Static "A plan that" in Fraunces regular + rotating italic word in honey-deep color, spring animation, 3.2s cycle. Width reserved to longest word ("keeps up") — zero CLS.

---

### Rank 2: "Dump everything. It becomes a plan."

**Exact h1 text:** `Dump everything.` `It becomes a` _plan._

**Rotating italic words:** plan → board → schedule → calm day

**Rationale:** Two sentences — the first is an imperative (lowers activation energy), the second is transformation (the outcome). Matches the literal product flow (brain-dump → calm board). Amie's "noun list + punchline" pattern and Sunsama's "compound imperative with relief verb" (Littlebird §7). More action-oriented than #1 — speaks to students who want to DO something rather than read a philosophy. Risk: "dump" might read as crude to some audiences.

**Treatment:** "Dump everything." on line 1, "It becomes a [rotating]." on line 2. Two-line hero headline, stacked.

---

### Rank 3: "Your week, handled."

**Exact h1 text:** `Your week,` _handled._

**Rotating italic words:** handled → sorted → planned → calm

**Rationale:** Three words. Ultra-short, Todoist "Clarity, finally." energy (Godly Pattern 1). The possessive "your" personalizes, "week" is the student time unit (not "day" which is too small, not "life" which is too vague), "handled" is the emotional relief — the work is done, you didn't have to do it. The comma creates the Sunsama breathing-pause cadence. Risk: may be too abstract without the demo below it to give it meaning.

**Treatment:** "Your week," static + rotating italic word. Single-line.

---

## Rejected Findings (overruled)

| Recommendation | Source | Why rejected |
|---|---|---|
| Words-only hero, no product UI above fold | Littlebird report §5 Steal 1 | Requires existing brand equity we don't have. For zero-user pre-launch, the demo IS the proof. Amie DON'T 3 + SaaSFrame §3 override this. |
| Problem-validation section before any product (profanity or raw honesty block) | Sunsama report §2 Steal 2 | Adds a section that delays the product proof. The hero subhead already validates the problem in 24 words ("For students whose calendars change faster than they can replan"). A full "chaos" section would make the page longer without earning conversion. Students don't need to be told their life is chaotic — they know. Show the solution faster. |
| Seven-day adoption timeline section | Amie report §5 Steal 3 | Adds a section we can't back with real data pre-launch. "Day 3: Watch it land" is a promise we haven't proven. Cut until we have retention data to support temporal claims. |
| "Sound familiar?" competitor-aware pain-point cards | Routine report §5 Steal 1 | Requires naming competitors when we have zero market presence. Sunsama DON'T 3: "Comparing yourself to established tools when you have no users signals insecurity." Implicit positioning in the hero subhead is enough. |
| Feature-as-lifestyle FAQ-style "Built for Every Team" multi-persona cards | Routine report DON'T 3 | Planevo is a vertical product (students). Fragmenting into persona cards dilutes the one message. One audience, one message at launch. |
| Pricing Manifesto / 10-principle values document | Sunsama report §5 Steal 3 | Premature. We haven't earned the right to philosophize about pricing. The founder's note carries the values signal in 2 sentences. A manifesto launches when we have paying users and need to justify price increases. |
| Cursor-reactive glow effect in hero | Godly report Pattern 3 | Conflicts with motion doctrine (page must be still at rest). A cursor glow is ambient motion that never stops. Our hero demo plays once and rests — no persistent effects. |
| Belief-statement section headers before each feature | Rise report §5 Steal 2 | Two belief statements would add copy density to sections that should lead with product UI. The section eyebrow + h2 already frames the feature. One belief statement (in the founder's note) is enough. |

---

*This brief is the reconciled direction. Every call cites its source. The implementation plan operationalizes it task-by-task.*
