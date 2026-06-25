# ADR-003: Dual auth model (cookies + Bearer)

## Status

Accepted

## Context

Planevo ships a Next.js web app (cookie sessions) and an Expo mobile app (Bearer tokens). Middleware cannot enforce auth on all `/api` routes without breaking mobile clients.

## Decision

1. **Web:** Supabase SSR cookies; middleware refreshes sessions via `getUser()`.
2. **Mobile:** `Authorization: Bearer <access_token>` on API routes.
3. API routes use `getAuthenticatedUser()` / `createAuthenticatedSupabaseClient()` to accept either method.
4. **Origin guard** on mutating routes for CSRF protection; Bearer requests bypass origin checks.
5. **Never** use `getSession()` on the server for authorization decisions.

## Consequences

- Each API route must call auth helpers explicitly (middleware does not gate `/api/*`).
- Mobile stores tokens in `expo-secure-store` with `autoRefreshToken: true`.
- Security reviews must verify every new API route authenticates correctly.

## References

- [lib/auth/get-user.ts](../../apps/web/lib/auth/get-user.ts)
- [lib/auth/origin-guard.ts](../../apps/web/lib/auth/origin-guard.ts)
