# Planevo Command Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Daily Plan with Planevo Command, the central responsibility hub where users can dump messy life, school, work, creative, and personal obligations by typing, pasting, speaking, forwarding, or importing, then Planevo turns that chaos into a calm board of real responsibilities, next actions, source-backed context, and confirmed Bruno help.

**Architecture:** Planevo Command is not a dictation app and not an AI-first chatbot. It is a native Planevo system made of a fast capture surface, a structured responsibility graph, deterministic validation, source-aware organization, usage/cost controls, a command board UI, mobile capture, and Bruno contextual actions. AI is used only where it removes setup friction: transcription, extraction, cleanup, categorization, ambiguity detection, and optional Bruno help. The durable source of truth is Planevo data, not an LLM response.

**Tech Stack:** Next.js web app, Expo mobile app, Supabase Postgres/RLS, existing Planevo auth/subscription stack, existing Bruno global overlay, OpenAI models for extraction/transcription/synthesis, Stripe/RevenueCat for billing, existing `source_items` and `calendar_events` integrations, PostHog or existing analytics for product metrics, Vercel/Supabase production hosting.

---

## 1. Product Thesis

Planevo Command should become the reason a person opens Planevo.

The old Daily Plan asks the user to care about a generated plan. The user still has to know what matters, enter tasks, trust the app, and return when life gets messy. That is too much effort for too little perceived value.

Planevo Command changes the promise:

> Dump everything on your plate. Planevo turns it into a calm command center for what you are responsible for.

The user should not feel like they are "planning." They should feel like they are unloading the mental pressure of school, work, family, goals, assignments, deadlines, meetings, messages, ideas, and worries into one place that makes life feel handleable.

The feature must hit this human truth:

- People do not fail because they need another beautiful to-do list.
- They fail because their responsibilities are spread across memory, Canvas, Google Calendar, Slack, texts, notes, email, group chats, screenshots, parents, bosses, teachers, clubs, sports, and personal pressure.
- When the load feels chaotic, they avoid it and open social apps.
- Planevo should make returning to responsibility feel frictionless, calm, and visually organized.

The final product should feel like the aesthetic productivity videos people want to replicate, but with real life built in: missed details, messy dumps, competing responsibilities, and changing context.

## 2. What Planevo Command Is

Planevo Command is a comprehensive tab that replaces Daily Plan in the main navigation.

It is a responsibility operating center with these core abilities:

1. Capture everything fast.
2. Clean the mess into structured responsibility items.
3. Show the user what is on their plate without overwhelming them.
4. Connect responsibilities back to sources like calendar events, Canvas assignments, Slack messages, Notion pages, Linear issues, and manual notes.
5. Give the user the next useful action without making the app feel like a generic AI wrapper.
6. Let Bruno help in context, but keep Bruno as an assistant inside the system instead of the whole product.
7. Track progress and momentum without shame.
8. Work on mobile as a fast dumping surface and on web as a richer command center.

The user-facing name can be:

- Primary recommendation: `Command`
- Hero action: `Clear My Plate`
- Supporting language: `Dump your responsibilities. Planevo sorts them.`

Avoid naming the whole feature "AI Planner", "Dictation", "Voice Notes", "Daily Plan", "Recovery", or "Productivity Coach".

## 3. What Planevo Command Is Not

Planevo Command must not become:

- A basic speech-to-notes app.
- A ChatGPT clone embedded in a tab.
- A prettier Daily Plan.
- A Notion workspace clone.
- A habit tracker.
- A shame/recovery system that tells users they failed.
- A complex project management tool with too many menus.
- A generic "AI productivity" feature where the output is just a paragraph.
- A feature that only works after the user manually sets up every class, project, club, and routine.

The product value is not "we use AI." The product value is "Planevo understands the responsibilities you dump into it and turns them into an organized place to act from."

## 4. The Core Pain

The core pain is not time management in the abstract.

The real pain is responsibility overload:

- A student has assignments in Canvas, tests in class, sports practice, club meetings, parents asking questions, social plans, and college pressure.
- A college student has lectures, labs, internships, part-time work, friends, bills, career prep, and personal goals.
- A corporate worker has Slack, meetings, deadlines, kids, family needs, errands, email, project docs, and accountability from managers.
- A creative has client work, content ideas, deadlines, invoices, editing, posting, collaborations, and personal life mixed together.

Most planning tools assume the user already knows what to type into a clean task field. Planevo Command assumes the user is overwhelmed and starts messy.

## 5. The Wedge

The market already has:

- To-do apps.
- Calendar apps.
- Dictation apps.
- AI note apps.
- Notion-like workspaces.
- Chatbots that generate plans.

Planevo Command should stand apart by combining:

- Messy input.
- Native structured output.
- Real source connections.
- A calm command board.
- Bruno actions in context.
- Mobile-first capture.
- Free voice capture with clear limits.
- A paid tier that unlocks higher-quality processing, more connected sources, and deeper Bruno help.

The wedge is not "speak and get notes." It is:

> Speak, paste, or import the chaos of your life. Planevo turns it into responsibilities you can trust, see, and act on.

## 6. Primary User Promise

In under 60 seconds, a new user should be able to:

1. Open Command.
2. Type, paste, or speak what is going on.
3. See Planevo clean it into responsibilities.
4. Confirm the items.
5. Land on a board that clearly shows what matters now, today, soon, and later.

The user should feel:

- Less mentally loaded.
- More in control.
- Clear about the next step.
- Not judged.
- Not forced into a setup process.

## 7. The 10 Second Test

A new user should understand the page within 10 seconds:

- Top action: `Clear My Plate`
- Input placeholder: `Type, paste, or say everything you have going on.`
- Visible result: a board organized into `Now`, `Today`, `Due Soon`, `On My Plate`, and `Unsorted`
- Bruno context: `Ask Bruno about this plate`

No tutorial should be required for the first successful use.

## 8. Navigation Change

Daily Plan should be replaced in the main app navigation by Command.

Current likely entry points to inspect:

- `apps/web/app/dashboard/daily-plan/page.tsx`
- `apps/web/components/daily-plan/DailyPlanView.tsx`
- `apps/web/lib/plan/get-day-plan-data.ts`
- `apps/web/lib/plan/day-plan.ts`
- `apps/web/lib/plan/agent/`
- dashboard nav/sidebar files found by searching for `daily-plan`
- mobile tab/navigation files found by searching for `Daily Plan`, `daily-plan`, and route tab declarations

Implementation decision:

- Add the new route at `apps/web/app/dashboard/command/page.tsx`.
- Keep the old Daily Plan route during rollout as a redirect or compatibility wrapper.
- Do not delete existing Daily Plan internals in Phase 1. Planevo Command can reuse `calendar_events`, `source_items`, and planner utilities where useful.
- Rename nav label from `Daily Plan` to `Command`.
- Keep database compatibility with existing calendar-based planning until the Command persistence layer is stable.

## 9. Core User Journeys

### 9.1 First-Time Student

User opens Command and sees one dominant capture surface.

User types:

```text
I have a bio lab report due Friday, algebra quiz tomorrow, English essay next week, soccer practice every day at 4, and I need to ask my teacher about missing work. Also I promised my mom I would clean my room before Saturday.
```

Planevo returns a preview:

- `Algebra quiz` as assessment, due tomorrow, high urgency.
- `Bio lab report` as assignment, due Friday, medium/high urgency.
- `English essay` as assignment, due next week.
- `Soccer practice` as recurring commitment, daily at 4 PM.
- `Ask teacher about missing work` as school follow-up.
- `Clean room` as personal responsibility before Saturday.

The user confirms the preview.

Command board shows:

- `Now`: Ask teacher, study for algebra quiz.
- `Today`: Soccer practice, start lab report outline.
- `Due Soon`: Bio lab report, English essay.
- `On My Plate`: Clean room.
- `Unsorted`: any unclear item that needs a time or class.

Bruno shows contextual action chips:

- `Break down bio lab report`
- `Make a study plan for algebra quiz`
- `Find time before soccer`

### 9.2 College Student

User speaks:

```text
I have econ lecture Monday Wednesday Friday, lab Thursday, internship application due Sunday, group project meeting Tuesday night, rent due on the first, and I need to call financial aid because my scholarship still is not showing.
```

Planevo extracts both academic and life admin responsibilities.

The board does not treat all tasks equally. It separates:

- Scheduled commitments.
- Deadlines.
- Follow-ups.
- Money/admin.
- Group responsibilities.

The value is that college life is not forced into one task list.

### 9.3 Corporate Worker

User pastes:

```text
Need to send Q3 forecast to Maya by Thursday, prep for 1:1 with Drew tomorrow, Slack from Alex about the onboarding doc, daycare pickup at 5, dentist Friday, and I still need to review the product spec before the leadership meeting.
```

Planevo extracts:

- Work deliverables.
- Meeting prep.
- Slack follow-up.
- Family constraint.
- Health appointment.
- Document review.

It should not assume the user wants a rigid day plan. It should show what is on their plate and where the pressure is.

### 9.4 Creative

User types:

```text
Client wants first cut by Wednesday, I need to post 3 TikToks this week, brand deck feedback came in, invoice Jordan, shoot B-roll on Saturday, and I have 12 random video ideas in Notes.
```

Planevo extracts:

- Client deliverables.
- Content production responsibilities.
- Admin/money tasks.
- Creative backlog.
- Scheduled shoot.

The board should support creative life without pretending everything is a corporate ticket.

### 9.5 Returning Daily Loop

The returning user opens Command and sees:

- What is already on their plate.
- What became urgent since last visit.
- New source items from integrations.
- A simple capture box for anything new.
- A calm count of unresolved items.

The default state should not be empty. Even when no tasks exist, it should encourage one simple input.

### 9.6 Mobile Capture Loop

On mobile, the user should be able to:

1. Open Planevo.
2. Tap Command.
3. Hold or tap the microphone.
4. Speak messy obligations.
5. See a cleaned preview.
6. Confirm now or save to inbox.

Mobile must optimize for fast dumping, not complex board management.

### 9.7 Share Sheet Loop

Later phase:

1. User shares text, screenshot text, email snippet, Canvas page, Slack message, or note into Planevo.
2. Planevo opens a Command import sheet.
3. User confirms whether this should become a responsibility.
4. The item appears on the board with source context.

### 9.8 Bruno Loop

Bruno should never replace the Command board.

Bruno should:

- Receive typed Command context.
- See selected responsibility items.
- Propose actions with confirmation.
- Explain why something is urgent.
- Break down a selected responsibility.
- Draft messages.
- Create calendar blocks only after user confirmation.
- Keep mutation behavior confirmation-based.

## 10. Command Board Layout

The Command page should be a full feature tab with operational density.

Recommended desktop layout:

1. Top capture band.
2. Board summary strip.
3. Main responsibility columns/sections.
4. Source/context panel.
5. Bruno action rail or contextual button.

Recommended mobile layout:

1. Sticky capture button/input.
2. `Now` section.
3. `Today` section.
4. `Due Soon` section.
5. `On My Plate` section.
6. Bottom action for Bruno.

### 10.1 Top Capture Band

Name: `Clear My Plate`

Input modes:

- Type.
- Paste.
- Speak.
- Import from connected sources.
- Add from screenshot/OCR in later phase.

Primary placeholder:

```text
Type, paste, or say everything you have going on.
```

Secondary examples can rotate subtly:

- `I have a chem test Friday, practice at 4, and a club meeting...`
- `Paste a Slack message, class reminder, or messy note...`
- `Say what is on your mind and Planevo will sort it.`

Avoid long instructional copy in the UI.

### 10.2 Summary Strip

Shows a compact, calm overview:

- `Now`: count.
- `Today`: count.
- `Due Soon`: count.
- `Unsorted`: count.
- `Sources`: count of connected sources with new items.

This gives the user immediate control without forcing a generated schedule.

### 10.3 Sections

Required sections:

- `Now`: items that need attention next.
- `Today`: commitments and responsibilities for the current date.
- `Due Soon`: upcoming deadlines and time-sensitive items.
- `On My Plate`: everything active but not urgent.
- `Unsorted`: items that need clarification.

Optional sections:

- `Waiting`: items blocked by someone else.
- `Ideas`: creative or future ideas that should not pollute urgent work.
- `Done`: recently completed items.
- `Sources`: integration-driven items requiring review.

### 10.4 Item Card

Each responsibility item should show:

- Title.
- Type icon.
- Due date or time if known.
- Source badge.
- Urgency badge only when useful.
- Confidence/needs-review state when extraction is uncertain.
- One primary action.
- Overflow actions.

Avoid making every card visually heavy.

Example card:

```text
Bio lab report
Assignment
Due Fri
Source: Manual
Action: Break down
```

### 10.5 Item Types

Supported item types:

- `assignment`
- `assessment`
- `meeting`
- `class`
- `practice`
- `work_deadline`
- `follow_up`
- `errand`
- `family`
- `money`
- `health`
- `creative`
- `idea`
- `habit_like_routine`
- `admin`
- `unknown`

Do not overfit early. The UI can display friendly labels while the database stores stable enum values.

### 10.6 Source Badges

Supported source types:

- `manual`
- `voice`
- `paste`
- `calendar`
- `canvas`
- `slack`
- `notion`
- `linear`
- `email_later`
- `share_sheet_later`
- `ocr_later`

If an item came from an integration, clicking the source badge should open source details or a context panel.

### 10.7 Dream Track

The user's language includes "making their dream a living proof." Planevo can support this without becoming a heavy goals app.

Add an optional lightweight concept:

Name: `Why It Matters`

Purpose:

- Link responsibilities to the user's larger life direction.
- Make school/work tasks feel connected to their desired identity.
- Avoid becoming a full OKR or habits product.

Example:

- Responsibility: `Finish scholarship essay`
- Why it matters: `College funding`

This should be optional metadata, not a required setup flow.

## 11. Bruno Integration

Bruno is part of Command, but Planevo is not AI-first.

Bruno should be the contextual assistant for responsibilities, not the main interface.

### 11.1 Bruno Roles in Command

Bruno can:

- Explain a responsibility.
- Break down a task.
- Draft a message.
- Suggest what to do next.
- Help clean an ambiguous intake.
- Propose calendar blocks.
- Summarize a source thread.
- Compare competing responsibilities.
- Help the user choose between items.

Bruno should not:

- Mutate external systems without confirmation.
- Hide the board behind chat.
- Become the only way to use Command.
- Generate fake certainty when data is missing.
- Shame the user for falling behind.

### 11.2 Bruno Entry Points

Required entry points:

- Global Bruno button remains.
- Command page registers context with global Bruno.
- Each responsibility item can open Bruno with that item selected.
- Preview panel can ask Bruno to clarify extraction.
- Source panel can ask Bruno to summarize context.

Existing architecture to preserve:

- `apps/web/components/dashboard/BrunoChatSidebar.tsx`
- `BrunoProvider`
- `BrunoShell`
- `useRegisterBrunoContext`
- `createBrunoChatRequestBody`
- `/api/bruno/actions/execute`
- proposal/confirmation card behavior

### 11.3 Bruno Action Examples

Action chips on an item:

- `Break down`
- `Draft message`
- `Find time`
- `Explain priority`
- `Add calendar block`
- `Mark waiting`

Bruno proposal flow:

1. User clicks `Find time`.
2. Bruno reads selected responsibility, today's calendar, and active Command board context.
3. Bruno proposes one or more calendar blocks.
4. User confirms.
5. Planevo writes to Google Calendar only if scopes and confirmation are valid.
6. The responsibility item links to the created event.

### 11.4 Bruno Context Contract

Command should register a compact typed context object.

```ts
type CommandBrunoContext = {
  surface: "command";
  selectedItemId?: string;
  boardSnapshot: {
    nowCount: number;
    todayCount: number;
    dueSoonCount: number;
    unsortedCount: number;
  };
  selectedItem?: {
    id: string;
    title: string;
    type: ResponsibilityType;
    dueAt: string | null;
    sourceType: ResponsibilitySourceType;
    status: ResponsibilityStatus;
    notes: string | null;
  };
};
```

Do not pass the entire user life history to Bruno by default. Pass the current board snapshot and selected item, then fetch more server-side when needed.

## 12. AI Model Policy

This section is intentionally explicit so future agents do not randomly choose models.

Pricing below was verified from public provider pages in July 2026. Re-check before launch because model names and prices can change.

### 12.1 Default Model Choices

Use these defaults:

```env
COMMAND_EXTRACT_MODEL=gpt-5.4-nano
COMMAND_EXTRACT_ESCALATION_MODEL=gpt-5.4-mini
COMMAND_BRUNO_MODEL=gpt-5.4-mini
COMMAND_DEEP_MODEL=gpt-5.4
COMMAND_TRANSCRIBE_FREE_MODEL=gpt-4o-mini-transcribe
COMMAND_TRANSCRIBE_PRO_MODEL=gpt-4o-transcribe
COMMAND_REALTIME_VOICE_MODEL=gpt-realtime-whisper
```

### 12.2 Text Extraction

Default:

- `gpt-5.4-nano`

Use for:

- Simple typed dumps.
- Basic paste cleanup.
- Fast structured JSON extraction.
- Low-cost free tier usage.

Escalate to:

- `gpt-5.4-mini`

Use escalation when:

- The dump includes many mixed domains.
- The output confidence is low.
- Dates are ambiguous.
- The user asks for deeper cleanup.
- Connected source context is included.
- The nano output fails schema validation twice.

Avoid:

- `gpt-5.4` for routine extraction.

Use `gpt-5.4` only for:

- Deep Bruno reasoning.
- High-value paid synthesis.
- Complex multi-source reviews.
- Evaluation runs where quality is being measured.

### 12.3 Bruno

Default Bruno model for Command:

- `gpt-5.4-mini`

Deep Bruno:

- `gpt-5.4`

Deep Bruno should be limited because output tokens are expensive.

Examples for Deep Bruno:

- "Help me make sense of my whole week."
- "I have school, work, internship applications, and family stuff. Tell me what is actually important."
- "Turn this semester into a realistic responsibility map."

Examples that should stay on mini:

- "Break down this assignment."
- "Draft a message to my teacher."
- "Find time today."
- "Explain why this is in Now."

### 12.4 Voice

Free voice:

- Prefer native device speech recognition where quality is acceptable and privacy/platform constraints are handled.
- Otherwise use `gpt-4o-mini-transcribe`.

Pro voice:

- Use `gpt-4o-transcribe` when quality matters.
- Use `gpt-4o-mini-transcribe` for long low-stakes dictation if margin pressure requires it.

Realtime voice:

- Use `gpt-realtime-whisper` only for live streaming experiences.
- Avoid realtime for simple "record then process" because it costs more.

### 12.5 Batch/Flex Processing

Use batch/flex pricing for:

- Background source refresh summarization.
- Nightly cleanup jobs.
- Non-urgent source-item classification.
- Evaluation runs.

Do not use batch for interactive capture where the user expects an immediate preview.

## 13. OpenAI Pricing Snapshot

Verified July 2026. Re-check before production launch.

Text:

- `gpt-5.4`: input `$2.50/M`, cached input `$0.25/M`, output `$15/M`
- `gpt-5.4-mini`: input `$0.75/M`, cached input `$0.075/M`, output `$4.50/M`
- `gpt-5.4-nano`: input `$0.20/M`, cached input `$0.02/M`, output `$1.25/M`

Batch/flex examples:

- `gpt-5.4-mini`: input `$0.375/M`, output `$2.25/M`
- `gpt-5.4-nano`: input `$0.10/M`, output `$0.625/M`

Voice:

- `gpt-4o-transcribe`: estimated `$0.006/min`
- `gpt-4o-mini-transcribe`: estimated `$0.003/min`
- `gpt-realtime-whisper`: `$0.017/min`

## 14. Cost Model

Planevo Command must be designed with cost controls from day one.

### 14.1 Example Text Extraction Cost

Assume one Clear My Plate input:

- 1,500 input tokens.
- 700 output tokens.

`gpt-5.4-nano`:

- Input: `1,500 / 1,000,000 * $0.20 = $0.0003`
- Output: `700 / 1,000,000 * $1.25 = $0.000875`
- Total: about `$0.001175`

`gpt-5.4-mini`:

- Input: `1,500 / 1,000,000 * $0.75 = $0.001125`
- Output: `700 / 1,000,000 * $4.50 = $0.00315`
- Total: about `$0.004275`

This means routine extraction can be cheap if kept on nano and outputs stay compact.

### 14.2 Example Bruno Cost

Assume one Bruno Command answer:

- 5,000 input tokens.
- 1,500 output tokens.

`gpt-5.4-mini`:

- Input: `5,000 / 1,000,000 * $0.75 = $0.00375`
- Output: `1,500 / 1,000,000 * $4.50 = $0.00675`
- Total: about `$0.0105`

`gpt-5.4`:

- Input: `5,000 / 1,000,000 * $2.50 = $0.0125`
- Output: `1,500 / 1,000,000 * $15 = $0.0225`
- Total: about `$0.035`

Deep Bruno must be metered.

### 14.3 Example Voice Cost

Free voice cap like Wispr Flow style:

- 2,000 words/week on web/desktop.
- 1,000 words/week on mobile.

Rough conversion:

- 150 words/minute speaking rate.
- 2,000 words/week is about 13.3 minutes/week.
- Monthly is about 58 minutes.

At `gpt-4o-mini-transcribe`:

- `58 * $0.003 = $0.174/month`

At `gpt-4o-transcribe`:

- `58 * $0.006 = $0.348/month`

Pro voice examples:

- 300 minutes/month on mini: `$0.90`
- 300 minutes/month on standard: `$1.80`
- 1,000 minutes/month on mini: `$3.00`
- 1,000 minutes/month on standard: `$6.00`

Recommendation:

- Free voice should use OS dictation or mini transcription.
- Student plan should cap voice lower than full Pro unless usage data proves margin is safe.
- Full Pro can include higher transcription limits, but enforce fair-use.

### 14.4 Stripe Revenue After Fees

Current Planevo web pricing discovered in repo:

- Monthly Pro: `$9.99/month`
- Annual Pro: `$79/year`
- Student: `$4.99/month`

Stripe domestic card fee:

- `2.9% + $0.30`

Approximate net:

- `$9.99`: fee `$0.59`, net `$9.40`
- `$4.99`: fee `$0.44`, net `$4.55`
- `$79`: fee `$2.59`, net `$76.41`

Target AI/product gross margin:

- Pro average monthly COGS under `$2.50`
- Student average monthly COGS under `$1.25`
- Free active user average monthly COGS under `$0.25`

### 14.5 App Store / Play Store

RevenueCat is already used by mobile. Current RevenueCat public positioning says their full suite is free until `$2,500` in monthly tracked revenue.

App Store Small Business Program:

- 15% commission under the program threshold.

Google Play:

- Verify current service-fee details before launch.
- Assume mobile subscription net is lower than Stripe web net.

Mobile plans should therefore be more careful with expensive voice/deep-AI allowances.

### 14.6 Infrastructure Costs

Supabase public pricing snapshot:

- Free includes 50k MAU, 500MB DB, 5GB egress, 1GB storage, 500k Edge Function invocations.
- Pro includes 100k MAU, then `$0.00325/MAU`; 8GB disk then `$0.125/GB`; 250GB egress then `$0.09/GB`; 100GB storage then `$0.021/GB`; 2M Edge Functions then `$2/M`.

Vercel Pro public pricing snapshot:

- `$20/month` platform fee.
- Includes one deploying seat and `$20` usage credit.
- Additional seats are `$20/month`.
- Usage add-ons vary.

Composio public pricing snapshot if used for integrations:

- Free: 20K tool calls/month.
- `$29/month`: 200K tool calls/month and additional `$0.299/1K`.
- `$229/month`: 2M calls/month and additional `$0.249/1K`.

PostHog public pricing snapshot:

- First 1M events/month free.
- Paid event rates depend on anonymous vs identified events.

### 14.7 Cost Guardrails

Required cost controls:

- Log every Command AI call in a usage ledger.
- Store model, tokens, audio seconds, estimated cost, user plan, feature area, and request id.
- Enforce per-plan limits before calling the model.
- Use nano first for extraction.
- Escalate only when schema validation or confidence requires it.
- Keep prompts compact.
- Keep outputs JSON-only where possible.
- Cache source summaries.
- Use batch/flex for non-interactive jobs.
- Rate-limit voice uploads by seconds, not just request count.
- Rate-limit Deep Bruno separately.

## 15. Free vs Pro

The free plan must be useful enough to prove the product, but not unlimited enough to create AI cost risk.

Existing web AI limits in repo:

- Free/canceled: 5 AI requests/day and 2/hour.
- Premium/student/trialing: 100/day and 20/hour.
- Admin: 1000/day and 100/hour.

Planevo Command should either reuse these limits or create a Command-specific ledger that still respects the global AI cap.

### 15.1 Free User

Free users get:

- Unlimited manual typed responsibilities.
- Unlimited local board organization.
- Basic Command board.
- Manual completion/status changes.
- Limited Clear My Plate AI cleanup.
- Limited voice dictation.
- One connected source or limited source preview, depending on integration cost.
- Basic Bruno questions within existing free AI limits.
- Basic reminders if already supported by app infrastructure.

Recommended free limits:

- Clear My Plate AI cleanups: 5/day, 2/hour, aligned with current free AI limits.
- Voice: 2,000 words/week web/desktop and 1,000 words/week mobile, or equivalent minutes.
- Source integrations: 1 active integration.
- Bruno: included in the 5/day free AI limit.
- Deep Bruno: locked.
- Background source refresh: manual only or limited daily refresh.

Free voice quality:

- Use native OS dictation when available.
- Fallback to `gpt-4o-mini-transcribe`.
- Free transcript can be slightly less polished than Pro, but must still be usable.

Free upgrade triggers:

- User hits voice cap.
- User hits Clear My Plate cleanup cap.
- User wants more than one source.
- User asks for Deep Bruno.
- User wants advanced source sync.
- User wants higher quality transcription.

### 15.2 Pro User

Pro users get:

- Higher AI cleanup limits.
- Higher voice limits.
- Higher quality transcription.
- Multiple connected sources.
- Advanced source refresh.
- Bruno with richer context.
- Deep Bruno monthly allowance.
- Calendar-aware scheduling proposals.
- Advanced breakdowns.
- More history/search.
- Priority processing.

Recommended Pro limits:

- Clear My Plate cleanups: 100/day, 20/hour, aligned with current premium limits.
- Voice: 1,000 minutes/month fair-use, or start at 300 minutes/month and raise after usage data.
- Sources: all supported integrations.
- Bruno standard: 100/day global AI cap.
- Deep Bruno: 20/month on `gpt-5.4`, then downgrade to mini or require add-on.
- Background source refresh: automatic.

### 15.3 Student User

Student plan currently appears as `$4.99/month`.

Student users should get real value, but cost caps must protect margin.

Recommended Student limits:

- Clear My Plate cleanups: same as Pro or slightly lower after telemetry.
- Voice: 300 minutes/month.
- Sources: Canvas, Google Calendar, and one additional source at launch.
- Bruno standard: premium limit.
- Deep Bruno: 10/month.
- Background source refresh: automatic but less frequent than full Pro if needed.

Student value should emphasize:

- Canvas assignments.
- Calendar/class commitments.
- Clubs/sports.
- Tests and essays.
- Parent/family responsibilities.
- College/career admin.

### 15.4 Admin

Admin users:

- Higher usage limits.
- Debug panels for token/cost traces.
- Ability to view extraction JSON in development.
- Ability to run evals.

Do not expose admin cost/debug panels to normal users.

## 16. Data Model

Planevo Command needs durable structured data.

Use Supabase/Postgres with RLS.

### 16.1 Tables

Recommended tables:

- `command_intake_runs`
- `responsibility_items`
- `responsibility_sources`
- `responsibility_item_sources`
- `responsibility_events`
- `command_usage_ledger`
- `responsibility_clarifications`
- `responsibility_item_links`

### 16.2 command_intake_runs

Purpose:

- Store each user dump and parse attempt.
- Track AI model/cost/confidence.
- Support preview confirmation.

Fields:

```sql
create table public.command_intake_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  input_mode text not null check (input_mode in ('text', 'paste', 'voice', 'source_import', 'share_sheet', 'ocr')),
  raw_text text,
  transcript_text text,
  status text not null default 'pending' check (status in ('pending', 'previewed', 'confirmed', 'discarded', 'failed')),
  extraction_model text,
  transcription_model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  audio_seconds integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  confidence numeric(4, 3),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 16.3 responsibility_items

Purpose:

- Durable responsibility object shown on the Command board.

Fields:

```sql
create table public.responsibility_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  type text not null default 'unknown',
  status text not null default 'active',
  priority text not null default 'normal',
  urgency_score integer not null default 0,
  confidence numeric(4, 3) not null default 1,
  due_at timestamptz,
  start_at timestamptz,
  end_at timestamptz,
  timezone text,
  recurrence_rule text,
  source_type text not null default 'manual',
  source_label text,
  source_external_id text,
  intake_run_id uuid references public.command_intake_runs(id) on delete set null,
  calendar_event_id uuid references public.calendar_events(id) on delete set null,
  source_item_id uuid references public.source_items(id) on delete set null,
  needs_review boolean not null default false,
  review_reason text,
  why_it_matters text,
  metadata jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Allowed `status` values:

- `active`
- `now`
- `scheduled`
- `waiting`
- `done`
- `archived`
- `discarded`

Allowed `priority` values:

- `low`
- `normal`
- `high`
- `urgent`

The UI can compute section placement from status, due date, calendar time, urgency, and source context. Do not over-store UI sections unless product needs explicit user pinning.

### 16.4 responsibility_sources

Purpose:

- Represent a source system or source artifact.

```sql
create table public.responsibility_sources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  external_id text,
  label text not null,
  url text,
  captured_text text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

### 16.5 responsibility_item_sources

Purpose:

- Many-to-many relationship between items and sources.

```sql
create table public.responsibility_item_sources (
  item_id uuid not null references public.responsibility_items(id) on delete cascade,
  source_id uuid not null references public.responsibility_sources(id) on delete cascade,
  relation text not null default 'derived_from',
  created_at timestamptz not null default now(),
  primary key (item_id, source_id)
);
```

### 16.6 responsibility_events

Purpose:

- Audit changes to responsibility items.

```sql
create table public.responsibility_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id uuid references public.responsibility_items(id) on delete cascade,
  event_type text not null,
  actor text not null default 'user',
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);
```

### 16.7 command_usage_ledger

Purpose:

- Cost and limit tracking for Command.

```sql
create table public.command_usage_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type text not null,
  feature text not null,
  provider text not null default 'openai',
  model text,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cached_input_tokens integer not null default 0,
  audio_seconds integer not null default 0,
  estimated_cost_usd numeric(10, 6) not null default 0,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
```

Features:

- `text_extract`
- `text_escalation`
- `voice_transcription`
- `bruno_standard`
- `bruno_deep`
- `source_refresh`
- `eval`

### 16.8 RLS

Each Command table must have RLS enabled.

Required policy pattern:

```sql
alter table public.responsibility_items enable row level security;

create policy "Users can read own responsibility items"
on public.responsibility_items
for select
using (auth.uid() = user_id);

create policy "Users can insert own responsibility items"
on public.responsibility_items
for insert
with check (auth.uid() = user_id);

create policy "Users can update own responsibility items"
on public.responsibility_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own responsibility items"
on public.responsibility_items
for delete
using (auth.uid() = user_id);
```

Repeat for each table with `user_id`.

## 17. TypeScript Domain Types

Create:

- `apps/web/lib/command/types.ts`

Core types:

```ts
export type ResponsibilityType =
  | "assignment"
  | "assessment"
  | "meeting"
  | "class"
  | "practice"
  | "work_deadline"
  | "follow_up"
  | "errand"
  | "family"
  | "money"
  | "health"
  | "creative"
  | "idea"
  | "habit_like_routine"
  | "admin"
  | "unknown";

export type ResponsibilityStatus =
  | "active"
  | "now"
  | "scheduled"
  | "waiting"
  | "done"
  | "archived"
  | "discarded";

export type ResponsibilityPriority = "low" | "normal" | "high" | "urgent";

export type ResponsibilitySourceType =
  | "manual"
  | "voice"
  | "paste"
  | "calendar"
  | "canvas"
  | "slack"
  | "notion"
  | "linear"
  | "email_later"
  | "share_sheet_later"
  | "ocr_later";

export type CommandInputMode =
  | "text"
  | "paste"
  | "voice"
  | "source_import"
  | "share_sheet"
  | "ocr";

export type ResponsibilityItem = {
  id: string;
  title: string;
  description: string | null;
  type: ResponsibilityType;
  status: ResponsibilityStatus;
  priority: ResponsibilityPriority;
  urgencyScore: number;
  confidence: number;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  timezone: string | null;
  recurrenceRule: string | null;
  sourceType: ResponsibilitySourceType;
  sourceLabel: string | null;
  needsReview: boolean;
  reviewReason: string | null;
  whyItMatters: string | null;
  metadata: Record<string, unknown>;
};

export type CommandBoard = {
  now: ResponsibilityItem[];
  today: ResponsibilityItem[];
  dueSoon: ResponsibilityItem[];
  onMyPlate: ResponsibilityItem[];
  unsorted: ResponsibilityItem[];
  waiting: ResponsibilityItem[];
  done: ResponsibilityItem[];
};
```

## 18. Extraction Schema

Create:

- `apps/web/lib/command/schema.ts`

Use Zod for model output validation.

```ts
import { z } from "zod";

export const extractedResponsibilitySchema = z.object({
  title: z.string().min(1).max(160),
  description: z.string().max(1000).nullable(),
  type: z.enum([
    "assignment",
    "assessment",
    "meeting",
    "class",
    "practice",
    "work_deadline",
    "follow_up",
    "errand",
    "family",
    "money",
    "health",
    "creative",
    "idea",
    "habit_like_routine",
    "admin",
    "unknown",
  ]),
  dueText: z.string().nullable(),
  dueAt: z.string().datetime().nullable(),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
  timezone: z.string().nullable(),
  recurrenceRule: z.string().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  confidence: z.number().min(0).max(1),
  needsReview: z.boolean(),
  reviewReason: z.string().nullable(),
  whyItMatters: z.string().nullable(),
  sourceHints: z.array(z.string()).default([]),
});

export const commandExtractionSchema = z.object({
  summary: z.string().max(400),
  items: z.array(extractedResponsibilitySchema).max(50),
  clarificationQuestions: z.array(z.string().max(160)).max(5),
  confidence: z.number().min(0).max(1),
});
```

The model must return JSON that matches this schema. If validation fails, retry once with a correction prompt. If it fails twice, return a user-friendly failure and save the raw input as an unsorted note-like responsibility.

## 19. Backend Pipeline

Pipeline:

1. User submits text, paste, voice, source import, share sheet, or OCR input.
2. Server authenticates user.
3. Server checks plan and usage limits.
4. If voice, transcribe audio.
5. Server creates `command_intake_runs` row.
6. Server calls extraction model.
7. Server validates JSON with Zod.
8. Server normalizes dates, types, priorities, and confidence.
9. Server returns preview items to client.
10. User confirms, edits, or discards.
11. Server persists confirmed `responsibility_items`.
12. Server links items to sources, calendar events, or source_items.
13. Server logs usage/cost.
14. UI refreshes Command board.
15. Bruno receives updated context.

Important:

- Do not persist model output as final responsibilities until the user confirms, except if product intentionally supports "auto-save to Unsorted."
- For free users, failed previews still count only if an actual AI provider call was made.
- Store raw text only if privacy policy allows. At minimum, let users delete it.
- Do not store raw audio by default.

## 20. API Routes

Create:

- `apps/web/app/api/command/intake/route.ts`
- `apps/web/app/api/command/confirm/route.ts`
- `apps/web/app/api/command/voice/route.ts`
- `apps/web/app/api/command/items/[id]/route.ts`
- `apps/web/app/api/command/board/route.ts`

### 20.1 POST /api/command/intake

Input:

```ts
type CommandIntakeRequest = {
  inputMode: "text" | "paste" | "source_import";
  text: string;
  timezone: string;
  clientNow: string;
  sourceIds?: string[];
};
```

Output:

```ts
type CommandIntakeResponse = {
  intakeRunId: string;
  summary: string;
  previewItems: ExtractedResponsibility[];
  clarificationQuestions: string[];
  usage: {
    planType: string;
    remainingToday: number;
    estimatedCostUsd: number;
  };
};
```

Behavior:

- Validate text length.
- Reject empty input.
- Enforce rate limits.
- Use `gpt-5.4-nano` first.
- Escalate to `gpt-5.4-mini` only when needed.
- Return preview, not persisted final items.

### 20.2 POST /api/command/confirm

Input:

```ts
type CommandConfirmRequest = {
  intakeRunId: string;
  items: Array<{
    title: string;
    description: string | null;
    type: ResponsibilityType;
    dueAt: string | null;
    startAt: string | null;
    endAt: string | null;
    priority: ResponsibilityPriority;
    whyItMatters: string | null;
    accepted: boolean;
  }>;
};
```

Output:

```ts
type CommandConfirmResponse = {
  createdItemIds: string[];
  board: CommandBoard;
};
```

Behavior:

- Verify intake run belongs to user.
- Persist accepted items.
- Mark run as confirmed.
- Add audit events.
- Return fresh board.

### 20.3 POST /api/command/voice

Input:

- Multipart audio upload or platform-specific audio blob.
- `timezone`
- `clientNow`

Output:

```ts
type CommandVoiceResponse = {
  transcript: string;
  intakeRunId?: string;
  previewItems?: ExtractedResponsibility[];
  usage: {
    audioSecondsUsedThisPeriod: number;
    audioSecondsRemainingThisPeriod: number;
    model: string;
  };
};
```

Behavior:

- Validate file size.
- Validate duration.
- Enforce plan voice cap before transcription.
- Transcribe.
- Optionally run text extraction immediately.
- Return transcript and preview.

### 20.4 GET /api/command/board

Returns board sections computed server-side.

Behavior:

- Read active responsibility items.
- Join relevant calendar/source context.
- Compute sections deterministically.
- Do not call AI for board load.

### 20.5 PATCH /api/command/items/[id]

Supports:

- title edit
- description edit
- type edit
- status change
- due date edit
- priority edit
- why-it-matters edit
- mark done
- archive
- move to waiting

Do not route simple item edits through Bruno.

## 21. Board Computation

Create:

- `apps/web/lib/command/board.ts`

Rules:

- `done`: status `done`.
- `waiting`: status `waiting`.
- `unsorted`: `needsReview = true` or type `unknown` with no due/start date.
- `now`: high urgency, overdue, due within 24 hours, explicitly pinned, or current calendar-linked commitment.
- `today`: due today, scheduled today, or user-pinned to today.
- `dueSoon`: due in next 7 days but not today/now.
- `onMyPlate`: active responsibilities not in other sections.

The board must be deterministic. AI should not decide live section placement every render.

Urgency score formula can start simple:

```ts
function computeUrgencyScore(item: ResponsibilityItem, now: Date): number {
  let score = 0;
  if (item.priority === "urgent") score += 40;
  if (item.priority === "high") score += 25;
  if (item.needsReview) score += 10;
  if (!item.dueAt) return score;

  const hoursUntilDue = (new Date(item.dueAt).getTime() - now.getTime()) / 36e5;
  if (hoursUntilDue < 0) score += 50;
  else if (hoursUntilDue <= 24) score += 35;
  else if (hoursUntilDue <= 72) score += 20;
  else if (hoursUntilDue <= 168) score += 10;

  return Math.min(score, 100);
}
```

## 22. Prompt Design

Prompting should be boring, structured, and schema-first.

### 22.1 Extraction System Prompt

Purpose:

- Extract responsibilities from messy user text.
- Do not motivate, coach, or over-explain.
- Return strict JSON.

Required principles:

- Split separate responsibilities.
- Preserve user's wording where possible.
- Infer dates only when enough context exists.
- Mark uncertain dates as `needsReview`.
- Do not invent obligations.
- Distinguish scheduled commitments from deadlines.
- Treat personal/family/admin responsibilities as valid.
- Keep descriptions short.

### 22.2 Extraction User Context

Include:

- User timezone.
- Current date/time.
- Input mode.
- Raw text.
- Optional source hints.

Do not include:

- Entire account history.
- Secrets.
- Unbounded source text.
- More source context than needed.

### 22.3 Example Prompt Shape

```ts
const system = `
You extract responsibilities for Planevo Command.
Return only JSON matching the provided schema.
Do not invent obligations.
Mark uncertain dates or unclear items with needsReview=true.
Separate deadlines, meetings, follow-ups, errands, family responsibilities, creative ideas, and admin work.
`;
```

## 23. Source Integrations

Planevo already has integration direction through `source_items` and `calendar_events`.

Command should reuse:

- `calendar_events` for Google Calendar schedule context.
- `source_items` for Canvas, Notion, Slack, Linear and other normalized work sources.

### 23.1 Google Calendar

Calendar is special because it has time blocks and write-back.

Command uses Calendar for:

- Today's commitments.
- Time constraints.
- Scheduled responsibilities.
- Proposed time blocks.

Write-back:

- Only with explicit user confirmation.
- Only after checking scopes.
- Use existing Bruno action confirmation patterns where possible.

### 23.2 Canvas

Canvas is critical for students.

Command uses Canvas for:

- Assignments.
- Due dates.
- Course labels.
- Missing/submitted state if available.

Phase behavior:

- Read/import Canvas assignment items.
- Show source badge.
- Let Bruno break down assignment.
- Do not write to Canvas.

### 23.3 Slack

Command uses Slack for:

- Follow-ups.
- Mentions.
- Actionable messages.
- Threads requiring response.

Phase behavior:

- Read normalized source items.
- Let user convert Slack item to responsibility.
- Bruno can draft reply.
- Do not send Slack message without explicit confirmation and dedicated action schema.

### 23.4 Notion

Command uses Notion for:

- Docs.
- Tasks if connected.
- Project context.

Phase behavior:

- Import as source context.
- Convert selected pages/tasks to responsibilities.
- Do not write back initially.

### 23.5 Linear

Command uses Linear for:

- Issues.
- Work deadlines.
- Assigned tasks.

Phase behavior:

- Import assigned issues.
- Show project/source context.
- Do not mutate Linear initially.

### 23.6 Email

Email can be later because it adds privacy and complexity.

Do not include email in first launch unless the existing product already has a safe email integration.

### 23.7 OCR/Screenshots

Screenshots are valuable for students and mobile users.

Later phase:

- User uploads screenshot.
- OCR extracts text.
- Command intake parses responsibilities.
- User confirms.

Do not launch OCR before text/voice is excellent.

## 24. Web File Structure

Create these files:

- `apps/web/app/dashboard/command/page.tsx`
- `apps/web/components/command/CommandView.tsx`
- `apps/web/components/command/CommandCapture.tsx`
- `apps/web/components/command/CommandBoard.tsx`
- `apps/web/components/command/CommandSection.tsx`
- `apps/web/components/command/CommandItemCard.tsx`
- `apps/web/components/command/CommandPreviewPanel.tsx`
- `apps/web/components/command/CommandVoiceButton.tsx`
- `apps/web/components/command/CommandUsageBanner.tsx`
- `apps/web/components/command/CommandSourcePanel.tsx`
- `apps/web/components/command/CommandBrunoActions.tsx`
- `apps/web/components/command/CommandEmptyState.tsx`
- `apps/web/components/command/CommandBoardSkeleton.tsx`
- `apps/web/lib/command/types.ts`
- `apps/web/lib/command/schema.ts`
- `apps/web/lib/command/models.ts`
- `apps/web/lib/command/costs.ts`
- `apps/web/lib/command/usage.ts`
- `apps/web/lib/command/extract.ts`
- `apps/web/lib/command/transcribe.ts`
- `apps/web/lib/command/normalize.ts`
- `apps/web/lib/command/validate.ts`
- `apps/web/lib/command/persist.ts`
- `apps/web/lib/command/board.ts`
- `apps/web/lib/command/bruno-context.ts`
- `apps/web/lib/command/source-items.ts`
- `apps/web/lib/command/__tests__/extract.test.ts`
- `apps/web/lib/command/__tests__/board.test.ts`
- `apps/web/lib/command/__tests__/usage.test.ts`
- `apps/web/app/api/command/intake/route.ts`
- `apps/web/app/api/command/confirm/route.ts`
- `apps/web/app/api/command/voice/route.ts`
- `apps/web/app/api/command/board/route.ts`
- `apps/web/app/api/command/items/[id]/route.ts`
- `apps/web/lib/supabase/migration_vXX_planevo_command.sql`

Modify these likely files:

- dashboard sidebar/nav file that references `daily-plan`
- mobile tabs/navigation files
- Bruno context registration where page context is declared
- subscription/usage limit helpers if Command needs separate quota
- analytics helper files if present

Use `rg "daily-plan|Daily Plan|BrunoProvider|useRegisterBrunoContext|AI_DAILY_LIMITS"` to find exact files before editing.

## 25. Mobile File Structure

Create or modify:

- `apps/mobile/app/(tabs)/command.tsx`
- `apps/mobile/components/command/MobileCommandView.tsx`
- `apps/mobile/components/command/MobileCommandCapture.tsx`
- `apps/mobile/components/command/MobileCommandBoard.tsx`
- `apps/mobile/components/command/MobileCommandItemCard.tsx`
- `apps/mobile/components/command/MobileCommandVoiceButton.tsx`
- `apps/mobile/components/command/MobileCommandPreviewSheet.tsx`
- `apps/mobile/lib/commandApi.ts`
- mobile tab/navigation route replacing Daily Plan

Mobile priorities:

- Fast voice/text capture.
- Preview confirmation.
- Simple board sections.
- Offline-friendly draft state if possible.
- RevenueCat-aware limits.

Do not try to build the full desktop source panel on mobile in the first pass.

## 26. Design Direction

Planevo Command should feel:

- Calm.
- Polished.
- Dense enough to be useful.
- Not childish.
- Not "vibe-coded."
- Not enterprise-cold.
- Warm but operational.

Visual principles:

- One dominant input surface.
- Strong information hierarchy.
- Fewer decorative cards.
- Sections feel like a command board, not a landing page.
- Use icons for item types and actions.
- Keep cards compact.
- Avoid giant hero text inside the dashboard.
- Avoid gradient/orb decoration.
- Use readable spacing and stable dimensions.
- Make mobile usable with one hand.

Microcopy:

- Use direct, low-shame language.
- Good: `On your plate`, `Needs a date`, `Waiting`, `Clear My Plate`.
- Avoid: `You failed`, `Recovery`, `Overdue again`, `Fix your schedule`.

## 27. Usage Limits Implementation

Create:

- `apps/web/lib/command/usage.ts`

Responsibilities:

- Read user's plan.
- Compute daily/hourly Command AI usage.
- Compute voice period usage.
- Compute Deep Bruno monthly usage.
- Enforce limits before provider calls.
- Log usage after provider calls.

Limit dimensions:

- AI requests per hour/day.
- Voice seconds per week/month.
- Deep Bruno per month.
- Source refreshes per day.
- Connected source count.

Recommended policy:

```ts
export type CommandLimitPolicy = {
  aiRequestsPerDay: number;
  aiRequestsPerHour: number;
  voiceSecondsPerMonth: number;
  voiceWordsPerWeek: number;
  deepBrunoPerMonth: number;
  connectedSources: number | "unlimited";
  automaticSourceRefresh: boolean;
};
```

Plan examples:

```ts
export const COMMAND_LIMITS = {
  free: {
    aiRequestsPerDay: 5,
    aiRequestsPerHour: 2,
    voiceSecondsPerMonth: 3600,
    voiceWordsPerWeek: 2000,
    deepBrunoPerMonth: 0,
    connectedSources: 1,
    automaticSourceRefresh: false,
  },
  student: {
    aiRequestsPerDay: 100,
    aiRequestsPerHour: 20,
    voiceSecondsPerMonth: 18000,
    voiceWordsPerWeek: 20000,
    deepBrunoPerMonth: 10,
    connectedSources: 3,
    automaticSourceRefresh: true,
  },
  premium: {
    aiRequestsPerDay: 100,
    aiRequestsPerHour: 20,
    voiceSecondsPerMonth: 60000,
    voiceWordsPerWeek: 50000,
    deepBrunoPerMonth: 20,
    connectedSources: "unlimited",
    automaticSourceRefresh: true,
  },
};
```

These limits can be tuned after telemetry. Start conservative and raise limits when margins are proven.

## 28. Analytics

Track product value, not vanity.

Events:

- `command_opened`
- `command_intake_started`
- `command_intake_submitted`
- `command_intake_previewed`
- `command_intake_confirmed`
- `command_intake_discarded`
- `command_item_created`
- `command_item_completed`
- `command_item_marked_waiting`
- `command_item_moved_section`
- `command_voice_started`
- `command_voice_transcribed`
- `command_voice_limit_hit`
- `command_ai_limit_hit`
- `command_source_connected`
- `command_source_item_converted`
- `command_bruno_opened`
- `command_bruno_action_clicked`
- `command_bruno_proposal_confirmed`
- `command_upgrade_clicked`
- `command_upgrade_completed`

Key metrics:

- Time to first responsibility created.
- Percent of new users who create first item in first session.
- Percent of users who confirm AI preview.
- Average items created per intake.
- Completion rate within 7 days.
- Return rate after first Command use.
- Free-to-paid conversion after limit hit.
- Voice usage by plan.
- AI cost per active user.
- AI cost per paid user.
- Source-connected retention lift.

Success thresholds to watch:

- New user first responsibility in under 60 seconds.
- Preview confirmation rate above 60%.
- Day 7 retention higher for users who use Command than users who do not.
- Paid conversion improves after source/voice limit triggers.
- Average Pro AI COGS remains under target.

## 29. Privacy, Safety, and Trust

Planevo Command handles sensitive life data. Treat it like a trust surface.

Rules:

- Auth required for every API.
- RLS required on every Command table.
- Do not store raw audio by default.
- Make transcript deletion possible.
- Make responsibility deletion possible.
- Never expose one user's source items to another user.
- Do not include secrets in prompts.
- Limit source text passed to AI.
- Validate and sanitize URLs.
- Treat integrated content as untrusted text.
- Guard against prompt injection from Slack, Notion, Canvas, Linear, or pasted content.
- Keep AI actions confirmation-based.
- Show source/confidence when the system is unsure.

Student considerations:

- Avoid shame language.
- Avoid claims that Planevo guarantees grades.
- Be careful with school/education data.
- Document retention policy before launch.

## 30. Competitive Position

Planevo Command must be described differently from dictation apps.

Dictation app promise:

- "Speak anywhere and get text."

Planevo Command promise:

- "Dump what you are responsible for and get a living command center."

Notion-like app promise:

- "Build your workspace."

Planevo Command promise:

- "You do not need to build a system first. Planevo sorts your responsibilities as they arrive."

Chatbot promise:

- "Ask AI for a plan."

Planevo Command promise:

- "Your responsibilities live in Planevo. Bruno helps inside that system."

Calendar app promise:

- "See your schedule."

Planevo Command promise:

- "See your responsibilities, deadlines, commitments, and source context in one place."

## 31. Rollout Strategy

Do not ship every idea at once.

Ship in layers:

1. Text capture and board.
2. Preview confirmation.
3. Usage limits.
4. Voice.
5. Source conversion.
6. Bruno contextual actions.
7. Mobile capture.
8. Share sheet/OCR.

Early launch should feel complete for the core loop even if later integrations are limited.

The core loop is:

> Dump mess -> preview responsibilities -> confirm -> command board -> act on next item.

## 32. Feature Flags

Add environment flags:

```env
PLANEVO_COMMAND_ENABLED=false
COMMAND_VOICE_ENABLED=false
COMMAND_SOURCE_SYNC_ENABLED=false
COMMAND_PRO_LIMITS_ENABLED=true
COMMAND_DEBUG_COSTS_ENABLED=false
COMMAND_DEEP_BRUNO_ENABLED=false
```

Rollout order:

- Local development.
- Internal admin.
- Small beta.
- Free users with low limits.
- Pro users.
- Mobile.

## 33. Implementation Phases

Each phase should be independently shippable or testable.

### Phase 0: Confirm Existing Surface and Navigation

Goal:

- Identify every Daily Plan entry point and every source of data Command can reuse.

Tasks:

- [ ] Run `rg "daily-plan|Daily Plan|daily plan" apps/web apps/mobile`.
- [ ] Run `rg "source_items|calendar_events" apps/web/lib apps/web/app`.
- [ ] Run `rg "BrunoProvider|useRegisterBrunoContext|createBrunoChatRequestBody" apps/web`.
- [ ] Document exact nav files to modify in implementation notes.
- [ ] Confirm whether mobile currently exposes Daily Plan as a tab or nested screen.
- [ ] Confirm current usage-limit helper paths.
- [ ] Do not delete existing Daily Plan code in this phase.

Acceptance:

- Agent knows exact files to touch.
- Agent knows how Daily Plan route is currently mounted.
- Agent knows current Bruno context path.

### Phase 1: Database, Types, and Domain Layer

Goal:

- Add the Command responsibility data model with RLS and TypeScript types.

Tasks:

- [ ] Create Supabase migration for Command tables.
- [ ] Add RLS policies for all user-owned tables.
- [ ] Add indexes for `user_id`, `due_at`, `status`, `source_type`, and `created_at`.
- [ ] Create `apps/web/lib/command/types.ts`.
- [ ] Create `apps/web/lib/command/schema.ts`.
- [ ] Create `apps/web/lib/command/board.ts`.
- [ ] Add unit tests for board section computation.

Suggested indexes:

```sql
create index responsibility_items_user_status_idx
on public.responsibility_items(user_id, status);

create index responsibility_items_user_due_idx
on public.responsibility_items(user_id, due_at);

create index command_usage_ledger_user_created_idx
on public.command_usage_ledger(user_id, created_at);
```

Acceptance:

- Migration applies locally.
- RLS policies exist.
- TypeScript types compile.
- Board tests pass.

### Phase 2: Text Intake, Extraction, Preview, Confirm

Goal:

- Let users type/paste messy obligations and get a structured preview.

Tasks:

- [ ] Create model config in `apps/web/lib/command/models.ts`.
- [ ] Create cost estimation in `apps/web/lib/command/costs.ts`.
- [ ] Create usage enforcement in `apps/web/lib/command/usage.ts`.
- [ ] Create extraction function in `apps/web/lib/command/extract.ts`.
- [ ] Create validation/normalization helpers.
- [ ] Create persistence helper.
- [ ] Create `POST /api/command/intake`.
- [ ] Create `POST /api/command/confirm`.
- [ ] Add tests for valid extraction JSON.
- [ ] Add tests for invalid extraction fallback.
- [ ] Add tests for usage limit rejection.

Acceptance:

- A text dump returns preview items.
- User can confirm preview items.
- Confirmed items persist as responsibilities.
- No model call happens when free user is over limit.
- Usage ledger records estimated cost.

### Phase 3: Web Command UI

Goal:

- Build the core Command tab that replaces Daily Plan visually and functionally.

Tasks:

- [ ] Create `apps/web/app/dashboard/command/page.tsx`.
- [ ] Create `CommandView`.
- [ ] Create `CommandCapture`.
- [ ] Create `CommandPreviewPanel`.
- [ ] Create `CommandBoard`.
- [ ] Create `CommandSection`.
- [ ] Create `CommandItemCard`.
- [ ] Create `CommandUsageBanner`.
- [ ] Create empty/loading/error states.
- [ ] Add route-level auth.
- [ ] Wire board load from `GET /api/command/board` or server data helper.
- [ ] Replace Daily Plan nav label/link with Command behind feature flag.
- [ ] Keep old Daily Plan route redirecting or accessible for rollback.

Acceptance:

- User can open Command tab.
- User can type/paste and preview items.
- User can confirm and see board update.
- UI works on desktop and mobile web viewport.
- Daily Plan nav no longer appears as primary when flag is on.

### Phase 4: Editing and Board Actions

Goal:

- Make responsibility items usable after creation.

Tasks:

- [ ] Implement `PATCH /api/command/items/[id]`.
- [ ] Support mark done.
- [ ] Support edit title.
- [ ] Support edit due date.
- [ ] Support edit type.
- [ ] Support mark waiting.
- [ ] Support archive/discard.
- [ ] Add optimistic UI where safe.
- [ ] Add audit events for changes.
- [ ] Add tests for item authorization.

Acceptance:

- User can manage items without Bruno.
- Simple item edits do not call AI.
- RLS/API auth prevents cross-user item edits.

### Phase 5: Plan Limits and Monetization

Goal:

- Make free/pro/student behavior real and cost-safe.

Tasks:

- [ ] Reuse existing plan types: `free`, `trialing`, `premium`, `student`, `canceled`, `admin`.
- [ ] Add Command limit policy.
- [ ] Enforce AI daily/hourly caps.
- [ ] Enforce voice caps even before voice UI ships.
- [ ] Add upgrade CTA when user hits cap.
- [ ] Add analytics for limit hits.
- [ ] Add admin debug cost view if `COMMAND_DEBUG_COSTS_ENABLED=true`.

Acceptance:

- Free users hit clear limits.
- Pro/student users get higher limits.
- Admin gets debug visibility.
- Cost ledger is queryable.

### Phase 6: Voice Capture

Goal:

- Let users speak their responsibilities and turn them into preview items.

Tasks:

- [ ] Create voice API route.
- [ ] Add audio duration validation.
- [ ] Add file size validation.
- [ ] Add voice cap enforcement.
- [ ] Use `gpt-4o-mini-transcribe` for free fallback.
- [ ] Use `gpt-4o-transcribe` for Pro where configured.
- [ ] Add `CommandVoiceButton` on web.
- [ ] Add mobile voice button.
- [ ] Return transcript and preview.
- [ ] Do not store raw audio by default.

Acceptance:

- Free user can speak within cap.
- User sees transcript.
- User sees preview items.
- Voice usage is logged in seconds and estimated cost.
- Over-cap user sees upgrade/limit message before model call.

### Phase 7: Source Items and Calendar Context

Goal:

- Bring connected responsibilities into Command without making setup required.

Tasks:

- [ ] Build helper to read `source_items` relevant to Command.
- [ ] Build helper to read `calendar_events` relevant to today/upcoming.
- [ ] Add source panel to Command.
- [ ] Let user convert source item into responsibility.
- [ ] Link responsibility to source item.
- [ ] Show source badges.
- [ ] Add source conversion analytics.
- [ ] Keep write-back disabled except confirmed calendar events.

Acceptance:

- Canvas/Slack/Notion/Linear normalized items can appear as source context where available.
- Calendar events can appear as commitments.
- User can convert a source item into a responsibility.
- Source badge links back to context.

### Phase 8: Bruno Context and Actions

Goal:

- Make Bruno useful inside Command without making Command AI-first.

Tasks:

- [ ] Register Command page context with global Bruno.
- [ ] Add selected item context.
- [ ] Add Command action chips.
- [ ] Add Bruno prompt/context builder for responsibilities.
- [ ] Add proposal action for calendar block if existing Bruno action system supports it.
- [ ] Add draft-message action without auto-send.
- [ ] Preserve confirmation card behavior.
- [ ] Add tests for Bruno context payload shape.

Acceptance:

- Bruno opens with Command context.
- Bruno can act on selected item.
- Mutating actions require confirmation.
- Command board remains usable without Bruno.

### Phase 9: Mobile Command

Goal:

- Make mobile the fastest place to dump responsibilities.

Tasks:

- [ ] Add mobile Command tab/screen.
- [ ] Add mobile capture input.
- [ ] Add mobile voice capture.
- [ ] Add preview bottom sheet.
- [ ] Add simplified board.
- [ ] Add RevenueCat-aware limit display.
- [ ] Add offline draft fallback if network fails.
- [ ] Test on iOS simulator and Android if tooling is available.

Acceptance:

- User can capture by text on mobile.
- User can capture by voice on mobile.
- Preview/confirm works.
- Board syncs with web.
- Limit states are clear.

### Phase 10: Share Sheet, OCR, and Advanced Capture

Goal:

- Let users send messy life inputs into Planevo from outside the app.

Tasks:

- [ ] Add share sheet target if mobile platform scope allows.
- [ ] Add shared text intake.
- [ ] Add screenshot/OCR capture if provider and privacy decisions are approved.
- [ ] Add source labeling for share/OCR.
- [ ] Add preview confirmation flow.

Acceptance:

- Shared text can become a responsibility.
- OCR result can be reviewed before saving.
- Source is labeled.
- User stays in control.

### Phase 11: Evals and Quality

Goal:

- Make extraction quality measurable.

Tasks:

- [ ] Create fixture set for student, college, corporate, creative, parent-professional inputs.
- [ ] Add expected extraction snapshots.
- [ ] Test nano extraction.
- [ ] Test mini escalation.
- [ ] Track false splits, missed obligations, invented obligations, date errors, and type errors.
- [ ] Add regression tests before prompt/model changes.

Acceptance:

- Model/prompt changes can be evaluated.
- Launch quality is not based on vibes.
- Escalation policy is supported by data.

### Phase 12: Rollout and Migration

Goal:

- Launch Command without breaking existing users.

Tasks:

- [ ] Add feature flag.
- [ ] Ship hidden route to admin/internal.
- [ ] Run migration in staging.
- [ ] Backfill or map existing Daily Plan tasks only if safe.
- [ ] Add redirect from Daily Plan if flag is enabled.
- [ ] Monitor usage, errors, cost, and conversion.
- [ ] Roll out to beta users.
- [ ] Roll out to all web users.
- [ ] Roll out mobile after web loop is stable.

Acceptance:

- Existing users do not lose data.
- Daily Plan can be restored if needed.
- Command usage and cost are observable.
- Launch does not rely on unbounded AI calls.

## 34. Testing Checklist

Unit tests:

- Extraction schema validation.
- Board section computation.
- Usage limit policy.
- Cost estimation.
- Date normalization.
- Responsibility persistence.

API tests:

- Intake auth required.
- Confirm auth required.
- Voice auth required.
- Over-limit rejection.
- Cross-user item access denied.
- Invalid JSON model response handled.

UI tests:

- Command page renders.
- Text capture opens preview.
- Confirm creates cards.
- Mark done updates board.
- Limit banner appears.
- Empty state appears.

Mobile tests:

- Text capture works.
- Voice permission denied state works.
- Voice cap hit state works.
- Preview sheet works.
- Board sync works.

Manual QA:

- Student messy dump.
- College messy dump.
- Corporate messy dump.
- Creative messy dump.
- Parent-professional messy dump.
- Ambiguous date.
- No due dates.
- Large paste.
- Free limit hit.
- Pro user high usage.
- Source item conversion.
- Bruno selected item.

## 35. Launch Acceptance Criteria

Planevo Command is launchable when:

- A new user can create their first responsibility in under 60 seconds.
- Text/paste intake works reliably.
- Preview confirmation works.
- Board sections are deterministic.
- Free/pro limits work.
- Usage/cost ledger works.
- Bruno context works without replacing the board.
- External write actions are confirmed.
- Mobile capture works if mobile is included in launch.
- RLS is enabled and tested.
- AI prompts do not invent obligations in common evals.
- The app still works if AI provider fails.

## 36. Failure States

Required failure handling:

- Empty input: ask user to type or say what is on their plate.
- AI provider failure: save raw text as unsorted draft if user agrees.
- Schema validation failure: retry once, then fallback.
- Usage limit hit: show remaining reset time and upgrade option.
- Voice permission denied: allow typing.
- Audio too long: ask user to shorten or upgrade.
- Source sync failure: show stale source badge and retry.
- Calendar write failure: keep responsibility item and show failed event creation.

## 37. Upgrade Moments

Upgrade prompts should be contextual, not spammy.

Good upgrade moments:

- Voice cap reached.
- User tries to connect second source.
- User wants automatic source refresh.
- User asks for Deep Bruno.
- User asks to process a large paste.
- User wants more history.

Bad upgrade moments:

- Before the user gets any value.
- Immediately after first page load.
- Blocking manual typed responsibilities.

Free must be useful. Pro must feel meaningfully more capable.

## 38. Copy Bank

Primary page title:

```text
Command
```

Primary action:

```text
Clear My Plate
```

Input placeholder:

```text
Type, paste, or say everything you have going on.
```

Empty state:

```text
Start with the messy version. Planevo will sort it.
```

Preview title:

```text
Review what Planevo found
```

Confirm button:

```text
Add to Command
```

Unsorted section:

```text
Needs review
```

Limit:

```text
You have used today's free cleanups. You can still add responsibilities manually.
```

Voice cap:

```text
Voice capture resets next week. Typing still works.
```

Bruno action:

```text
Ask Bruno about this
```

Avoid:

- `AI generated your perfect plan`
- `You are behind`
- `Recover your failed day`
- `Productivity coach`
- `Optimize your life`

## 39. Investor Pitch Version

Planevo Command is the product's core value engine.

Most productivity apps ask users to create a system before they get relief. That is why people churn. They download the app while motivated, but when real life gets messy, the app becomes another responsibility.

Planevo Command starts where people actually are: overloaded, scattered, and avoiding responsibility because it feels too messy to face.

The user can type, paste, speak, or import everything on their plate. Planevo converts that mess into structured responsibility objects, links them to sources, shows what matters now, and gives Bruno enough context to help without turning the product into a chatbot.

This creates a stronger moat than a daily plan:

- The more users dump into Planevo, the more useful their board becomes.
- Integrations make Planevo source-aware.
- Bruno becomes more valuable because it works inside a structured system.
- Mobile capture makes the habit easy.
- Free users can experience the value, while Pro unlocks higher-quality voice, deeper Bruno, and multiple sources.

Planevo is not selling AI. Planevo is selling relief from responsibility chaos.

## 40. Implementation Notes for Future Agents

Read before coding:

- This plan.
- Existing Daily Plan code.
- Existing Bruno context/action code.
- Existing subscription/rate-limit code.
- Existing integration/source item code.

Do not:

- Build a standalone chat page.
- Replace the board with an AI conversation.
- Remove confirmation from mutating actions.
- Delete Daily Plan internals before rollout is stable.
- Add a giant onboarding flow before the user can capture.
- Hard-code model pricing in UI.
- Store raw audio by default.
- Let source text prompt-inject the model.

Do:

- Keep the first use fast.
- Make manual typing always available.
- Make AI optional but valuable.
- Use deterministic code for board placement.
- Track cost from day one.
- Keep Pro limits clear.
- Keep student pricing margin safe.
- Preserve Bruno as global/contextual.

## 41. Pricing and Market Source Links

Re-check these before launch because pricing and limits can change.

- OpenAI API pricing: `https://developers.openai.com/api/docs/pricing`
- Supabase billing: `https://supabase.com/docs/guides/platform/billing-on-supabase`
- Vercel Pro plan: `https://vercel.com/docs/plans/pro-plan`
- Stripe pricing: `https://stripe.com/pricing`
- Composio pricing: `https://composio.dev/pricing`
- Wispr Flow pricing reference for free voice cap inspiration: `https://wisprflow.ai/pricing`
- PostHog pricing: `https://posthog.com/pricing`
- RevenueCat pricing/revenue threshold reference: `https://www.revenuecat.com/`
- Apple App Store Small Business Program: `https://developer.apple.com/app-store/small-business-program/`
- Google Play service fee reference: `https://support.google.com/googleplay/android-developer/answer/112622`

## 42. Self Review

- This plan replaces Daily Plan with a comprehensive Command tab, not a small feature.
- It defines product thesis, user journeys, board layout, Bruno behavior, model policy, cost model, free/pro/student limits, data model, API routes, file structure, analytics, privacy, rollout, and phased implementation.
- It avoids positioning Planevo as AI-first or as a dictation app.
- It uses concrete model choices and cost assumptions verified in July 2026.
- It includes implementation phases that can be completed one at a time.
- It keeps external mutations confirmation-based.
- It keeps the existing ecosystem direction: Calendar, Canvas, Slack, Notion, Linear, mobile, billing, and Bruno.
