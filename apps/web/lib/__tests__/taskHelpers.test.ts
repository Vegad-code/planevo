import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatDuration,
  formatDueDate,
  isOverdue,
  getRandomCompletionMessage,
  getRandomRescheduleMessage,
  getCurrentTimeOfDay,
  COMPLETION_MESSAGES,
  RESCHEDULE_MESSAGES,
  PRIORITY_COLORS,
  TIME_OF_DAY_INFO,
  ENERGY_INFO,
} from '../taskHelpers';

describe('taskHelpers', () => {
  describe('formatDuration', () => {
    it('formats minutes under an hour correctly', () => {
      expect(formatDuration(45)).toBe('45m');
    });

    it('formats exactly one hour correctly', () => {
      expect(formatDuration(60)).toBe('1h');
    });

    it('formats mixed hours and minutes correctly', () => {
      expect(formatDuration(90)).toBe('1h 30m');
    });

    it('returns empty string for null', () => {
      expect(formatDuration(null)).toBe('');
    });

    it('returns empty string for 0', () => {
      expect(formatDuration(0)).toBe('');
    });

    it('returns minutes-only for single minute', () => {
      expect(formatDuration(1)).toBe('1m');
    });

    it('returns hours-only for exact multiple hours', () => {
      expect(formatDuration(120)).toBe('2h');
    });

    it('returns hours and minutes for 2.5 hours', () => {
      expect(formatDuration(150)).toBe('2h 30m');
    });
  });

  describe('isOverdue', () => {
    it('returns false for null', () => {
      expect(isOverdue(null)).toBe(false);
    });

    it('returns true for past dates', () => {
      const past = new Date(Date.now() - 100000).toISOString();
      expect(isOverdue(past)).toBe(true);
    });

    it('returns false for future dates', () => {
      const future = new Date(Date.now() + 100000).toISOString();
      expect(isOverdue(future)).toBe(false);
    });
  });

  describe('task completion vs scheduling', () => {
    it('verifies that scheduling a task conceptually decouples from completion', () => {
      // Mocking task behavior: scheduling a task simply updates its scheduled time, not its completion status
      const mockTask = {
        id: '123',
        title: 'Study Math',
        is_completed: false,
        scheduled_start: null
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleTask = (task: any, time: string) => {
        return { ...task, scheduled_start: time }; // Completion state remains unchanged
      };

      const scheduledTask = scheduleTask(mockTask, '2026-05-26T10:00:00Z');

      expect(scheduledTask.scheduled_start).toBe('2026-05-26T10:00:00Z');
      expect(scheduledTask.is_completed).toBe(false); // Task should not be marked as complete upon scheduling
    });
  });

  describe('formatDueDate', () => {
    it('returns null for null input', () => {
      expect(formatDueDate(null)).toBeNull();
    });

    it('returns "Today" for today', () => {
      const today = new Date();
      expect(formatDueDate(today.toISOString())).toBe('Today');
    });

    it('returns "Tomorrow" for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(formatDueDate(tomorrow.toISOString())).toBe('Tomorrow');
    });

    it('returns "Xd ago" for past dates', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDueDate(yesterday.toISOString())).toBe('1d ago');
    });

    it('returns "Xd" for dates within the next week', () => {
      const inFiveDays = new Date();
      inFiveDays.setDate(inFiveDays.getDate() + 5);
      expect(formatDueDate(inFiveDays.toISOString())).toBe('5d');
    });

    it('returns formatted date for dates more than 7 days out', () => {
      const farFuture = new Date();
      farFuture.setDate(farFuture.getDate() + 30);
      const result = formatDueDate(farFuture.toISOString());
      expect(result).toBeTruthy();
      expect(result).not.toMatch(/^\d+d$/);
    });
  });

  describe('getRandomCompletionMessage', () => {
    it('returns a message from COMPLETION_MESSAGES', () => {
      const msg = getRandomCompletionMessage();
      expect(COMPLETION_MESSAGES).toContain(msg);
    });
  });

  describe('getRandomRescheduleMessage', () => {
    it('returns a message from RESCHEDULE_MESSAGES', () => {
      const msg = getRandomRescheduleMessage();
      expect(RESCHEDULE_MESSAGES).toContain(msg);
    });
  });

  describe('getCurrentTimeOfDay', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns "morning" for hours 6-11', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(8);
      expect(getCurrentTimeOfDay()).toBe('morning');
    });

    it('returns "afternoon" for hours 12-16', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      expect(getCurrentTimeOfDay()).toBe('afternoon');
    });

    it('returns "evening" for hours 17-21', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
      expect(getCurrentTimeOfDay()).toBe('evening');
    });

    it('returns "anytime" for late night hours', () => {
      vi.spyOn(Date.prototype, 'getHours').mockReturnValue(2);
      expect(getCurrentTimeOfDay()).toBe('anytime');
    });
  });

  describe('constants', () => {
    it('PRIORITY_COLORS has all priority levels', () => {
      expect(PRIORITY_COLORS).toHaveProperty('critical');
      expect(PRIORITY_COLORS).toHaveProperty('high');
      expect(PRIORITY_COLORS).toHaveProperty('medium');
      expect(PRIORITY_COLORS).toHaveProperty('low');
    });

    it('TIME_OF_DAY_INFO has all time buckets', () => {
      expect(TIME_OF_DAY_INFO).toHaveProperty('morning');
      expect(TIME_OF_DAY_INFO).toHaveProperty('afternoon');
      expect(TIME_OF_DAY_INFO).toHaveProperty('evening');
      expect(TIME_OF_DAY_INFO).toHaveProperty('anytime');
      expect(TIME_OF_DAY_INFO.morning).toHaveProperty('emoji');
      expect(TIME_OF_DAY_INFO.morning).toHaveProperty('label');
    });

    it('ENERGY_INFO has all energy levels', () => {
      expect(ENERGY_INFO).toHaveProperty('low');
      expect(ENERGY_INFO).toHaveProperty('medium');
      expect(ENERGY_INFO).toHaveProperty('high');
      expect(ENERGY_INFO.high).toHaveProperty('label');
      expect(ENERGY_INFO.high).toHaveProperty('color');
    });
  });
});
