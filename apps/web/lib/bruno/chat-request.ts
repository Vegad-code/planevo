import type {
  BrunoAssistantMode,
  BrunoClarificationResponse,
  BrunoPageContext,
} from '@/lib/bruno/types';

export function createBrunoChatRequestBody(
  conversationId: string | null,
  pageContext: BrunoPageContext | null,
  assistantMode: BrunoAssistantMode = 'general',
  clarificationResponse?: BrunoClarificationResponse
) {
  return {
    diagnostics: true,
    conversationId,
    assistantMode,
    ...(pageContext ? { pageContext } : {}),
    ...(clarificationResponse ? { clarificationResponse } : {}),
  };
}
