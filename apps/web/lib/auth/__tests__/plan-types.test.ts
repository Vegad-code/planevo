import { describe, it, expect } from 'vitest';
import { normalizePlanType } from '../plan-types';

describe('normalizePlanType', () => {
  it('should return "free" by default for null or undefined', () => {
    expect(normalizePlanType(null)).toBe('free');
    expect(normalizePlanType(undefined)).toBe('free');
    expect(normalizePlanType('')).toBe('free');
    expect(normalizePlanType('unknown_string')).toBe('free');
  });

  it('should return the canonical plan types as-is', () => {
    expect(normalizePlanType('free')).toBe('free');
    expect(normalizePlanType('premium')).toBe('premium');
    expect(normalizePlanType('trialing')).toBe('trialing');
    expect(normalizePlanType('student')).toBe('student');
    expect(normalizePlanType('canceled')).toBe('canceled');
    expect(normalizePlanType('admin')).toBe('admin');
  });

  it('should map legacy pro/premium types to "premium"', () => {
    expect(normalizePlanType('pro')).toBe('premium');
    expect(normalizePlanType('pro_monthly')).toBe('premium');
    expect(normalizePlanType('pro_annual')).toBe('premium');
    expect(normalizePlanType('team')).toBe('premium');
    expect(normalizePlanType('elite')).toBe('premium');
  });
});
