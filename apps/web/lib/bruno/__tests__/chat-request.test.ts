import { describe, expect, it } from 'vitest';
import { createBrunoChatRequestBody } from '@/lib/bruno/chat-request';

describe('createBrunoChatRequestBody', () => {
  it('includes conversation diagnostics and the current page context', () => {
    expect(
      createBrunoChatRequestBody('conversation-1', {
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - June 2026',
        payload: { activeView: 'month' },
      })
    ).toEqual({
      diagnostics: true,
      conversationId: 'conversation-1',
      pageContext: {
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - June 2026',
        payload: { activeView: 'month' },
      },
    });
  });
});
