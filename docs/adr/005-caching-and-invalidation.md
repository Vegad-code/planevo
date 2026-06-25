# ADR-005: Caching and invalidation

## Status

Accepted

## Context

Planevo mixes Next.js App Router caching, client fetches, and Postgres as source of truth. Integration secrets must never be cached in the browser.

## Decision

1. **Integration tokens:** `cache: 'no-store'` on all external API calls that use decrypted tokens. Never store plaintext tokens in `localStorage`, Zustand, or React state beyond masked UI placeholders.
2. **User-facing data:** Prefer server components + `revalidatePath` after mutations (settings, tasks, integrations).
3. **Rate limits:** `ip_rate_limit_buckets` and `ai_usage_logs` are DB-backed; purge via data-retention cron — not application memory.
4. **Static assets:** Vercel CDN defaults; no custom edge cache for authenticated HTML.
5. **OpenAI / Composio responses:** Do not cache LLM outputs across users; per-request only.

## Consequences

- Higher origin load on hot paths vs aggressive CDN caching — acceptable for authenticated app surfaces.
- Explicit `revalidatePath` required when adding new server-action settings flows.

## References

- [DATA_RETENTION.md](../DATA_RETENTION.md)
- [lib/http/resilient-fetch.ts](../../apps/web/lib/http/resilient-fetch.ts)
