import { describe, expect, it } from 'vitest';
import { inferEnergyLevel } from '@/lib/plan/infer-energy';

describe('inferEnergyLevel', () => {
  describe('with default "morning" preference', () => {
    it('returns "high" during morning focus window (6-12)', () => {
      expect(inferEnergyLevel(null, 8)).toBe('high');
      expect(inferEnergyLevel(undefined, 10)).toBe('high');
    });

    it('returns "low" late at night (22+)', () => {
      expect(inferEnergyLevel(null, 23)).toBe('low');
      expect(inferEnergyLevel(null, 0)).toBe('low');
      expect(inferEnergyLevel(null, 3)).toBe('low');
    });

    it('returns "low" during post-lunch dip (13-14)', () => {
      expect(inferEnergyLevel(null, 13)).toBe('low');
      expect(inferEnergyLevel(null, 14)).toBe('low');
    });

    it('returns "medium" during other hours', () => {
      expect(inferEnergyLevel(null, 15)).toBe('medium');
      expect(inferEnergyLevel(null, 16)).toBe('medium');
      expect(inferEnergyLevel(null, 20)).toBe('medium');
    });
  });

  describe('with explicit energy preferences', () => {
    it('returns "high" during afternoon preference window', () => {
      expect(inferEnergyLevel('afternoon', 14)).toBe('high');
    });

    it('returns "high" during evening preference window', () => {
      expect(inferEnergyLevel('evening', 19)).toBe('high');
    });

    it('returns "high" during night preference window (wraps midnight)', () => {
      expect(inferEnergyLevel('night', 21)).toBe('high');
      expect(inferEnergyLevel('night', 1)).toBe('high');
    });

    it('returns "high" at any hour for chaos preference', () => {
      expect(inferEnergyLevel('chaos', 3)).toBe('high');
      expect(inferEnergyLevel('chaos', 14)).toBe('high');
      expect(inferEnergyLevel('chaos', 23)).toBe('high');
    });

    it('falls back to morning range for unknown preferences', () => {
      expect(inferEnergyLevel('unknown_pref', 8)).toBe('high');
    });
  });

  describe('with memory focus windows', () => {
    it('returns "high" when hour falls inside a memory focus window', () => {
      const memory = {
        preferred_focus_windows: [{ start: '14:00', end: '16:00' }],
        planning_style: undefined,
      };
      expect(inferEnergyLevel('morning', 15, memory as never)).toBe('high');
    });

    it('does not override when hour is outside memory windows', () => {
      const memory = {
        preferred_focus_windows: [{ start: '14:00', end: '16:00' }],
        planning_style: undefined,
      };
      expect(inferEnergyLevel('morning', 20, memory as never)).toBe('medium');
    });

    it('handles empty preferred_focus_windows gracefully', () => {
      const memory = {
        preferred_focus_windows: [],
        planning_style: undefined,
      };
      expect(inferEnergyLevel('morning', 20, memory as never)).toBe('medium');
    });

    it('handles undefined memory gracefully', () => {
      expect(inferEnergyLevel('morning', 20, undefined)).toBe('medium');
    });
  });

  describe('boundary conditions', () => {
    it('hour 6 is the start of morning = "high"', () => {
      expect(inferEnergyLevel('morning', 6)).toBe('high');
    });

    it('hour 12 is the end of morning (exclusive), start of afternoon', () => {
      expect(inferEnergyLevel('morning', 12)).not.toBe('high');
      expect(inferEnergyLevel('afternoon', 12)).toBe('high');
    });

    it('hour 22 is the start of late night = "low"', () => {
      expect(inferEnergyLevel('morning', 22)).toBe('low');
    });

    it('hour 5 is the end of late night = "low"', () => {
      expect(inferEnergyLevel('morning', 5)).toBe('low');
    });
  });
});
