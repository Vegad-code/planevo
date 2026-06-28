import type { UIMessage } from 'ai';

interface BrunoStarterActionsState {
  messages: Array<Pick<UIMessage, 'role'>>;
  currentConversationId: string | null;
  input: string;
  showHistory: boolean;
  isProcessing: boolean;
  isRateLimited: boolean;
}

export function shouldShowBrunoStarterActions({
  messages,
  currentConversationId,
  input,
  showHistory,
  isProcessing,
  isRateLimited,
}: BrunoStarterActionsState) {
  const hasUserMessages = messages.some((message) => message.role === 'user');

  return (
    !hasUserMessages &&
    !currentConversationId &&
    input.trim().length === 0 &&
    !showHistory &&
    !isProcessing &&
    !isRateLimited
  );
}
