import { describe, expect, it, vi } from 'vitest';
import { buildBrunoContext } from '@/lib/bruno/contextBuilder';
import type { BrunoModelPolicy } from '@/lib/bruno/types';

const basePolicy: BrunoModelPolicy = {
  tier: 'standard',
  proLocked: false,
  freeCreditsAllowed: false,
  includeTasks: false,
  includeCalendar: false,
  includeCanvas: false,
  maxOutputTokens: 500,
  temperature: 0.2,
  upgradeCardEligible: false,
};

describe('buildBrunoContext', () => {
  it('does not load expensive context when the policy does not request it', async () => {
    const loaders = {
      loadTasks: vi.fn(),
      loadCalendar: vi.fn(),
      loadCanvas: vi.fn(),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: basePolicy,
      },
      loaders
    );

    expect(result).toEqual({
      taskContext: '',
      calendarContext: '',
      canvasContext: '',
      integrationContext: '',
    });
    expect(loaders.loadTasks).not.toHaveBeenCalled();
    expect(loaders.loadCalendar).not.toHaveBeenCalled();
    expect(loaders.loadCanvas).not.toHaveBeenCalled();
  });

  it('loads and bounds only the requested context', async () => {
    const loaders = {
      loadTasks: vi.fn().mockResolvedValue([
        {
          id: 'task-1',
          title: 'Essay',
          status: 'todo',
          dueDate: '2026-06-15',
          priority: 'high',
          estimatedMinutes: 45,
        },
      ]),
      loadCalendar: vi.fn().mockResolvedValue([
        {
          id: 'event-1',
          title: 'Class',
          startTime: '2026-06-14T17:00:00.000Z',
          endTime: '2026-06-14T18:00:00.000Z',
          status: 'confirmed',
        },
      ]),
      loadCanvas: vi.fn(),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: {
          ...basePolicy,
          includeTasks: true,
          includeCalendar: true,
        },
      },
      loaders
    );

    expect(result.taskContext).toContain('"Essay"');
    expect(result.calendarContext).toContain('"Class"');
    expect(loaders.loadCanvas).not.toHaveBeenCalled();
  });

  it('skips task loading when dataAccess.tasks is false even if policy includes tasks', async () => {
    const loaders = {
      loadTasks: vi.fn().mockResolvedValue([{ id: 't1', title: 'Test', status: 'todo', dueDate: null, priority: 'low', estimatedMinutes: 30 }]),
      loadCalendar: vi.fn(),
      loadCanvas: vi.fn(),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: { ...basePolicy, includeTasks: true },
        dataAccess: { tasks: false, calendar: true, canvas: true, integrations: true },
      },
      loaders
    );

    expect(result.taskContext).toBe('');
    expect(loaders.loadTasks).not.toHaveBeenCalled();
  });

  it('loads tasks when both policy and dataAccess permit', async () => {
    const loaders = {
      loadTasks: vi.fn().mockResolvedValue([{ id: 't1', title: 'Homework', status: 'todo', dueDate: null, priority: 'high', estimatedMinutes: 45 }]),
      loadCalendar: vi.fn(),
      loadCanvas: vi.fn(),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: { ...basePolicy, includeTasks: true },
        dataAccess: { tasks: true, calendar: true, canvas: true, integrations: true },
      },
      loaders
    );

    expect(result.taskContext).toContain('"Homework"');
    expect(loaders.loadTasks).toHaveBeenCalledOnce();
  });

  it('skips calendar loading when dataAccess.calendar is false even if policy includes calendar', async () => {
    const loaders = {
      loadTasks: vi.fn(),
      loadCalendar: vi.fn().mockResolvedValue([
        {
          id: 'event-1',
          title: 'Class',
          startTime: '2026-06-14T17:00:00.000Z',
          endTime: '2026-06-14T18:00:00.000Z',
          status: 'confirmed',
        },
      ]),
      loadCanvas: vi.fn(),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: { ...basePolicy, includeCalendar: true },
        dataAccess: { tasks: true, calendar: false, canvas: true, integrations: true },
      },
      loaders
    );

    expect(result.calendarContext).toBe('');
    expect(loaders.loadCalendar).not.toHaveBeenCalled();
  });

  it('skips canvas loading when dataAccess.canvas is false even if policy includes canvas', async () => {
    const loaders = {
      loadTasks: vi.fn(),
      loadCalendar: vi.fn(),
      loadCanvas: vi.fn().mockResolvedValue([
        {
          id: 'a1',
          name: 'Essay',
          courseName: 'History',
          dueAt: '2026-06-20',
          description: null,
          htmlUrl: null,
        },
      ]),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: { ...basePolicy, includeCanvas: true },
        dataAccess: { tasks: true, calendar: true, canvas: false, integrations: true },
      },
      loaders
    );

    expect(result.canvasContext).toBe('');
    expect(loaders.loadCanvas).not.toHaveBeenCalled();
  });

  it('skips integration loading when dataAccess.integrations is false even if policy includes tasks', async () => {
    const loaders = {
      loadTasks: vi.fn().mockResolvedValue([]),
      loadCalendar: vi.fn(),
      loadCanvas: vi.fn(),
      loadIntegrations: vi.fn().mockResolvedValue({
        pulses: [{ provider: 'linear', connected: true, openCount: 2, dueThisWeek: 1, label: 'Linear' }],
        items: [],
      }),
    };

    const result = await buildBrunoContext(
      {
        userId: 'user-1',
        policy: { ...basePolicy, includeTasks: true },
        dataAccess: { tasks: true, calendar: true, canvas: true, integrations: false },
      },
      loaders
    );

    expect(result.integrationContext).toBe('');
    expect(loaders.loadIntegrations).not.toHaveBeenCalled();
  });
});

