# Amie.so — Landing Page Research Report
**Research Agent 3 · Product-as-Hero & Microinteractions**
**Date:** 2026-07-06

---

## 1. Access Log

| URL | Result | Notes |
|---|---|---|
| `https://amie.so` | **Fetched successfully** | Full page content rendered as markdown. JS-driven animations are not captured in text fetch, but layout/copy/structure fully extracted. |
| `https://amie.so/art` | **Fetched successfully** | Preserved old hyper-animated landing page (pre-pivot). Critical reference for microinteraction research. |
| `https://amie.so/pricing` | **Fetched successfully** | Pro vs Business tier table. Actual dollar prices are gated/hidden in the rendered version. |
| `https://amie.so/download` | **Fetched successfully** | Minimal page: macOS, iOS, Windows download links + App Store featured badge. |
| `https://amie.so/features/notes` | **Fetched successfully** | Dedicated notes feature page with "Get started" + "Watch demo" CTAs. |
| `https://amie.so/changelog` | **Fetched successfully** | 127+ updates logged. Lowercase, casual tone. |
| Third-party design teardowns (blakecrosley.com, educlopez/design-bites, frontend.fyi) | **Accessed via web search snippets** | Direct fetch blocked by auto-review. Search result excerpts provided extensive detail on animation choreography, color systems, and shadow vocabulary. |
| Industry commentary (LinkedIn, Instagram, Swipe Pages, Seojack, The Verge, Inverse) | **Accessed via web search** | Provided critical context on the pivot from animated → static site and reception. |

**Key limitation:** JS-rendered microinteractions on the live current site cannot be directly observed through text fetch. Animation data relies on (a) the preserved `/art` page structure, (b) multiple third-party technical breakdowns that reverse-engineered the Framer Motion implementation, and (c) landing page gallery metadata confirming current page elements (Product Screenshots, Sticky CTA, Bento Grid). This is stated explicitly per research protocol.

---

## 2. Section-by-Section Job Map

### CURRENT SITE (amie.so — post-pivot, mid-2025 onward)

**Important context:** Amie underwent a major pivot in 2025. The current site is intentionally stripped of the old hyper-animated approach. Industry commentary: "They pivoted back to a simple style landing page. No more crazy animations." — Luka Krcmar. And: "the new site feels very restrained — almost like browsing a document." — josh_yolkk. This makes both the current and old sites relevant to Planevo's research.

#### Section 1: Nav + Hero
- **JOB:** Declare what the product is and give the visitor exactly one specific reason to care, within 3 seconds.
- **Mechanism:** Single headline "AI Note Taker without a bot" with selective amber/yellow highlight on "without a bot" — a typographic device that creates hierarchy without color overload. Two CTAs: "Get started" (primary, vivid blue pill) + "Request a demo" (secondary, text). Below the fold: a product screenshot rendered with enough detail to communicate depth without overwhelming the minimal aesthetic.
- **Notable copy:** `"AI Note Taker without a bot"` — The negative framing ("without") positions against a universal pain point (bots in calls). Six words. No adjectives.
- **Design notes:** Off-white background (#FAFAFA), crisp sans-serif (Inter var), high-contrast blue CTA against near-white. No animation on current site hero.

#### Section 2: Social Proof Logos
- **JOB:** Compress credibility into a single glance — "people like you already use this."
- **Mechanism:** "Trusted by teams at" + horizontal logo strip (Canva, Spotify, and others implied). No counts, no case studies — just logos.
- **Notable copy:** `"Trusted by teams at"` — passive, low-pressure. Not "used by 10,000 teams" — no count, because the job is borrowed authority from known brands, not volume.

#### Section 3: Specific Outcome Claim
- **JOB:** Convert abstract "saves time" into a falsifiable, memorable number.
- **Mechanism:** `"Within 47 seconds: Share summary. Keep CRM updated. Plan action items. Schedule next meeting."` — Four micro-outcomes chained to one precise number. The number is odd (47, not 45 or 60), which reads as measured rather than rounded.
- **Design note:** This is mid-hero, functioning almost as an expanded subtitle. Followed by a solitary "Get started" CTA.

#### Section 4: Meeting Notes Feature Block
- **JOB:** Establish primary use case and position against the field.
- **Mechanism:** Subheadline "Summarize any meeting, without a bot" + inline competitor replacement pattern: `"Replaces: Fireflies, Otter, Fathom"`. This is followed by a "Why Amie?" editorial block that directly acknowledges 27 competitors exist and argues for differentiation.
- **Notable copy:** `"There are 27 meeting notes apps out there. If summaries is all you need, any of them will do."` — Radical honesty. Concedes the commodity, then pivots to differentiation. This is the single most interesting copywriting move on the page: it earns credibility by volunteering a concession.
- **Two real testimonials** with full names, titles, companies (Quentin di Silvestro / beam.ai, Arnaud Mun / dev-id). These are enterprise-leaning, not consumer.

#### Section 5: Summaries & Action Items Detail
- **JOB:** Overcome the "AI summaries suck" objection.
- **Mechanism:** States the common problem ("AI summaries often miss the mark because they don't understand your business") then presents the solution as context-aware AI. Sub-sections: "No bots in calls," "Summary," "Action items." Language support claim: "We speak 17 languages really well. And 82 more without speaker labeling."
- **Notable copy:** `"The common problem with AI summaries is that they don't know the context"` — Names the objection in the prospect's own words before answering it.

#### Section 6: No Bot In Calls (Technical Differentiator)
- **JOB:** Make the "no bot" claim concrete and tangible.
- **Mechanism:** Four specific capabilities as bullet points: pause recording, auto-stop on silence, split recordings, speaker separation. References the macOS notch overlay UI. Includes a user testimonial from a software engineer.
- **Notable copy:** `"If you don't have a notch, you'll instead see a floating UI. It's a good reason to upgrade your Mac though."` — One of the few jokes on the current page. Light, self-aware, non-forced.

#### Section 7: Works Everywhere
- **JOB:** Eliminate the "but I use Zoom/Teams/Slack" objection.
- **Mechanism:** Provider compatibility list (Zoom, Google Meet, Slack Huddle, Microsoft Teams) + three recording modes (manual on Amie-joined, auto-prompt on external, fully automatic).

#### Section 8: Private Notes
- **JOB:** Differentiate from competitors who only offer post-meeting summaries.
- **Mechanism:** Pre/during-meeting private notes that guide AI summary focus points. User can define headings, emphasize numbers, prepare agendas. Private tab not visible to others.

#### Section 9: 7-Day Journey Timeline
- **JOB:** Set realistic adoption expectations and compress "why bother" into a visual arc.
- **Mechanism:** Three-column timeline: Today → Day 3 → Day 7. Progressive value story: record first meeting → connect tools & auto-create items → automate 90% of follow-up. Ends with "Win back hours per week, per team member."
- **Notable copy:** `"What you can achieve with Amie in just 7 days"` — Not a feature list; a temporal promise. Maps to the user's lived experience of onboarding.

#### Section 10: AI Chat
- **JOB:** Demonstrate AI as capable assistant, not just summarizer.
- **Mechanism:** Founder Dennis Müller's own quote: `"It's like ChatGPT, but it has full context about my company and job."` An embedded email from a real user (Nish Budhraja) showing a detailed, unsolicited testimonial — including the admission "I had churned last year but you won me back." This is remarkably honest for a marketing page.
- **Chat Actions sub-section:** Draft emails, create/update meetings, rewrite summaries, create mind maps, move events. The headline example: `"I'm sick, move everything to Thursday."` — shows power through a human moment, not a feature spec.

#### Section 11: Integrations
- **JOB:** Neutralize "but I already use Notion/Slack/Hubspot."
- **Mechanism:** Grid of integration cards with one-line descriptions. Five live (Hubspot, Notion, Slack, Linear, Pipedrive), four "Soon" (Attio, Personio, Ashby, Greenhouse). "Request integrations at care@amie.so" — treats gaps as conversations, not roadmap items.
- **Notable copy:** `"Too many tools require you to use them all the time to be useful. Amie works just as well in the background."` — Reframes the "all-in-one" pitch as "you don't even have to change your workflow."

#### Section 12: Shareable Pages
- **JOB:** Show that recorded meetings become compounding knowledge, not disposable artifacts.
- **Mechanism:** Three organization modes: by recurring event, by domain, by manual grouping. Testimonial positions it as "AI-native CRM." Sub-tabs: Share with anyone, Share like a document, Ask in context.
- **Notable copy:** `"Wow, auto-generated pages are the kind of thing that you don't even know you need until you see it. It's like an AI-native CRM."` — Victor Fteha, Founder. Positioned as discovered value, not expected value.

#### Section 13: Calendar & Todos (Secondary Feature)
- **JOB:** Show that Amie is more than meeting notes — it's a full day-organizer.
- **Mechanism:** "Organize your day on autopilot" headline. Replaces pattern again: `"Replaces: Gcal, Things 3, Motion"`. AI Scheduling and AI Calendar sub-blocks. Three short testimonials:
  - `"It doesn't have to suck to be productive"` — Oz, Founder
  - `"nothing but joy. opening a calendar shouldn't be stressful. can't imagine to go back"` — Raf, Designer
  - `"I can finally do time blocking and to-do lists from one interface."` — Noah, Founder
- **Design note:** This section is demoted below meeting notes — a deliberate signal of Amie's pivot. Calendar is now supporting cast, not lead.

#### Section 14: How It Works (3-Step)
- **JOB:** Make first use feel trivially easy.
- **Mechanism:** Three numbered steps: (1) Download Amie, (2) Start recording, (3) Save hours. CTA: "Get started."
- **Notable copy:** Step 3's verb is "Save" — outcome, not action. The first two steps are mechanical; the third is aspirational.

#### Section 15: FAQ
- **JOB:** Catch remaining objections without cluttering the narrative.
- **Mechanism:** Seven questions in expandable format. Questions include "How does Amie protect my privacy?" and "Can I use Amie at my company?" — acknowledging both individual and enterprise concerns.

### OLD SITE (amie.so/art — preserved, pre-pivot)

This is the version that won design awards and went viral. Structure:

#### Hero: Personalized Greeting
- **JOB:** Make the product feel alive and personal on first contact.
- **Mechanism:** `"Happy Tuesday! It's 10:10 AM and windy in Berlin."` — Time-aware, location-aware, weather-aware greeting. Then: `"You got 2 emails and have 2 meetings today."` — Summarizes your day in one sentence. This is not a marketing claim; it's the product speaking as if you're already using it.
- **Tagline:** `"Todos, email, calendar. All-in-done."` — Wordplay on "all-in-one" → "all-in-done." Three nouns, one punchline.

#### Feature Scrolling Section
- **JOB:** Show each feature in action without a feature dump.
- **Mechanism:** Sticky product screenshot on one side of the viewport, descriptive text scrolls on the other. Feature tabs at bottom: Scheduling | Widgets | Accounts | Pomodoro | Timezones. Each tab swaps the sticky visual.
- **Feature copy pattern:** Short sentence + personality. Example: `"Schedule your todos using natural language, Amie understands you."` / `"Find the right balance between focus and breaks."` / `"Amie helps you juggle multiple timezones so you can beat the jet lag."`

#### Download Block
- **JOB:** Convert to download with zero friction.
- **Mechanism:** `"Download for free"` + four platform buttons: iOS, macOS Silicon, macOS Intel, Windows. No signup required to download.

---

## 3. Microinteraction Inventory

### Current Site (amie.so)

The current site has deliberately stripped most animations post-pivot. Identified elements:

| Element | Trigger | Duration | Page-at-rest state |
|---|---|---|---|
| **Amber/yellow text highlight** on "without a bot" | Load (immediate) | Static | Yes — highlight is permanent, not animated |
| **Sticky CTA** (confirmed by landing page gallery metadata) | Scroll — appears after scrolling past hero | Fade in, likely ~0.3s | No — CTA follows viewport |
| **Product screenshots** within sections | Scroll into view | Likely fade+scale (0.3s based on design system DNA) | Yes — static once revealed |
| **Bento grid** layout in feature sections | Scroll into view | Stagger reveal per card | Yes — static once placed |
| **"Replaces:" inline text** | Load | Static | Yes |
| **Integration cards** (grid) | Scroll | Likely fade-in | Yes |
| **FAQ accordion** | Click | Expand/collapse, ~0.2s | Yes when collapsed |
| **"Soon" badges** on integration cards | Static | N/A | Yes — passive indicator |
| **7-day timeline tabs** (Today / Day 3 / Day 7) | Click | Content swap | Yes — shows "Today" at rest |

**Key observation:** The current site is almost entirely at rest. The pivot to "document-like" means microinteractions are minimal and functional (accordion, tab switch), not decorative. This is a deliberate design choice, not neglect.

### Old Site (amie.so/art) — The Microinteraction Goldmine

| Element | Trigger | Duration | Page-at-rest state |
|---|---|---|---|
| **Hero greeting text** ("Happy Tuesday!") | Load (autonomous) | Cascading reveal, ~0.5s total with stagger | Yes after reveal |
| **Weather + email + meeting count** | Load (autonomous) | Fade in with stagger after greeting | Yes after reveal |
| **Scroll-triggered feature sections** | Scroll (50% viewport) | 0.3s per element, 0.05s stagger between elements | Yes once revealed |
| **Sticky product screenshot** (left side) | Scroll (passive, position: sticky) | Continuous during scroll | No — changes with scroll position |
| **Feature element scale animation** | Scroll into view | Scale 0.75 → 1.0 + opacity 0→1, 0.3s | Yes after animation |
| **Feature element exit** | Scroll past | Scale 1.0 → 0.75 + opacity 1→0, reverse | Returns to rest |
| **Feature tab navigation** (Scheduling / Widgets / etc.) | Click (user-triggered) | Visual swap + possible layout animation | Yes — shows selected tab |
| **Calendar week view** (Mon–Fri grid) | Autonomous on load + scroll-triggered | Elements populate the grid with stagger | Yes once populated |
| **Temperature display** ("25°C") | Load | Static after load | Yes |
| **"All-in-done" headline** | Scroll or load | Likely fade + slide | Yes after reveal |

**Critical distinction for Planevo:**
- **User-triggered:** FAQ accordion, feature tabs, 7-day timeline tabs, CTA hover states
- **Scroll-triggered (autonomous on scroll):** Feature section reveals, sticky screenshot transitions, entry/exit animations
- **Load-triggered (fully autonomous):** Hero greeting, weather/stats, initial page choreography

**The old site's signature move:** Scroll-triggered sticky split — product UI stays pinned while descriptive text scrolls alongside it. This is the mechanism that went viral and spawned numerous Framer tutorials. It is NOT present on the current site.

---

## 4. Personality Mechanics

### Where Joy Is Injected

**1. Copy voice — conversational and specific, never generic**
- `"All-in-done"` — wordplay requires the reader to do a tiny double-take, which creates delight
- `"Happy Tuesday! It's 10:10 AM and windy in Berlin."` — the product speaks as a friend, not a tool
- `"If you don't have a notch... It's a good reason to upgrade your Mac though."` — self-aware humor, never forced
- `"I'm sick, move everything to Thursday."` — demonstrates AI through a human vulnerability moment
- `"There are 27 meeting notes apps out there. If summaries is all you need, any of them will do."` — radical honesty as personality
- `"It doesn't have to suck to be productive"` — user quote that doubles as brand manifesto
- `"nothing but joy. opening a calendar shouldn't be stressful"` — emotional positioning in user's words

**2. Warmth through color and surface — not illustration**
- Off-white (#FAFAFA) instead of pure white — "small in hex, enormous in feel"
- Brand rose-pink (#F6A6A6) used once per view as a "pastel emotional accent" — never dominant
- Shadows at 4% and 12% opacity — "almost invisible" — depth through subtlety
- No harsh borders; elevation expressed through multi-stop shadow layers
- 9999px pill radius on CTAs — the most "friendly" border-radius possible

**3. Animation choreography (old site) — consistency creates personality**
- Every animation uses the same 0.3s / 0.05s-stagger recipe. This consistency is what reads as "polished" vs. "random effects."
- Scale from 0.75 (not 0 — elements arrive almost-sized, not from nothing)
- Trigger at 50% viewport — ensures the user sees the animation start, not just the aftermath
- Exit animations exist (reverse scale + fade) — the page breathes on scroll-back

**4. Product-as-personality — the UI carries the brand**
- The old hero didn't show a static screenshot — it showed the product speaking ("Happy Tuesday!") as if you were already logged in
- Calendar events use the 15-color semantic palette, making the product UI itself colorful and warm
- The product screenshot IS the hero imagery — no separate illustration or stock photo layer

**5. The name itself — "Amie" = friend (French)**
- CEO Dennis Müller describes development as "fuck around and find out" — the brand personality extends to the team culture
- Changelog entries are lowercase, casual: "this was one of the most requested integrations!" — not corporate announcements

### Where They Hold Back

- **No mascot or character.** Zero illustration-based personality. All warmth comes from copy, color, and animation — never from a drawn figure.
- **No emoji in marketing copy.** Despite casual tone, the landing page text contains no emoji. (Changelog entries may differ.)
- **No animation on current site.** The pivot to static was deliberate — the viral animated site "might have overwhelmed users" and the team chose conversion-focused restraint.
- **No dark mode on marketing site.** The warmth of #FAFAFA requires a light canvas.
- **Testimonials are restrained.** Real names, titles, companies — but no headshots on the main page, no star ratings, no NPS scores.
- **"Soon" labels are honest.** Integration cards marked "Soon" rather than hiding gaps or over-promising.
- **No counter or vanity metric.** No "100,000 users" or "5M meetings recorded" — the trust comes from logo strip + testimonial quality, not volume claims.
- **Humor is sparse.** Maybe 2-3 genuinely funny lines in 4000+ words of copy. The restraint is what makes them land.

---

## 5. Three Concrete Steals, Translated

### Steal 1: The "Product Speaking to You" Hero

**The job:** Make the visitor feel like they're already inside the product, not looking at an ad for it.

**Their mechanism (old site):** Hero shows `"Happy Tuesday! It's 10:10 AM and windy in Berlin. You got 2 emails and have 2 meetings today."` — the product addresses the visitor personally with time-aware, contextual data. No "welcome to our website" — just the product doing its thing.

**Planevo translation:** Hero shows a live (or live-looking) Planevo board for a specific day — "Monday, October 14" — with 3-4 real tasks populated (e.g., "Orgo problem set," "Review lecture notes Ch. 5," "Laundry"). Tasks are slotted into free-time blocks on a visible calendar sidebar. A subtle animation: one task gently slides from the "dump" area into a free slot, showing the core mechanic in motion. Headline overlaid on or adjacent to the product: `"You dumped it. It landed."` or similar. The board uses cream paper (#FFFDF5), dot grid, honey accent on the active time block, forest-green checkmarks.

**30% rule check:** Their mechanism is a personalized greeting with weather/email/meeting data speaking from a calendar app. Ours is a task board with tasks auto-placing into calendar slots from a planner app. Different product, different data, different visual language (cream/serif/dot-grid vs. white/sans/clean), different animation (task sliding into slot vs. text cascading). The only shared DNA is "product speaks at rest" — which is a job, not a mechanism. Passes.

### Steal 2: The Radical Honesty Block

**The job:** Earn credibility by volunteering a concession, then pivoting to differentiation.

**Their mechanism:** `"There are 27 meeting notes apps out there. If summaries is all you need, any of them will do. Many of them will even be cheaper."` Then: `"If you want to use them to become better at your job, you'll need Amie."` — Acknowledges the commodity, concedes price, then claims a higher-order benefit.

**Planevo translation:** A short editorial block (serif, cream, max 3 sentences) that says something like: `"There are dozens of planners. Most of them will let you write a to-do list. If that's all you need, Notes app works fine. If you need your plan to actually fit your day — to know when you're free and put work there — that's what we built."` This sits below the hero, before any feature detail. No fake testimonials, no inflated claims — just an honest framing that positions Planevo's specific differentiator (calendar-aware planning) against the generic category (to-do lists).

**30% rule check:** The structure is similar (concede → pivot), but the content, tone, and category are entirely different. Amie targets enterprise meeting-note buyers; Planevo targets students who've tried and abandoned to-do apps. The concession is different (price vs. simplicity), the pivot is different (career improvement vs. calendar-fit), and the voice is different (SaaS professional vs. editorial student-friendly). The 3-sentence structure is a rhetorical pattern, not a visual design. Passes.

### Steal 3: The Temporal Adoption Arc (7-Day Journey)

**The job:** Set realistic expectations for how quickly the product becomes useful, compressing "why should I bother" into a narrative arc.

**Their mechanism:** Three-column layout: Today → Day 3 → Day 7. Each column has 3 bullet outcomes, progressing from "record your first meeting" to "automate 90% of follow-up." CTA at the end: "Start free trial."

**Planevo translation:** A "Your first week" section on the landing page. Three stages, but mapped to a student's week:
- **Today:** "Dump everything on your plate. Classes, assignments, that thing your roommate asked you to do."
- **Wednesday:** "Watch it land. Tasks are in your free time. The 2-hour gap between Chem and English? That's when Orgo happens."
- **Friday:** "Something came up? Planevo reshuffled. Your weekend isn't ruined."

Visual: Three dot-grid "cards" in a row, each showing a simplified Planevo board state for that day. Cream background, honey accent on the active day's card, forest-green on completed items. The copy is student-specific (classes, roommates, problem sets), not enterprise (CRM, workflows, team members).

**30% rule check:** The "3-stage timeline" structure is common across SaaS (Notion, Linear, dozens of others use it). The Planevo version uses entirely different content (student life vs. enterprise workflows), different visuals (dot-grid cards vs. clean columns), different timeframe labels (Today/Wednesday/Friday vs. Today/Day 3/Day 7), and different materials (cream/serif/honey vs. white/sans/blue). Passes.

---

## 6. Three Deliberate DON'Ts

### DON'T 1: Don't Strip All Animation (The "Document" Trap)

**What Amie did:** Pivoted from a hyper-animated site that won design awards to an almost completely static, document-like page. Industry reaction was polarized — some praised conversion focus, others called it "too restrained."

**Why Planevo must not copy this:** Planevo has zero users and zero brand recognition. Amie could afford to go static because they had existing brand equity, an established user base, and enterprise testimonials doing the credibility work. Planevo needs the landing page to do the selling — a static page full of product screenshots won't convey the core "adaptive plan" mechanic, which is inherently dynamic. The auto-rescheduling value prop requires motion to be believed. A few well-chosen scroll-triggered animations (task sliding into a calendar slot, board reshuffling when a conflict appears) are essential, not decorative. The lesson from Amie is not "remove animations" — it's "don't let animations become the product." Use them to demonstrate the product.

### DON'T 2: Don't Use Enterprise Social Proof Patterns

**What Amie does:** "Trusted by teams at" + corporate logos (Canva, Spotify). Real testimonials from GTM leads, co-founders, software engineers with company affiliations.

**Why Planevo must not copy this:** Planevo is pre-launch with zero users, targeting college students. Using a "Trusted by teams at" strip with university logos would look desperate and dishonest (we don't have them). Student testimonials from beta aren't available yet (no users). Instead, use proof mechanisms that are honest for day zero: a working demo (the product proving itself), precise falsifiable claims ("syncs with your Google Calendar in under 10 seconds"), a founder's note explaining why this was built, and integration badges (Google Calendar, Canvas LMS) that prove technical capability rather than social adoption. Earn testimonials; don't fake them.

### DON'T 3: Don't Bury the Unique Mechanic Below the Fold Like Calendar & Todos

**What Amie does:** Their calendar + todos + AI scheduling section — the feature most analogous to what Planevo does — is pushed to section 13 of 15 on the current page, below meeting notes, AI chat, integrations, and shareable pages. It gets a "Replaces: Gcal, Things 3, Motion" tag but minimal real estate. This is because Amie pivoted away from calendar-as-core.

**Why this matters for Planevo:** Planevo's entire value prop IS the calendar-aware planning mechanic. If Planevo buries "tasks land in your real free time" below features like "integrations" or "AI chat," the page fails. The adaptive scheduling must be the hero section, the first scroll, and the animating proof point. Amie's burial of their calendar feature is a product-strategy signal (they deprioritized it), not a design pattern to follow. Planevo should do the opposite: calendar-aware placement is the headline, the hero animation, and the "47 seconds" equivalent.

---

## 7. Headline/Slogan Raw Material

### Headline Patterns Observed

| Pattern | Amie Example | Structure |
|---|---|---|
| **Noun list + punchline** | "Todos, email, calendar. All-in-done." | Three short nouns. Period. Then a twist on an expected phrase. |
| **Negative positioning** | "AI Note Taker without a bot" | [What it is] + "without" + [the thing you hate about competitors] |
| **Specific number + outcome chain** | "Within 47 seconds: Share summary. Keep CRM updated." | [Precise time] + [4 imperative verb phrases] |
| **Empathetic imperative** | "Organize your day on autopilot" | [Verb] + [your thing] + [how] |
| **Honest concession** | "There are 27 meeting notes apps out there." | [Uncomfortable truth] → pivot to differentiation |
| **User-voice manifesto** | "It doesn't have to suck to be productive" | Let a user say what the brand can't say directly |
| **Verb + emotional object** | "nothing but joy" | [Extreme simplification] of the emotional benefit |
| **Temporal promise** | "What you can achieve with Amie in just 7 days" | [Outcome] + [product] + [bounded time] |
| **Single-action hero** | "Start recording in seconds" | [One verb] + [time compression] |
| **Feature as lifestyle** | "opening a calendar shouldn't be stressful" | [Mundane action] + "shouldn't be" + [emotion to eliminate] |

### Verb Choices Worth Noting
- **Organize** (not "manage") — implies order from chaos
- **Achieve** (not "do") — implies meaningful progress
- **Shuffle/reshuffle** — implies adaptive, living system
- **Record/save/automate** — progressive complexity verbs for the 7-day arc
- **Replace** — directly competitive, used in "Replaces:" pattern
- **Win back** — recovery framing ("win back hours") implies you lost something

### Rhythms and Constraints
- Headlines are 4-8 words maximum on the current site
- Subheadlines allow 10-15 words
- Body copy uses 1-2 sentence paragraphs, never more than 3
- Conversational fragments are used as sentences: "From there, we use AI to schedule your day."
- First person ("we") is used freely — the company speaks, not a faceless entity
- Second person ("your") dominates — always the user's day, the user's meetings, the user's time

### Candidate Patterns for Planevo Slogans (informed by, not copied from, Amie)

Using the **noun list + punchline** structure:
- "Classes, deadlines, life. One calm board."
- "Dump it. It lands. It moves."

Using the **negative positioning** structure:
- "A planner that knows when you're free."
- "A plan that actually fits your day."

Using the **feature as lifestyle** structure:
- "Planning shouldn't mean guessing."
- "Your plan shouldn't break when Tuesday does."

Using the **temporal promise** structure:
- "Your week, sorted by Wednesday."

Using the **honest concession** structure:
- "Most planners don't know your schedule. This one does."

---

*End of report. All observations are sourced from direct page fetches and web search results as documented in the access log. No details were fabricated.*
