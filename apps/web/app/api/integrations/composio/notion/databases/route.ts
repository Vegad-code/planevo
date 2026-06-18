import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeIsPro } from '@/lib/integrations/summary';
import {
  executeComposioToolAttempts,
  mapNotionDatabaseOptions,
  NOTION_LIST_DATABASE_ATTEMPTS,
  extractProviderRecords,
} from '@/lib/integrations/composio/providerTools';
import {
  getIntegrationAccount,
  upsertIntegrationAccount,
} from '@/lib/integrations/accounts';

async function requirePro(request: NextRequest) {
  if (!isAllowedOriginOrBearer(request)) {
    return { error: NextResponse.json({ error: 'Forbidden: invalid origin' }, { status: 403 }) };
  }
  const { user, error } = await getAuthenticatedUser(request);
  if (error || !user) {
    return { error: NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 }) };
  }
  const { data: profile } = await supabaseAdmin
    .from('users')
    .select('plan_type')
    .eq('id', user.id)
    .single();
  if (!computeIsPro(profile?.plan_type, user.email)) {
    return { error: NextResponse.json({ error: 'Pro plan required.' }, { status: 403 }) };
  }
  return { user };
}

export async function GET(request: NextRequest) {
  const gate = await requirePro(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const account = await getIntegrationAccount(user.id, 'notion');
    const selectedIds =
      (account?.metadata?.notion_database_ids as string[] | undefined) ?? [];

    const result = await executeComposioToolAttempts(
      user.id,
      NOTION_LIST_DATABASE_ATTEMPTS
    );

    if (!result.successful) {
      return NextResponse.json({
        databases: [],
        error:
          result.error ??
          'Could not load Notion databases. Share at least one database with the Planevo integration in Notion, then try again.',
      });
    }

    const databases = mapNotionDatabaseOptions(
      extractProviderRecords('notion', result.data),
      selectedIds
    );

    return NextResponse.json({ databases });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list databases' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requirePro(request);
  if (gate.error) return gate.error;
  const user = gate.user;

  try {
    const body = await request.json();
    const databaseIds: string[] = Array.isArray(body?.databaseIds)
      ? body.databaseIds.map(String)
      : [];

    const account = await getIntegrationAccount(user.id, 'notion');
    const metadata = {
      ...(account?.metadata ?? {}),
      notion_database_ids: databaseIds,
    };

    await upsertIntegrationAccount({
      userId: user.id,
      provider: 'notion',
      status: 'connected',
      metadata,
    });

    return NextResponse.json({ success: true, databaseIds });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save databases' },
      { status: 500 }
    );
  }
}
