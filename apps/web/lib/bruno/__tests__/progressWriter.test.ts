import { describe, expect, it } from 'vitest';
import { BrunoProgressWriter } from '@/lib/bruno/progressWriter';

describe('BrunoProgressWriter', () => {
  it('emits progress updates as steps advance', () => {
    const writes: Array<{ type: string; data?: unknown }> = [];
    const writer = new BrunoProgressWriter({
      write: (chunk) => writes.push(chunk),
    });

    writer.markReadDone();
    writer.markSafetyDone();
    writer.markRouteDone('daily_planning', 'Planning the rest of today');

    const last = writes.at(-1);
    expect(last?.type).toBe('data-bruno-progress');
    expect(last?.data).toMatchObject({
      phase: 'working',
      summary: 'Loading your planner context',
    });
  });
});
