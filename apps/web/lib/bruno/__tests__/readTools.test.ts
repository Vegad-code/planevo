import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  getBrunoReadTools,
  sanitizeSearchQuery,
} from '@/lib/bruno/readTools';
import type { BrunoDataAccess } from '@/lib/bruno/types';

const USER_ID = '11111111-1111-1111-1111-111111111111';

const allEnabled: BrunoDataAccess = {
  tasks: true,
  calendar: true,
  canvas: true,
  integrations: true,
};

const allDisabled: BrunoDataAccess = {
  tasks: false,
  calendar: false,
  canvas: false,
  integrations: false,
};

function createChain(finalResult: { data?: unknown; error?: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  const methods = [
    'select',
    'eq',
    'is',
    'in',
    'or',
    'ilike',
    'lte',
    'gte',
    'order',
    'limit',
  ];
  for (const method of methods) {
    chain[method] = vi.fn(() => chain);
  }
  chain.then = vi.fn((onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(finalResult).then(onFulfilled)
  ) as unknown as ReturnType<typeof vi.fn>;
  return chain;
}

async function runTool(
  toolName: keyof ReturnType<typeof getBrunoReadTools>,
  dataAccess: BrunoDataAccess,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: any = {}
) {
  const tools = getBrunoReadTools(USER_ID, dataAccess);
  const selected = tools[toolName];
  if (!selected || !('execute' in selected) || typeof selected.execute !== 'function') {
    throw new Error(`Tool ${toolName} has no execute`);
  }
  return selected.execute(args, {} as never);
}

describe('sanitizeSearchQuery', () => {
  it('strips PostgREST filter-breaking characters', () => {
    expect(sanitizeSearchQuery('foo%bar,(test)')).toBe('foobartest');
  });
});

describe('getBrunoReadTools', () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it('search_tasks returns ACCESS_DISABLED when tasks access is off', async () => {
    const result = await runTool('search_tasks', { ...allEnabled, tasks: false });
    expect(result).toMatchObject({ success: false, error: 'ACCESS_DISABLED' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('search_calendar_events returns ACCESS_DISABLED when calendar access is off', async () => {
    const result = await runTool('search_calendar_events', {
      ...allEnabled,
      calendar: false,
    });
    expect(result).toMatchObject({ success: false, error: 'ACCESS_DISABLED' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('search_canvas_assignments returns ACCESS_DISABLED when canvas access is off', async () => {
    const result = await runTool('search_canvas_assignments', {
      ...allEnabled,
      canvas: false,
    });
    expect(result).toMatchObject({ success: false, error: 'ACCESS_DISABLED' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('search_work_items returns ACCESS_DISABLED when integrations access is off', async () => {
    const result = await runTool('search_work_items', {
      ...allEnabled,
      integrations: false,
    });
    expect(result).toMatchObject({ success: false, error: 'ACCESS_DISABLED' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('get_integrations_status returns ACCESS_DISABLED when integrations access is off', async () => {
    const result = await runTool('get_integrations_status', {
      ...allEnabled,
      integrations: false,
    });
    expect(result).toMatchObject({ success: false, error: 'ACCESS_DISABLED' });
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('search_tasks queries tasks table only', async () => {
    const chain = createChain({
      data: [
        {
          id: 't1',
          title: 'Homework',
          description: null,
          notes: null,
          status: 'todo',
          due_date: null,
          priority: 'high',
          estimated_minutes: 30,
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await runTool('search_tasks', allEnabled, { query: 'home' });

    expect(mockFrom).toHaveBeenCalledWith('tasks');
    expect(mockFrom).not.toHaveBeenCalledWith('source_items');
    expect(chain.or).toHaveBeenCalledWith(
      'title.ilike.%home%,description.ilike.%home%'
    );
    expect(result).toMatchObject({ success: true, tasks: [{ title: 'Homework' }] });
  });

  it('search_work_items queries source_items with provider filter', async () => {
    const chain = createChain({
      data: [
        {
          id: 'si1',
          provider: 'linear',
          title: 'Fix bug',
          status: 'open',
          due_date: null,
          url: 'https://linear.app/issue/1',
        },
      ],
      error: null,
    });
    mockFrom.mockReturnValue(chain);

    const result = await runTool('search_work_items', allEnabled, {
      query: 'bug',
      provider: 'linear',
    });

    expect(mockFrom).toHaveBeenCalledWith('source_items');
    expect(chain.in).toHaveBeenCalledWith('provider', ['linear']);
    expect(chain.ilike).toHaveBeenCalledWith('title', '%bug%');
    expect(result).toMatchObject({
      success: true,
      items: [{ provider: 'linear', title: 'Fix bug' }],
    });
  });

  it('search_tasks clamps limit to 100', async () => {
    const chain = createChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);

    await runTool('search_tasks', allEnabled, { limit: 999 });

    expect(chain.limit).toHaveBeenCalledWith(100);
  });
});

describe('buildReadToolsBlock', () => {
  it('is exported from brunoPrompts and lists enabled tools only', async () => {
    const { buildReadToolsBlock } = await import('@/lib/bruno/brunoPrompts');
    const block = buildReadToolsBlock(allDisabled);
    expect(block).toBe('');

    const enabledBlock = buildReadToolsBlock(allEnabled);
    expect(enabledBlock).toContain('search_tasks');
    expect(enabledBlock).toContain('search_work_items');
    expect(enabledBlock).toContain('get_integrations_status');
  });
});
