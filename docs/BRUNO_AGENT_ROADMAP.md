# Bruno Agentic Overhaul — Roadmap

Produced 2026-07-03 from a multi-agent deep-read of the Bruno pipeline (chat, execute path, tools, frontend, tests) plus research on current OpenAI models and AI SDK v6 capabilities.

## Diagnosis (why Bruno was bad at actions)

1. **Wrong model on the action path.** Every action-capable mode ran `gpt-4o-mini` (2024, no reasoning, pre-GPT-5 tool calling). The stronger models were reserved for pro-locked *advice* modes that never execute anything.
2. **Regex gates decided everything before any model saw the conversation.** `detectAppAction` (10 regexes over only the latest message) + an LLM router that was **off by default** meant anything phrased unusually fell to `basic_chat`: no context, 500 output tokens, 5 tool steps.
3. **Two pre-LLM hijacks ate action turns.** The deterministic LangGraph workflow marked turns "handled" even when it only emitted an ambiguity question (whose answer the regex parser could not parse — dead end), and the clarification card quizzed any non-basic-chat message ≤32 words instead of acting.
4. **The agent loop is severed at the propose/execute boundary.** `propose_action` returns "waiting for confirmation"; execution happens in a separate HTTP request whose outcome never re-enters the model loop. Bruno can't chain, verify, or recover.
5. **Validation at the wrong time.** One passthrough payload schema for 14 action types means invalid proposals surface *after* the user confirms; the execute route casts instead of parsing the discriminated union; two divergent date parsers ('tomorrow at 3pm' fails at execute time).

## Shipped (P1 + P2, this pass)

- **Models**: STANDARD/MEDIUM → `gpt-5.4-mini`, DEEP → `gpt-5.4`, router stays `gpt-5.4-nano`. All other AI surfaces (daily plan generator, schedule, insight, weekly review, fallback breakdown, titles) moved off `gpt-4o-mini`.
- **Responses API + reasoning effort** in `handleChatV2`: `openai.responses(model)` with `reasoningEffort: 'low'` ('medium' for deep tier / daily_planning / schedule_repair). Reasoning items now persist across tool steps.
- **Budgets**: maxOutputTokens raised (app_action/daily_planning/schedule_repair 900→4000, task_management 700→3000, basic_chat 500→2000, etc.); tool step limit flat 25 for every mode.
- **Flags default ON**: `BRUNO_ROUTING_V2_ENABLED` and `BRUNO_LLM_ROUTER_ENABLED` now default true (env value `false` is the kill switch). The V1 path (non-persisting propose_action) is no longer the production default.
- **Hijacks defanged**: the deterministic workflow only short-circuits when it produced concrete proposals; ambiguity text falls through to the agent. Clarification cards only fire for genuinely vague ≤8-word prompts at router confidence < 0.7.
- **Prompts**: new ACTION POLICY block (act decisively, compound requests, one focused question max, read-before-write); scheduling anchor + V3 execution rules now in **every** mode, not just app_action; notes mode keeps `propose_action`; stable-prefix ordering for the 10x cached-input discount.

## Shipped (P3 + P6 + P5 increments, second pass — 2026-07-03)

**P3 — validation, dates, compound plans (complete)**
- `lib/bruno/dates.ts`: one flexible date parser (`inferFlexibleEventDateTime`) handling relative expressions ('tomorrow at 3pm', 'next tuesday morning', 'tonight'); wired into `resolveTimeBlockTimes` and `enrichTimeBlockProposal`. Confirmed proposals no longer dead-end at execute time on relative dates.
- Per-action-type required fields enforced at **propose** time via `proposedActionSchema.superRefine` (UPDATE_TASK→taskId, UPDATE/DELETE_CALENDAR_EVENT→event identity, CREATE_TIME_BLOCK→startTime, notes→noteId, UPDATE_DAILY_PLAN→planAction) — the model gets an actionable error inside the loop and self-corrects. Execute-time re-parse stays lenient (`proposedActionBaseSchema`) so legacy proposals still run.
- Destructive invariants (riskLevel high + requiresConfirmation) forced in `coerceProposedActionInput` and normalized in `buildAuthorizedExecuteRequest`, which now **actually parses** `executeActionRequestSchema` instead of casting. The 24h `contains(type,title)` legacy proposal lookup is removed.
- **`APPLY_PLAN`** action type + **`propose_plan`** tool: one card for an ordered multi-step plan (≤20 steps), single confirm, sequential server-side execution with per-step results, ref-chaining (`ref` + `taskIdRef`/`eventIdRef`/`noteIdRef`/`linkedTaskIdRef`), halt-on-first-failure with partial progress reporting, per-step data-access gating in the execute route. Sidebar renders it via the server-shaped `proposal` in the tool output.

**P6 — availability awareness (complete)**
- New `find_availability` read tool wrapping `findGaps`: per-day free slots for a date range (≤14 days), work-hour bounds, min-duration filter; prompt instructs Bruno to check it before proposing blocks. `get_user_context` now returns `scheduling_preferences` + planning memory.

**P5 — increments shipped**
- Execution outcomes now land in the conversation: the execute route writes `✅ Done — <title>` / `⚠️ Couldn't complete…` assistant rows to `bruno_messages` (ownership-checked), so the next turn's model context and reloaded conversations both know what happened. The sidebar passes `conversationId` with execute calls.
- Daily Plan subscribes to `planevo:calendar-events-changed` / `planevo:tasks-changed` — executed actions refresh it without manual reload.
- Message-edit deletion anchors to the server row's `created_at` (was: client clock).
- Migration `20260703120000_bruno_messages_parts.sql` adds nullable `bruno_messages.parts` jsonb — groundwork for full parts persistence.

## Remaining workstreams

### P4 + P5(full) — Native `needsApproval` loop + parts persistence (do together)
**Key finding (2026-07-03):** AI SDK v6 native approval (`needsApproval` + `addToolApprovalResponse` — both verified present in installed packages) requires approval state to survive the client resubmission round-trip. But `resolveAuthoritativeChatMessages` deliberately discards all client-sent assistant/tool parts (anti-prompt-injection) and rebuilds text-only history from `bruno_messages`. **Full parts persistence is therefore a hard prerequisite, not a follow-up**:
1. Persist full UIMessage parts server-side on `onFinish` (the `parts` column already exists); rehydrate in `loadConversation` and `resolveAuthoritativeChatMessages` (server-side parts are trusted; client-sent parts remain ignored — approval responses matched against server-side pending approval records by approvalId).
2. Then flip write tools to `needsApproval: true` behind `BRUNO_AGENT_LOOP_ENABLED`; tool `execute()` = reservation → fresh ID re-resolution → `executeAction` → structured result into the loop. Skip quota re-reservation when a request is a pure approval continuation.
3. Then delete the sidebar's legacy extraction paths, the `/api/bruno/fallback/breakdown` band-aid, and share the message list with `BrunoChat.tsx` (which still renders dead "Executing Tool…" pills). Keep `/api/bruno/actions/execute` for mobile until it migrates.
4. Then retire the LangGraph `appActionWorkflow` + `@langchain/langgraph` (its regex path now only short-circuits when it produced concrete proposals; bulk moves increasingly flow through `apply_plan`).

### Smaller follow-ups
- Mobile: render `tool-propose_plan` parts (mobile `extractProposals` currently only knows `propose_action`).
- Shrink the static context dump in favor of on-demand reads (A/B via PostHog).
- Dashboard v4 shell: decide on a targeted refresh for executed actions (daily-plan + calendar are covered).

## Known gaps (candidates for new action types)
Task→block scheduling linkage, all-day events, recurring events/tasks, bulk complete, delete note, notebook management, reminders, Bruno-memory updates.

## Cost note
gpt-5.4-mini is $0.75/$4.50 per 1M tokens ($0.075 cached input). With the stable-prefix prompt ordering, effective input cost in multi-turn loops approaches old gpt-4o-mini levels. Monitor via the existing `costEstimator` + `bruno_usage` logs (estimator now prefix-matches dated snapshots).
