import { describe, expect, it } from 'vitest';
import {
  buildAuthorizedExecuteRequest,
  detectClientPayloadTampering,
} from '@/lib/bruno/verifiedProposalPayload';

describe('verifiedProposalPayload', () => {
  it('builds execute request from logged proposal only', () => {
    const request = buildAuthorizedExecuteRequest(
      'proposal-abc',
      {
        type: 'UPDATE_CALENDAR_EVENT',
        title: 'Study block',
        description: 'Move study block',
        payload: {
          eventId: '22222222-2222-2222-2222-222222222222',
          startTime: '2026-07-03T02:00:00.000Z',
          endTime: '2026-07-03T04:00:00.000Z',
        },
      },
      { timeZone: 'America/Los_Angeles' }
    );

    expect('error' in request).toBe(false);
    if ('error' in request) return;
    expect(request.payload?.eventId).toBe('22222222-2222-2222-2222-222222222222');
    expect(request.payload?.startTime).toBe('2026-07-03T02:00:00.000Z');
  });

  it('detects client tampering of eventId', () => {
    const tamper = detectClientPayloadTampering(
      { eventId: '33333333-3333-3333-3333-333333333333' },
      { eventId: '22222222-2222-2222-2222-222222222222' }
    );
    expect(tamper).toContain('eventId');
  });
});
