import { NextResponse } from 'next/server';

import { withAuth } from '@/lib/api/route-helpers';
import { encryptToken } from '@/lib/crypto';
import { upsertIntegrationAccount } from '@/lib/integrations/accounts';
import { canvasSaveCredentialsSchema } from '@/lib/api/schemas';
import { assertCanvasUrlSafe } from '@/lib/canvas/url-validation';

export const POST = withAuth(async ({ user, request }) => {
  try {
    const parsed = canvasSaveCredentialsSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { url, token } = parsed.data;

    const safe = await assertCanvasUrlSafe(url);
    if (!safe.ok) {
      return NextResponse.json({ error: 'Invalid Canvas URL' }, { status: 400 });
    }

    const encryptedToken = encryptToken(token.trim());

    await upsertIntegrationAccount({
      userId: user.id,
      provider: 'canvas',
      accessTokenEncrypted: encryptedToken,
      metadata: { canvas_url: safe.url },
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
});
