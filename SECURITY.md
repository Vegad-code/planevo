# Security Policy

## Reporting

Report security issues to **security@planevo.co** (or the address listed on the privacy page). Do not open public GitHub issues for undisclosed vulnerabilities.

## Secret handling

- Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `OPENAI_API_KEY`, `ENCRYPTION_KEY`, `CRON_SECRET`) must never use the `NEXT_PUBLIC_` prefix.
- Integration tokens are encrypted at rest with AES-256-GCM (`ENCRYPTION_KEY`). Legacy plaintext is rejected at decrypt time; run `node scripts/reencrypt-integration-tokens.mjs` before deploy if migrating old data.
- Rotate secrets using [docs/SECRET_ROTATION.md](docs/SECRET_ROTATION.md).
- Owner/admin bypass emails: `PLANEVO_OWNER_EMAILS` (comma-separated) or `BRUNO_ADMIN_EMAILS`.

## Dependency and secret scanning

- **Dependabot** opens weekly npm update PRs (`.github/dependabot.yml`).
- **CI** runs `node scripts/ci-audit.mjs` on every push/PR (production high/critical gate).
- **CI** runs `node scripts/ci-secret-grep.mjs` to block likely API keys in source.
- **CI** runs `node scripts/ci-route-validation.mjs` for Zod on mutating routes.
- Enable **GitHub secret scanning** and push protection on the repository (Settings → Code security).
- Overrides in root `package.json` pin patched transitive versions (`ws`, `undici`) where upstream has not yet released fixes.

## CSRF / origin guard

Cookie-authenticated routes that return or mutate sensitive data use `isAllowedOriginOrBearer` or `isAllowedOrigin`. Exceptions (webhooks, crons, OAuth callbacks) are listed in route allowlists and `scripts/ci-route-validation.mjs`.

## Audit and retention

- `security_audit_log` records account deletion, integration disconnect, sign-in failures, and Stripe portal opens.
- Operational retention: [docs/DATA_RETENTION.md](docs/DATA_RETENTION.md).

## Architecture

- [docs/architecture/SECURITY_DATA_FLOW.md](docs/architecture/SECURITY_DATA_FLOW.md)

## Known accepted risks

Review `npm audit` output after dependency changes. Transitive advisories tied to `next` or MCP tooling are tracked and upgraded via Dependabot rather than ignored silently.
