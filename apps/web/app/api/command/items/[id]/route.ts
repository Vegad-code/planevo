/**
 * PATCH /api/command/items/[id] — edit a responsibility (§20.5).
 * DELETE /api/command/items/[id] — discard (soft) a responsibility.
 *
 * Simple item edits never call AI (§20.5 / §26 "Do not route simple item edits
 * through Bruno"). Ownership is enforced by user-scoped queries + audit events.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/get-user';
import { isAllowedOriginOrBearer } from '@/lib/auth/origin-guard';
import { commandDb } from '@/lib/command/db';
import { FEATURES } from '@/lib/featureFlags';
import { patchItem, type ItemPatch } from '@/lib/command/persist';
import type { ResponsibilityItem } from '@/lib/command/types';

const STATUSES: ReadonlySet<ResponsibilityItem['status']> = new Set([
  'active',
  'waiting',
  'done',
  'archived',
  'discarded',
]);
const PRIORITIES: ReadonlySet<ResponsibilityItem['priority']> = new Set([
  'low',
  'normal',
  'high',
  'urgent',
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const patch: ItemPatch = {};
  if (typeof body.title === 'string') patch.title = body.title;
  if (body.description === null || typeof body.description === 'string') {
    patch.description = body.description;
  }
  if (typeof body.type === 'string') patch.type = body.type as ResponsibilityItem['type'];
  if (typeof body.status === 'string' && STATUSES.has(body.status)) {
    patch.status = body.status as ResponsibilityItem['status'];
  }
  if (typeof body.priority === 'string' && PRIORITIES.has(body.priority)) {
    patch.priority = body.priority as ResponsibilityItem['priority'];
  }
  if (body.dueAt === null || typeof body.dueAt === 'string') patch.dueAt = body.dueAt;
  if (body.whyItMatters === null || typeof body.whyItMatters === 'string') {
    patch.whyItMatters = body.whyItMatters;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'No supported fields to update' }, { status: 400 });
  }

  const updated = await patchItem(commandDb(), user.id, id, patch);
  if (!updated) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  // Soft delete = discard lifecycle status (§16.3). Nothing is hard-deleted here.
  const updated = await patchItem(commandDb(), user.id, id, { status: 'discarded' });
  if (!updated) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }
  return NextResponse.json({ item: updated });
}
