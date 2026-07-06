import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks -----------------------------------------------------------------
// schedule-bridge.ts calls `commandDb()` and `getBrunoMasterContext()` directly
// (not via dependency injection), so both module boundaries are mocked here.

const getBrunoMasterContextMock = vi.fn();
vi.mock('@/lib/ai/orchestrator', () => ({
  getBrunoMasterContext: (...args: unknown[]) => getBrunoMasterContextMock(...args),
}));

/** Minimal thenable query-builder stub that mimics supabase-js chaining. */
function makeQuery(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const passthrough = vi.fn(() => builder);
  builder.select = passthrough;
  builder.eq = passthrough;
  builder.neq = passthrough;
  builder.is = passthrough;
  builder.in = passthrough;
  builder.order = passthrough;
  builder.insert = vi.fn(() => builder);
  builder.update = vi.fn(() => builder);
  builder.single = () => Promise.resolve(result);
  builder.maybeSingle = () => Promise.resolve(result);
  builder.then = (
    onFulfilled: (value: typeof result) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return builder;
}

const fromMock = vi.fn();
const commandDbMock = { from: fromMock };
vi.mock('@/lib/command/db', () => ({
  commandDb: () => commandDbMock,
}));

import { proposeSchedule, confirmSchedule } from '../schedule-bridge';

beforeEach(() => {
  fromMock.mockReset();
  getBrunoMasterContextMock.mockReset();
});

const TZ = 'UTC';

function itemRow(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? 'item-1',
    title: overrides.title ?? 'Untitled',
    description: null,
    type: 'assignment',
    status: 'active',
    priority: overrides.priority ?? 'normal',
    urgency_score: 0,
    confidence: 1,
    due_at: overrides.due_at ?? null,
    start_at: null,
    end_at: null,
    timezone: null,
    recurrence_rule: null,
    source_type: 'manual',
    source_label: null,
    source_item_id: null,
    calendar_event_id: null,
    task_id: null,
    intake_run_id: null,
    needs_review: false,
    review_reason: null,
    why_it_matters: null,
    metadata: overrides.metadata ?? {},
    completed_at: null,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function worldState(overrides: { calendarEvents?: unknown[]; memory?: Record<string, unknown> } = {}) {
  return {
    user: {} as unknown,
    memory: {
      avoided_focus_windows: [],
      planning_style: { work_hours: undefined },
      ...overrides.memory,
    },
    memoryContext: '',
    tasks: [],
    calendarEvents: overrides.calendarEvents ?? [],
    preferences: null,
  };
}

describe('proposeSchedule', () => {
  it('reuses findGaps and returns a block that lands inside the found gap', async () => {
    // "Now" falls in the middle of a 10:00-11:00 busy block, so the only gap
    // findGaps() can return starts exactly at 11:00 (the block's end).
    const clientNow = new Date('2026-07-06T10:30:00.000Z');
    fromMock.mockReturnValueOnce(
      makeQuery({ data: [itemRow({ id: 'a', title: 'Write essay' })], error: null }),
    );
    getBrunoMasterContextMock.mockResolvedValueOnce(
      worldState({
        calendarEvents: [
          {
            id: 'busy-1',
            summary: 'busy',
            start: { dateTime: '2026-07-06T10:00:00.000Z' },
            end: { dateTime: '2026-07-06T11:00:00.000Z' },
          },
        ],
      }),
    );

    const proposals = await proposeSchedule('user-1', ['a'], TZ, clientNow);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].itemId).toBe('a');
    expect(proposals[0].suggestedStart).toBe('2026-07-06T11:00:00.000Z');
    expect(proposals[0].suggestedEnd).toBe('2026-07-06T11:45:00.000Z');
  });

  it('writes nothing — only a single select query is issued, no insert/update', async () => {
    const clientNow = new Date('2026-07-06T09:00:00.000Z');
    fromMock.mockReturnValueOnce(makeQuery({ data: [itemRow({ id: 'a' })], error: null }));
    getBrunoMasterContextMock.mockResolvedValueOnce(worldState());

    await proposeSchedule('user-1', ['a'], TZ, clientNow);

    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('responsibility_items');
    const builder = fromMock.mock.results[0].value as Record<string, unknown>;
    expect(builder.insert).not.toHaveBeenCalled();
    expect(builder.update).not.toHaveBeenCalled();
  });

  it('returns proposals most-urgent first', async () => {
    const clientNow = new Date('2026-07-06T09:00:00.000Z');
    const urgent = itemRow({ id: 'urgent', title: 'Due soon', priority: 'urgent' });
    const low = itemRow({ id: 'low', title: 'Low priority', priority: 'low' });
    fromMock.mockReturnValueOnce(makeQuery({ data: [low, urgent], error: null }));
    getBrunoMasterContextMock.mockResolvedValueOnce(worldState());

    const proposals = await proposeSchedule('user-1', ['low', 'urgent'], TZ, clientNow);

    expect(proposals.map((p) => p.itemId)).toEqual(['urgent', 'low']);
  });

  it('omits items that do not fit into any remaining gap', async () => {
    // 10 minutes before the 22:00 close — below findGaps' own 15-minute floor.
    const clientNow = new Date('2026-07-06T21:50:00.000Z');
    fromMock.mockReturnValueOnce(
      makeQuery({ data: [itemRow({ id: 'a', metadata: { estimatedMinutes: 30 } })], error: null }),
    );
    getBrunoMasterContextMock.mockResolvedValueOnce(worldState());

    const proposals = await proposeSchedule('user-1', ['a'], TZ, clientNow);

    expect(proposals).toHaveLength(0);
  });
});

describe('confirmSchedule', () => {
  it('links calendar_event_id onto the item without setting status to done', async () => {
    const selectExisting = makeQuery({ data: { id: 'a', calendar_event_id: null }, error: null });
    const insertEvent = makeQuery({ data: { id: 'event-1' }, error: null });
    const updateBuilder = makeQuery({ data: null, error: null });
    const auditInsert = makeQuery({ data: null, error: null });

    fromMock
      .mockReturnValueOnce(selectExisting)
      .mockReturnValueOnce(insertEvent)
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(auditInsert);

    const results = await confirmSchedule(
      'user-1',
      [
        {
          itemId: 'a',
          title: 'Write essay',
          suggestedStart: '2026-07-06T11:00:00.000Z',
          suggestedEnd: '2026-07-06T11:45:00.000Z',
        },
      ],
      TZ,
    );

    expect(results).toEqual([{ itemId: 'a', calendarEventId: 'event-1', alreadyScheduled: false }]);

    expect(updateBuilder.update).toHaveBeenCalledTimes(1);
    const updatePayload = (updateBuilder.update as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(updatePayload.calendar_event_id).toBe('event-1');
    expect(updatePayload.start_at).toBe('2026-07-06T11:00:00.000Z');
    expect(updatePayload.end_at).toBe('2026-07-06T11:45:00.000Z');
    // Lifecycle integrity: scheduling must never touch status or completed_at.
    expect(updatePayload).not.toHaveProperty('status');
    expect(updatePayload).not.toHaveProperty('completed_at');

    expect(auditInsert.insert).toHaveBeenCalledTimes(1);
    const auditPayload = (auditInsert.insert as ReturnType<typeof vi.fn>).mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(auditPayload.event_type).toBe('scheduled');
  });

  it('is idempotent — an already-linked item is reported without re-inserting a calendar event', async () => {
    const selectExisting = makeQuery({
      data: { id: 'a', calendar_event_id: 'existing-event' },
      error: null,
    });
    fromMock.mockReturnValueOnce(selectExisting);

    const results = await confirmSchedule(
      'user-1',
      [
        {
          itemId: 'a',
          title: 'Write essay',
          suggestedStart: '2026-07-06T11:00:00.000Z',
          suggestedEnd: '2026-07-06T11:45:00.000Z',
        },
      ],
      TZ,
    );

    expect(results).toEqual([
      { itemId: 'a', calendarEventId: 'existing-event', alreadyScheduled: true },
    ]);
    // Only the existence check ran — no insert into calendar_events.
    expect(fromMock).toHaveBeenCalledTimes(1);
  });
});
