import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isCronAuthorized } from '@/lib/notifications/cron-auth';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/database';

const RETENTION_RULES = [
  { table: 'bruno_tool_logs', column: 'created_at', days: 90 },
  { table: 'mcp_tool_calls', column: 'created_at', days: 90 },
  { table: 'notification_deliveries', column: 'created_at', days: 180 },
  { table: 'ip_rate_limit_buckets', column: 'window_start', days: 7 },
  { table: 'ai_usage_logs', column: 'created_at', days: 365 },
] as const;

/**
 * GET /api/cron/data-retention
 * Purges aged operational rows per DATA_RETENTION.md.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are not configured' }, { status: 500 });
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const results: Record<string, number | string> = {};

  for (const rule of RETENTION_RULES) {
    const cutoff = new Date(Date.now() - rule.days * 24 * 60 * 60 * 1000).toISOString();
    const { error, count } = await supabase
      .from(rule.table as 'bruno_tool_logs')
      .delete({ count: 'exact' })
      .lt(rule.column, cutoff);

    if (error) {
      logger.error('data-retention purge failed', {
        route: '/api/cron/data-retention',
        table: rule.table,
        error: error.message,
      });
      results[rule.table] = error.message;
    } else {
      results[rule.table] = count ?? 0;
    }
  }

  logger.info('data-retention sweep complete', { route: '/api/cron/data-retention', results });

  return NextResponse.json({ ok: true, results });
}
