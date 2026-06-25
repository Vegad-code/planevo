import { describe, expect, it } from 'vitest';

import {
  canSendNotification,
  defaultNotificationPreferences,
  getLocalDateKey,
  isLocalTimeWithinWindow,
  isPastLocalTime,
  normalizeNotificationPreferences,
} from '../preferences';

describe('notification preferences', () => {
  it('backfills new notification types for older preference rows', () => {
    const preferences = normalizeNotificationPreferences({
      master_toggle: true,
      channels: { push: true, email: true },
      quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
      types: {
        ...defaultNotificationPreferences.types,
        deadline_rescue: false,
      },
    });

    expect(preferences.types.deadline_rescue).toBe(false);
    expect(preferences.types.weekly_review).toBe(true);
    expect(preferences.types.billing).toBe(true);
  });

  it('blocks disabled channels and notification types', () => {
    expect(canSendNotification({
      master_toggle: true,
      channels: { push: false, email: true },
      quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
      types: defaultNotificationPreferences.types,
    }, 'push', 'daily_plan')).toBe(false);
  });

  it('matches local delivery windows and local dates', () => {
    const date = new Date('2026-06-04T16:15:00.000Z');

    expect(isLocalTimeWithinWindow(date, 'America/Los_Angeles', '09:00')).toBe(true);
    expect(isLocalTimeWithinWindow(date, 'America/New_York', '09:00')).toBe(false);
    expect(getLocalDateKey(date, 'America/Los_Angeles')).toBe('2026-06-04');
  });

  it('detects when local time has passed a target time', () => {
    const morning = new Date('2026-06-04T16:15:00.000Z');

    expect(isPastLocalTime(morning, 'America/Los_Angeles', '09:00')).toBe(true);
    expect(isPastLocalTime(morning, 'America/Los_Angeles', '18:00')).toBe(false);
  });
});
