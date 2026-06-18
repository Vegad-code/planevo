import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getComposioClient } from '@/lib/integrations/composio/client';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { reconcileProAccounts } from '@/lib/integrations/summary';

export async function POST(request: NextRequest) {
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

    const { connectionId } = await request.json();
    if (!connectionId) {
      return NextResponse.json({ error: 'Missing connectionId' }, { status: 400 });
    }

    const composio = getComposioClient();
    if (!composio) {
      return NextResponse.json({ error: 'Composio API key missing' }, { status: 500 });
    }
    const connectionsResp = await composio.connectedAccounts.list({
      userIds: [user.id],
    });
    const owned = (connectionsResp.items ?? []).some(
      (item) => String(item.id) === String(connectionId)
    );

    if (!owned) {
      return NextResponse.json(
        { error: 'Connection not found for this user' },
        { status: 403 }
      );
    }

    await composio.connectedAccounts.delete(connectionId);

    await reconcileProAccounts(user.id).catch((err) =>
      console.warn('[composio-disconnect] reconcile failed:', err)
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting Composio connection:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
