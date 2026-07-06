/**
 * POST /api/command/schedule — Planevo Command's scheduling bridge (§9.9 "Plan
 * My Day", Phase 7B). Flag-gated by `COMMAND_SCHEDULE_BRIDGE` (in addition to
 * `PLANEVO_COMMAND`) — 404 when either is off.
 *
 * `{ action: 'propose', itemIds }` → reuses the existing availability engine
 * (`lib/command/schedule-bridge.ts` → `getBrunoMasterContext()` → `findGaps()`)
 * to return proposed blocks. NEVER writes.
 *
 * `{ action: 'confirm', blocks }` → writes the confirmed blocks to
 * `calendar_events`, links each responsibility item's `calendar_event_id`,
 * and returns a fresh board (`loadBoard`). Scheduling never completes an item.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { loadBoard } from '@/lib/command/persist';
import {
  proposeSchedule,
  confirmSchedule,
  type ScheduleBlockInput,
} from '@/lib/command/schedule-bridge';

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function parseBlocks(value: unknown): ScheduleBlockInput[] | null {
  if (!Array.isArray(value)) return null;
  const blocks: ScheduleBlockInput[] = [];
  for (const raw of value as Array<Record<string, unknown>>) {
    if (
      typeof raw?.itemId !== 'string' ||
      typeof raw?.title !== 'string' ||
      typeof raw?.suggestedStart !== 'string' ||
      typeof raw?.suggestedEnd !== 'string'
    ) {
      return null;
    }
    blocks.push({
      itemId: raw.itemId,
      title: raw.title,
      suggestedStart: raw.suggestedStart,
      suggestedEnd: raw.suggestedEnd,
    });
  }
  return blocks;
}

export async function POST(req: NextRequest) {
  if (!FEATURES.PLANEVO_COMMAND || !FEATURES.COMMAND_SCHEDULE_BRIDGE) {
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
  const action = body?.action;
  const timezone: string = typeof body?.timezone === 'string' ? body.timezone : 'UTC';

  if (action === 'propose') {
    const itemIds: unknown = body?.itemIds;
    if (!isStringArray(itemIds) || itemIds.length === 0) {
      return NextResponse.json({ error: 'itemIds is required' }, { status: 400 });
    }
    const clientNow = typeof body?.clientNow === 'string' ? new Date(body.clientNow) : new Date();
    try {
      const proposals = await proposeSchedule(user.id, itemIds, timezone, clientNow);
      return NextResponse.json({ proposals });
    } catch (err) {
      console.error('[Command schedule] propose error:', err);
      return NextResponse.json({ error: 'Failed to propose schedule' }, { status: 500 });
    }
  }

  if (action === 'confirm') {
    const blocks = parseBlocks(body?.blocks);
    if (!blocks || blocks.length === 0) {
      return NextResponse.json({ error: 'blocks is required' }, { status: 400 });
    }
    try {
      const results = await confirmSchedule(user.id, blocks, timezone);
      const { board } = await loadBoard(commandDb(), user.id, new Date(), timezone);
      return NextResponse.json({ results, board });
    } catch (err) {
      console.error('[Command schedule] confirm error:', err);
      return NextResponse.json({ error: 'Failed to confirm schedule' }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}
