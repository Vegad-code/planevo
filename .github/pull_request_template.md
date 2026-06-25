## Summary

<!-- What changed and why -->

## Security checklist

- [ ] No secrets or API keys in source (`node scripts/ci-secret-grep.mjs`)
- [ ] Mutating API routes use Zod validation (`node scripts/ci-route-validation.mjs`)
- [ ] RLS considered for new tables / columns
- [ ] `service_role` used only server-side
- [ ] Integration tokens encrypted at rest (no `allowLegacyPlaintext`)
- [ ] Origin guard on cookie-authenticated routes that return sensitive data

## Test plan

- [ ] `npm run check` passes locally
- [ ] Relevant E2E / unit tests updated
