import { describe, expect, it } from 'vitest';
import {
  authChangePasswordBodySchema,
  authPasswordResetBodySchema,
  authSignInBodySchema,
  authSignUpBodySchema,
  passwordPolicySchema,
  composioConnectBodySchema,
  googleCalendarsSaveBodySchema,
  metricsTrackBodySchema,
  scheduleBodySchema,
} from '@/lib/api/schemas';

describe('api schemas', () => {
  it('validates metrics track body', () => {
    expect(
      metricsTrackBodySchema.safeParse({
        type: 'focus_time',
        value: 120,
        date: '2026-06-19',
      }).success
    ).toBe(true);
    expect(metricsTrackBodySchema.safeParse({ type: 'bad', value: 1 }).success).toBe(false);
  });

  it('validates google calendars save body', () => {
    expect(
      googleCalendarsSaveBodySchema.safeParse({
        selectedCalendarIds: ['primary'],
      }).success
    ).toBe(true);
    expect(googleCalendarsSaveBodySchema.safeParse({ selectedCalendarIds: 'nope' }).success).toBe(
      false
    );
  });

  it('validates composio connect body', () => {
    expect(composioConnectBodySchema.safeParse({ appName: 'notion' }).success).toBe(true);
    expect(composioConnectBodySchema.safeParse({}).success).toBe(false);
  });

  it('validates auth bodies', () => {
    expect(
      authSignInBodySchema.safeParse({ email: 'a@b.com', password: 'secret' }).success
    ).toBe(true);
    expect(
      authSignUpBodySchema.safeParse({
        email: 'a@b.com',
        password: 'secret12',
        name: 'Alex',
      }).success
    ).toBe(true);
    expect(authPasswordResetBodySchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
    expect(
      authChangePasswordBodySchema.safeParse({
        currentPassword: 'oldsecret',
        newPassword: 'newsecret1',
      }).success
    ).toBe(true);
    expect(passwordPolicySchema.safeParse('short').success).toBe(false);
    expect(passwordPolicySchema.safeParse('longenough').success).toBe(true);
  });

  it('accepts empty schedule body', () => {
    expect(scheduleBodySchema.safeParse({}).success).toBe(true);
    expect(scheduleBodySchema.safeParse({ extra: true }).success).toBe(false);
  });
});
