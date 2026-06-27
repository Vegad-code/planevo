# Data retention (operational)

Retention periods for operational tables. Legal copy (privacy policy) is maintained separately.

| Data | Retention | Mechanism |
|------|-----------|-----------|
| `bruno_tool_logs` | 90 days | Weekly cron `DELETE` |
| `mcp_tool_calls` | 90 days | Weekly cron `DELETE` |
| `notification_deliveries` | 180 days (`sent_at`) | Weekly cron `DELETE` |
| `ip_rate_limit_buckets` | 7 days | Weekly cron `DELETE` |
| `ai_usage_logs` | 365 days | Weekly cron `DELETE` |
| `bruno_route_events` | 365 days | Weekly cron `DELETE` |
| `security_audit_log` | 730 days | Weekly cron `DELETE` |
| `bruno_messages` | 180 days | Weekly cron `DELETE` |
| `chat_conversations` | 180 days (`last_active`) | Weekly cron `DELETE` (cascades messages) |
| `mcp_oauth_sessions` | Expired or consumed 7+ days ago | Weekly cron `DELETE` |
| Chat conversations (manual) | User-controlled | Existing delete flow |

## Cron

- **Route:** `GET /api/cron/data-retention`
- **Schedule:** `0 3 * * 0` (Sundays 03:00 UTC) in `apps/web/vercel.json`
- **Auth:** `Authorization: Bearer $CRON_SECRET`

## User data deletion

Account deletion (`deleteAccountAction`) removes the auth user and cascades owned rows per foreign keys. Export is available under Settings → Privacy.

## References

- [SECURITY.md](../SECURITY.md)
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
