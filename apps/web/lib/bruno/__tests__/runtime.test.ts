import { describe, expect, it } from 'vitest';
import {
  extractLastUserMessage,
  getBrunoRoutingFlags,
  getModelCallSettings,
} from '@/lib/bruno/runtime';

describe('Bruno V2 runtime helpers', () => {
  it('extracts the latest user text from AI SDK message parts', () => {
    expect(
      extractLastUserMessage([
        { role: 'user', content: 'old' },
        {
          role: 'assistant',
          content: 'reply',
        },
        {
          role: 'user',
          content: null,
          parts: [
            { type: 'file', url: 'https://example.com' },
            { type: 'text', text: 'latest message' },
          ],
        },
      ])
    ).toBe('latest message');
  });

  it('supports internal-only rollout when global V2 is disabled', () => {
    const flags = getBrunoRoutingFlags(
      {
        BRUNO_ROUTING_V2_ENABLED: 'false',
        BRUNO_ROUTING_INTERNAL_USER_IDS: 'user-1,user-2',
      },
      'user-2'
    );

    expect(flags.routingV2Enabled).toBe(true);
  });

  it('omits temperature for GPT-5 models', () => {
    expect(getModelCallSettings('gpt-5.4-mini', 0.2)).toEqual({});
    expect(getModelCallSettings('gpt-4o-mini', 0.2)).toEqual({
      temperature: 0.2,
    });
  });
});
