# Data retention (operational)

Retention periods for operational tables. Legal copy (privacy policy) is maintained separately.

| Data | Retention | Mechanism |
|------|-----------|-----------|
| `bruno_tool_logs` | 90 days | Weekly cron `DELETE` |
| `mcp_tool_calls` | 90 days | Weekly cron `DELETE` |
| `notification_deliveries` | 180 days | Weekly cron `DELETE` |
| `ip_rate_limit_buckets` | 7 days | Daily cron `DELETE` |
| `ai_usage_logs` | 365 days | Monthly cron `DELETE` |
| Chat conversations | User-controlled | Existing delete flow |
| `security_audit_log` | 2 years | Manual review / future cron |

## Cron

- **Route:** `GET /api/cron/data-retention`
- **Schedule:** `0 3 * * 0` (Sundays 03:00 UTC) in `apps/web/vercel.json`
- **Auth:** `Authorization: Bearer $CRON_SECRET`

## User data deletion

Account deletion (`deleteAccountAction`) removes the auth user and cascades owned rows per foreign keys. Export is available under Settings → Privacy.

## References

- [SECURITY.md](../SECURITY.md)
- [DISASTER_RECOVERY.md](./DISASTER_RECOVERY.md)
