import { describe, expect, it } from 'vitest';
import { parseNaturalInput } from '../parseNaturalInput';
import { parseTaskInput } from '../mapToTaskDraft';

const REF = new Date(2026, 5, 24, 10, 0, 0);

describe('parseNaturalInput', () => {
  it('parses work meeting at 3 tmr for 40min', () => {
    const result = parseNaturalInput('work meeting at 3 tmr for 40min', REF);
    expect(result.title).toBe('work meeting');
    expect(result.estimatedMinutes).toBe(40);
    expect(result.startAt).toBeDefined();
    expect(result.startAt!.getDate()).toBe(25);
    expect(result.startAt!.getHours()).toBe(15);
  });

  it('parses essay due friday with priority', () => {
    const result = parseNaturalInput('Essay due Friday #high', REF);
    expect(result.title).toBe('Essay');
    expect(result.priority).toBe('high');
    expect(result.hasDueCue).toBe(true);
    expect(result.dateOnly).toBe(true);
  });

  it('parses p1 priority alias', () => {
    const result = parseNaturalInput('Submit report p1 tomorrow', REF);
    expect(result.priority).toBe('critical');
  });

  it('parses recurrence every monday', () => {
    const result = parseNaturalInput('Water plants every monday', REF);
    expect(result.recurrencePattern).toBe('FREQ=WEEKLY;BYDAY=MO');
    expect(result.chips).toContain('Every monday');
  });

  it('does not false-positive monthly in title', () => {
    const result = parseNaturalInput('Create monthly report', REF);
    expect(result.recurrencePattern).toBeUndefined();
    expect(result.title).toBe('Create monthly report');
  });
});

describe('parseTaskInput', () => {
  it('maps date-only due for due cue', () => {
    const result = parseTaskInput('Essay due Friday #high', REF);
    expect(result.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.dueDateOnly).toBe(true);
    expect(result.priority).toBe('high');
  });

  it('maps timed due for at time phrases', () => {
    const result = parseTaskInput('work meeting at 3 tmr for 40min', REF);
    expect(result.title).toBe('work meeting');
    expect(result.estimatedMinutes).toBe(40);
    expect(result.dueDate).toContain('T');
  });

  it('maps backlog keyword', () => {
    const result = parseTaskInput('Read chapter backlog', REF);
    expect(result.isBacklog).toBe(true);
    expect(result.dueDate).toBeUndefined();
  });
});
