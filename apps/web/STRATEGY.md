# Plan Pilot — Strategy & Positioning Document

> **Purpose:** This is the single source of truth for *what Plan Pilot is, who it's for, and what we will and will not build.* Every code change, marketing decision, and feature debate should be checked against this doc. If something here is wrong, change the doc first — then the code.

> **Status:** Pre-launch. Pre-revenue. Pre-feedback. We are choosing focus over scope.

---

## 1. The One-Sentence Pitch

**For ADHD college students who keep missing Canvas deadlines despite trying every planner, Plan Pilot is the calm AI co-pilot that automatically reschedules your week without guilt every time life slips. Unlike Motion or Todoist, we're built for brains that don't run on willpower.**

Use this verbatim on the homepage hero, the App Store description, and every pitch deck.

---

## 2. Who We Are For (and Who We Are Not)

### Our user (the ICP)
- Age 17–24, US college student
- Has ADHD diagnosis or strongly suspects it
- Uses Canvas (or Blackboard / Brightspace as future expansion)
- Has tried and abandoned ≥2 planners in the past year
- Owns an iPhone (primary) — lives on their phone, not a laptop
- Often has a parent who would pay $9.99/mo to keep them in school

### Who we are NOT for (yet)
- Working professionals → that's Motion's market
- Knowledge-base / second-brain users → that's Notion's market
- Power-user "GTD" task-jugglers → that's Todoist's market
- High-school students → too price-sensitive, no Canvas
- Teams / collaboration → not until v2 ("Plan Pilot for Study Groups")

**Rule:** if a feature request comes from someone outside the ICP, we politely log it and move on.

---

## 3. The One Problem We Solve

**"I keep missing Canvas deadlines I knew about, and every planner I've tried makes me feel worse when I fall behind."**

That is the single sentence we are paid to solve. Everything in the product must trace back to it.

### Our promise
*"Plan Pilot won't shame you when life slips. Ollie just reorganizes tomorrow. That's the whole product."*

---

## 4. Painkiller, Not Vitamin

We lead with painkillers. Vitamins exist only as retention hooks.

| Type | Feature | Status |
|------|---------|--------|
| 🩹 Painkiller | Canvas auto-sync | Keep — core |
| 🩹 Painkiller | No-Shame Rollover | Keep — core (the magic moment) |
| 🩹 Painkiller | Daily Plan (energy-aware) | Keep — core |
| 🩹 Painkiller | Ollie Chat (with task/calendar tools) | Keep — core |
| 💊 Vitamin | Garden of Done | Defer — flag off |
| 💊 Vitamin | Weekly Review | Keep, but as **email**, not dashboard widget |
| 💊 Vitamin | Habits page | Defer — flag off |
| 💊 Vitamin | Goal Architect / Decompose / Breakdown / Prioritize | Defer — collapse into Ollie Chat tools |
| 💊 Vitamin | AcademicSearch | Defer — flag off |
| 💊 Vitamin | Focus Mode | Defer — flag off |
| 💊 Vitamin | n8n webhook integration | Defer — flag off |
| 💊 Vitamin | Ollie Personalities | Defer — single warm tone for v1 |

---

## 5. The v1 Feature List (Final, Locked)

We ship exactly these and nothing more:

1. **Onboarding wizard** (psychological, see §9)
2. **Connect Canvas + Connect Google Calendar**
3. **Daily Plan** — one AI surface that schedules today
4. **No-Shame Rollover** — automatic on app open
5. **Ollie Chat** — single endpoint with function calls (move task, reschedule, create task, mark done)
6. **Settings** — energy preference, focus windows, subscription
7. **Mobile app** (Expo) — same Daily Plan + Rollover + Chat
8. **Stripe billing** — single tier, single price, 14-day trial

**Everything else stays in the codebase but is feature-flagged off** until 20 paying users explicitly ask for it.

---

## 6. AI Surface Reduction

**Before:** 19 AI endpoints (architect, breakdown, chat, clarify, confirm-constraint, constraint-suggestions, daily-plan, decompose, feedback, ghost-block, import-blueprint, memory, memory/patterns, memory/rules, nudge, prioritize, schedule-agent, schedule-refine, search, weekly-review).

**After (v1):** 3 AI surfaces.

1. **`/api/ai/daily-plan`** — generates today's schedule
2. **`/api/ai/chat`** — Ollie agent with function calling (replaces nudge, clarify, breakdown, decompose, architect, prioritize, search, schedule-refine, confirm-constraint, constraint-suggestions, schedule-agent)
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
| Plan Pilot Monthly | **$9.99/mo** | Everything. |
| Plan Pilot Annual | **$79/yr** | 34% savings. Anchor on the marketing page. |
| Student verified (.edu) | **$4.99/mo** | SheerID or `.edu` email + active enrollment check |

**What we are killing:**
- ❌ Free forever tier (5 AI plans/month) — adverse selection, no conversion lever
- ❌ Standard / Pro / Elite tiers — decision fatigue for an ADHD audience
- ❌ "Coming Soon" features in pricing copy — we sell what works today

**When (and only when) we add a higher tier later:**
- **Plan Pilot for Study Groups** — $14.99/mo per seat, 3+ seats, body-doubling features
- **Plan Pilot for Schools** — B2B, contact sales, FERPA DPA included

These are *different audiences*, not feature gates on the same user.

---

## 8. Retention Engine

We must build at least one of these before launch, and all three within 90 days:

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Habit loop (daily) | Push notification: *"3 things on your plate today. Tap to see your plan."* | Build for v1 |
| Switching cost (lock-in) | AI Memory: focus windows, accepted patterns, learned rules | ✅ Already built — market it harder |
| Identity hook (weekly) | Email: *"Ollie noticed: you completed 73% of your Canvas tasks this week — up from 41%."* | Build for v1.1 |
| Social/accountability (longer-term) | Study buddy / body-doubling room | Defer to v2 |
| Mobile widget | Lock screen widget: "Next action" | Build for v1.1 (iOS) |

---

## 9. Psychological Onboarding (60 seconds)

Every screen is engineered around a specific psychological lever.

| # | Screen | Lever | Copy |
|---|--------|-------|------|
| 1 | Identity match (pre-signup) | Self-identification | *"Be honest — does this sound like you?"* with 4 ADHD-coded checkboxes |
| 2 | Reveal | Belonging | *"You're exactly who Plan Pilot is for. Let's prove it in 60 seconds."* |
| 3 | The Promise | Loss-aversion + safety | *"Plan Pilot won't shame you when life slips. Ollie just reorganizes tomorrow."* |
| 4 | Connect Canvas | Wow moment | Live-pull their assignments → *"You have 4 things due this week. We'll never let you miss one."* |
| 5 | Energy preference | Personalization | *"When does your brain actually work?"* Morning / Afternoon / Night / Chaotic |
| 6 | First Daily Plan | Sunk cost | Real schedule generated from their real Canvas data |
| 7 | Trial paywall | Loss-aversion + transparency | *"14 days free. Then $9.99/mo. No ads, no data sale. Card collected so we can keep your assignments here."* |

**Critical onboarding rules:**
- Never show an empty dashboard
- Never ask the user to "add their first task" before showing value
- Card-required trial — it filters tire-kickers and dramatically improves D14 conversion
- Onboarding must complete in < 90 seconds on a phone

---

## 10. Marketing & Distribution

We do **not** spend on paid ads until D7 retention > 30% and trial→paid > 25%.

**Free channels we will own first:**
- **TikTok** — short videos in the language of ADHD students ("POV: you forgot 3 Canvas assignments again")
- **Reddit** — r/ADHD, r/college, r/GetMotivated (genuine, not spammy)
- **University disability services offices** — outreach, free codes for verified students
- **ADHD coaches / therapists** — affiliate / referral program
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
| Verified ADHD-student paid users | ≥ 200 |
| Net Promoter Score | ≥ 40 |

If we miss these, **we narrow further**, we don't add features.

---

## 12. Anti-Goals (Explicit Don'ts)

We will explicitly NOT do these in the next 6 months, no matter how tempting:

- ❌ Build for working professionals
- ❌ Add team / collaboration features
- ❌ Add a Notion-style workspace / docs editor
- ❌ Ship more than 3 user-facing AI surfaces
- ❌ Add tiered pricing
- ❌ Bring back a free-forever plan
- ❌ Localize to non-English (until North America wedge is dominated)
- ❌ Build integrations beyond Canvas + Google Calendar
- ❌ Pivot away from ADHD students because one professional emailed asking for it

---

## 13. Execution Plan (Mapping Strategy → Code)

This is the order I'll work in once you give the green light. Each block is self-contained and ships independently.

### Block A — P0 Bug & Brand Hygiene (3–5 days)
1. Fix the `,,` syntax bug on landing page (`app/page.tsx:287`)
2. Rename "Plant Pilot" → "Plan Pilot" everywhere (metadata, login, signup, forgot-password, monorepo)
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
3. Live Canvas pull on screen 4
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
3. Three screens: Daily Plan / Ollie Chat / Settings
4. Push notifications (Expo Notifications)
5. iOS Home Screen Widget for "Next action"
6. EAS build pipeline (TestFlight + Play Internal)

### Block G — Retention (5–7 days)
1. Weekly Review email job (Supabase cron or Vercel cron)
2. Push notifications for missed-deadline rescue
3. Streak / "Ollie noticed" copy on Daily Plan card
4. Referral link generator

---

## 14. Decision Log

This section grows over time. Every strategic decision and its date is logged so we know *why* we did things later.

| Date | Decision | Reason |
|------|----------|--------|
| 2026-01 | ICP narrowed to "ADHD college students using Canvas" | Defensible wedge, painkiller alignment, clear distribution |
| 2026-01 | AI surfaces cut from 19 → 3 | Cost, focus, reliability |
| 2026-01 | Killed free-forever tier | Adverse selection; no conversion lever |
| 2026-01 | Killed 3-tier pricing (Standard/Pro/Elite) | Decision fatigue for ADHD audience; no usage data to justify gates |
| 2026-01 | Single price $9.99/mo + $79/yr + $4.99 .edu | Simple positioning, captures real ICP affordability |
| 2026-01 | Card-required 14-day trial | Filters tire-kickers, lifts D14 conversion |
| 2026-01 | Mobile app is a v1 launch requirement, not a v2 | ICP lives on their phone |
| 2026-01 | **Block A shipped** — P0 crash fix, brand rename, testimonials removed, legal stubs created | Cleanup pass before strategic cuts |
| 2026-01 | Use Termly/Iubenda for legal docs (no lawyer until ~500 paying users or first school B2B) | Sufficient for pre-launch; stops 404s on footer links |

---

## 15. How We Use This Doc

- **Before any new feature is built:** check it against §3 (the one problem) and §12 (anti-goals).
- **Before any pricing change:** update §7 first, get founder sign-off, then ship.
- **Before any pivot pressure:** re-read §2 (who we are not for).
- **Every quarter:** review §11 (success targets). If we hit them, scope can grow modestly. If we miss, we narrow further.

---

*Last updated: 2026-01. Next review: after the first 100 paying users.*
