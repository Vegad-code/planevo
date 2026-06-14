import { describe, expect, it } from 'vitest';
import {
  buildPageContextBlock,
  pageContextSchema,
} from '@/lib/bruno/page-context';

describe('page context', () => {
  it('validates and formats bounded UI metadata', () => {
    const context = pageContextSchema.parse({
      source: 'calendar',
      page: '/dashboard/calendar',
      label: 'Calendar - Week of Jun 8',
      payload: {
        activeView: 'week',
        selectedDate: '2026-06-13T00:00:00.000Z',
      },
    });

    expect(buildPageContextBlock(context)).toContain(
      'CURRENT PLANEVO PAGE CONTEXT'
    );
    expect(buildPageContextBlock(context)).toContain(
      'Label: Calendar - Week of Jun 8'
    );
    expect(buildPageContextBlock(context)).toContain('"activeView":"week"');
  });

  it('returns no prompt block when context is absent', () => {
    expect(buildPageContextBlock(undefined)).toBe('');
  });

  it('rejects oversized labels', () => {
    expect(() =>
      pageContextSchema.parse({
        label: 'x'.repeat(161),
      })
    ).toThrow();
  });
});
