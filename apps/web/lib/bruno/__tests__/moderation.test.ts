import { describe, expect, it, vi } from 'vitest';
import { moderateBrunoMessage } from '@/lib/bruno/moderation';

describe('moderateBrunoMessage', () => {
  it('returns clear when the provider does not flag the message', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [{ flagged: false, categories: {} }],
        }),
        { status: 200 }
      )
    );

    await expect(
      moderateBrunoMessage('Help me plan my afternoon', {
        apiKey: 'test-key',
        fetcher,
      })
    ).resolves.toEqual({ status: 'clear', categories: [] });
  });

  it('returns unsafe with only the flagged category names', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            {
              flagged: true,
              categories: {
                violence: true,
                harassment: false,
                'self-harm': true,
              },
            },
          ],
        }),
        { status: 200 }
      )
    );

    await expect(
      moderateBrunoMessage('unsafe input', {
        apiKey: 'test-key',
        fetcher,
      })
    ).resolves.toEqual({
      status: 'unsafe',
      categories: ['violence', 'self-harm'],
    });
  });

  it('throws on provider failure so the route can fail closed', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response('unavailable', { status: 503 })
    );

    await expect(
      moderateBrunoMessage('hello', {
        apiKey: 'test-key',
        fetcher,
      })
    ).rejects.toThrow('status 503');
  });
});
