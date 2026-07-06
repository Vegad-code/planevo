/**
 * GET/POST /api/command/sources — source item + calendar context (Phase 7, §23).
 *
 * Read-only against Canvas/Notion/Slack/Linear (`source_items`) and Google
 * Calendar (`calendar_events`); POST converts one item into a responsibility
 * and returns the fresh board so the client can render without a second fetch.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { loadBoard } from '@/lib/command/persist';
import {
  convertCalendarEventToResponsibility,
  convertSourceItemToResponsibility,
  listCommandSourceItems,
  listRelevantCalendarEvents,
} from '@/lib/command/source-items';

/** Both the base Command flag and the source-sync flag must be on (§27 gating). */
function sourcesEnabled(): boolean {
  return FEATURES.PLANEVO_COMMAND && FEATURES.COMMAND_SOURCE_SYNC;
}

export async function GET(req: NextRequest) {
  if (!sourcesEnabled()) {
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
  const client = commandDb();

  try {
    const [sourceItems, calendarEvents] = await Promise.all([
      listCommandSourceItems(client, user.id),
      listRelevantCalendarEvents(client, user.id, new Date(), timezone),
    ]);
    return NextResponse.json({ sourceItems, calendarEvents });
  } catch (err) {
    console.error('[Command sources] error:', err);
    return NextResponse.json({ error: 'Failed to load sources' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!sourcesEnabled()) {
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
  const sourceItemId: unknown = body?.sourceItemId;
  const calendarEventId: unknown = body?.calendarEventId;
  const timezone: string = typeof body?.timezone === 'string' ? body.timezone : 'UTC';

  if (typeof sourceItemId !== 'string' && typeof calendarEventId !== 'string') {
    return NextResponse.json(
      { error: 'sourceItemId or calendarEventId is required' },
      { status: 400 },
    );
  }

  const client = commandDb();

  try {
    const result =
      typeof sourceItemId === 'string'
        ? await convertSourceItemToResponsibility(client, user.id, sourceItemId)
        : await convertCalendarEventToResponsibility(client, user.id, calendarEventId as string);

    const { board } = await loadBoard(client, user.id, new Date(), timezone);
    return NextResponse.json({ ...result, board });
  } catch (err) {
    console.error('[Command sources] convert error:', err);
    return NextResponse.json({ error: 'Failed to convert item' }, { status: 500 });
  }
}
