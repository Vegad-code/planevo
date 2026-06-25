# ADR-001: calendar_events as canonical schedule source

## Status

Accepted

## Context

Planevo historically stored daily plans in both `schedules` (snapshot logs) and `calendar_events` (live blocks). Dashboard rendering and Bruno tooling need a single source of truth to avoid drift, duplicate blocks, and inconsistent AI scheduling.

## Decision

**`calendar_events` is the canonical source of truth** for all live plan rendering, scheduling mutations, and Bruno calendar tools. The `schedules` table remains for historical snapshots only and must not be read for active dashboard views.

## Consequences

- All new scheduling features write to `calendar_events`.
- Migrations and Bruno tools target `calendar_events` lifecycle states (`pending_ai`, `accepted`, `confirmed`, etc.).
- `schedules` may be deprecated or used only for audit/history exports.

## References

- [LAUNCH_CHECKLIST.md](../../LAUNCH_CHECKLIST.md)
- [CLAUDE.md](../../CLAUDE.md)
