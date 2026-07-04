import { DefaultChatTransport } from 'ai';
import { supabase } from '@/lib/supabase';
import type {
  BrunoAssistantMode,
  BrunoClarificationResponse,
} from './types';

export function getBrunoApiUrl(): string {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) return apiUrl;
  if (__DEV__) return 'http://localhost:3000';
  throw new Error('EXPO_PUBLIC_API_URL is required in production builds.');
}

export function createBrunoChatTransport() {
  return new DefaultChatTransport({
    api: `${getBrunoApiUrl()}/api/ai/chat`,
    headers: async (): Promise<Record<string, string>> => {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return {};
      return { Authorization: `Bearer ${token}` };
    },
  });
}

export function createBrunoChatRequestBody({
  conversationId,
  assistantMode,
  clarificationResponse,
}: {
  conversationId: string | null;
  assistantMode: BrunoAssistantMode;
  clarificationResponse?: BrunoClarificationResponse;
}) {
  return {
    conversationId,
    assistantMode,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    localTime: new Date().toLocaleString(),
    ...(clarificationResponse ? { clarificationResponse } : {}),
  };
}
