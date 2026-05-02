import type { AiLatencyDiagnostic, LatencySeverity } from './aiLatency';

export type ChatClientLatencyDiagnostic = {
  feature: string;
  clickToRequestStartMs: number;
  requestRoundTripMs: number;
  responseParseMs: number;
  clickToAnswerReadyMs: number;
  severity: LatencySeverity;
  thresholdMs: number;
  server?: AiLatencyDiagnostic;
};

const CHAT_CLIENT_TARGET_MS = 2500;

function roundMs(value: number) {
  return Math.max(0, Math.round(value));
}

function getClientSeverity(totalMs: number): LatencySeverity {
  if (totalMs <= 1200) return 'good';
  if (totalMs <= CHAT_CLIENT_TARGET_MS) return 'watch';
  if (totalMs <= 5000) return 'slow';
  return 'critical';
}

export function buildChatClientLatencyDiagnostic(params: {
  clickAt: number;
  requestStartedAt: number;
  responseReceivedAt: number;
  parsedAt: number;
  answerReadyAt: number;
  server?: AiLatencyDiagnostic;
}): ChatClientLatencyDiagnostic {
  const clickToAnswerReadyMs = roundMs(params.answerReadyAt - params.clickAt);

  return {
    feature: 'ollie-chat',
    clickToRequestStartMs: roundMs(params.requestStartedAt - params.clickAt),
    requestRoundTripMs: roundMs(params.responseReceivedAt - params.requestStartedAt),
    responseParseMs: roundMs(params.parsedAt - params.responseReceivedAt),
    clickToAnswerReadyMs,
    severity: getClientSeverity(clickToAnswerReadyMs),
    thresholdMs: CHAT_CLIENT_TARGET_MS,
    server: params.server,
  };
}

export function reportChatLatencyDiagnostic(diagnostic: ChatClientLatencyDiagnostic) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PUBLIC_AI_LATENCY_DIAGNOSTICS !== 'true'
  ) {
    return;
  }

  const summary = {
    clickToAnswerReadyMs: diagnostic.clickToAnswerReadyMs,
    requestRoundTripMs: diagnostic.requestRoundTripMs,
    responseParseMs: diagnostic.responseParseMs,
    serverTotalMs: diagnostic.server?.totalMs,
    openAiMs: diagnostic.server?.openAiMs,
    serverOverheadMs: diagnostic.server?.serverOverheadMs,
    severity: diagnostic.severity,
    targetMs: diagnostic.thresholdMs,
  };

  if (diagnostic.severity === 'slow' || diagnostic.severity === 'critical') {
    console.warn('[AI latency diagnostic] Chat response exceeded target', summary);
    return;
  }

  console.info('[AI latency diagnostic] Chat response timing', summary);
}
