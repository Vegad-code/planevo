# Settings Implementation Tasks Tracker

This document serves as the official execution tracker for the Settings and AntiGravity implementation plan. Use this tracker to mark progress across all phases.

## Reference Documents
Always reference back to these core documents during execution:
- [Diagnostic & Plan Document](../SETTINGS_DIAGNOSTIC_AND_ANTIGRAVITY_PLAN.md)
- [Product SSOT](../apps/web/STRATEGY.md)

## Global Engineering Rules (Applies to all phases)
- **Migrations & Schema:**
  - [ ] For every new table: Add RLS policies, add indexes, test owner-only access, and update generated Supabase types.
  - [ ] **Migration Naming Rule:** Use idempotent migrations with a clear naming convention (e.g., `migration_v14_settings_foundation.sql`), avoiding ad hoc schema edits.
  - [ ] **Rollback/Compatibility Rule:** Do not break existing users while migrating fields (especially for `users.scheduling_preferences` or Canvas/Google). Write fallback/sync layers where necessary.
- **Visual QA:**
  - [ ] For any settings UI changes, require desktop and mobile screenshots for both light and dark mode to verify visual integrity.
- **Analytics:**
  - [ ] Track non-sensitive events carefully (e.g., settings saves, integration connect/disconnect, notification opt-in, billing portal open, export, delete intent). NEVER track sensitive pasted LLM import contents or integration tokens.

---

## Phase 0: Guardrails & Prerequisites
- [x] Acknowledge guardrails: Do not change app code until this settings plan is accepted.
- [x] Verify server actions or API routes are used for sensitive operations.
- [x] Verify no stored tokens are exposed to client components.
- [x] Setup feature flags for integrations not yet production-ready.

---

## Phase 1: Settings Foundation
**Files to Read First:**
- `apps/web/app/dashboard/settings/layout.tsx`
- `apps/web/components/settings/SettingsSidebar.tsx`
- `apps/web/components/settings/SettingsSearch.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/ui/ThemeToggle.tsx`

**Tasks:**
- [x] Create settings registry (`apps/web/lib/settings/registry.ts`).
- [x] Create reusable settings UI primitives (`SettingsSection`, `SettingsRow`, `SettingsToggleRow`, etc.).
- [x] Update `SettingsSidebar` and `SettingsSearch` to read from registry.
- [x] Replace hard-coded badges (e.g., live integration count, membership plan status).
- [x] Convert hard-coded settings colors to semantic tokens (CSS variables or Tailwind theme tokens).
- [x] Fix encoding artifacts across settings files (replace mojibake).
- [x] Implement mobile-responsive behavior for the sidebar and settings cards.

**Acceptance Criteria:**
- [x] Every tab and search result comes from the same registry.
- [x] No settings badge is hard-coded.
- [x] Switching themes affects settings without breaking contrast.
- [x] No mojibake in UI.
- [x] Mobile views are usable.

---

## Phase 2: Profile
**Files to Read First:**
- `apps/web/app/dashboard/settings/profile/page.tsx`
- `apps/web/app/dashboard/settings/profile/actions.ts`
- `apps/web/components/settings/ProfileForm.tsx`
- `apps/web/types/database.ts`

**Tasks:**
- [ ] Add migration for `user_profile_settings` (timezone, preferred name, school/work context, planning baseline).
- [ ] Create server actions for profile read/update.
- [ ] Build Profile UI with sections: Identity, School/Work Context, Planning Baseline, Account Security Summary.
- [ ] Update sidebar profile card to use live plan and initials.

**Acceptance Criteria:**
- [ ] User can save profile without full page reload.
- [ ] Bruno receives the updated preferred name, timezone, and planning baseline in prompt context.

---

## Phase 3: Calendar & Planning
**Files to Read First:**
- `apps/web/types/database.ts`
- `apps/web/app/dashboard/settings/calendar/page.tsx` if it exists; otherwise create it after checking settings routing

**Tasks:**
- [ ] Build Calendar & Planning settings UI to consolidate time-blocking behaviors.
- [ ] Add controls for: Default calendar view, day start/end, work/school hours, focus/avoided windows, break preferences, buffer between events, auto-schedule aggressiveness, rollover style, max planned minutes per day, weekly review time.
- [ ] Read and write data leveraging `calendar_preferences`, `user_ai_memory`, and safely migrating from `users.scheduling_preferences`.

**Acceptance Criteria:**
- [ ] Bruno and Daily Plan use these settings correctly.
- [ ] Calendar UI reflects these preferences without onboarding again.

---

## Phase 4: Bruno Preferences And LLM Import
**Files to Read First:**
- `apps/web/lib/ai/memory.ts`
- `apps/web/app/api/ai/chat/route.ts`
- `apps/web/app/dashboard/settings/bruno/page.tsx`

**Tasks:**
- [x] Build Bruno Preferences UI (Response Style, Length, Planning Personality, Proactivity, Detail Requirements).
- [x] Implement Memory Controls (view, edit, delete, reset).
- [x] Add LLM import parser route and review-before-save UI. Treat pasted text as untrusted. Parse only into an allowlisted schema. Never let pasted prompts override Bruno/system instructions. Discard raw pasted text by default. User must review before save.
- [x] Add server actions for memory read/update/delete.
- [x] Update `buildMemoryContext()` and adjust system prompt precedence to respect user preferences over general rules.

**Acceptance Criteria:**
- [x] Saving preferences visibly changes Bruno's answer style in chat.
- [x] Imported preferences require explicit confirmation and drop sensitive raw strings.

---

## Phase 5: Sources And Integrations
**Files to Read First:**
- `apps/web/components/settings/IntegrationsScreen.tsx`, `IntegrationCard.tsx`, `CanvasConnectModal.tsx`, `GoogleCalendarManageModal.tsx`
- `apps/web/lib/integrations/registry.ts`, `google-calendar.ts`
- `apps/web/lib/canvas/actions.ts`

**Tasks:**
- **Phase 5A: Generic Integration Lifecycle Tables**
  - [ ] Add database tables (`integration_accounts`, `integration_sources`, `source_items`, `integration_sync_runs`) with RLS, indexes, and updated types.
- **Phase 5B: Fix Canvas and Google Calendar**
  - [ ] Migrate Canvas and Google Calendar integrations to the new generic model safely, supporting existing connections.
  - [ ] Implement Canvas fixes (replace token flow, sync now, disconnect soft-delete, masked tokens - NO token exposure).
  - [ ] Implement Google Calendar fixes (store selected calendars in `integration_sources`, incremental sync, read vs write consent separation).
  - [ ] Add sync logs and status displays to Integration cards.
  - [ ] Verify Google OAuth scopes match actual behavior: read-only import unless user explicitly enables write-back.
- **Phase 5C: Waitlist States**
  - [ ] Set up waitlist/request states for Notion, Slack, and Linear.
  - **HARD GATE:** Do not ship Phase 5D (actual implementation) until Canvas and Google sync are proven robust and trustworthy.
- **Phase 5D: Notion, Slack, Linear Implementation (Later)**
  - [ ] **Notion:** Implement OAuth, database/page picker, property mapping, and import only selected databases/items.
  - [ ] **Slack:** Implement slash command, message shortcut, and app mention. Do NOT scrape full channels.
  - [ ] **Linear:** Implement OAuth, fetch assigned issues only, filter by project/team, and setup webhook sync.

**Acceptance Criteria:**
- [ ] UI list and backend registry are 1-1.
- [ ] Every integration has manage, sync, disconnect, and delete-imported controls.
- [ ] NO tokens exposed client-side.

---

## Phase 6: Notifications
**Files to Read First:**
- `apps/web/app/dashboard/settings/notifications/page.tsx`
- `apps/web/app/api/notifications/push/route.ts`, `apps/web/app/api/cron/deadline-rescue/route.ts`
- `apps/mobile/app/(tabs)/settings.tsx`, `apps/mobile/lib/notifications.ts`

**Tasks:**
- [ ] Add `notification_preferences` JSONB model to the database with RLS.
- [x] Use Expo for mobile push. Implemented Resend email notifications as alternative to Web Push.
- [ ] Build web settings UI for Notification Preferences (master toggle, channels, quiet hours, timing, types).
- [ ] Update mobile toggle to respect preferences.
- [ ] Implement deep-link payload handling for pushes.
- [ ] Add server-side quiet-hours filtering before sending pushes.
- [ ] Build a "send test notification" feature and stale token cleanup logic.

**Acceptance Criteria:**
- [ ] Toggling a notification accurately persists.
- [ ] Test push successfully delivers on mobile.
- [ ] Push taps open the expected deep-link screen.
- [ ] Server correctly filters by quiet-hours.

---

## Phase 7: Membership
**Files to Read First:**
- `apps/web/app/dashboard/settings/membership/page.tsx`
- `apps/web/lib/stripe.ts`
- `apps/web/app/api/stripe/checkout/route.ts`, `portal/route.ts`, `webhook/route.ts`
- `apps/web/hooks/use-subscription.ts`

**Tasks:**
- [x] Load live subscription fields from `users` (plan type, status, trial end, Stripe details).
- [x] Build Current Plan Summary UI using extensive billing states (`cancel_at_period_end`, renewal date, failed payment / `past_due`, trial end).
- [x] Add Plan Actions (upgrade CTA, manage billing portal link).
- [x] Add Stripe Customer Portal integration for cancel/renew flows. Set portal return URL to go back to `/dashboard/settings/membership`.
- [x] Update the Membership sidebar badge to reflect live status. Keep webhook as the definitive source of truth.

**Acceptance Criteria:**
- [x] Free users can upgrade.
- [x] Paid users can open billing portal and return safely.
- [x] Membership badge mirrors exact Stripe webhook state.

---

## Phase 8: Danger Zone
**Files to Read First:**
- `apps/web/app/dashboard/settings/danger/page.tsx`
- `apps/web/lib/supabase/admin.ts`
- `apps/web/app/api/stripe/*`
- `apps/web/lib/auth/*`

**Tasks:**
- [ ] Build the multi-step account deletion UI.
- [ ] Add export-before-delete reminder.
- [ ] Require typed confirmation.
- [ ] Explain retained Stripe invoice/legal records.
- [ ] Secure route with Auth + CSRF/origin guard and enforce service-role-only deletion.
- [ ] Revoke integration tokens where possible, delete/anonymize analytics identity if supported, delete Supabase auth user, and sign out.
- [ ] Handle active Stripe subscriptions (cancel/schedule cancellation) before account deletion.

**Acceptance Criteria:**
- [ ] Deletion requires typed confirmation.
- [ ] Subscriptions are canceled upstream before data disappears.
- [ ] Route rejects unauthenticated users, cross-origin/CSRF attempts, and attempts to delete any account other than the signed-in user.

---

## Phase 9: Appearance
**Files to Read First:**
- `apps/web/app/dashboard/settings/appearance/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/ui/ThemeToggle.tsx`, `ColorSchemeToggle.tsx`
- `apps/mobile/constants/Colors.ts`

**Tasks:**
- [ ] Define semantic tokens for settings UI in `apps/web/app/globals.css`.
- [ ] Implement Theme Mode (System, Light, Dark) using semantic tokens.
- [ ] Implement Color Themes (Warm Planevo, Forest, Ocean, Rose, High Contrast).
- [ ] Implement Density and Motion toggles.
- [ ] Add a live preview panel for theme/density.
- [ ] Ensure persistence across reloads and align mobile/web palette.

**Acceptance Criteria:**
- [ ] All tabs pass contrast/readability in both light and dark modes.
- [ ] Desktop and mobile screenshots are captured for Visual QA to verify theme accuracy.

---

## Phase 10: Data And Privacy
**Files to Read First:**
- `apps/web/app/dashboard/settings/privacy/page.tsx`
- `apps/web/app/privacy/page.tsx`, `terms/page.tsx`, `cookies/page.tsx`
- `apps/web/lib/ai/memory.ts`

**Tasks:**
- [ ] Add Privacy Center UI (links to Privacy Policy, Terms, Cookie Policy).
- [ ] Integrate actual Termly-generated policies (NO placeholders for launch).
- [ ] Clean up legacy links: Explicitly replace all old `planpilot.app` references/emails with Planevo-approved domains.
- [ ] Implement data export route (JSON/CSV).
- [ ] Implement AI memory delete/reset controls.
- [ ] Add controls to delete imported source data.
- [ ] Document what data is retained, deleted, or anonymized after account deletion.
- [ ] Add analytics consent toggle (if PostHog active).

**Acceptance Criteria:**
- [ ] All legal documents are real Termly content.
- [ ] No `planpilot.app` artifacts remain.
- [ ] Export downloads valid JSON/CSV.
- [ ] AI memory can be fully reset locally.

---

## Phase 11: Additional Features (Help & Feedback, Search Improvements)
- [ ] Build Help & Feedback UI (Contact support, bug reports, version info).
- [ ] **Pre-launch:** Set up `support@planevo.co` email address and connect to a helpdesk/AI service.
- [ ] Upgrade search functionality to index setting labels and synonyms.

**Acceptance Criteria:**
- [ ] Search result deep-links directly to a section, not just the parent tab.

---

## Global Verification Checklist
For every phase completed, execute the following checks:
- [ ] Visual QA: Desktop + Mobile screenshots acquired for Light/Dark modes (for UI phases).
- [ ] Run `npm run lint`
- [ ] Run `npm run typecheck` (or equivalent)
- [ ] Migration apply/rollback verified (ensure zero broken states for existing fields).
- [ ] Verify generated Supabase types update successfully.
- [ ] Execute Playwright settings smoke test.
- [ ] Perform mobile settings notification test (where applicable).
- [ ] Verify token exposure check for Canvas/Google (ensure NO sensitive tokens sent client-side).
