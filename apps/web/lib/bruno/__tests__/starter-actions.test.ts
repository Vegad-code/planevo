import { describe, expect, it } from 'vitest';
import { shouldShowBrunoStarterActions } from '@/lib/bruno/starter-actions';

const baseState = {
  messages: [] as Array<{ role: 'user' | 'assistant' }>,
  currentConversationId: null,
  input: '',
  showHistory: false,
  isProcessing: false,
  isRateLimited: false,
};

describe('shouldShowBrunoStarterActions', () => {
  it('shows starter actions for an untouched new chat', () => {
    expect(shouldShowBrunoStarterActions(baseState)).toBe(true);
  });

  it('hides starter actions after the user starts chatting', () => {
    expect(
      shouldShowBrunoStarterActions({
        ...baseState,
        messages: [
          ...baseState.messages,
          { role: 'user' as const },
        ],
      })
    ).toBe(false);
  });

  it('hides starter actions for loaded or prefilled chat states', () => {
    expect(
      shouldShowBrunoStarterActions({
        ...baseState,
        currentConversationId: 'conversation-1',
      })
    ).toBe(false);

    expect(
      shouldShowBrunoStarterActions({
        ...baseState,
        input: 'Help me with this assignment',
      })
    ).toBe(false);
  });

  it('hides starter actions when Bruno is busy or blocked by limits', () => {
    expect(
      shouldShowBrunoStarterActions({
        ...baseState,
        isProcessing: true,
      })
    ).toBe(false);

    expect(
      shouldShowBrunoStarterActions({
        ...baseState,
        isRateLimited: true,
      })
    ).toBe(false);
  });
});
