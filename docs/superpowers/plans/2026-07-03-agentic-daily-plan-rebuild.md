# Agentic Daily Plan Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Planevo Daily Plan into an agentic, cross-source command center that creates a trustworthy plan every day from calendar events, Canvas, Google Calendar, Slack, Linear, Notion, native tasks, user memory, and scheduling preferences.

**Architecture:** Keep `calendar_events` as the canonical live schedule source. Add an agent planning layer under `apps/web/lib/plan/agent/` that gathers normalized context, scores candidate work deterministically, asks the model only for rationale/copy, stores explainability in `calendar_events.metadata`, and records run snapshots for audit/debug. Rebuild the Daily Plan UI around operational density: timeline, source influence, capacity, risks, and confirmed mutations.

**Tech Stack:** Next.js App Router, React client components, Supabase/Postgres, Vitest, existing Bruno action proposal flow, existing Composio source sync, OpenAI-compatible fetch path already used by `generateDailyPlan`.

---

## Research Baseline

- Current Daily Plan page lives at `apps/web/app/dashboard/daily-plan/page.tsx` and renders `apps/web/components/daily-plan/DailyPlanView.tsx`.
- Active plan blocks are `calendar_events`; do not revive `current_day_plan` for live rendering.
- Integration data exists through `source_items` for Canvas, Notion, Slack, and Linear, plus `calendar_events` for Google Calendar.
- Public product research points to four required behaviors: one consolidated today view, due-date-to-do-date scheduling, visible capacity before committing, and low-friction previewed re-planning.
- External write boundary: Daily Plan may create local pending plan artifacts by default. Google Calendar write-back must remain confirmed and scope-checked. Canvas, Slack, Linear, and Notion write-back should stay out of scope until explicit action schemas and confirmation/audit flows exist.

## File Structure

- Create `apps/web/lib/plan/agent/types.ts`: canonical agent context, candidate, draft block, run summary, and metadata types.
- Create `apps/web/lib/plan/agent/normalizer.ts`: maps native tasks, Canvas rows, Google events, and `source_items` into `DailyPlanCandidateItem`.
- Create `apps/web/lib/plan/agent/gatherers.ts`: loads user, memory, tasks, source items, calendar rows, accounts, and existing plan state with user ownership filters.
- Create `apps/web/lib/plan/agent/planner.ts`: deterministic scoring, capacity calculation, gap assignment, overflow/risk output.
- Create `apps/web/lib/plan/agent/persist.ts`: writes pending AI blocks to `calendar_events` and records `daily_plan_agent_runs`.
- Create `apps/web/lib/plan/agent/index.ts`: public `generateAgenticDailyPlan` facade.
- Create `apps/web/lib/plan/agent/__tests__/normalizer.test.ts`, `planner.test.ts`, `gatherers.test.ts`, and `persist.test.ts`.
- Modify `apps/web/lib/ai/generate-daily-plan.ts`: delegate to the agent facade while preserving the existing exported function contract.
- Modify `apps/web/lib/plan/day-plan.ts`: expose metadata fields needed by the UI: confidence, source ids, factor labels, planner version.
- Modify `apps/web/lib/plan/get-day-plan-data.ts`: return capacity, risks, source influence, run summary, and concrete overflow list.
- Modify `apps/web/components/daily-plan/*`: replace the current tab-heavy consumer layout with an enterprise command center.
- Add `supabase/migrations/20260703120000_daily_plan_agent_runs.sql`: run snapshot table with RLS.

---

### Task 1: Agent Types And Normalization

**Files:**
- Create: `apps/web/lib/plan/agent/types.ts`
- Create: `apps/web/lib/plan/agent/normalizer.ts`
- Test: `apps/web/lib/plan/agent/__tests__/normalizer.test.ts`

- [ ] **Step 1: Define agent types**

```ts
export type DailyPlanSource =
  | 'task'
  | 'canvas'
  | 'google_calendar'
  | 'notion'
  | 'slack'
  | 'linear';

export interface DailyPlanCandidateItem {
  id: string;
  source: DailyPlanSource;
  title: string;
  description: string | null;
  dueAt: string | null;
  startAt: string | null;
  endAt: string | null;
  estimatedMinutes: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string | null;
  url: string | null;
  rawSourceId: string | null;
  confidenceSignals: string[];
}

export interface DailyPlanDraftBlock {
  candidateId: string;
  source: DailyPlanSource;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  reason: string;
  confidence: number;
  confidenceFactors: string[];
  constraintsUsed: string[];
  url: string | null;
}
```

- [ ] **Step 2: Write normalizer tests**

Run: `npm test --workspace planevo -- --run apps/web/lib/plan/agent/__tests__/normalizer.test.ts`

Expected first run: FAIL because `normalizeDailyPlanCandidates` does not exist.

- [ ] **Step 3: Implement normalizer**

Implement `normalizeDailyPlanCandidates({ tasks, canvasAssignments, sourceItems })` so it:
- excludes completed/closed/cancelled source items using the existing `isOpenSourceItem` semantics;
- maps Canvas assignment due dates and course metadata;
- maps Slack items as low/medium priority unless explicitly marked urgent in text;
- maps Linear priority from normalized `priority`;
- maps Notion date/status from `source_items`;
- defaults missing durations to the user scheduling default or 45 minutes.

- [ ] **Step 4: Verify**

Run: `npm test --workspace planevo -- --run apps/web/lib/plan/agent/__tests__/normalizer.test.ts`

Expected: PASS.

---

### Task 2: Agent Run Snapshot Table

**Files:**
- Create: `supabase/migrations/20260703120000_daily_plan_agent_runs.sql`
- Create: `apps/web/lib/plan/agent/persist.ts`
- Test: `apps/web/lib/plan/agent/__tests__/persist.test.ts`

- [ ] **Step 1: Add migration**

```sql
CREATE TABLE IF NOT EXISTS public.daily_plan_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  planner_version text NOT NULL,
  trigger text NOT NULL CHECK (trigger IN ('cron', 'manual', 'reshuffle', 'bruno-agent')),
  status text NOT NULL CHECK (status IN ('running', 'success', 'failed', 'skipped')),
  input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);

CREATE INDEX IF NOT EXISTS daily_plan_agent_runs_user_date_idx
  ON public.daily_plan_agent_runs (user_id, local_date, created_at DESC);

ALTER TABLE public.daily_plan_agent_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own daily plan agent runs"
  ON public.daily_plan_agent_runs;
CREATE POLICY "Users can view own daily plan agent runs"
  ON public.daily_plan_agent_runs
  FOR SELECT
  USING (auth.uid() = user_id);
```

- [ ] **Step 2: Implement run persistence helpers**

Add `startDailyPlanAgentRun`, `finishDailyPlanAgentRun`, and `failDailyPlanAgentRun` using `supabaseAdmin`.

- [ ] **Step 3: Verify helper shape with unit tests**

Run: `npm test --workspace planevo -- --run apps/web/lib/plan/agent/__tests__/persist.test.ts`

Expected: PASS with mocked Supabase insert/update chains.

---

### Task 3: Gatherers

**Files:**
- Create: `apps/web/lib/plan/agent/gatherers.ts`
- Test: `apps/web/lib/plan/agent/__tests__/gatherers.test.ts`

- [ ] **Step 1: Implement gathered context shape**

Gather:
- `users`: name, timezone scheduling prefs, energy preference, notification prefs;
- `tasks`: incomplete, not deleted;
- `calendar_events`: fixed and existing AI blocks in the requested local day;
- `source_items`: Canvas, Notion, Slack, Linear, not deleted;
- `canvas_assignments`: fallback only when Canvas `source_items` are absent;
- `integration_accounts_public`: provider statuses.

- [ ] **Step 2: Add source freshness labels**

Expose per-provider freshness:

```ts
{
  provider: 'notion',
  connected: true,
  lastSyncedAt: '2026-07-03T15:00:00.000Z',
  itemCount: 7,
  stale: false
}
```

- [ ] **Step 3: Verify user ownership filters**

Run: `npm test --workspace planevo -- --run apps/web/lib/plan/agent/__tests__/gatherers.test.ts`

Expected: PASS; every query includes `.eq('user_id', userId)` where the table has `user_id`.

---

### Task 4: Deterministic Planner

**Files:**
- Create: `apps/web/lib/plan/agent/planner.ts`
- Test: `apps/web/lib/plan/agent/__tests__/planner.test.ts`

- [ ] **Step 1: Implement scoring**

Score candidates by:
- due today: `+45`
- due within 3 days: `+30`
- due within 7 days: `+18`
- urgent priority: `+35`
- high priority: `+24`
- Linear issue high/urgent: `+18`
- Slack item with direct ask/question mark/user mention: `+10`
- missing due date: `-8`
- estimated duration larger than largest open gap: `-20`

- [ ] **Step 2: Implement capacity**

Calculate:
- fixed busy minutes;
- available focus minutes;
- planned focus minutes;
- buffer minutes;
- overflow count;
- overload status: `healthy`, `tight`, `overloaded`.

- [ ] **Step 3: Implement gap assignment**

Place candidates into gaps without overlap, preserve fixed events, add 10 minute buffers after meetings when the next focus block starts within 15 minutes, and produce overflow reasons for skipped candidates.

- [ ] **Step 4: Verify planner cases**

Run: `npm test --workspace planevo -- --run apps/web/lib/plan/agent/__tests__/planner.test.ts`

Expected: PASS for deadline ordering, fixed-event preservation, buffer insertion, overflow reasons, and no overlap.

---

### Task 5: Generation Facade

**Files:**
- Create: `apps/web/lib/plan/agent/index.ts`
- Modify: `apps/web/lib/ai/generate-daily-plan.ts`
- Test: `apps/web/app/api/ai/daily-plan/__tests__/route.test.ts`
- Test: `apps/web/lib/plan/agent/__tests__/planner.test.ts`

- [ ] **Step 1: Implement `generateAgenticDailyPlan`**

Flow:
1. Start run snapshot.
2. Gather context.
3. Normalize candidates.
4. Build deterministic draft.
5. If `OPENAI_API_KEY` exists, ask model only to rewrite reasons and summary within the deterministic block times.
6. Re-validate every start/end against gaps.
7. Delete only pending AI blocks for the date.
8. Insert pending `calendar_events` with metadata explanation.
9. Finish run snapshot.

- [ ] **Step 2: Preserve public return contract**

`generateDailyPlan` must still return:

```ts
{
  ok: true,
  plan,
  overflow,
  summary,
  message,
  energyLevel,
  focusScore,
  vibe
}
```

- [ ] **Step 3: Verify route compatibility**

Run: `npm test --workspace planevo -- --run apps/web/app/api/ai/daily-plan/__tests__/route.test.ts`

Expected: PASS without changing the API response shape.

---

### Task 6: Page Data For Enterprise UI

**Files:**
- Modify: `apps/web/lib/plan/day-plan.ts`
- Modify: `apps/web/lib/plan/get-day-plan-data.ts`
- Test: `apps/web/lib/plan/__tests__/plan.test.ts`

- [ ] **Step 1: Extend `DayPlanBlock` metadata**

Add:
- `confidence?: number`
- `confidenceFactors: string[]`
- `sourceIds: string[]`
- `constraintsUsed: string[]`
- `plannerVersion?: string`

- [ ] **Step 2: Extend page data**

Return:
- `capacity`
- `risks`
- `sourceInfluence`
- `overflowItems`
- `latestAgentRun`

- [ ] **Step 3: Verify mapping**

Run: `npm test --workspace planevo -- --run apps/web/lib/plan/__tests__/plan.test.ts`

Expected: PASS with added assertions for metadata extraction and overflow item shape.

---

### Task 7: Daily Plan Command Center UI

**Files:**
- Modify: `apps/web/components/daily-plan/DailyPlanView.tsx`
- Modify: `apps/web/components/daily-plan/PlanHeader.tsx`
- Modify: `apps/web/components/daily-plan/DailyPlanTabs.tsx`
- Modify: `apps/web/components/daily-plan/PlanBlockCard.tsx`
- Create: `apps/web/components/daily-plan/CapacityStrip.tsx`
- Create: `apps/web/components/daily-plan/SourceInfluencePanel.tsx`
- Create: `apps/web/components/daily-plan/RiskQueue.tsx`
- Create: `apps/web/components/daily-plan/AgentRunPanel.tsx`

- [ ] **Step 1: Replace consumer header with operational summary**

Header should answer:
- what to do now;
- whether the day is healthy/tight/overloaded;
- what changed since last run;
- primary actions: Accept plan, Rebalance, Ask Bruno.

- [ ] **Step 2: Replace tab-first layout**

Desktop layout:
- left/main: time-ordered plan timeline;
- right rail: capacity, risks, source influence, latest run state.

Mobile layout:
- single column: now card, timeline, risks, source influence.

- [ ] **Step 3: Make every AI block explainable**

Each plan block shows:
- source badge;
- reason;
- confidence;
- factors;
- actions: accept, wrong time, move later, ask Bruno.

- [ ] **Step 4: Preserve existing affordances**

Keep:
- `Adjust with Bruno`;
- accept all;
- per-block accept/reject;
- regenerate;
- source item details;
- `useRegisterBrunoContext`.

---

### Task 8: Bruno Context And Confirmation

**Files:**
- Modify: `apps/web/components/daily-plan/DailyPlanView.tsx`
- Modify: `apps/web/lib/bruno/tools/readTools.ts`
- Modify: `apps/web/lib/bruno/executeAction.ts`
- Test: `apps/web/lib/bruno/__tests__/readTools.test.ts`
- Test: `apps/web/lib/bruno/__tests__/executeAction.test.ts`

- [ ] **Step 1: Enrich Daily Plan page context**

Include compact:
- capacity;
- risks;
- source influence;
- overflow item titles;
- latest run status;
- visible plan blocks.

- [ ] **Step 2: Extend Bruno `get_daily_plan`**

Return capacity and explanation metadata without exposing raw provider payloads.

- [ ] **Step 3: Keep mutations confirmed**

`UPDATE_DAILY_PLAN` continues to support accept/reject/regenerate. New external write-backs are not added in this rebuild.

- [ ] **Step 4: Verify**

Run:

```bash
npm test --workspace planevo -- --run apps/web/lib/bruno/__tests__/readTools.test.ts apps/web/lib/bruno/__tests__/executeAction.test.ts
```

Expected: PASS.

---

### Task 9: Verification

**Files:**
- No new files unless tests expose a defect.

- [ ] **Step 1: Focused test suite**

Run:

```bash
npm test --workspace planevo -- --run apps/web/lib/plan apps/web/app/api/ai/daily-plan apps/web/lib/bruno
```

Expected: PASS, or report pre-existing unrelated failures separately.

- [ ] **Step 2: Typecheck**

Run:

```bash
npm run typecheck --workspace planevo
```

Expected: PASS, or report baseline failures separately from touched files.

- [ ] **Step 3: Manual web verification**

Run the web app and open `/dashboard/daily-plan`. Verify:
- disconnected provider states;
- connected provider source influence;
- no overlapping plan blocks;
- accept all updates timeline state;
- ask Bruno opens the global overlay with Daily Plan context;
- regenerate creates pending blocks and explains why each one exists.

