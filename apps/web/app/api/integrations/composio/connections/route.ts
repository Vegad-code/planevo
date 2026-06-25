import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getComposioClient, dedupeComposioConnections } from '@/lib/integrations/composio/client';
import { reconcileProAccounts } from '@/lib/integrations/summary';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';

export async function GET(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const { user, error } = await getAuthenticatedUser(request);
    if (error || !user) {
      return NextResponse.json({ error: error || 'Unauthorized' }, { status: 401 });
    }

    if (!process.env.COMPOSIO_API_KEY) {
      return NextResponse.json({ error: 'Composio API key missing' }, { status: 500 });
    }

    await dedupeComposioConnections(user.id).catch((err) =>
      console.warn('[composio-connections] dedupe failed:', err)
    );

    const composio = getComposioClient();
    if (!composio) {
      return NextResponse.json({ error: 'Composio API key missing' }, { status: 500 });
    }
    const connectionsResp = await composio.connectedAccounts.list({ userIds: [user.id] });
    const connections = connectionsResp.items;

    // Keep integration_accounts in sync with Composio so the dashboard, tasks,
    // and daily plan can read connection status from one table.
    await reconcileProAccounts(user.id).catch((err) =>
      console.warn('[composio-connections] reconcile failed:', err)
    );

    return NextResponse.json({ connections });
  } catch (err: unknown) {
    console.error('Error fetching Composio connections:', err);
    return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
  }
}
