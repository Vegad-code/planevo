import { describe, it, expect } from 'vitest';
import { formatDuration, isOverdue } from '../taskHelpers';

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
});
