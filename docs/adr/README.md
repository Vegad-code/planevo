# Architecture Decision Records

This directory contains formal ADRs for Planevo. Each record captures context, decision, and consequences.

| ADR | Title |
|-----|-------|
| [001](./001-calendar-events-canonical-source.md) | `calendar_events` as canonical schedule source |
| [002](./002-bruno-model-routing.md) | Bruno model routing with cost-safe fallbacks |
| [003](./003-dual-auth-cookies-and-bearer.md) | Dual auth model (cookies + Bearer) |
| [004](./004-integration-token-encryption.md) | Integration token encryption at rest |

API contracts are published in [../openapi.yaml](../openapi.yaml). Runtime Zod contracts are exported from [`apps/web/lib/api/openapi-schemas.ts`](../../apps/web/lib/api/openapi-schemas.ts).
