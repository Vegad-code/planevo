import { afterEach, describe, expect, it, vi } from 'vitest';

import { sendExpoPushNotification } from '../expo';

describe('sendExpoPushNotification', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the Expo ticket id for successful sends', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'ok', id: 'ticket-123' } }),
    }));

    const result = await sendExpoPushNotification({
      to: 'ExponentPushToken[test]',
      title: 'Test',
      body: 'Hello',
    });

    expect(result).toEqual({ ok: true, ticketId: 'ticket-123' });
  });
});
