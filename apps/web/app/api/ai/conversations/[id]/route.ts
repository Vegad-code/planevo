import { NextResponse } from 'next/server';
import { z } from 'zod';

import { withAuth } from '@/lib/api/route-helpers';
import { deleteConversation } from '@/lib/bruno/deleteConversation';

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export const DELETE = withAuth(async ({ user, params }) => {
  try {
    const rawParams = await params;
    const parsedParams = paramsSchema.safeParse(rawParams);
    if (!parsedParams.success) {
      return NextResponse.json({ error: 'Invalid conversation id' }, { status: 400 });
    }

    const result = await deleteConversation(user.id, parsedParams.data.id);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({ deleted: true, id: result.id });
  } catch (error) {
    console.error('[Delete Conversation] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});
