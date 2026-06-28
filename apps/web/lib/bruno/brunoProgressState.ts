import type { ChatStatus, UIMessage } from 'ai';
import type { BrunoDataParts } from './types';
import type { BrunoProgressPayload, BrunoProgressStep } from './bruno-progress';
import {
  buildInitialProgressSteps,
  buildProgressPayload,
  humanizeBrunoToolName,
} from './bruno-progress';
import { isBrunoFinalizingPhase } from './brunoThinkingPhrases';

export type { BrunoProgressStep } from './bruno-progress';

export type BrunoProgressState = {
  isBrunoWorking: boolean;
  isBrunoFinalizing: boolean;
  progressSteps: BrunoProgressStep[];
  progressSummary: string | null;
  assistantAnswerText: string | null;
};

type DeriveInput = {
  messages: UIMessage<unknown, BrunoDataParts>[];
  chatStatus: ChatStatus;
  isExternallyProcessing?: boolean;
};

type MessagePart = {
  type: string;
  text?: string;
  data?: BrunoProgressPayload;
  toolInvocation?: {
    toolName?: string;
    state?: string;
  };
  state?: string;
};

function lastAssistantMessage(
  messages: DeriveInput['messages']
): UIMessage<unknown, BrunoDataParts> | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === 'assistant') return messages[i];
  }
  return null;
}

function lastAssistantText(messages: DeriveInput['messages']): string | null {
  const message = lastAssistantMessage(messages);
  if (!message) return null;
  const text = message.parts
    ?.filter((part) => part.type === 'text')
    .map((part) => ('text' in part ? part.text : ''))
    .join('')
    .trim();
  return text || null;
}

function extractServerProgress(
  messages: DeriveInput['messages']
): BrunoProgressPayload | null {
  const message = lastAssistantMessage(messages);
  if (!message?.parts) return null;
  for (const part of message.parts) {
    if (part.type === 'data-bruno-progress' && 'data' in part) {
      return part.data as BrunoProgressPayload;
    }
  }
  return null;
}

function toolStepStatusFromPart(part: MessagePart): BrunoProgressStep['status'] {
  const state =
    part.state ??
    part.toolInvocation?.state ??
    (part.type.startsWith('tool-') ? 'input-available' : undefined);

  switch (state) {
    case 'output-available':
      return 'done';
    case 'output-error':
      return 'error';
    case 'input-streaming':
    case 'input-available':
      return 'active';
    default:
      return 'active';
  }
}

function extractToolName(part: MessagePart): string | null {
  if (part.toolInvocation?.toolName) {
    return part.toolInvocation.toolName;
  }
  if (part.type.startsWith('tool-') && part.type !== 'tool-invocation') {
    return part.type.slice('tool-'.length);
  }
  return null;
}

function extractToolSteps(
  messages: DeriveInput['messages']
): BrunoProgressStep[] {
  const message = lastAssistantMessage(messages);
  if (!message?.parts) return [];

  const toolSteps: BrunoProgressStep[] = [];
  const seen = new Set<string>();

  for (const rawPart of message.parts) {
    const part = rawPart as MessagePart;
    const toolName = extractToolName(part);
    if (!toolName) continue;

    const stepId = `tool:${toolName}`;
    if (seen.has(stepId)) continue;
    seen.add(stepId);

    toolSteps.push({
      id: stepId,
      label: humanizeBrunoToolName(toolName),
      status: toolStepStatusFromPart(part),
    });
  }

  return toolSteps;
}

function mergeProgressSteps(
  serverSteps: BrunoProgressStep[],
  toolSteps: BrunoProgressStep[]
): BrunoProgressStep[] {
  const merged = [...serverSteps];
  for (const toolStep of toolSteps) {
    const index = merged.findIndex((s) => s.id === toolStep.id);
    if (index === -1) {
      merged.push(toolStep);
    } else {
      merged[index] = toolStep;
    }
  }
  return merged;
}

export function deriveBrunoProgressState(
  input: DeriveInput
): BrunoProgressState {
  const isStreaming =
    input.chatStatus === 'streaming' || input.chatStatus === 'submitted';
  const isBrunoWorking = isStreaming || Boolean(input.isExternallyProcessing);

  const serverProgress = extractServerProgress(input.messages);
  const toolSteps = extractToolSteps(input.messages);

  let progressSteps: BrunoProgressStep[] = [];
  let progressSummary: string | null = null;

  if (serverProgress) {
    progressSteps = mergeProgressSteps(serverProgress.steps, toolSteps);
    progressSummary = serverProgress.summary;
    if (serverProgress.phase === 'complete' && !isBrunoWorking) {
      progressSummary = 'Done';
    }
  } else if (isBrunoWorking) {
    const fallback = buildProgressPayload(buildInitialProgressSteps());
    progressSteps = mergeProgressSteps(fallback.steps, toolSteps);
    progressSummary = input.isExternallyProcessing
      ? 'Running tools…'
      : fallback.summary;
  } else if (toolSteps.length > 0) {
    progressSteps = toolSteps;
    progressSummary = toolSteps.find((s) => s.status === 'active')?.label ?? null;
  }

  const assistantAnswerText = lastAssistantText(input.messages);
  const isBrunoFinalizing =
    isBrunoWorking &&
    isBrunoFinalizingPhase({
      progressSteps,
      progressSummary,
      chatStatus: input.chatStatus,
      assistantAnswerText,
    });

  return {
    isBrunoWorking,
    isBrunoFinalizing,
    progressSteps,
    progressSummary,
    assistantAnswerText,
  };
}
