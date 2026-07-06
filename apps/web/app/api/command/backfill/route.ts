/**
 * POST /api/command/backfill — mirror the authenticated user's open tasks into
 * `responsibility_items` (§16.9 step 2 / Phase 12). Idempotent + re-runnable, so
 * it is safe to call on first Command load or from a migration sweep. User-scoped:
 * a user only ever backfills their own tasks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { backfillTasksToResponsibilities } from '@/lib/command/tasks-bridge';

export async function POST(req: NextRequest) {
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

  try {
    const processed = await backfillTasksToResponsibilities(commandDb(), user.id);
    return NextResponse.json({ processed });
  } catch (err) {
    console.error('[Command backfill] error:', err);
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 });
  }
}
