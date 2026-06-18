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
});
