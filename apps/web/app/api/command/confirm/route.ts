/**
 * POST /api/command/confirm — persist accepted preview items (§20.2).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import {
  persistConfirmedItems,
  updateIntakeRun,
  loadBoard,
  type ConfirmItemInput,
} from '@/lib/command/persist';
import type { CommandConfirmResponse, ExtractedResponsibility } from '@/lib/command/types';

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

  const body = await req.json().catch(() => null);
  const intakeRunId: unknown = body?.intakeRunId;
  const rawItems: unknown = body?.items;
  if (typeof intakeRunId !== 'string' || !Array.isArray(rawItems)) {
    return NextResponse.json({ error: 'intakeRunId and items are required' }, { status: 400 });
  }

  const timezone: string = typeof body?.timezone === 'string' ? body.timezone : 'UTC';

  const items: ConfirmItemInput[] = (rawItems as Array<Record<string, unknown>>).map((raw) => {
    const item: ExtractedResponsibility = {
      title: typeof raw.title === 'string' ? raw.title : '',
      description: typeof raw.description === 'string' ? raw.description : null,
      type: (typeof raw.type === 'string' ? raw.type : 'unknown') as ExtractedResponsibility['type'],
      dueText: null,
      dueAt: typeof raw.dueAt === 'string' ? raw.dueAt : null,
      startAt: typeof raw.startAt === 'string' ? raw.startAt : null,
      endAt: typeof raw.endAt === 'string' ? raw.endAt : null,
      timezone: typeof raw.timezone === 'string' ? raw.timezone : null,
      recurrenceRule: typeof raw.recurrenceRule === 'string' ? raw.recurrenceRule : null,
      priority: (typeof raw.priority === 'string' ? raw.priority : 'normal') as ExtractedResponsibility['priority'],
      confidence: typeof raw.confidence === 'number' ? raw.confidence : 1,
      needsReview: raw.needsReview === true,
      reviewReason: typeof raw.reviewReason === 'string' ? raw.reviewReason : null,
      whyItMatters: typeof raw.whyItMatters === 'string' ? raw.whyItMatters : null,
      sourceHints: [],
    };
    return { ...item, accepted: raw.accepted !== false };
  });

  try {
    const createdItemIds = await persistConfirmedItems(
      commandDb(),
      user.id,
      intakeRunId,
      items,
    );
    await updateIntakeRun(commandDb(), user.id, intakeRunId, { status: 'confirmed' });

    const { board } = await loadBoard(commandDb(), user.id, new Date(), timezone);
    const response: CommandConfirmResponse = { createdItemIds, board };
    return NextResponse.json(response);
  } catch (err) {
    console.error('[Command confirm] error:', err);
    return NextResponse.json({ error: 'Failed to save responsibilities' }, { status: 500 });
  }
}
