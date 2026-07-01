# Composio setup (Notion, Slack, Linear)

> **Flag-gated Pro integrations** — enabled via `NEXT_PUBLIC_ENABLE_NOTION_INTEGRATION`, `NEXT_PUBLIC_ENABLE_SLACK_INTEGRATION`, `NEXT_PUBLIC_ENABLE_LINEAR_INTEGRATION` in [`lib/featureFlags.ts`](../lib/featureFlags.ts). Not part of v1 core marketing; do not promise in landing copy unless flags are on.

Planevo connects Notion, Slack, and Linear through [Composio](https://platform.composio.dev).

## One-time dashboard configuration

1. Open your Composio project and confirm auth configs exist for `notion`, `slack`, and `linear`.
2. Under each auth config (or project redirect settings), whitelist **both** callback URLs:
   - `http://localhost:3000/api/integrations/composio/callback`
   - `https://planevo.co/api/integrations/composio/callback`
3. Remove any stale `*.vercel.app` preview URLs. Those cause `404 DEPLOYMENT_NOT_FOUND` after OAuth.
4. Set `COMPOSIO_API_KEY` in `apps/web/.env.local`.

Toolkit versions are pinned in code (`20260512_00` by default). Override per toolkit with:

- `COMPOSIO_TOOLKIT_VERSION_NOTION`
- `COMPOSIO_TOOLKIT_VERSION_SLACK`
- `COMPOSIO_TOOLKIT_VERSION_LINEAR`

## Local development

- You can keep `NEXT_PUBLIC_APP_URL=https://planevo.co` for emails and referrals.
- OAuth callbacks use the browser origin (`localhost:3000`) automatically during connect.
- After connecting Notion, pick databases in the settings UI so the sync engine knows what to pull.
- After connecting Slack or Linear, Planevo verifies Composio access and runs an initial sync automatically.

## Provider behavior in Planevo

| Provider | Connect flow | Manage action | Sync source |
|----------|--------------|---------------|-------------|
| Notion | OAuth + database picker | Pick databases & scope | Selected databases via `NOTION_QUERY_DATABASE` |
| Slack | OAuth + manage preferences | Channels, starred items, DMs | Selected channels + optional starred |
| Linear | OAuth + manage preferences | Teams, projects, assignee filter | Selected teams/projects with filters |

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Multiple connected accounts error | Reload integrations; duplicates are deduped on connect. Disconnect and reconnect if needed. |
| Popup lands on 404 / wrong host | Whitelist the callback URLs above in Composio; remove old Vercel preview URLs. |
| Card still shows Available after OAuth | Refresh the page; check Composio dashboard for an ACTIVE connection for your Supabase user ID. |
| Toolkit version not specified | Restart the dev server after pulling latest code; versions are configured in `lib/integrations/composio/config.ts`. |
| Notion picker empty | Share databases with the Planevo/Composio integration inside Notion. |
| Slack/Linear sync empty | Confirm the connected workspace has visible messages/issues for the authenticated token; use Manage to retry sync. |

Debug endpoint (authenticated, Pro only):

`GET /api/integrations/composio/verify?provider=slack|linear|notion`
