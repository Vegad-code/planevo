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
      }, 'planning')
    ).toEqual({
      diagnostics: true,
      conversationId: 'conversation-1',
      assistantMode: 'planning',
      pageContext: {
        source: 'calendar',
        page: '/dashboard/calendar',
        label: 'Calendar - June 2026',
        payload: { activeView: 'month' },
      },
    });
  });

  it('includes clarification responses when submitting follow-up context', () => {
    const clarificationResponse = {
      cardId: 'clarify-1',
      originalPrompt: 'Plan my afternoon',
      answers: [
        {
          questionId: 'q1',
          question: 'What matters most?',
          answer: 'Finish homework',
          source: 'option' as const,
        },
      ],
    };

    expect(
      createBrunoChatRequestBody(
        'conversation-1',
        null,
        'general',
        clarificationResponse
      )
    ).toEqual({
      diagnostics: true,
      conversationId: 'conversation-1',
      assistantMode: 'general',
      clarificationResponse,
    });
  });
});
