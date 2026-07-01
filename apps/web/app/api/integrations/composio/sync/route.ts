import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeIsPro } from '@/lib/integrations/summary';
import { syncAllComposioProviders } from '@/lib/integrations/composio/syncEngine';
import { evaluatePostSyncNotifications } from '@/lib/notifications/post-sync-notify';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import { emptyStrictBodySchema, parseJsonBody } from '@/lib/api/schemas';

const PRO_PROVIDERS: ProIntegrationProvider[] = ['notion', 'slack', 'linear'];
const SYNC_DEBOUNCE_MS = 5 * 60 * 1000;

function parseProvider(value: string | null): ProIntegrationProvider | undefined {
  if (value && (PRO_PROVIDERS as string[]).includes(value)) {
    return value as ProIntegrationProvider;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 });
    }

    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(emptyStrictBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { data: profile } = await supabaseAdmin
      .from('users')
      .select('plan_type')
      .eq('id', user.id)
      .single();

    if (!computeIsPro(profile?.plan_type, user.email)) {
      return NextResponse.json(
        { error: 'Pro plan required for work integrations.' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const provider = parseProvider(url.searchParams.get('provider'));
    const force = url.searchParams.get('force') === 'true';

    // Debounce: skip if a sync started within the window, unless forced.
    if (!force) {
      const since = new Date(Date.now() - SYNC_DEBOUNCE_MS).toISOString();
      const { data: recent } = await supabaseAdmin
        .from('integration_sync_runs')
        .select('id')
        .eq('user_id', user.id)
        .in('provider', provider ? [provider] : PRO_PROVIDERS)
        .gte('started_at', since)
        .limit(1);
      if (recent && recent.length > 0) {
        return NextResponse.json({ synced: {}, skipped: true });
      }
    }

    const synced = await syncAllComposioProviders(user.id, provider);

    const totalSynced = Object.values(synced).reduce((sum, count) => sum + (count ?? 0), 0);
    if (totalSynced > 0) {
      const providersToNotify = provider ? [provider] : (['slack', 'linear', 'notion'] as const);
      await Promise.all(
        providersToNotify.map((item) =>
          evaluatePostSyncNotifications(supabaseAdmin, user.id, item, synced[item] ?? 0)
        )
      );
    }

    return NextResponse.json({ synced });
  } catch (err) {
    console.error('[composio-sync] route error:', err);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
