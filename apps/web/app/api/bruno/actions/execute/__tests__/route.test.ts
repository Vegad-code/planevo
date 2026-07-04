import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';

const {
  executeActionMock,
  fromMock,
  logExecuteActionAuditMock,
} = vi.hoisted(() => ({
  executeActionMock: vi.fn(),
  fromMock: vi.fn(),
  logExecuteActionAuditMock: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
}));

vi.mock('@/lib/auth/origin-guard', () => ({
  isAllowedOriginOrBearer: vi.fn(() => true),
}));

vi.mock('@/lib/auth/get-user', () => ({
  getAuthenticatedUser: vi.fn(async () => ({
    user: { id: '11111111-1111-1111-1111-111111111111' },
    error: null,
  })),
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: fromMock,
  },
}));

vi.mock('@/lib/bruno/executeAction', () => ({
  executeAction: executeActionMock,
  logExecuteActionAudit: logExecuteActionAuditMock,
}));

function createBuilder(options: {
  maybeSingle?: unknown;
  single?: unknown;
  limit?: unknown;
} = {}) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;

  Object.assign(builder, {
    select: vi.fn(chain),
    eq: vi.fn(chain),
    contains: vi.fn(chain),
    gte: vi.fn(chain),
    order: vi.fn(chain),
    insert: vi.fn(chain),
    update: vi.fn(chain),
    limit: vi.fn(async () => options.limit ?? { data: [], error: null }),
    maybeSingle: vi.fn(async () => options.maybeSingle ?? { data: null, error: null }),
    single: vi.fn(async () => options.single ?? { data: null, error: null }),
  });

  return builder;
}

function queueBuilders(builders: Array<Record<string, unknown>>) {
  const queue = [...builders];
  fromMock.mockImplementation(() => {
    const next = queue.shift();
    if (!next) throw new Error('Unexpected Supabase query');
    return next;
  });
}

describe('/api/bruno/actions/execute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeActionMock.mockResolvedValue({
      success: true,
      data: {
        eventId: '22222222-2222-2222-2222-222222222222',
        title: 'Meeting',
      },
    });
    logExecuteActionAuditMock.mockResolvedValue(undefined);
  });

  it('retries a previous failed execution row using the verified proposal payload', async () => {
    const exactProposal = createBuilder({
      maybeSingle: {
        data: {
          id: 'proposal-log-1',
          arguments: {
            type: 'UPDATE_CALENDAR_EVENT',
            title: 'Meeting',
            description: 'Move Meeting',
            payload: {
              eventId: '22222222-2222-2222-2222-222222222222',
              startTime: '2026-07-03T23:00:00.000Z',
              endTime: '2026-07-04T01:00:00.000Z',
            },
          },
        },
        error: null,
      },
    });
    const profile = createBuilder({
      maybeSingle: { data: { scheduling_preferences: { timezone: 'America/Los_Angeles' } }, error: null },
    });
    const reservation = createBuilder({
      single: { data: null, error: { code: '23505', message: 'duplicate' } },
    });
    const existingExecution = createBuilder({
      maybeSingle: {
        data: {
          id: 'execute-log-1',
          result: {
            status: 'failed',
            error: 'Event ID is required to update a calendar event.',
          },
          created_at: new Date(Date.now() - 60_000).toISOString(),
        },
        error: null,
      },
    });
    const retryUpdate = createBuilder();
    const successUpdate = createBuilder();

    queueBuilders([
      exactProposal,
      profile,
      reservation,
      existingExecution,
      retryUpdate,
      successUpdate,
    ]);

    const request = new NextRequest('http://localhost/api/bruno/actions/execute', {
      method: 'POST',
      body: JSON.stringify({
        proposalId: 'proposal-1',
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'Meeting',
        description: 'Move Meeting',
        payload: {},
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      eventId: '22222222-2222-2222-2222-222222222222',
    });
    expect(executeActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          eventId: '22222222-2222-2222-2222-222222222222',
        }),
      }),
      expect.objectContaining({
        mergedPayload: expect.objectContaining({
          eventId: '22222222-2222-2222-2222-222222222222',
        }),
      })
    );
  });

  it('rejects task execution when Bruno task access is disabled', async () => {
    const exactProposal = createBuilder({
      maybeSingle: {
        data: {
          id: 'proposal-log-1',
          arguments: {
            type: 'UPDATE_TASK',
            title: 'Finish reading',
            description: 'Mark Finish reading complete',
            payload: {
              taskId: '33333333-3333-3333-3333-333333333333',
              status: 'done',
              completed: true,
            },
          },
        },
        error: null,
      },
    });
    const profile = createBuilder({
      maybeSingle: {
        data: {
          scheduling_preferences: {
            bruno_access_tasks: false,
            timezone: 'America/Los_Angeles',
          },
        },
        error: null,
      },
    });

    queueBuilders([exactProposal, profile]);

    const request = new NextRequest('http://localhost/api/bruno/actions/execute', {
      method: 'POST',
      body: JSON.stringify({
        proposalId: 'proposal-1',
        type: 'UPDATE_TASK',
        title: 'Finish reading',
        payload: {},
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body).toMatchObject({
      success: false,
    });
    expect(body.error).toMatch(/task access is disabled/i);
    expect(executeActionMock).not.toHaveBeenCalled();
  });
});
