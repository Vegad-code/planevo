import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/lib/api/route-helpers';
import { encryptToken } from '@/lib/crypto';
import { upsertIntegrationAccount } from '@/lib/integrations/accounts';

const bodySchema = z.object({
  url: z.string().min(1),
  token: z.string().min(1),
});

export const POST = withAuth(async ({ user, request }) => {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { url, token } = parsed.data;
    const encryptedToken = encryptToken(token.trim());

    await upsertIntegrationAccount({
      userId: user.id,
      provider: 'canvas',
      accessTokenEncrypted: encryptedToken,
      metadata: { canvas_url: url.trim() },
      status: 'connected',
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Canvas save]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save Canvas credentials' },
      { status: 500 }
    );
  }
});
