# Planevo Settings Diagnostic And AntiGravity Implementation Plan

> **Partially superseded (June 2026):** Appearance rebuild documented in [`apps/web/APPEARANCE_AUDIT.md`](../apps/web/APPEARANCE_AUDIT.md). Calendar & Planning settings map to the **availability model** (focus windows, work hours) in [`apps/web/STRATEGY.md`](../apps/web/STRATEGY.md). Re-audit remaining settings tabs before treating completion % as current.

Date: 2026-05-31
Scope: diagnostic and product/engineering handoff only. No app code should be changed by this document

## Executive Summary

Planevo's settings area has the right top-level categories, but only Profile and parts of Sources and Integrations are functional today. Bruno Preferences, Appearance, Notifications, Membership, Data and Privacy, and Danger Zone are placeholders. The current UI also hard-codes warm colors throughout the settings files, so dark/light mode and app-wide theme consistency cannot work until the settings area moves to shared design tokens.

The biggest settings problem is not that things say "coming soon." The bigger problem is that settings currently over-promise trust-sensitive behaviors without giving users enough control, status, or explanation. A productivity app with AI, school data, calendar data, push notifications, billing, and connected work tools needs settings to be the user's control room: what is connected, what is being read, when it syncs, what Bruno remembers, how notifications behave, what plan they are on, how to export/delete data, and how to revoke access.

AntiGravity should implement this one tab at a time, in this order:

1. Settings foundation: shared config, reusable cards/rows, theme tokens, mobile-responsive layout, search index.
2. Profile: better identity, timezone, school/work context, default planning profile.
3. Bruno Preferences: response style, scheduling behavior, memory controls, external LLM preference import.
4. Sources and Integrations: real integration lifecycle, status, sync logs, permissions, and premium gating.
5. Notifications: channel-level preferences and push permission lifecycle.
6. Membership: plan status, Stripe portal, upgrade/cancel/renew, invoices, trial state.
7. Data and Privacy: legal links, data map, export, AI memory controls, connected-source deletion.
8. Danger Zone: multi-step account deletion with subscription handling and final confirmation.
9. Appearance: light/dark/system mode, color theme, density, motion, and accessibility.
10. Optional new tabs: Calendar and Planning, Referrals, Help and Feedback, Developer/Diagnostics.

## Code Read

Primary files inspected:

- `apps/web/app/dashboard/settings/layout.tsx`
- `apps/web/components/settings/SettingsSidebar.tsx`
- `apps/web/components/settings/SettingsSearch.tsx`
- `apps/web/components/settings/ProfileForm.tsx`
- `apps/web/components/settings/IntegrationsScreen.tsx`
- `apps/web/components/settings/IntegrationCard.tsx`
- `apps/web/components/settings/CanvasConnectModal.tsx`
- `apps/web/components/settings/GoogleCalendarManageModal.tsx`
- `apps/web/app/dashboard/settings/profile/page.tsx`
- `apps/web/app/dashboard/settings/profile/actions.ts`
- `apps/web/app/dashboard/settings/bruno/page.tsx`
- `apps/web/app/dashboard/settings/appearance/page.tsx`
- `apps/web/app/dashboard/settings/notifications/page.tsx`
- `apps/web/app/dashboard/settings/membership/page.tsx`
- `apps/web/app/dashboard/settings/privacy/page.tsx`
- `apps/web/app/dashboard/settings/danger/page.tsx`
- `apps/web/lib/integrations/registry.ts`
- `apps/web/lib/integrations/google-calendar.ts`
- `apps/web/lib/canvas/actions.ts`
- `apps/web/lib/ai/memory.ts`
- `apps/web/app/api/ai/chat/route.ts`
- `apps/web/lib/stripe.ts`
- `apps/web/app/api/stripe/checkout/route.ts`
- `apps/web/app/api/stripe/portal/route.ts`
- `apps/web/app/api/stripe/webhook/route.ts`
- `apps/web/app/api/notifications/push/route.ts`
- `apps/web/app/api/cron/deadline-rescue/route.ts`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/lib/notifications.ts`
- `apps/web/app/privacy/page.tsx`
- `apps/web/app/terms/page.tsx`
- `apps/web/app/cookies/page.tsx`
- `apps/web/lib/supabase/schema.sql`
- `apps/web/types/database.ts`

## Current State Diagnosis

### What Works Today

- Settings layout exists with sidebar, header, search trigger, and routed tabs.
- Profile can save `name` and `energy_preference`.
- Canvas connection modal can test/save credentials and disconnect.
- Google Calendar connection uses Supabase OAuth, can manage selected calendars, sync now, and store sync frequency in `scheduling_preferences`.
- Stripe Checkout, Stripe Portal, and Stripe webhook scaffolding exist.
- Push token storage exists on `users` via `expo_push_token` and `push_notifications_enabled`.
- Mobile settings has a simple notifications toggle and profile/connection summary.
- `user_ai_memory` exists and already supports tone preference, planning style, focus windows, break preference, detail preference, learned rules, accepted/disliked patterns, and task preference learning.

### What Is Broken Or Too Thin

- Most settings pages are empty placeholders.
- Sidebar badges are hard-coded: `3 / 7` and `TRIAL - 11D` are not backed by live data.
- Settings pages hard-code warm hex colors, so the existing theme toggle cannot affect them.
- Several files show mojibake encoding artifacts around bullets, dashes, arrows, keyboard symbols, and emoji text. This is visible to users in settings copy.
- Profile is too small for an AI planning app. It only stores name and broad energy preference.
- Bruno Preferences page does not expose the memory system that already exists.
- The system prompt currently has fixed Bruno behavior, and user tone preferences only enter through `memoryContext`. There is no settings UI to control it.
- Sources and Integrations uses a UI-only integration list that is not aligned with `INTEGRATION_REGISTRY`.
- Notion, Slack, and Linear are visible as coming soon but have no waitlist state, no required scope explanation, no architecture, and no realistic sync path.
- Canvas token handling must never expose stored full tokens back to the client.
- Google Calendar OAuth requests `calendar.events`, which allows write access. If write-back is optional, the app should separate "read events" from "write Bruno blocks" consent.
- Notifications have a single boolean. Users need notification type, channel, quiet hours, timing, and tone controls.
- Membership page does not read live Stripe or DB status.
- Data and Privacy page does not expose export, AI memory reset, connected-source cleanup, or policy links.
- Danger Zone has no real delete-account flow.
- Public privacy/terms/cookies pages are stubs and still reference `planpilot.app` emails.
- Existing `schema.sql` appears duplicated/corrupted in parts. Do not rely on it blindly. Use migrations and generated types as the source of truth after verification.

## Competitor Settings Comparison

### Akiflow

Akiflow has a broad settings model: Account, AI Center, AI Workflows, Calendars, Integrations, Calendar Appearance, Tasks/Events/Slots, Share Availability, General Settings, Rituals, Shortcuts, and Notifications. This is the closest benchmark for Planevo because it treats settings as workflow configuration, not just account preferences.

What Planevo should copy:

- AI settings should be first-class, not hidden.
- Calendar and task defaults deserve their own preference area.
- Notifications should include reminders, sounds, and task/event controls.
- Shortcuts/search should help users find settings quickly.

Source: https://product.akiflow.com/en/help/articles/7791811-settings

### Sunsama

Sunsama organizes around daily planning, timeboxing, account/workspace settings, billing, security, and many integrations. Sunsama's Slack integration is especially relevant: it supports creating tasks from Slack messages, posting planning/shutdown notes, updating focus status, and pausing notifications during focus.

What Planevo should copy:

- Make integrations feel like workflow features, not just OAuth buttons.
- Let settings control planning rituals, timeboxing defaults, and focus behavior.
- For Slack, start with explicit "send to Planevo" actions and focus status before trying to ingest whole channels.

Sources:

- https://help.sunsama.com/docs/help
- https://help.sunsama.com/docs/integrations/slack/

### Motion

Motion's integration help positions integrations as capture and automation paths. It includes email-to-task, Siri Shortcuts, Zapier, and API options. Motion's notification help emphasizes cross-device task/update notifications and device-level troubleshooting.

What Planevo should copy:

- Add simple capture integrations before complex full sync.
- Explain when to use each integration path.
- Provide a "send test notification" and troubleshooting state.

Sources:

- https://www.usemotion.com/help/settings/integrations
- https://www.usemotion.com/help/settings/managing-notifications

### Todoist

Todoist's calendar integration flow is clear: connect calendar from settings, choose permissions, and see events alongside tasks. Todoist's calendar integration also syncs time-blocked tasks back to calendar for schedule mirroring.

What Planevo should copy:

- Calendar settings should be separate and explicit.
- Show what is imported, what is written back, and how to disable/re-enable.
- Make sync behavior predictable and easy to reset.

Source: https://get.todoist.help/hc/en-us/articles/13258169208860-Use-the-Calendar-Integration

## Recommended Settings Information Architecture

Use these tabs for the full product. Some can ship later, but the structure should be designed now.

### Core Tabs

1. Profile
2. Bruno Preferences
3. Sources and Integrations
4. Calendar and Planning
5. Notifications
6. Appearance
7. Membership
8. Data and Privacy
9. Danger Zone

### Optional Tabs

10. Referrals
11. Help and Feedback
12. Keyboard Shortcuts
13. Diagnostics

### Why Add Calendar and Planning

Right now `energy_preference` sits in Profile and Google sync frequency sits inside the Google modal. That will not scale. Planevo's core promise is scheduling. Users need one place for:

- working hours
- sleep/wake window
- preferred focus windows
- avoided windows
- default task duration
- break style
- calendar default view
- auto-scheduling aggressiveness
- rollover behavior
- buffer policy
- weekly planning/review defaults

Some of these already exist in `user_ai_memory` and `calendar_preferences`; the settings UI should expose them.

## Global Settings Foundation

### Problem

Settings content is split across hard-coded pages and ad hoc components. Search is a static list. Sidebar badges are hard-coded. Theme colors are hard-coded. This makes every future settings feature more fragile.

### Step-By-Step

1. Create a settings definition module:
   - Suggested file: `apps/web/lib/settings/registry.ts`
   - Include `id`, `label`, `path`, `keywords`, `description`, `badgeResolver`, `requiredPlan`, and `status`.

2. Update `SettingsSidebar` and `SettingsSearch` to read from this registry.

3. Replace hard-coded sidebar badges:
   - Integration badge: live connected count over available count.
   - Membership badge: live plan or trial days from `users.plan_type`, `trial_end`, `subscription_status`.

4. Create reusable settings UI primitives:
   - `SettingsSection`
   - `SettingsRow`
   - `SettingsToggleRow`
   - `SettingsSelectRow`
   - `SettingsCard`
   - `SettingsDangerCard`
   - `SettingsSaveBar`

5. Move all settings colors to CSS variables or Tailwind theme tokens.

6. Fix encoding artifacts across settings files:
   - Replace mojibake text with plain ASCII or valid Unicode.
   - Verify visible strings in screenshots and browser.

7. Add loading, error, empty, and success states to every tab.

8. Add mobile-responsive behavior:
   - Sidebar collapses into tabs/segmented menu on small screens.
   - Search remains accessible.
   - Cards stay readable without horizontal scroll.

### Acceptance Criteria

- Every tab and search result comes from the same settings registry.
- No settings badge is hard-coded.
- Switching theme affects settings.
- No mojibake appears in UI.
- The settings page is usable on mobile widths.

## Profile Tab

### Current Problem

Profile only stores email, full name, and energy preference. For an AI planner, this misses the data Bruno needs to plan correctly.

### Better Profile Design

Top area:

- Avatar or initials
- Full name
- Email
- Plan badge
- EDU verification badge if true
- Connected source summary
- Timezone
- Last active/synced summary

Sections:

1. Identity
   - Name
   - Avatar upload or generated initials color
   - Preferred first name Bruno should use
   - Pronouns optional
   - Timezone

2. School or Work Context
   - Student / worker / both
   - School name
   - Graduation year or semester label
   - Major or role
   - Term start/end dates
   - Default Canvas institution URL if connected

3. Planning Baseline
   - Energy preference
   - Workload style: light, balanced, intense
   - Default daily focus target
   - Default task duration
   - Preferred planning time

4. Account Security Summary
   - Authentication provider
   - Email verified
   - Last login if available
   - Sign out all sessions if Supabase session management supports it

### Data Model

Do not keep expanding `users` forever. Use:

- `users`: identity, plan, auth-adjacent fields.
- `user_profile_settings`: profile details such as timezone, school, role, semester dates, preferred name.
- `user_ai_memory`: planning preferences and behavior memory.
- `calendar_preferences`: calendar display and calendar-specific settings.

### Step-By-Step

1. Add a migration for `user_profile_settings` if the fields do not exist elsewhere.
2. Create server actions for profile read/update.
3. Move energy preference either into `user_ai_memory.preferred_focus_windows`/planning settings or keep a compatibility write to `users.energy_preference`.
4. Add timezone detection with manual override.
5. Add profile completeness hints, but keep them subtle.
6. Make profile card in sidebar use live plan and initials.

### Acceptance Criteria

- User can update profile without reloading the full page.
- Bruno receives preferred name, timezone, and planning baseline in prompt context.
- Profile visually looks like a real account center, not a form floating in empty space.

## Bruno Preferences Tab

### Current Problem

The page is empty, but the backend already has a useful `user_ai_memory` model. Bruno's prompt also has fixed style instructions that may override user preference.

### Required Features

1. Response Style
   - Warm
   - Direct
   - Coach
   - Gentle/adaptive
   - High-accountability

2. Response Length
   - Brief
   - Standard
   - Detailed

3. Planning Personality
   - Strict schedule
   - Balanced
   - Flexible
   - Ask before making changes
   - Act automatically when obvious

4. Bruno Proactivity
   - Silent unless asked
   - Light nudges
   - Active planning partner
   - High accountability

5. Detail Requirements
   - Include "why now"
   - Include materials
   - Include done-when condition
   - Include next step after task

6. Memory Controls
   - View what Bruno remembers
   - Edit learned rules
   - Delete individual memory items
   - Reset all Bruno memory
   - Pause memory learning

7. External LLM Preference Import
   - Paste preference profile from ChatGPT, Claude, Gemini, or another LLM.
   - Planevo extracts structured preferences.
   - User reviews checkboxes before saving.
   - Store only confirmed preferences.

### Prompting System Changes

Current path:

- `apps/web/lib/ai/memory.ts` builds `memoryContext`.
- `apps/web/app/api/ai/chat/route.ts` injects `memoryContext` into `systemPrompt`.

Needed changes:

1. Extend `tone_preference`:
   - `style`
   - `directness`
   - `encouragement_level`
   - `challenge_level`
   - `humor_level`
   - `emoji_level`
   - `avoid_phrases`
   - `preferred_phrases`

2. Extend `planning_style`:
   - `mode`
   - `autonomy_level`
   - `ask_before_calendar_changes`
   - `reschedule_aggressiveness`
   - `max_focus_blocks_per_day`
   - `max_planned_minutes_per_day`
   - `allow_buffers`

3. Add `memory_learning_settings`:
   - `learning_enabled`
   - `allow_inferred_preferences`
   - `require_review_for_imports`
   - `last_imported_at`

4. Rewrite `buildMemoryContext()` so the highest-priority user preferences appear before general Bruno persona rules.

5. In `chat/route.ts`, make the system prompt say:
   - User preference overrides default Bruno tone unless safety, accuracy, or product constraints require otherwise.
   - If a user asks for a different style in the moment, respect the current request but do not save it unless they say to remember it.

### External LLM Preference Import Flow

User-facing flow:

1. User opens Bruno Preferences.
2. Clicks "Import from another AI."
3. Planevo shows a copyable prompt.
4. User pastes it into ChatGPT, Claude, Gemini, etc.
5. User pastes the result into Planevo.
6. Planevo parses it into structured preferences.
7. User reviews and confirms.
8. Planevo saves to `user_ai_memory` with source `llm_import`.

Copyable prompt:

```text
You are helping me move my assistant preferences into Planevo, an AI planning app with an assistant named Bruno. Based only on what you know from our conversations, summarize how I like an AI assistant to respond.

Do not include private secrets, passwords, health details, financial account details, or anything I would not want saved in a productivity app.

Return:
1. My preferred response tone.
2. My preferred response length.
3. How direct or gentle I like feedback.
4. How much accountability I like.
5. How I like plans structured.
6. What phrases or behaviors I dislike.
7. Any scheduling, focus, or productivity preferences you have noticed.
8. A short paragraph Planevo can use as context for Bruno.

Format it as clear bullet points. If you are unsure about something, label it "low confidence."
```

Parser requirements:

- Use a server route, not client-side parsing.
- Treat pasted content as untrusted user input.
- Do not let pasted content override system/developer instructions.
- Extract only into an allowlisted schema.
- Show all extracted preferences for confirmation.
- Attach confidence and source metadata.
- Keep raw import text only if user explicitly chooses "save original import"; default should discard raw text after extraction.

### Acceptance Criteria

- Bruno Preferences page edits the real `user_ai_memory` row.
- Bruno prompt behavior changes after saving preferences.
- User can inspect and delete memory.
- LLM import cannot silently save raw pasted personal data.

## Sources And Integrations Tab

### Current Problem

Canvas and Google Calendar are partly real. Notion, Slack, and Linear are coming-soon cards. The integration registry only knows Canvas and Google Calendar, while UI has more integrations hard-coded.

### Target Architecture

Create generic integration tables instead of putting every token/status on `users`.

Suggested tables:

```sql
integration_accounts (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  provider text not null,
  provider_account_id text,
  display_name text,
  status text not null,
  access_token_encrypted text,
  refresh_token_encrypted text,
  scopes text[],
  expires_at timestamptz,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

integration_sources (
  id uuid primary key,
  integration_account_id uuid references integration_accounts(id) on delete cascade,
  provider text not null,
  source_type text not null,
  external_id text not null,
  display_name text,
  sync_enabled boolean default true,
  settings jsonb default '{}',
  created_at timestamptz default now(),
  unique(integration_account_id, external_id)
);

source_items (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  provider text not null,
  source_id uuid references integration_sources(id) on delete set null,
  external_id text not null,
  item_type text not null,
  title text not null,
  description text,
  due_at timestamptz,
  url text,
  status text,
  metadata jsonb default '{}',
  imported_task_id uuid references tasks(id) on delete set null,
  imported_event_id uuid references calendar_events(id) on delete set null,
  last_seen_at timestamptz default now(),
  deleted_at timestamptz,
  unique(user_id, provider, external_id)
);

integration_sync_runs (
  id uuid primary key,
  user_id uuid references users(id) on delete cascade,
  provider text not null,
  integration_account_id uuid references integration_accounts(id) on delete cascade,
  status text not null,
  items_seen integer default 0,
  items_created integer default 0,
  items_updated integer default 0,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz
);
```

### Integration Lifecycle UI

Every integration card should show:

- Status: not connected, connected, needs attention, syncing, paused, disconnected.
- What Planevo can read.
- What Planevo can write.
- Last sync time.
- Sync count.
- Error state and fix button.
- Manage button.
- Disconnect button.
- Delete imported data option.
- Permission scopes.
- Plan gating.

### Canvas

Current:

- Manual URL and token entry.
- Server actions test/save/disconnect.
- Stored encrypted token is used.

Fixes:

1. Never send stored full token back to browser.
2. Show masked token only.
3. Add "replace token" flow.
4. Add "sync now" and "last sync result."
5. Add school/domain helper.
6. On disconnect, soft-delete or unlink imported Canvas tasks/events according to user choice.
7. Add sync logs.

### Google Calendar

Current:

- OAuth connection.
- Calendar selection.
- Manual sync.
- Frequency setting stored in `scheduling_preferences`.

Fixes:

1. Store selected calendars as `integration_sources`, not a single `google_calendar_id` field.
2. Store sync tokens per calendar for incremental sync.
3. Use Google incremental sync tokens for efficiency.
4. Use Google push channels for near-real-time updates when production HTTPS is available.
5. Separate read-only calendar import consent from write-back consent.
6. Show imported event count and write-back status.
7. On disconnect, clear tokens and offer to remove imported events.

Official Google references:

- Calendar scopes: https://developers.google.com/workspace/calendar/api/auth
- Incremental sync: https://developers.google.com/workspace/calendar/api/guides/sync
- Push notifications: https://developers.google.com/workspace/calendar/api/guides/push

### Notion

Best first version:

- OAuth public connection.
- User chooses pages/databases through Notion's OAuth page picker.
- Planevo asks user to map database properties:
  - title property
  - due date property
  - status property
  - assignee/person property if needed
  - priority property if present
- Planevo imports only structured database rows with a due date or selected status.
- Planevo stores source links and lets user convert rows to tasks or auto-import matching rows.

Do not start by reading arbitrary page content. That creates privacy risk and noisy AI context.

Official Notion references:

- Public connections and OAuth: https://developers.notion.com/guides/get-started/public-integrations
- Authorization: https://developers.notion.com/docs/authorization
- Working with databases/data sources: https://developers.notion.com/guides/data-apis/working-with-databases

### Slack

Best first version:

- Slack OAuth install.
- Add message shortcut: "Send to Planevo."
- Add slash command: `/planevo task`.
- Add app mention: `@Planevo remind me...`.
- Optional: when user starts focus mode, update Slack status if user opts in.
- Optional: pause Slack notifications during focus only if Slack API and user consent support the desired behavior.

Do not start by reading whole channels. That is too invasive and will scare users.

Minimum scopes to investigate:

- `commands` for slash commands and shortcuts.
- `app_mentions:read` for bot mentions.
- Additional message/action scopes only if required for message shortcuts.

Official Slack references:

- App mentions: https://api.slack.com/events/app_mention
- Shortcuts: https://api.slack.com/interactivity/shortcuts/using
- Events API types: https://api.slack.com/events
- Scopes: https://api.slack.com/scopes/apps

### Linear

Best first version:

- OAuth.
- User chooses workspace/team.
- Import issues assigned to the user.
- Filter by status, priority, project, due date, cycle.
- Convert Linear issue to Planevo task or mirror assigned issues.
- Use webhooks for issue updates.

Official Linear references:

- OAuth: https://linear.app/developers/oauth-2-0-authentication
- Webhooks: https://linear.app/developers/webhooks
- Developer hub: https://linear.app/developers

### Other Integrations To Add Later

High value:

- Gmail/email-to-task
- Microsoft Outlook Calendar
- Microsoft To Do
- Apple Reminders
- Todoist
- GitHub
- Trello/Asana/ClickUp
- Zapier or Make for long-tail integrations

### Acceptance Criteria

- UI list and backend registry are aligned.
- Every connected integration has manage, sync now, disconnect, and delete-imported-data controls.
- Coming-soon cards either collect waitlist interest or are hidden from v1.
- Bruno never claims an integration is available unless a real tool and sync path exists.

## Notifications Tab

### Current Problem

Web settings are placeholder. Mobile only has a single push toggle. Server push routes send morning and deadline rescue messages, but there is no user-facing control over notification types, quiet hours, channel, timing, sound, or deep link behavior.

### Required Notification Types

1. Daily Plan Ready
2. Morning Planning Reminder
3. Deadline Rescue
4. Focus Start
5. Focus End
6. Missed Task / Rollover
7. Weekly Review
8. Bruno Suggestions
9. Billing and Account
10. Integration Sync Errors

### Preferences Needed

- Master notification toggle.
- Channel toggles: push, email, in-app.
- Quiet hours.
- Allowed days.
- Preferred morning reminder time.
- Deadline reminder timing: same day, 1 day before, custom.
- Notification tone: gentle, direct, high-accountability.
- Sound/vibration preference where supported.
- Send test notification.
- Device list and last token update.
- "Fix permissions" helper if OS push permission denied.

### Data Model

Add `notification_preferences jsonb` or a dedicated table.

Suggested JSON:

```json
{
  "channels": {
    "push": true,
    "email": false,
    "in_app": true
  },
  "quiet_hours": {
    "enabled": true,
    "start": "22:00",
    "end": "08:00"
  },
  "types": {
    "daily_plan_ready": { "enabled": true, "push": true, "email": false },
    "deadline_rescue": { "enabled": true, "push": true, "email": false, "lead_minutes": 180 },
    "weekly_review": { "enabled": true, "push": false, "email": true },
    "integration_errors": { "enabled": true, "push": false, "email": true }
  }
}
```

### Implementation Notes

- Expo push can send batches up to 100 messages per request and supports receipts/errors. Remove or disable stale tokens when Expo returns `DeviceNotRegistered`.
- Add a notification payload schema so taps deep link to the exact task, plan, chat, or settings area.
- Add server-side quiet-hours filtering before sending.
- Add analytics events: notification enabled, disabled, sent, opened, failed.

Official Expo reference:

- Sending notifications: https://docs.expo.dev/push-notifications/sending-notifications/
- SDK notifications: https://docs.expo.dev/versions/latest/sdk/notifications

### Acceptance Criteria

- User can control each notification type.
- Mobile push token registration and deregistration are reliable.
- Push taps open the correct screen.
- Server never sends user-facing pushes outside quiet-hour rules unless marked urgent and user opted in.

## Membership Tab

### Current Problem

Stripe routes exist, but settings membership UI is empty. Users need to understand plan status and manage payment actions.

### Required UI

1. Current Plan Summary
   - Plan name
   - Trial status
   - Renewal date
   - Cancellation scheduled state
   - Payment status
   - Billing interval

2. Plan Actions
   - Upgrade from free
   - Renew/reactivate if canceled or canceling
   - Open billing portal
   - Cancel membership
   - Change plan
   - Update payment method

3. Payment and Billing
   - Invoice history through Stripe portal or custom view later
   - Tax/billing address managed by Stripe portal
   - Payment failure warnings

4. Feature Entitlements
   - Show what is included in free vs Pro/Builder.
   - Keep copy honest. Do not list Notion/Slack/Linear as paid benefits until they work.

### Stripe Guidance

The fastest safe path is to use Stripe Customer Portal for subscription updates, cancellation, payment method updates, and invoices. Stripe supports portal configuration, cancellation, subscription updates, invoices, payment methods, localization, and cancellation reason collection.

Official Stripe references:

- Customer Portal: https://docs.stripe.com/customer-management
- Modify subscriptions: https://docs.stripe.com/billing/subscriptions/change
- Cancel subscriptions: https://docs.stripe.com/billing/subscriptions/cancel

### Data Needed From DB

Read from `users`:

- `plan_type`
- `subscription_status`
- `trial_end`
- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`
- `stripe_current_period_end`

Consider adding:

- `cancel_at_period_end`
- `subscription_cancel_at`
- `subscription_current_period_start`
- `last_payment_failed_at`

### Step-By-Step

1. Server component loads user subscription fields.
2. If no `stripe_customer_id`, show plan comparison and upgrade CTA.
3. If active/trialing, show live plan summary and "Manage billing" portal button.
4. If canceled/canceling, show renew/reactivate path.
5. Add a cancellation explanation screen before redirecting to Stripe portal cancellation flow.
6. Track billing events with PostHog.
7. Keep webhook as the source of truth for plan changes.

### Acceptance Criteria

- User can upgrade from settings.
- User can open Stripe portal.
- User can cancel or renew through Stripe-supported flows.
- Membership badge reflects real status.

## Data And Privacy Tab

### Current Problem

The page is placeholder. Public privacy, terms, and cookie pages are draft stubs. Data export and AI memory controls are missing.

### Required UI

1. Privacy Center
   - Links to Privacy Policy, Terms, Cookie Policy.
   - "Last updated" dates.
   - Termly embed or hosted policy link.

2. What Planevo Stores
   - Account data
   - Tasks/goals/calendar events
   - Canvas assignment metadata
   - Google Calendar events
   - Bruno messages and AI memory
   - Push token
   - Billing identifiers
   - Analytics events

3. AI Data Controls
   - View Bruno memory.
   - Delete Bruno memory.
   - Pause learning.
   - Explain what is sent to AI providers.

4. Connected Source Data Controls
   - Delete imported Canvas data.
   - Delete imported Google Calendar events.
   - Delete imported Notion/Slack/Linear items when those exist.

5. Export Data
   - Export JSON.
   - Export CSV for tasks/events.
   - Include a clear timestamp and source list.

6. Cookie and Analytics Consent
   - Essential cookies always on.
   - Analytics toggle if PostHog is active.
   - Error monitoring disclosure if Sentry is active.

### Termly Guidance

Termly can generate privacy, terms, cookie policies, and consent tooling for websites/apps. Use Termly as the legal content generator, then make the in-app Data and Privacy page a control panel that links to those policies and exposes real product controls.

Source: https://termly.io/

### Privacy Policy Must Disclose

Not legal advice, but the Termly questionnaire/policy should cover:

- Supabase auth/database and storage.
- OpenAI or any AI provider used for Bruno/Daily Plan.
- Stripe billing.
- PostHog analytics.
- Sentry error monitoring.
- Google Calendar OAuth and calendar event import/write-back.
- Canvas manual access token and assignment sync.
- Expo push notification tokens.
- Email provider if used.
- Data retention and deletion timing.
- FERPA-sensitive positioning for students.
- Under-18 policy.
- User rights under applicable US state privacy laws, GDPR/UK GDPR if serving those users.
- Whether AI inputs are used for model training by vendors.
- Contact email at the correct Planevo domain, not PlanPilot.

### Account Deletion Dependency

Supabase documents that deleting users can be done through auth user management, but JWTs remain valid until expiry and Storage-owned objects can block deletion. Because `public.users` references `auth.users` with `ON DELETE CASCADE`, deleting auth user can cascade public rows if all foreign keys are correct. Still, implement deletion through a server route with service role and explicit cleanup/checks.

Official Supabase reference: https://supabase.com/docs/guides/auth/managing-user-data

### Acceptance Criteria

- User can export data.
- User can delete AI memory without deleting account.
- User can delete imported data by source.
- Policies are no longer stubs.
- All privacy copy matches actual shipped features.

## Danger Zone

### Current Problem

Danger Zone is placeholder. Account deletion is required for trust and App Store expectations.

### Required Actions

1. Delete imported source data.
2. Reset Bruno memory.
3. Delete all tasks/events/plans.
4. Delete account.

### Delete Account Flow

Use multiple steps:

1. Explain exactly what will be deleted:
   - account
   - tasks
   - calendar events
   - AI memory
   - messages
   - integrations
   - push tokens
   - app data

2. Explain what may remain:
   - Stripe invoice/payment records required for tax/accounting.
   - Aggregated analytics that is no longer tied to the user if anonymized.
   - Logs retained temporarily for security.

3. Require typed confirmation:
   - `DELETE MY ACCOUNT`

4. If subscription active:
   - Cancel or schedule cancellation in Stripe first.
   - Make clear whether access ends now or at period end.

5. Send confirmation email if email provider exists.

6. Execute deletion server-side:
   - Revoke integration tokens when APIs support it.
   - Delete or anonymize analytics identity if supported.
   - Delete app rows or rely on cascade after verifying.
   - Delete Supabase auth user via admin API.
   - Sign out current session.

7. Redirect to goodbye screen.

### Tone

Use kind copy, but do not manipulate the user. Good cancellation/deletion UX is clear, calm, and reversible only where technically true.

Suggested copy:

- "We are sorry to see you go."
- "You can export your data before deleting."
- "This cannot be undone after deletion starts."
- "Your Stripe invoices may remain for legal and tax records."

### Acceptance Criteria

- No account deletion action exists without typed confirmation.
- Active subscribers are not deleted without subscription handling.
- User can export first.
- Deletion route is protected by auth, CSRF/origin checks, and service-role-only admin work.

## Appearance Tab

### Current Problem

Global CSS has `data-theme` support for dark/light/sepia-like tokens, but settings pages use hard-coded colors. Mobile has separate forest-green design constants that do not match the warm web redesign.

### Required Features

1. Theme Mode
   - System
   - Light
   - Dark

2. Color Theme
   - Warm Planevo
   - Forest
   - Ocean
   - Rose
   - High contrast

3. Density
   - Comfortable
   - Compact

4. Motion
   - Full
   - Reduced
   - Follow system

5. Calendar Colors
   - Color by source
   - Color by calendar
   - Color by energy

6. Accessibility
   - Larger text option
   - Reduce transparency
   - High contrast borders

### Design Direction

Keep Planevo warm, but avoid a one-note beige/brown theme. Add controlled accent colors:

- Warm honey for brand moments.
- Sage for success/connected.
- Rose for danger/errors.
- Blue for calendar/Google.
- Violet or indigo for AI/Bruno memory.
- Neutral ink and paper tokens for structure.

Do not use giant decorative cards for settings. This is a work surface. Use compact rows, clear grouping, small previews, and live examples.

### Step-By-Step

1. Define semantic tokens:
   - `--surface-page`
   - `--surface-card`
   - `--surface-muted`
   - `--text-primary`
   - `--text-muted`
   - `--border-subtle`
   - `--accent-primary`
   - `--accent-success`
   - `--accent-danger`
   - `--accent-info`

2. Update settings components to use semantic tokens.
3. Store preference in `appearance_preferences` or `users.scheduling_preferences.appearance` temporarily.
4. Sync theme to mobile constants later.
5. Add preview panel for theme/density.

### Acceptance Criteria

- Dark mode is readable in all settings tabs.
- Light mode keeps warm Planevo feel.
- No hard-coded page-level colors remain in settings.
- Mobile and web brand colors are intentionally aligned.

## Calendar And Planning Tab

This should be added because it is central to how the app works.

Required controls:

- Default calendar view.
- Day start/end.
- Work/school hours.
- Focus windows.
- Avoided windows.
- Break preference.
- Buffer between events.
- Auto-schedule aggressiveness.
- Rollover style.
- Max planned minutes per day.
- Weekly review day/time.
- Timezone.

Data sources:

- `calendar_preferences`
- `user_ai_memory.planning_style`
- `user_ai_memory.preferred_focus_windows`
- `user_ai_memory.avoided_focus_windows`
- `user_ai_memory.break_preference`
- `users.scheduling_preferences` as compatibility bridge.

Acceptance criteria:

- Bruno and Daily Plan use these settings.
- Calendar UI uses these display settings.
- Changes are reflected without needing onboarding again.

## Help And Feedback Tab

Add after core tabs.

Features:

- Contact support.
- Report bug.
- Request integration.
- Submit feedback.
- View app version/build.
- Link docs/privacy/security.
- Optional diagnostic bundle export.

This is especially useful while integrations are evolving.

## Search Improvements

Current search only finds tab names.

Upgrade search to index:

- Tab labels.
- Setting labels.
- Synonyms:
  - "billing" -> Membership
  - "cancel" -> Membership/Danger Zone
  - "delete" -> Danger Zone/Data
  - "theme" -> Appearance
  - "dark" -> Appearance
  - "Slack" -> Sources
  - "tone" -> Bruno Preferences
  - "memory" -> Bruno Preferences/Data
  - "push" -> Notifications

Acceptance criteria:

- Search result can deep-link to a section, not just a tab.

## Implementation Order For AntiGravity

### Phase 0: Guardrails

1. Do not change app code until this settings plan is accepted.
2. Before each feature, read the files listed in that feature section.
3. Add migrations before UI if a new setting needs persistence.
4. Use server actions or API routes for sensitive operations.
5. Never expose stored tokens to client components.
6. Use feature flags for integrations that are not production-ready.

### Phase 1: Settings Foundation

Files to read:

- `apps/web/app/dashboard/settings/layout.tsx`
- `apps/web/components/settings/SettingsSidebar.tsx`
- `apps/web/components/settings/SettingsSearch.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/ui/ThemeToggle.tsx`

Tasks:

1. Create settings registry.
2. Create settings UI primitives.
3. Replace hard-coded badges.
4. Fix encoding artifacts.
5. Convert settings colors to semantic tokens.
6. Add mobile layout behavior.

Validation:

- Navigate every settings tab.
- Search every tab.
- Test narrow viewport.
- Toggle theme.

### Phase 2: Profile

Files to read:

- `apps/web/app/dashboard/settings/profile/page.tsx`
- `apps/web/app/dashboard/settings/profile/actions.ts`
- `apps/web/components/settings/ProfileForm.tsx`
- `apps/web/types/database.ts`

Tasks:

1. Add profile settings table or fields.
2. Add timezone and preferred name.
3. Add school/work context.
4. Add planning baseline.
5. Update sidebar profile card.

Validation:

- Save persists.
- Bruno prompt receives updated profile context.

### Phase 3: Bruno Preferences And LLM Import

Files to read:

- `apps/web/lib/ai/memory.ts`
- `apps/web/app/api/ai/chat/route.ts`
- `apps/web/app/dashboard/settings/bruno/page.tsx`

Tasks:

1. Build Bruno Preferences UI.
2. Add server actions for memory read/update/delete.
3. Add LLM import parser route.
4. Add review-before-save UI.
5. Update `buildMemoryContext()`.
6. Adjust system prompt precedence.

Validation:

- Saved style changes Bruno answer style.
- Imported preferences require confirmation.
- Raw pasted import is discarded unless user opts in.

### Phase 4: Sources And Integrations

Files to read:

- `apps/web/components/settings/IntegrationsScreen.tsx`
- `apps/web/components/settings/IntegrationCard.tsx`
- `apps/web/components/settings/CanvasConnectModal.tsx`
- `apps/web/components/settings/GoogleCalendarManageModal.tsx`
- `apps/web/lib/integrations/registry.ts`
- `apps/web/lib/integrations/google-calendar.ts`
- `apps/web/lib/canvas/actions.ts`

Tasks:

1. Align UI to integration registry.
2. Add integration lifecycle tables.
3. Migrate Canvas/Google status to generic integration model.
4. Add sync logs and status.
5. Add waitlist/request state for Notion/Slack/Linear if not implementing immediately.
6. Add Notion OAuth and database mapping when ready.
7. Add Slack message shortcut/slash command when ready.
8. Add Linear OAuth and assigned issue sync when ready.

Validation:

- Connect, manage, sync, disconnect, delete imported data.
- No full token appears in browser.
- Coming-soon cards do not imply paid value unless waitlist-only.

### Phase 5: Notifications

Files to read:

- `apps/web/app/dashboard/settings/notifications/page.tsx`
- `apps/web/app/api/notifications/push/route.ts`
- `apps/web/app/api/cron/deadline-rescue/route.ts`
- `apps/mobile/app/(tabs)/settings.tsx`
- `apps/mobile/lib/notifications.ts`

Tasks:

1. Add notification preferences model.
2. Build web settings UI.
3. Update mobile toggle to respect preferences.
4. Add test notification.
5. Add deep-link payload handling.
6. Add stale token cleanup.
7. Add quiet-hours filtering.

Validation:

- Toggle each notification type.
- Send test push.
- Tap push opens expected screen.

### Phase 6: Membership

Files to read:

- `apps/web/app/dashboard/settings/membership/page.tsx`
- `apps/web/lib/stripe.ts`
- `apps/web/app/api/stripe/checkout/route.ts`
- `apps/web/app/api/stripe/portal/route.ts`
- `apps/web/app/api/stripe/webhook/route.ts`
- `apps/web/hooks/use-subscription.ts`

Tasks:

1. Load live subscription fields.
2. Show plan summary.
3. Add upgrade CTA.
4. Add manage billing portal action.
5. Add cancel/renew state through Stripe portal or portal deep links.
6. Update sidebar badge.

Validation:

- Free user can upgrade.
- Active/trialing user can manage billing.
- Canceled user sees renew path.

### Phase 7: Data And Privacy

Files to read:

- `apps/web/app/dashboard/settings/privacy/page.tsx`
- `apps/web/app/privacy/page.tsx`
- `apps/web/app/terms/page.tsx`
- `apps/web/app/cookies/page.tsx`
- `apps/web/lib/ai/memory.ts`

Tasks:

1. Replace public legal stubs with Termly output.
2. Add privacy center UI.
3. Add data export route.
4. Add AI memory delete/reset.
5. Add delete imported source data controls.
6. Add analytics consent if PostHog is active.

Validation:

- Export downloads usable JSON.
- Reset Bruno memory works.
- Policy pages no longer say draft.

### Phase 8: Danger Zone

Files to read:

- `apps/web/app/dashboard/settings/danger/page.tsx`
- `apps/web/lib/supabase/admin.ts`
- `apps/web/app/api/stripe/*`
- `apps/web/lib/auth/*`

Tasks:

1. Add export-before-delete reminder.
2. Add typed confirmation.
3. Add server deletion route.
4. Cancel or schedule Stripe cancellation.
5. Revoke integrations where possible.
6. Delete/anonymize data.
7. Delete Supabase auth user.
8. Sign out and redirect.

Validation:

- Route rejects unauthenticated request.
- Route rejects missing typed confirmation.
- Test account is fully deleted or anonymized according to policy.

### Phase 9: Appearance

Files to read:

- `apps/web/app/dashboard/settings/appearance/page.tsx`
- `apps/web/app/globals.css`
- `apps/web/components/ui/ThemeToggle.tsx`
- `apps/web/components/ui/ColorSchemeToggle.tsx`
- `apps/mobile/constants/Colors.ts`

Tasks:

1. Implement light/dark/system.
2. Implement color themes.
3. Implement density and motion.
4. Add appearance preview.
5. Align mobile/web palette.

Validation:

- All settings tabs pass contrast/readability in light and dark.
- Preference persists across reload.

## Launch Truth Rules

1. If an integration does not work, label it waitlist or hide it.
2. If Bruno cannot do something with a real tool, the prompt must not claim it.
3. If a setting is visible, it must either save, explain why it is unavailable, or collect waitlist interest.
4. Payment actions should use Stripe-hosted flows unless there is a strong reason not to.
5. Privacy controls must match real data behavior.
6. Data deletion should be clear about what is deleted, retained, anonymized, and why.
7. Tokens and secrets must never be exposed client-side after initial entry.

## Recommended P0 List

Do these before adding Notion/Slack/Linear:

1. Fix settings foundation and encoding artifacts.
2. Implement Bruno Preferences using existing `user_ai_memory`.
3. Implement Membership with live Stripe status and portal link.
4. Implement Notifications preferences and push test.
5. Implement Data Export and Delete Account.
6. Make integrations lifecycle trustworthy for Canvas and Google.

## Source Index

Competitor/product research:

- Akiflow settings: https://product.akiflow.com/en/help/articles/7791811-settings
- Akiflow integrations: https://akiflow.com/integrations
- Sunsama help/settings/integrations: https://help.sunsama.com/docs/help
- Sunsama Slack integration: https://help.sunsama.com/docs/integrations/slack/
- Motion integrations: https://www.usemotion.com/help/settings/integrations
- Motion notifications: https://www.usemotion.com/help/settings/managing-notifications
- Todoist calendar integration: https://get.todoist.help/hc/en-us/articles/13258169208860-Use-the-Calendar-Integration

Official integration/payment/privacy/notification docs:

- Notion public integrations: https://developers.notion.com/guides/get-started/public-integrations
- Notion authorization: https://developers.notion.com/docs/authorization
- Notion databases/data sources: https://developers.notion.com/guides/data-apis/working-with-databases
- Slack app mention event: https://api.slack.com/events/app_mention
- Slack shortcuts: https://api.slack.com/interactivity/shortcuts/using
- Slack events: https://api.slack.com/events
- Slack scopes: https://api.slack.com/scopes/apps
- Linear OAuth: https://linear.app/developers/oauth-2-0-authentication
- Linear webhooks: https://linear.app/developers/webhooks
- Google Calendar scopes: https://developers.google.com/workspace/calendar/api/auth
- Google Calendar sync: https://developers.google.com/workspace/calendar/api/guides/sync
- Google Calendar push notifications: https://developers.google.com/workspace/calendar/api/guides/push
- Expo push notifications: https://docs.expo.dev/push-notifications/sending-notifications/
- Expo notifications SDK: https://docs.expo.dev/versions/latest/sdk/notifications
- Stripe customer portal: https://docs.stripe.com/customer-management
- Stripe subscription changes: https://docs.stripe.com/billing/subscriptions/change
- Stripe cancellation: https://docs.stripe.com/billing/subscriptions/cancel
- Supabase user management/deletion: https://supabase.com/docs/guides/auth/managing-user-data
- Termly: https://termly.io/
