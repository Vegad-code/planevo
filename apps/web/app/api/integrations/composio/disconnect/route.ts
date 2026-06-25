import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { getComposioClient } from '@/lib/integrations/composio/client';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { reconcileProAccounts } from '@/lib/integrations/summary';
import { composioDisconnectBodySchema, parseJsonBody } from '@/lib/api/schemas';
import { createLogger } from '@/lib/logger';
import { logSecurityAudit } from '@/lib/security-audit';

const log = createLogger({ route: '/api/integrations/composio/disconnect' });

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

    const body = await request.json().catch(() => ({}));
    const parsed = parseJsonBody(composioDisconnectBodySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { connectionId } = parsed.data;

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

    await logSecurityAudit({
      actorUserId: user.id,
      action: 'integration.disconnect',
      resourceType: 'composio',
      resourceId: connectionId,
      ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    });

    log.info('composio disconnected', { userId: user.id, connectionId });

    await reconcileProAccounts(user.id).catch((err) =>
      log.warn('reconcile failed after disconnect', { userId: user.id, error: String(err) })
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error('Error deleting Composio connection:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
