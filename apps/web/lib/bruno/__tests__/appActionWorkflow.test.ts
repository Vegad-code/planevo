import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runBrunoAppActionWorkflow } from '@/lib/bruno/appActionWorkflow';
import type { Database } from '@/types/database';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const EVENT_ID = '22222222-2222-2222-2222-222222222222';
const WORK_ID = '33333333-3333-3333-3333-333333333333';
const TASK_ID = '55555555-5555-5555-5555-555555555555';
const TIME_ZONE = 'America/Los_Angeles';
const REFERENCE_DATE = new Date('2026-07-01T19:00:00.000Z');

type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string | null;
  source: string | null;
  color: string | null;
  metadata: Record<string, never>;
  is_all_day: boolean | null;
};

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
};

function createEvent(overrides: Partial<CalendarEventRow> = {}): CalendarEventRow {
  return {
    id: EVENT_ID,
    title: 'Meeting',
    description: null,
    start_time: '2026-07-02T23:00:00.000Z',
    end_time: '2026-07-03T01:00:00.000Z',
    status: 'accepted',
    source: 'schedule',
    color: null,
    metadata: {},
    is_all_day: false,
    ...overrides,
  };
}

function createWorkflowSupabase(input: {
  events?: CalendarEventRow[];
  tasks?: TaskRow[];
} = {}) {
  const events = input.events ?? [];
  const tasks = input.tasks ?? [];
  const calendarChain = {
    select: vi.fn(() => calendarChain),
    eq: vi.fn(() => calendarChain),
    gte: vi.fn(() => calendarChain),
    lt: vi.fn(() => calendarChain),
    or: vi.fn(() => calendarChain),
    order: vi.fn(() => calendarChain),
    limit: vi.fn().mockResolvedValue({ data: events, error: null }),
  };
  const taskChain = {
    select: vi.fn(() => taskChain),
    eq: vi.fn(() => taskChain),
    is: vi.fn(() => taskChain),
    order: vi.fn(() => taskChain),
    limit: vi.fn().mockResolvedValue({ data: tasks, error: null }),
  };
  const insert = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn(() => ({
    eq: vi.fn().mockResolvedValue({ error: null }),
  }));
  const from = vi.fn((table: string) => {
    if (table === 'bruno_tool_logs') return { insert, update };
    if (table === 'tasks') return taskChain;
    return calendarChain;
  });

  return {
    supabase: { from } as unknown as SupabaseClient<Database>,
    calendarChain,
    taskChain,
    insert,
    update,
  };
}

describe('runBrunoAppActionWorkflow', () => {
  it('moves Thursday events to the next day and creates the requested Work block', async () => {
    const { supabase, insert } = createWorkflowSupabase({ events: [createEvent()] });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message:
        'Move everything i have on thursday this week to the next day and replace with one event that Says work that spans from 9am-2pm if it is not already in there.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(2);
    expect(result.proposals[0]).toMatchObject({
      type: 'UPDATE_CALENDAR_EVENT',
      title: 'Meeting',
      payload: {
        eventId: EVENT_ID,
        startTime: '2026-07-03T23:00:00.000Z',
        endTime: '2026-07-04T01:00:00.000Z',
      },
    });
    expect(result.proposals[1]).toMatchObject({
      type: 'CREATE_TIME_BLOCK',
      title: 'Work',
      payload: {
        startTime: '2026-07-02T16:00:00.000Z',
        endTime: '2026-07-02T21:00:00.000Z',
        colorCategory: 'work',
      },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        idempotency_key: `proposal:${result.proposals[0].id}`,
        arguments: expect.objectContaining({
          proposalId: result.proposals[0].id,
        }),
      })
    );
  });

  it('moves anything on July 2 to July 3 with real event IDs', async () => {
    const { supabase } = createWorkflowSupabase({ events: [createEvent()] });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Anything on July 2nd, move that to July 3rd.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: 'UPDATE_CALENDAR_EVENT',
      payload: {
        eventId: EVENT_ID,
        startTime: '2026-07-03T23:00:00.000Z',
        endTime: '2026-07-04T01:00:00.000Z',
      },
    });
  });

  it('uses stable proposal IDs for identical deterministic proposals', async () => {
    const first = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Anything on July 2nd, move that to July 3rd.',
      timeZone: TIME_ZONE,
      supabase: createWorkflowSupabase({ events: [createEvent()] }).supabase,
      referenceDate: REFERENCE_DATE,
    });
    const second = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Anything on July 2nd, move that to July 3rd.',
      timeZone: TIME_ZONE,
      supabase: createWorkflowSupabase({ events: [createEvent()] }).supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(first.proposals[0]?.id).toBe(second.proposals[0]?.id);
    expect(first.proposals[0]?.id).toMatch(/^proposal-/);
  });

  it('reschedules tasks due on a source day to a target day', async () => {
    const { supabase } = createWorkflowSupabase({
      tasks: [
        {
          id: TASK_ID,
          title: 'Read chapter 4',
          due_date: '2026-07-02',
        },
      ],
    });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Shift all my tasks from July 2nd to July 3rd.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: 'RESCHEDULE_TASK',
      payload: {
        taskId: TASK_ID,
        dueDate: '2026-07-03',
      },
    });
  });

  it('reschedules a single meeting to a new time on the same day', async () => {
    const { supabase } = createWorkflowSupabase({
      events: [
        createEvent({
          start_time: '2026-07-01T21:00:00.000Z',
          end_time: '2026-07-01T22:00:00.000Z',
        }),
      ],
    });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Reschedule my meeting to 4pm.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: 'UPDATE_CALENDAR_EVENT',
      payload: {
        eventId: EVENT_ID,
      },
    });
  });

  it('resolves Thursday in a July month view to Jul 2, not the selected end-of-month cell', async () => {
    const eveningStudy = createEvent({
      title: 'JS Study — Week 1 Review',
      start_time: '2026-07-03T02:00:00.000Z',
      end_time: '2026-07-03T04:00:00.000Z',
    });
    const { supabase } = createWorkflowSupabase({ events: [eveningStudy] });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Move everything I have on Thursday to Friday',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: new Date('2026-07-01T12:00:00.000Z'),
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]?.payload.startTime).toContain('2026-07-04');
  });

  it('finds Thursday evening events when using the user timezone', async () => {
    const eveningStudy = createEvent({
      title: 'JS Study — Week 1 Review',
      start_time: '2026-07-03T02:00:00.000Z',
      end_time: '2026-07-03T04:00:00.000Z',
    });
    const { supabase } = createWorkflowSupabase({ events: [eveningStudy] });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Move everything I have on Thursday to Friday',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: 'UPDATE_CALENDAR_EVENT',
      title: 'JS Study — Week 1 Review',
    });
  });

  it('does not duplicate or move an existing matching replacement Work block', async () => {
    const work = createEvent({
      id: WORK_ID,
      title: 'Work',
      start_time: '2026-07-02T16:00:00.000Z',
      end_time: '2026-07-02T21:00:00.000Z',
    });
    const { supabase } = createWorkflowSupabase({ events: [createEvent(), work] });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message:
        'Move everything I have on Thursday this week to the next day and replace with one event that says Work from 9am-2pm if it is not already in there.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: 'UPDATE_CALENDAR_EVENT',
      payload: { eventId: EVENT_ID },
    });
  });

  it('prepares a high-risk delete proposal when exactly one event matches the date', async () => {
    const { supabase } = createWorkflowSupabase({ events: [createEvent()] });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Delete the event on July 2nd.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toHaveLength(1);
    expect(result.proposals[0]).toMatchObject({
      type: 'DELETE_CALENDAR_EVENT',
      riskLevel: 'high',
      requiresConfirmation: true,
      payload: { eventId: EVENT_ID },
    });
  });

  it('asks the user to choose when a delete date has multiple matching events', async () => {
    const { supabase } = createWorkflowSupabase({
      events: [createEvent(), createEvent({ id: WORK_ID, title: 'Work' })],
    });

    const result = await runBrunoAppActionWorkflow({
      userId: USER_ID,
      message: 'Delete the event on July 2nd.',
      timeZone: TIME_ZONE,
      supabase,
      referenceDate: REFERENCE_DATE,
    });

    expect(result.handled).toBe(true);
    expect(result.proposals).toEqual([]);
    expect(result.text).toMatch(/multiple events/i);
  });
});
