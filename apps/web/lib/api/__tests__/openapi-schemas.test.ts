import { describe, expect, it } from 'vitest';
import { apiContractSchemas } from '@/lib/api/openapi-schemas';

describe('api contract schemas', () => {
  it('parses documented auth payloads', () => {
    expect(
      apiContractSchemas.AuthSignInBody.safeParse({
        email: 'user@example.com',
        password: 'secret',
      }).success
    ).toBe(true);

    expect(
      apiContractSchemas.AuthSignUpBody.safeParse({
        email: 'user@example.com',
        password: 'secret123',
        name: 'Alex',
      }).success
    ).toBe(true);

    expect(
      apiContractSchemas.AuthPasswordResetBody.safeParse({
        email: 'user@example.com',
      }).success
    ).toBe(true);
  });

  it('exposes all OpenAPI-documented request bodies', () => {
    expect(Object.keys(apiContractSchemas).sort()).toEqual([
      'AuthChangePasswordBody',
      'AuthPasswordResetBody',
      'AuthSignInBody',
      'AuthSignUpBody',
      'ComposioConnectBody',
      'GoogleCalendarsSaveBody',
      'MetricsTrackBody',
      'ScheduleBody',
    ]);
  });
});
