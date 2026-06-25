# Security data flow

High-level view of authentication, integration secrets, and privileged server access.

## Auth flow (cookie + Bearer)

```mermaid
sequenceDiagram
  participant Browser
  participant Next as Next.js App Router
  participant Supabase as Supabase Auth

  Browser->>Next: POST /api/auth/sign-in (Origin guard)
  Next->>Supabase: signInWithPassword
  Supabase-->>Next: session JWT + refresh
  Next-->>Browser: HttpOnly cookies (SSR)

  Browser->>Next: GET /dashboard (RSC)
  Next->>Supabase: getUser() server-side
  alt no user
    Next-->>Browser: redirect /login
  else authenticated
    Next-->>Browser: dashboard HTML
  end

  Note over Browser,Next: Mobile uses Bearer on API routes via isAllowedOriginOrBearer
```

## Integration token boundary

```mermaid
flowchart LR
  subgraph client [Client]
    UI[Dashboard UI]
  end
  subgraph server [Server only]
    API[API routes / server actions]
    Crypto[lib/crypto encrypt/decrypt]
    SR[service_role Supabase client]
  end
  subgraph db [Postgres]
    Base[integration_accounts]
    Pub[integration_accounts_public view]
  end

  UI -->|metadata only| Pub
  API --> SR
  SR --> Base
  API --> Crypto
  Crypto -->|plaintext in memory only| API
```

- Ciphertext columns are revoked from `authenticated` role.
- UI shows masked placeholders (`••••last4`).
- Re-encryption maintenance: `scripts/reencrypt-integration-tokens.mjs`.

## service_role usage map

| Area | Path |
|------|------|
| Integration sync | `lib/integrations/*`, cron routes |
| Bruno tool execution | `app/api/bruno/*`, `lib/bruno/*` |
| Account deletion | `dashboard/settings/danger/actions.ts` |
| Security audit log | `lib/security-audit.ts` |
| AI quota admin RPC | `lib/auth/rateLimit.ts` |
| Data retention cron | `app/api/cron/data-retention` |

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or `NEXT_PUBLIC_*` env vars.

## References

- [SECURITY.md](../../SECURITY.md)
- [ADR-004](../adr/004-integration-token-encryption.md)
- [SECRET_ROTATION.md](../SECRET_ROTATION.md)
