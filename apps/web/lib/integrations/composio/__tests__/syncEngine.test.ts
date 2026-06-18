import { describe, expect, it, vi } from 'vitest';

// The sync engine imports the Supabase admin client and Composio client at module
// load. Stub them so importing the pure mapper functions has no side effects.
vi.mock('@/lib/supabase/admin', () => ({ supabaseAdmin: {} }));
vi.mock('@/lib/integrations/accounts', () => ({
  upsertIntegrationAccount: vi.fn(),
  getIntegrationAccount: vi.fn(),
}));
vi.mock('../client', () => ({
  executeFirstAvailableTool: vi.fn(),
  getActiveProProviders: vi.fn(),
}));

import {
  extractItemsArray,
  mapLinearIssue,
  mapNotionPage,
  mapSlackItem,
} from '../syncEngine';

describe('extractItemsArray', () => {
  it('returns the array directly when given one', () => {
    expect(extractItemsArray([{ a: 1 }] as never)).toEqual([{ a: 1 }]);
  });

  it('finds arrays under common container keys', () => {
    expect(extractItemsArray({ issues: [{ id: '1' }] })).toEqual([{ id: '1' }]);
    expect(extractItemsArray({ results: [{ id: '2' }] })).toEqual([{ id: '2' }]);
  });

  it('finds arrays nested one level deeper', () => {
    expect(extractItemsArray({ data: { issues: [{ id: '3' }] } })).toEqual([
      { id: '3' },
    ]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(extractItemsArray({ foo: 'bar' })).toEqual([]);
  });

  it('extracts Slack search matches from nested payloads', () => {
    expect(
      extractItemsArray({
        messages: {
          matches: [{ ts: '1.23', text: 'Hello team' }],
        },
      })
    ).toEqual([{ ts: '1.23', text: 'Hello team' }]);
  });
});

describe('mapLinearIssue', () => {
  it('maps a Linear issue into a normalized source item', () => {
    const result = mapLinearIssue({
      id: 'iss_1',
      title: 'Fix login bug',
      description: 'Users cannot log in',
      dueDate: '2026-07-01',
      url: 'https://linear.app/iss_1',
      priority: 2,
      state: { name: 'In Progress', type: 'started' },
      assignee: { name: 'Sam' },
    });

    expect(result).toMatchObject({
      external_id: 'iss_1',
      item_type: 'issue',
      title: 'Fix login bug',
      status: 'In Progress',
      priority: 'high',
      completed: false,
    });
    expect(result?.assignees).toHaveLength(1);
  });

  it('marks completed when the state type is completed', () => {
    const result = mapLinearIssue({
      id: 'iss_2',
      title: 'Done thing',
      state: { name: 'Done', type: 'completed' },
    });
    expect(result?.completed).toBe(true);
  });

  it('returns null without an id or title', () => {
    expect(mapLinearIssue({ title: 'No id' })).toBeNull();
    expect(mapLinearIssue({ id: 'x' })).toBeNull();
  });
});

describe('mapNotionPage', () => {
  it('extracts title, due date, and status from properties', () => {
    const result = mapNotionPage({
      id: 'page_1',
      url: 'https://notion.so/page_1',
      properties: {
        Name: { type: 'title', title: [{ plain_text: 'Write spec' }] },
        Due: { type: 'date', date: { start: '2026-08-15' } },
        Status: { type: 'status', status: { name: 'In progress' } },
      },
    });

    expect(result).toMatchObject({
      external_id: 'page_1',
      item_type: 'assignment',
      title: 'Write spec',
      due_date: '2026-08-15',
      status: 'In progress',
      completed: false,
    });
  });

  it('marks completed when status indicates done', () => {
    const result = mapNotionPage({
      id: 'page_2',
      properties: {
        Name: { type: 'title', title: [{ plain_text: 'Old task' }] },
        Status: { type: 'status', status: { name: 'Done' } },
      },
    });
    expect(result?.completed).toBe(true);
  });

  it('falls back to Untitled and returns null without an id', () => {
    expect(mapNotionPage({ id: 'p', properties: {} })?.title).toBe('Untitled');
    expect(mapNotionPage({ properties: {} })).toBeNull();
  });
});

describe('mapSlackItem', () => {
  it('maps a Slack item and truncates long text', () => {
    const longText = 'x'.repeat(200);
    const result = mapSlackItem({
      ts: '123.456',
      text: longText,
      permalink: 'https://slack.com/archives/1',
    });

    expect(result).toMatchObject({
      external_id: '123.456',
      item_type: 'message',
      completed: false,
      url: 'https://slack.com/archives/1',
    });
    expect(result?.title.endsWith('...')).toBe(true);
    expect(result?.title.length).toBe(140);
  });

  it('returns null without an identifier', () => {
    expect(mapSlackItem({ text: 'no ts' })).toBeNull();
  });
});
