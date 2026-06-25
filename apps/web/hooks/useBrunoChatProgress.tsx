'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
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

export type BrunoChatProgressValue = BrunoProgressState & {
  isProgressExpanded: boolean;
  setIsProgressExpanded: (expanded: boolean) => void;
  toggleProgressExpanded: () => void;
  resetProgress: () => void;
};

const BrunoChatProgressContext = createContext<BrunoChatProgressValue | null>(
  null
);

type UseBrunoChatProgressOptions = {
  messages: BrunoUIMessage[];
  status: ChatStatus;
  isExternallyProcessing?: boolean;
  resetSignal?: string | number | null;
};

export function useBrunoChatProgressState(
  options: UseBrunoChatProgressOptions
): BrunoChatProgressValue {
  const { messages, status, isExternallyProcessing = false, resetSignal } =
    options;

  const [isProgressExpanded, setIsProgressExpanded] = useState(true);
  const previousWorkingRef = useRef(false);

  const derived = useMemo(
    () =>
      deriveBrunoProgressState({
        messages,
        chatStatus: status,
        isExternallyProcessing,
      }),
    [messages, status, isExternallyProcessing]
  );

  const resetProgress = useCallback(() => {
    setIsProgressExpanded(true);
  }, []);

  useEffect(() => {
    resetProgress();
  }, [resetSignal, resetProgress]);

  useEffect(() => {
    if (derived.isBrunoWorking && derived.progressSteps.length > 0) {
      setIsProgressExpanded(true);
    }
  }, [derived.isBrunoWorking, derived.progressSteps.length]);

  useEffect(() => {
    const wasWorking = previousWorkingRef.current;
    previousWorkingRef.current = derived.isBrunoWorking;

    if (
      wasWorking &&
      !derived.isBrunoWorking &&
      (derived.progressSummary || derived.assistantAnswerText)
    ) {
      const timer = window.setTimeout(() => {
        setIsProgressExpanded(false);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
  }, [
    derived.assistantAnswerText,
    derived.isBrunoWorking,
    derived.progressSummary,
  ]);

  return useMemo(
    () => ({
      ...derived,
      isProgressExpanded,
      setIsProgressExpanded,
      toggleProgressExpanded: () => {
        setIsProgressExpanded((expanded) => !expanded);
      },
      resetProgress,
    }),
    [derived, isProgressExpanded, resetProgress]
  );
}

type BrunoChatProgressProviderProps = {
  messages: BrunoUIMessage[];
  status: ChatStatus;
  isExternallyProcessing?: boolean;
  resetSignal?: string | number | null;
  children: ReactNode;
};

export function BrunoChatProgressProvider({
  messages,
  status,
  isExternallyProcessing,
  resetSignal,
  children,
}: BrunoChatProgressProviderProps) {
  const value = useBrunoChatProgressState({
    messages,
    status,
    isExternallyProcessing,
    resetSignal,
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
