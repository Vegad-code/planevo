import { describe, expect, it } from 'vitest';

import { recordNotificationDelivery } from '../delivery';

describe('recordNotificationDelivery', () => {
  it('throws when the delivery ledger cannot be written', async () => {
    const supabase = {
      from: () => ({
        upsert: async () => ({ error: { message: 'RLS blocked insert' } }),
      }),
    };

    await expect(recordNotificationDelivery(
      supabase as never,
      'user-123',
      'test_email',
      'email',
      'dedupe-123'
    )).rejects.toEqual({ message: 'RLS blocked insert' });
  });
});
