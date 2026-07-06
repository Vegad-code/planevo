/**
 * GET /api/command/board — deterministic board, zero AI (§20.4).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { loadBoard } from '@/lib/command/persist';
import { summarizeBoard } from '@/lib/command/board';

export async function GET(req: NextRequest) {
  if (!FEATURES.PLANEVO_COMMAND) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!isAllowedOriginOrBearer(req)) {
    return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
  }
  const { user, error: authError } = await getAuthenticatedUser(req);
  if (authError || !user) {
    return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
  }

  const timezone = req.nextUrl.searchParams.get('timezone') || 'UTC';

  try {
    const { board } = await loadBoard(commandDb(), user.id, new Date(), timezone);
    return NextResponse.json({ board, summary: summarizeBoard(board) });
  } catch (err) {
    console.error('[Command board] error:', err);
    return NextResponse.json({ error: 'Failed to load board' }, { status: 500 });
  }
}
