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
  schedulingContext?: { localTime?: string; timeZone?: string },
  options?: { editMessageId?: string }
) {
  const resolvedTimeZone =
    schedulingContext?.timeZone ??
    Intl.DateTimeFormat().resolvedOptions().timeZone;
  const resolvedLocalTime =
    schedulingContext?.localTime ?? new Date().toLocaleString();

  return {
    diagnostics: true,
    // Web surfaces opt into the native approval loop (propose → approve →
    // execute inside one model run). Mobile keeps the legacy execute flow.
    agentLoop: true,
    conversationId,
    assistantMode,
    timeZone: resolvedTimeZone,
    localTime: resolvedLocalTime,
    ...(pageContext ? { pageContext } : {}),
    ...(clarificationResponse ? { clarificationResponse } : {}),
    ...(options?.editMessageId ? { editMessageId: options.editMessageId } : {}),
  };
}
