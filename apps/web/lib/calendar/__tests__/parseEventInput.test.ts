import { describe, expect, it } from 'vitest';
import { parseEventInput } from '../parseEventInput';

const REF = new Date(2026, 5, 24, 10, 0, 0); // Wed Jun 24 2026 10:00

describe('parseEventInput', () => {
  it('parses natural phrase without at or tilde', () => {
    const result = parseEventInput('Study session tomorrow 2pm for 90', REF);
    expect(result.title).toBe('Study session');
    expect(result.estimatedMinutes).toBe(90);
    expect(result.startAt).toBeDefined();
    expect(result.startAt!.getDate()).toBe(25);
    expect(result.startAt!.getHours()).toBe(14);
    expect(result.chips).toContain('90 min');
  });

  it('parses day of week and am time', () => {
    const result = parseEventInput('Team standup monday 9am for 30m', REF);
    expect(result.title).toBe('Team standup');
    expect(result.estimatedMinutes).toBe(30);
    expect(result.startAt!.getDay()).toBe(1); // Monday
    expect(result.startAt!.getHours()).toBe(9);
  });

  it('parses next friday with hour duration', () => {
    const result = parseEventInput(
      'Lunch with Alex next friday noon for 1 hour',
      REF
    );
    expect(result.title).toBe('Lunch with Alex');
    expect(result.estimatedMinutes).toBe(60);
    expect(result.startAt!.getDay()).toBe(5); // Friday
    expect(result.startAt!.getHours()).toBe(12);
  });

  it('parses at time with tomorrow', () => {
    const result = parseEventInput('Dentist at 3 tomorrow', REF);
    expect(result.title).toBe('Dentist');
    expect(result.startAt!.getDate()).toBe(25);
    expect(result.startAt!.getHours()).toBe(15);
  });

  it('parses for 2h with today time', () => {
    const result = parseEventInput('Deep work for 2h today at 4', REF);
    expect(result.title).toBe('Deep work');
    expect(result.estimatedMinutes).toBe(120);
    expect(result.startAt!.getDate()).toBe(24);
    expect(result.startAt!.getHours()).toBe(16);
  });

  it('does not false-positive on plain titles', () => {
    const result = parseEventInput('Team meeting', REF);
    expect(result.title).toBe('Team meeting');
    expect(result.startAt).toBeUndefined();
    expect(result.estimatedMinutes).toBeUndefined();
    expect(result.chips).toHaveLength(0);
  });

  it('still supports legacy tilde duration', () => {
    const result = parseEventInput('Focus block ~45m', REF);
    expect(result.title).toBe('Focus block');
    expect(result.estimatedMinutes).toBe(45);
  });

  it('extracts priority and source tags', () => {
    const result = parseEventInput('Read syllabus #high #Canvas tomorrow 3pm', REF);
    expect(result.title).toBe('Read syllabus');
    expect(result.priority).toBe('high');
    expect(result.source).toBe('Canvas');
    expect(result.startAt!.getHours()).toBe(15);
  });
});
