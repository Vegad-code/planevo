# ADR-002: Bruno model routing with cost-safe fallbacks

## Status

Accepted

## Context

Bruno serves free and Pro users with different AI capabilities. Uncontrolled model routing can explode OpenAI costs and degrade latency for simple requests.

## Decision

1. Route messages through a **classifier** that selects `basic_chat`, `deep_reasoning`, or tool-heavy modes based on intent and plan tier.
2. On classifier failure, **fall back to `basic_chat`** (never fail the user request).
3. Enforce quotas via `ai_usage_logs` (server-only writes) and `reserve_bruno_deep_access` RPC for deep routes.
4. Log routing decisions to `bruno_route_events` and `bruno_tool_logs` for audit.

## Consequences

- Free users retain useful chat via cheaper models and deterministic fallbacks (`/api/bruno/fallback/breakdown`).
- Pro gating is enforced in application code and DB RPCs, not only in prompts.
- Routing changes require updates to tests in `lib/bruno/__tests__/`.

## References

- [PLANEVO_BRUNO_ROUTING_IMPLEMENTATION_LAUNCH_SAFE.md](../PLANEVO_BRUNO_ROUTING_IMPLEMENTATION_LAUNCH_SAFE.md)
- [lib/bruno/routeMessage.ts](../../apps/web/lib/bruno/routeMessage.ts)
