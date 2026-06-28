'use client';

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import type { ChatStatus } from 'ai';
import type { UIMessage } from 'ai';
import {
  deriveBrunoProgressState,
  type BrunoProgressState,
  type BrunoProgressStep,
} from '@/lib/bruno/brunoProgressState';
import type { BrunoDataParts } from '@/lib/bruno/types';

type BrunoUIMessage = UIMessage<unknown, BrunoDataParts>;

export type BrunoChatProgressValue = BrunoProgressState;

const BrunoChatProgressContext = createContext<BrunoChatProgressValue | null>(
  null
);

type UseBrunoChatProgressOptions = {
  messages: BrunoUIMessage[];
  status: ChatStatus;
  isExternallyProcessing?: boolean;
};

export function useBrunoChatProgressState(
  options: UseBrunoChatProgressOptions
): BrunoChatProgressValue {
  const { messages, status, isExternallyProcessing = false } = options;

  return useMemo(
    () =>
      deriveBrunoProgressState({
        messages,
        chatStatus: status,
        isExternallyProcessing,
      }),
    [messages, status, isExternallyProcessing]
  );
}

type BrunoChatProgressProviderProps = {
  messages: BrunoUIMessage[];
  status: ChatStatus;
  isExternallyProcessing?: boolean;
  children: ReactNode;
};

export function BrunoChatProgressProvider({
  messages,
  status,
  isExternallyProcessing,
  children,
}: BrunoChatProgressProviderProps) {
  const value = useBrunoChatProgressState({
    messages,
    status,
    isExternallyProcessing,
  });

  return (
    <BrunoChatProgressContext.Provider value={value}>
      {children}
    </BrunoChatProgressContext.Provider>
  );
}

export function useBrunoChatProgress(): BrunoChatProgressValue {
  const context = useContext(BrunoChatProgressContext);
  if (!context) {
    throw new Error(
      'useBrunoChatProgress must be used within BrunoChatProgressProvider'
    );
  }
  return context;
}

export type { BrunoProgressStep };
