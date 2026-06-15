# Bruno V2 Launch Runbook

Bruno V2 is disabled by default. Deploying the code does not enable the new
router or grant usable Deep Bruno access until the migration and flags are
configured.

## Pre-Rollout Checklist (Code Fixes)
Before applying the migration and turning on flags, the following code fixes need to be applied to the V2 implementation:
- [x] **Remove Hardcoded Email:** Extracted to `BRUNO_ADMIN_EMAILS` env variable in `handleChatV2.ts`. Add `BRUNO_ADMIN_EMAILS=jabbouranthony720@gmail.com` to your Vercel/local `.env`.
- [x] **Fix Null-Model Guard:** `handleChatV2.ts` now correctly distinguishes `unsafe` (safety response) from other null-model scenarios (falls back to Standard model).
- [x] **Tighten Coding Regex:** Updated `detectObviousMode.ts` so generic words like "code" don't trigger coding help mode. Now requires specific terms like "codebase", "source code", "programming", "coding".
- [x] **Wire Up to Main Route:** Already integrated — `route.ts` line 197 calls `handleBrunoChatV2` when `routingV2Enabled` is true.
- [x] **Build UI Components:** Already built — `BrunoEntitlementNotice.tsx` renders upgrade/warning/cap cards, `BrunoChatSidebar.tsx` filters and displays data parts.

## 1. Apply The Migration

Apply:

`apps/web/lib/supabase/migration_v22_bruno_routing_usage.sql`

The migration:

- Extends `ai_usage_logs` with route, token, cost, latency, and status fields.
- Creates backend-written route events and the Deep Bruno credit ledger.
- Grants three lifetime onboarding credits to existing and future users.
- Adds atomic, idempotent reserve and refund functions.
- Removes authenticated client write access to usage and credit tables.

Run Supabase security and performance advisors after applying it.

## 2. Start With Internal Routing

Keep the public switch off and add internal user IDs:

```env
BRUNO_ROUTING_V2_ENABLED=false
BRUNO_ROUTING_INTERNAL_USER_IDS=user-uuid-1,user-uuid-2
BRUNO_LLM_ROUTER_ENABLED=true
BRUNO_UPGRADE_CARDS_ENABLED=true
BRUNO_DEEP_CREDITS_ENABLED=true
```

Optional model overrides:

```env
BRUNO_ROUTER_MODEL=gpt-5.4-nano
BRUNO_STANDARD_MODEL=gpt-4o-mini
BRUNO_MEDIUM_MODEL=gpt-5.4-nano
BRUNO_DEEP_MODEL=gpt-5.4-mini
```

## 3. Verify Internal Traffic

Test app actions, daily planning, deadline rescue, tutoring, coding help,
emotional recovery, crisis language, a free user with credits, a free user
without credits, and a Pro user near the monthly cap.

Confirm:

- `bruno_route_events` receives one row per V2 request.
- `ai_usage_logs.status` changes from `reserved` to `completed` or `failed`.
- Failed deep calls receive an idempotent refund ledger row.
- Upgrade cards are UI data parts, not generated chat copy.
- App actions continue to require confirmation before mutation.

## 4. Public Rollout

After internal logs and costs look correct:

```env
BRUNO_ROUTING_V2_ENABLED=true
```

Keep the remaining flags independent so the LLM router, upgrade cards, or free
Deep credits can be disabled without rolling back the route implementation.
