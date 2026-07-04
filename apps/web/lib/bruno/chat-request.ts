import type {
  BrunoAssistantMode,
  BrunoClarificationResponse,
  BrunoPageContext,
} from '@/lib/bruno/types';

export function createBrunoChatRequestBody(
  conversationId: string | null,
  pageContext: BrunoPageContext | null,
  assistantMode: BrunoAssistantMode = 'general',
  clarificationResponse?: BrunoClarificationResponse,
  schedulingContext?: { localTime?: string; timeZone?: string }
) {
  const resolvedTimeZone =
    schedulingContext?.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const resolvedLocalTime =
    schedulingContext?.localTime ?? new Date().toLocaleString();

  return {
    diagnostics: true,
    conversationId,
    assistantMode,
    timeZone: resolvedTimeZone,
    localTime: resolvedLocalTime,
    ...(pageContext ? { pageContext } : {}),
    ...(clarificationResponse ? { clarificationResponse } : {}),
  };
}
