# Chaos playbook (manual)

Manual fault-injection steps to verify graceful degradation. No automated chaos tooling in v1.

## Preconditions

- Staging environment with production-like config
- On-call engineer available
- Sentry + Vercel dashboards open

## Scenarios

### 1. OpenAI unavailable

1. Set invalid `OPENAI_API_KEY` in staging Vercel env.
2. Redeploy.
3. **Expect:** Bruno chat returns user-visible error; no unhandled 500s; Sentry captures bounded errors.
4. Restore valid key and redeploy.

### 2. Cron secret mismatch

1. Change `CRON_SECRET` without redeploying cron routes.
2. Trigger `/api/cron/data-retention` manually.
3. **Expect:** 401; no data purge; alert in logs.
4. Fix secret and redeploy.

### 3. Supabase read-only / outage

1. Simulate by blocking outbound to Supabase IP (staging firewall) or pause project in dashboard (extreme).
2. **Expect:** Auth and dashboard fail closed; health checks surface errors.
3. Restore connectivity; verify no partial writes left inconsistent state.

### 4. Stripe webhook secret wrong

1. Roll webhook secret in Stripe without updating Vercel.
2. Send test event.
3. **Expect:** 401/400 on webhook; subscriptions unchanged.
4. Align secret and confirm event processing.

### 5. Integration token decrypt failure

1. Corrupt one `integration_accounts` ciphertext row in staging (backup first).
2. Run Google or Canvas sync for that user.
3. **Expect:** Sync marks account error; no plaintext token in client responses.

## Recovery verification

After each scenario:

- [ ] Core auth works
- [ ] Dashboard loads for test user
- [ ] No elevated error rate in Sentry (15 min window)
- [ ] Document findings in incident channel

## References

- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
- [SECRET_ROTATION.md](./SECRET_ROTATION.md)
