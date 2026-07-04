import { describe, expect, it } from 'vitest';
import {
  inferFlexibleEventDateTime,
  resolveRelativeDate,
} from '@/lib/bruno/dates';

// Thursday, July 2 2026, 10:00 AM in New York (14:00 UTC).
const REFERENCE = new Date('2026-07-02T14:00:00.000Z');
const TZ = 'America/New_York';

describe('resolveRelativeDate', () => {
  it('resolves today/tomorrow relative to the user timezone', () => {
    expect(resolveRelativeDate('today', REFERENCE, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 2,
    });
    expect(resolveRelativeDate('tomorrow', REFERENCE, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 3,
    });
  });

  it('counts today as the upcoming weekday for a bare weekday name', () => {
    // Reference is a Thursday.
    expect(resolveRelativeDate('thursday', REFERENCE, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 2,
    });
    expect(resolveRelativeDate('friday', REFERENCE, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 3,
    });
  });

  it('resolves next <weekday> to the following week when it matches today', () => {
    expect(resolveRelativeDate('next thursday', REFERENCE, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 9,
    });
    expect(resolveRelativeDate('next tuesday', REFERENCE, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 7,
    });
  });

  it('handles timezone boundaries (late night UTC is still the prior local day)', () => {
    // 2026-07-03T02:00Z is 10pm July 2 in New York.
    const lateNight = new Date('2026-07-03T02:00:00.000Z');
    expect(resolveRelativeDate('tomorrow', lateNight, TZ)).toEqual({
      year: 2026,
      month: 7,
      day: 3,
    });
  });
});

describe('inferFlexibleEventDateTime', () => {
  it('resolves "tomorrow at 3pm" (the old parser threw at execute time)', () => {
    const result = inferFlexibleEventDateTime(
      'tomorrow at 3pm',
      TZ,
      REFERENCE,
      60
    );
    // 3pm EDT on July 3 = 19:00 UTC.
    expect(result?.startTime).toBe('2026-07-03T19:00:00.000Z');
    expect(result?.endTime).toBe('2026-07-03T20:00:00.000Z');
  });

  it('resolves "next tuesday morning"', () => {
    const result = inferFlexibleEventDateTime(
      'study session next tuesday morning',
      TZ,
      REFERENCE,
      90
    );
    // 9am EDT on July 7 = 13:00 UTC.
    expect(result?.startTime).toBe('2026-07-07T13:00:00.000Z');
  });

  it('resolves "tonight"', () => {
    const result = inferFlexibleEventDateTime('gym tonight', TZ, REFERENCE, 60);
    // 7pm EDT July 2 = 23:00 UTC.
    expect(result?.startTime).toBe('2026-07-02T23:00:00.000Z');
  });

  it('still handles explicit month-day phrasing via the base parser', () => {
    const result = inferFlexibleEventDateTime(
      'July 28 at 9 AM',
      TZ,
      REFERENCE,
      60
    );
    expect(result?.startTime).toBe('2026-07-28T13:00:00.000Z');
  });

  it('defaults a date-only expression to 9am local instead of failing', () => {
    const result = inferFlexibleEventDateTime(
      'block time for essay tomorrow',
      TZ,
      REFERENCE,
      120
    );
    expect(result?.startTime).toBe('2026-07-03T13:00:00.000Z');
    expect(result?.endTime).toBe('2026-07-03T15:00:00.000Z');
  });

  it('returns null when there is no date signal at all', () => {
    expect(
      inferFlexibleEventDateTime('finish the essay', TZ, REFERENCE, 60)
    ).toBeNull();
  });
});
