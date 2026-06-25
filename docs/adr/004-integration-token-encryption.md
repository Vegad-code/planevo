# ADR-004: Integration token encryption at rest

## Status

Accepted (updated 2026-06)

## Context

Users connect Canvas, Google Calendar, Composio, and other integrations. Storing third-party tokens in plaintext violates Planevo's security bar and compliance commitments.

## Decision

1. Encrypt integration tokens with **AES-256-GCM** before persisting (`ENCRYPTION_KEY`, 32-byte hex).
2. Expose **public views** (`integration_accounts_public`, `mcp_connections_public`) that hide ciphertext columns from `authenticated` clients.
3. Decrypt only in server-side code paths; never return raw tokens to the browser.
4. **No legacy plaintext reads in application code.** Run `scripts/reencrypt-integration-tokens.mjs` to migrate existing rows before deploy.

## Consequences

- Key rotation requires re-encryption — see [SECRET_ROTATION.md](../SECRET_ROTATION.md).
- Server-only `service_role` client is required for integration sync jobs.
- UI shows masked token placeholders only.

## References

- [lib/crypto.ts](../../apps/web/lib/crypto.ts)
- [scripts/reencrypt-integration-tokens.mjs](../../scripts/reencrypt-integration-tokens.mjs)
- [supabase/migrations/20260616140000_hide_integration_token_columns.sql](../supabase/migrations/20260616140000_hide_integration_token_columns.sql)
