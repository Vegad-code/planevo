import type { BrunoPageContext } from '@/lib/bruno/types';

export function createBrunoChatRequestBody(
  conversationId: string | null,
  pageContext: BrunoPageContext | null
) {
  return {
    diagnostics: true,
    conversationId,
    ...(pageContext ? { pageContext } : {}),
  };
}
