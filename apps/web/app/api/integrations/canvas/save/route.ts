import { NextRequest, NextResponse } from 'next/server';
import { createAuthenticatedSupabaseClient } from '@/lib/auth/get-user';
import { encryptToken } from '@/lib/crypto';
import { upsertIntegrationAccount } from '@/lib/integrations/accounts';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { isAllowedCanvasUrl } from '@/lib/canvas/url-validation';
import { canvasSaveCredentialsSchema } from '@/lib/api/schemas';

export async function POST(request: NextRequest) {
  try {
    if (!isAllowedOriginOrBearer(request)) {
      return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
    }

    const auth = await createAuthenticatedSupabaseClient(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = canvasSaveCredentialsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { url, token } = parsed.data;

    if (!isAllowedCanvasUrl(url)) {
      return NextResponse.json({ error: 'Invalid Canvas URL' }, { status: 400 });
    }

    const encryptedToken = encryptToken(token.trim());

    await upsertIntegrationAccount({
      userId: auth.user.id,
      provider: 'canvas',
      accessTokenEncrypted: encryptedToken,
      metadata: { canvas_url: url.trim() },
      status: 'connected',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Canvas save]', err);
    return NextResponse.json(
      { error: 'Failed to save Canvas credentials' },
      { status: 500 }
    );
  }
}
