# Planevo Command — Build State (orchestration checkpoint)

> **STATUS (2026-07-05): Phases 0–9 + 11 COMPLETE and DEPLOYED to the live DB; Phase 10 deferred by design.**
> - Migration APPLIED to the live Supabase project `wuzignwkynhquevywbyd` (Planevo) via MCP: 5 tables + 20 RLS policies + 7 indexes + `ai_usage_logs.audio_seconds`. Security advisor shows no issues on the new tables. DB smoke test (intake→item→audit→board-read→cleanup) passed with zero leftover rows.
> - Local flags turned ON in `apps/web/.env.local` (`NEXT_PUBLIC_PLANEVO_COMMAND_ENABLED` + voice/source/schedule). Dev server verified: `/dashboard/command` renders (307→login when unauthed), all Command API routes compile + run + enforce the origin guard (403), no 404/500, clean dev log.
> - Verified static: web `tsc` 0 errors, 85 Command tests green, 255 Bruno tests green, mobile `tsc` 0 errors.
>
> **Remaining (optional / ops):** (1) regenerate the `Database` type from the live schema and delete the `lib/command/db.ts` cast (app already typechecks with it); (2) set the same flags in Vercel/Expo prod env when ready to launch; (3) `POST /api/command/backfill` per user to mirror existing tasks; (4) later flip `COMMAND_IS_HOME`; (5) drive the authenticated happy-path in a browser (dump→preview→confirm→board) to watch a real extraction — needs a logged-in session.

> **This file is the single source of truth for the Command build.**
> If the session died (usage limit, crash) and the user says **"continue"**:
> 1. Read this file top to bottom.
> 2. Run `git -C /Users/jabbo/M1plan/planevo status && git diff --stat` to see actual work on disk.
> 3. Resume from the first unchecked item in **Task Board** below. Verify before re-doing anything.
> 4. Update this file after every checkpoint. Append progress to `comprehensive.md` §43 (Build Log) at phase boundaries.
>
> **Orchestration note:** builder subagents (Opus, then Sonnet) repeatedly died on the account usage/session limit; the orchestrator (Fable, then Opus 4.8) built the remainder directly each time. If agents keep dying on limits, build directly rather than re-launching into the same dead quota.

**Plan:** `planevo/docs/superpowers/plans/comprehensive.md` (authoritative)
**Orchestrator:** Fable (main session). **Builders:** Opus subagents, checked by Fable; Fable rebuilds anything below bar.
**Branch:** working directly on `main` working tree (no commits until user asks).

## Binding decisions made this build

- **Liquid glass reconciliation:** §26.1 bans glassmorphism *on the board rows*. User asked for liquid glass. Resolution: existing `GlassPanel`/`glass-sheet`/`glass-card` components are used ONLY on the planes §26.1 allows as boxed surfaces — capture band, preview panel, Bruno rail, sheets/modals. Rows stay dense typographic (Things 3 / Linear reference). Glass = chrome; typography = content.
- Flags added to `apps/web/lib/featureFlags.ts`: `PLANEVO_COMMAND`, `COMMAND_VOICE`, `COMMAND_SOURCE_SYNC`, `COMMAND_SCHEDULE_BRIDGE`, `COMMAND_IS_HOME`, `COMMAND_DEBUG_COSTS` (all env-gated, default off).
- Migration lives in `planevo/supabase/migrations/` with timestamp naming (e.g. `20260704150000_planevo_command.sql`).
- Types/schema anchored by orchestrator first so parallel agents share one contract: `apps/web/lib/command/types.ts`, `apps/web/lib/command/schema.ts` — DONE, do not fork these shapes.

## Task Board

### Phase 0 — Recon & foundation (orchestrator) ✅
- [x] Full plan read; recon of nav (`components/dashboard/sidebar/shared.tsx:21`), Bruno hook (`components/bruno/BrunoProvider.tsx:92`), glass system (`components/ui/glass-panel.tsx`, `glass-sheet.tsx`, `app/globals.css`), migrations dir, `packages/nlp-core`, `lib/taskParser.ts`
- [x] `lib/command/types.ts` (domain + API contracts, §17/§20)
- [x] `lib/command/schema.ts` (Zod extraction schema, §18)
- [x] Feature flags added

### Phase 1 — Data layer ✅ DONE (verified)
- [x] Supabase migration `20260704150000_planevo_command.sql` — 5 tables + RLS + indexes + `ai_usage_logs` extension. (Subagent-authored, kept after review.)
- [x] `lib/command/board.ts` — deterministic sections + `computeUrgencyScore` + overdue decay + Now-cap overflow. (Orchestrator.)
- [x] `lib/command/__tests__/board.test.ts` — 17 tests passing.

### Phase 2 — Backend pipeline ✅ DONE (verified, orchestrator-built)
- [x] `lib/command/`: models, costs, usage, fastpath, extract, normalize, validate, persist, db
- [x] API routes: intake, confirm, board, items/[id] (auth + origin-guard + flag-gated)
- [x] Tests: extract (valid/retry→escalate/fallback) + usage (limit rejection, feature wiring) — 11 tests passing (28 total)

### Phase 3 — Web UI ✅ DONE (verified, orchestrator-built)
- [x] `app/dashboard/command/page.tsx` + all `components/command/*`
- [x] Nav swap Daily Plan → Command behind `PLANEVO_COMMAND` (Daily Plan route intact); `BrunoContextSource` +'command'
- [x] §26.1 compliance + glass-only-on-chrome honored; Bruno context registered via `useRegisterBrunoContext`
- [x] Verified: `tsc --noEmit` 0 errors (whole workspace), ESLint clean on Command source, 28/28 tests green

### Phase 4+ — QUEUED (core loop is complete + shippable behind flag)
- [ ] Apply migration in a real Supabase environment (needs DB access) + regenerate `Database` type, then drop `lib/command/db.ts` cast
- [ ] Phase 5: upgrade-CTA analytics events (PostHog events from §28)
- [ ] Phase 6: voice route (`api/command/voice` + `CommandVoiceButton`) behind `COMMAND_VOICE`
- [ ] Phase 7/7B: source panel (`source_items`) + Plan-My-Day schedule bridge (`schedule-bridge.ts`) behind `COMMAND_SCHEDULE_BRIDGE`
- [ ] Phase 8: Bruno action *execution* wiring (context registration already done)
- [ ] Phase 9: mobile Command
- [ ] Update `apps/web/STRATEGY.md` note (CLAUDE.md already references the transition)

## Agent check-in log

| When | Agent | Status | Verdict |
|---|---|---|---|
| 2026-07-04 | command-data | launched | — |
| 2026-07-04 | command-backend | launched | — |
| 2026-07-04 | command-ui | launched | — |

## Notes for resume

- Web workspace is Next.js 16 with breaking changes — agents must read `apps/web/node_modules/next/dist/docs/` guides before writing route/page code (per `apps/web/AGENTS.md`).
- Strict TS, no `any`; `npm run typecheck --workspace planevo` must pass.
- Do NOT delete/bypass Daily Plan internals; Command is additive behind flags.
- Do NOT add a second date parser — use `lib/bruno/dates.ts`.
- Usage logging extends `ai_usage_logs` via existing `costEstimator`/`usageService`; deep Bruno metering stays in the Bruno credit ledger.
