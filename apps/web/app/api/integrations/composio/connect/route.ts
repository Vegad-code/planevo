import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { prepareConnectionForLink, getComposioClient, dedupeComposioConnections } from '@/lib/integrations/composio/client';
import { resolveComposioCallbackUrl } from '@/lib/integrations/composio/oauth';
import { reconcileProAccounts } from '@/lib/integrations/summary';
import { composioConnectBodySchema } from '@/lib/api/schemas';

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

    const body = await request.json().catch(() => null);
    const parsed = composioConnectBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Missing or invalid appName' }, { status: 400 });
    }

    const { appName, redirectUrl, reconnect } = parsed.data;

    const composio = getComposioClient();
    if (!composio) {
      return NextResponse.json({ error: 'Composio API key missing' }, { status: 500 });
    }

    // Fetch auth configs to find the ID for the requested appName
    const authConfigsResp = await (composio as any).client.authConfigs.list();
    const targetConfig = authConfigsResp.items.find(
      (config: any) => config.toolkit?.slug === appName
    );

    if (!targetConfig) {
      return NextResponse.json(
        { error: `Auth config for ${appName} not found` },
        { status: 400 }
      );
    }

    const prepareResult = await prepareConnectionForLink(
      user.id,
      targetConfig.id,
      reconnect ? 'reconnect' : 'connect'
    );

    if (prepareResult === 'already_connected' && !reconnect) {
      await reconcileProAccounts(user.id).catch((err) =>
        console.warn('[composio-connect] reconcile failed:', err)
      );
      return NextResponse.json({ alreadyConnected: true });
    }

    const connection = await composio.connectedAccounts.link(
      user.id,
      targetConfig.id,
      {
        callbackUrl: resolveComposioCallbackUrl(request, redirectUrl),
      }
    );

    return NextResponse.json({ redirectUrl: connection.redirectUrl });
  } catch (err: unknown) {
    console.error('Error initiating Composio connection:', err);
    return NextResponse.json({ error: 'Failed to initiate connection' }, { status: 500 });
  }
}
