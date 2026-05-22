# Planevo — Strategy & Positioning Document

> **Purpose:** This is the single source of truth for *what Planevo is, who it's for, and what we will and will not build.* Every code change, marketing decision, and feature debate should be checked against this doc. If something here is wrong, change the doc first — then the code.

> **Status:** Pre-launch. Pre-revenue. Pre-feedback. We are choosing focus over scope.

---

## 1. The One-Sentence Pitch

**For busy students and high-performers whose lives move faster than their calendars, Planevo is the AI co-pilot that automatically protects your focus and reschedules your tasks without friction. Unlike generic planners, we’re built for people who want to spend their energy doing the work, not planning it.**

Use this verbatim on the homepage hero, the App Store description, and every pitch deck.

---

## 2. Who We Are For (and Who We Are Not)

### Our user (the ICP)
- **The Modern Student:** Using Canvas/Blackboard, feeling overwhelmed by deadlines and seeking a way to stay on top of coursework without the stress.
- **The Professional Builder:** Early-career professionals, creators, or knbearedge workers who want an AI agent to handle the logistics of their day (rescheduling, task prioritization) so they can stay in deep work.
- **The Complexity Juggler:** Anyone whose schedule changes faster than they can keep up with.

### Who we are NOT for (yet)
- Enterprise teams (B2B SaaS) → we focus on individual productivity first.
- Knbearedge-base / second-brain users → we are a scheduler, not an archive.
- High-school students → too price-sensitive, focus is on higher-ed and professional markets.

**Rule:** if a feature request comes from someone outside the ICP, we politely log it and move on.

---

## 3. The One Problem We Solve

**"I know what I need to do, but my schedule changes so fast that I spend more time re-planning than actually working."**

That is the single sentence we are paid to solve. Everything in the product must trace back to it.

### Our promise
*"Planevo takes the friction out of planning. Bruno handles the logistics so you can focus on the work."*

---

## 4. Painkiller, Not Vitamin

We lead with painkillers. Vitamins exist only as retention hooks.

| Type | Feature | Status |
|------|---------|--------|
| 🩹 Painkiller | Task Source Sync (Canvas, Tasks, etc.) | Keep — core |
| 🩹 Painkiller | No-Shame Rollover | Keep — core (the magic moment) |
| 🩹 Painkiller | Daily Plan (energy-aware) | Keep — core |
| 🩹 Painkiller | Bruno Chat (with task/calendar tools) | Keep — core |
| 💊 Vitamin | Garden of Done | Defer — flag off |
| 💊 Vitamin | Weekly Review | Keep, but as **email**, not dashboard widget |
| 💊 Vitamin | Habits page | Defer — flag off |
| 💊 Vitamin | Goal Architect / Decompose / Breakdown / Prioritize | Defer — collapse into Bruno Chat tools |
| 💊 Vitamin | AcademicSearch | Defer — flag off |
| 💊 Vitamin | Focus Mode | Defer — flag off |
| 💊 Vitamin | n8n webhook integration | Defer — flag off |
| 💊 Vitamin | Bruno Personalities | Defer — single warm tone for v1 |

---

## 5. The v1 Feature List (Final, Locked)

We ship exactly these and nothing more:

1. **Onboarding wizard** (psychological, see §9)
2. **Connect Task Source (Canvas/Tasks) + Connect Google Calendar**
3. **Daily Plan** — one AI surface that schedules today
4. **No-Shame Rollover** — automatic on app open
5. **Bruno Chat** — single endpoint with function calls (move task, reschedule, create task, mark done)
6. **Settings** — energy preference, focus windows, subscription
7. **Mobile app** (Expo) — same Daily Plan + Rollover + Chat
8. **Stripe billing** — single tier, single price, 14-day trial

**Everything else stays in the codebase but is feature-flagged off** until 20 paying users explicitly ask for it.

---

## 6. AI Surface Reduction

**Before:** 19 AI endpoints (architect, breakdown, chat, clarify, confirm-constraint, constraint-suggestions, daily-plan, decompose, feedback, ghost-block, import-blueprint, memory, memory/patterns, memory/rules, nudge, prioritize, schedule-agent, schedule-refine, search, weekly-review).

**After (v1):** 3 AI surfaces.

1. **`/api/ai/daily-plan`** — generates today's schedule
2. **`/api/ai/chat`** — Bruno agent with function calling (replaces nudge, clarify, breakdown, decompose, architect, prioritize, search, schedule-refine, confirm-constraint, constraint-suggestions, schedule-agent)
3. **`/api/ai/weekly-review`** — runs once/week, sent as email

**Cost guardrails:**
- All non-chat surfaces use `gpt-4o-mini`
- Chat uses `gpt-4o-mini` by default; upgrade to `gpt-4o` only when complex tool-calling is needed
- Per-feature daily quotas (not global) so a chatty user can't lock themselves out of Daily Plan

---

## 7. Pricing Model (Final)

**One product. One price. One trial. No tiers.**

| Plan | Price | Notes |
|------|-------|-------|
| 14-day free trial | $0 | Card collected upfront, refund on day 14 if no engagement signal |
| Planevo Monthly | **$9.99/mo** | Everything. |
| Planevo Annual | **$79/yr** | 34% savings. Anchor on the marketing page. |
| Student / Early Career (.edu) | **$4.99/mo** | SheerID or `.edu` email + active enrollment check |

**What we are killing:**
- ❌ Free forever tier (5 AI plans/month) — adverse selection, no conversion lever
- ❌ Standard / Pro / Elite tiers — decision fatigue for an ADHD audience
- ❌ "Coming Soon" features in pricing copy — we sell what works today

**When (and only when) we add a higher tier later:**
- **Planevo for Study Groups** — $14.99/mo per seat, 3+ seats, body-doubling features
- **Planevo for Schools** — B2B, contact sales, FERPA DPA included

These are *different audiences*, not feature gates on the same user.

---

## 8. Retention Engine

We must build at least one of these before launch, and all three within 90 days:

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Habit loop (daily) | Push notification: *"3 things on your plate today. Tap to see your plan."* | Build for v1 |
| Switching cost (lock-in) | AI Memory: focus windows, accepted patterns, learned rules | ✅ Already built — market it harder |
| Identity hook (weekly) | Email: *"Bruno noticed: you completed 73% of your Canvas tasks this week — up from 41%."* | Build for v1.1 |
| Social/accountability (longer-term) | Study buddy / body-doubling room | Defer to v2 |
| Mobile widget | Lock screen widget: "Next action" | Build for v1.1 (iOS) |

---

## 9. Psychological Onboarding (60 seconds)

Every screen is engineered around a specific psychological lever.

| # | Screen | Lever | Copy |
|---|--------|-------|------|
| 1 | Identity match (pre-signup) | Self-identification | *"Be honest — does this sound like you?"* with 4 ADHD-coded checkboxes |
| 2 | Reveal | Belonging | *"You're exactly who Planevo is for. Let's prove it in 60 seconds."* |
| 3 | The Promise | Loss-aversion + safety | *"Planevo won't shame you when life slips. Bruno just reorganizes tomorrow."* |
| 4 | Connect Data Source | Wow moment | Live-pull their tasks → *"You have 4 things to do this week. We'll never let you miss one."* |
| 5 | Energy preference | Personalization | *"When does your brain actually work?"* Morning / Afternoon / Night / Chaotic |
| 6 | First Daily Plan | Sunk cost | Real schedule generated from their real task data |
| 7 | Trial paywall | Loss-aversion + transparency | *"14 days free. Then $9.99/mo. No ads, no data sale. Card collected so we can keep your focus on track."* |

**Critical onboarding rules:**
- Never show an empty dashboard
- Never ask the user to "add their first task" before showing value
- Card-required trial — it filters tire-kickers and dramatically improves D14 conversion
- Onboarding must complete in < 90 seconds on a phone

---

## 10. Marketing & Distribution

We do **not** spend on paid ads until D7 retention > 30% and trial→paid > 25%.

**Free channels we will own first:**
- **TikTok / Reels** — short videos showing the "Bruno Magic" (automatic rescheduling when plans change)
- **Reddit** — r/productivity, r/college, r/GetMotivated (genuine, not spammy)
- **University / Professional Orgs** — outreach, free codes for verified members
- **Coaches / Therapists** — affiliate / referral program
- **Real testimonials** — replace the fake "Sarah T., CS Major" / "Mark R., Grad Student" quotes with real students before launch

---

## 11. What Success Looks Like (90-Day Targets)

| Metric | Target |
|--------|--------|
| Trial signups | 1,000 |
| Trial → Paid conversion | ≥ 25% |
| D7 retention (paid) | ≥ 60% |
| D30 retention (paid) | ≥ 40% |
| MRR | $2,500+ |
| Net Promoter Score | ≥ 40 |

If we miss these, **we narrow further**, we don't add features.

---

## 12. Anti-Goals (Explicit Don'ts)

We will explicitly NOT do these in the next 6 months, no matter how tempting:

- ❌ Add team / collaboration features (v1 is for individuals)
- ❌ Add a Notion-style workspace / docs editor
- ❌ Ship more than 3 user-facing AI surfaces
- ❌ Add tiered pricing
- ❌ Bring back a free-forever plan
- ❌ Localize to non-English (until North America wedge is dominated)
- ❌ Build integrations beyond primary sources (for now)

---

## 13. Execution Plan (Mapping Strategy → Code)

This is the order I'll work in once you give the green light. Each block is self-contained and ships independently.

### Block A — P0 Bug & Brand Hygiene (3–5 days)
1. Fix the `,,` syntax bug on landing page (`app/page.tsx:287`)
2. Rename "Planevo" → "Planevo" everywhere (metadata, login, signup, forgot-password, monorepo)
3. Replace fake testimonials with placeholder copy until real ones come in
4. Drop unused deps (`@google/generative-ai`, broken `lucide-react`, `gsap` if framer is the choice)
5. Pick ONE icon library (Phosphor) and remove the others
6. Wire `/privacy`, `/terms`, `/cookies` stubs

### Block B — Strategic Cuts (2–3 days)
1. Feature-flag system (env-based or Supabase-backed)
2. Hide Habits, Projects, Focus, AcademicSearch, Garden of Done, n8n behind flags
3. Collapse 19 AI routes → 3 (preserve old code under `/_archive` or behind flags)
4. Rewrite landing page around the painkiller (Section 1 of this doc)
5. Rewrite dashboard to surface ONE thing: "Your next action"

### Block C — Psychological Onboarding (3–5 days)
1. Build the 7-screen onboarding flow per §9
2. Add `onboarding_complete` gate (already in schema, currently unused)
3. Live data pull on screen 4
4. Wire `energy_preference` capture

### Block D — Pricing & Monetization (3–5 days)
1. Stripe integration (Checkout + Customer Portal)
2. Single-price model + .edu discount via SheerID or email-domain check
3. 14-day trial with card capture
4. Webhook → update `users.plan_type`
5. Per-feature rate limits replacing the global `consume_ai_usage`
6. Delete tiered pricing UI

### Block E — Security Hardening (2–3 days)
1. `pgcrypto`-based encryption migration for `canvas_token`, `google_calendar_refresh_token`, `n8n_webhook_token`
2. Wrapper functions for read/write
3. Rotate all existing tokens after migration
4. Add `SET search_path` to `handle_new_user()` SECURITY DEFINER function
5. Origin/CSRF check on AI POST routes
6. Sentry + PostHog wiring

### Block F — Mobile App (10–15 days)
1. Replace Expo template with real app structure
2. Shared `@plant-pilot/core` package with typed Supabase client + AI types
3. Three screens: Daily Plan / Bruno Chat / Settings
4. Push notifications (Expo Notifications)
5. iOS Home Screen Widget for "Next action"
6. EAS build pipeline (TestFlight + Play Internal)

### Block G — Retention (5–7 days)
1. Weekly Review email job (Supabase cron or Vercel cron)
2. Push notifications for missed-deadline rescue
3. Streak / "Bruno noticed" copy on Daily Plan card
4. Referral link generator

---

## 14. Decision Log

This section grows over time. Every strategic decision and its date is logged so we know *why* we did things later.

| Date | Decision | Reason |
|------|----------|--------|
| 2026-01 | ICP expanded to "All students and high-performers" | Scaling beyond ADHD wedge to universal productivity |
| 2026-01 | AI surfaces cut from 19 → 3 | Cost, focus, reliability |
| 2026-01 | Killed free-forever tier | Adverse selection; no conversion lever |
| 2026-01 | Killed 3-tier pricing (Standard/Pro/Elite) | Decision fatigue for users; no usage data to justify gates |
| 2026-01 | Single price $9.99/mo + $79/yr + $4.99 .edu | Simple positioning, captures real ICP affordability |
| 2026-01 | Card-required 14-day trial | Filters tire-kickers, lifts D14 conversion |
| 2026-01 | Mobile app is a v1 launch requirement, not a v2 | ICP lives on their phone |
| 2026-01 | **Block A shipped** — P0 crash fix, brand rename, testimonials removed, legal stubs created | Cleanup pass before strategic cuts |
| 2026-01 | Use Termly/Iubenda for legal docs (no lawyer until ~500 paying users or first school B2B) | Sufficient for pre-launch; stops 404s on footer links |
| 2026-01 | **Block B shipped** — 15 AI routes archived, dashboard radically rewritten to "One Next Action", sidebar trimmed to 4 items, feature flag system added, ~14 dead components archived | Eliminates AI cost overhead, focuses ICP on the painkiller, reversible via `_archive/` folder |
| 2026-01 | Added §16 "Painkiller Visibility Rule" to this doc | Permanent guardrail so the same mistake doesn't repeat in Blocks C–G. |
| 2026-05-08 | Implemented "Immersive Dashboard" + Personalized Greetings | Increases "Warm Co-pilot" brand feel; `max-w-full` when sidebar collapsed supports high-density focus without violating minimalism. |
| 2026-05-08 | Transitioned to Radix UI Tabs for Sync/Plan/Focus workflow | Standardized the 3-pillar dashboard structure (Sync -> Plan -> Focus) per §4. |

---

## 15. How We Use This Doc

- **Before any new feature is built:** check it against §3 (the one problem) and §12 (anti-goals).
- **Before any pricing change:** update §7 first, get founder sign-off, then ship.
- **Before any pivot pressure:** re-read §2 (who we are not for).
- **Every quarter:** review §11 (success targets). If we hit them, scope can grow modestly. If we miss, we narrow further.

---

## 16. The Painkiller Visibility Rule

**Every feature in §4's painkiller list MUST be discoverable from the dashboard within ONE click. No exceptions.**

This rule exists because Block B initially over-trimmed the dashboard and made Daily Plan / Canvas sync / Google Calendar sync (all painkillers) invisible to new users. Reducing surface area is good. Hiding the core value prop is not.

**Non-negotiable surfaces on `/dashboard`:**
- Today's Daily Plan (current block + ability to view full day)
- Data source connection state (visible chip, one click to connect/disconnect)
- Google Calendar connection state (same treatment)
- "Generate today's plan" CTA when none exists

**Where the rule applies:**
- Adding a new feature → if it's in §4 painkillers, it must surface on the dashboard
- Removing/refactoring UI → if you'd hide a painkiller below a fold, scroll, or extra click, stop and find another way
- Onboarding (Block C) → first-run flow must walk users through ALL painkiller surfaces in <90 seconds

**Vitamins ≠ Painkillers.** Vitamins like Garden of Done, Habits, Focus Mode CAN and SHOULD stay archived behind feature flags. Don't conflate the two.

---

## 17. UI Design Philosophy (The "Immersive Minimalist")

We balance minimalism with utility through these rules:

1. **Warmth by Default**: Greetings MUST include time-of-day awareness (Good morning, afternoon, evening) and the user's name to reinforce the "Bruno is your friend" dynamic.
2. **Dynamic Density**: The dashboard defaults to a focused, centered layout (`max-w-5xl`) but allows for an "Immersive Mode" (`max-w-full`) when the sidebar is collapsed. This supports students on laptops who need to see their full schedule and backlog simultaneously.
3. **Transition-First**: Every layout shift (sidebar collapse, tab switch) MUST have a smooth CSS/Framer transition. Planevo should feel like a fluid extension of the OS, not a static website.

---

*Last updated: 2026-05-08. Next review: after the first 100 paying users.*
