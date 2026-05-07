export type LatencySeverity = 'good' | 'watch' | 'slow' | 'critical';

export type DiagnosticStep = {
  name: string;
  ms: number;
};

export type AiLatencyDiagnostic = {
  feature: string;
  totalMs: number;
  openAiMs: number | null;
  serverOverheadMs: number | null;
  severity: LatencySeverity;
  thresholdMs: number;
  steps: DiagnosticStep[];
  startedAt: string;
};

const RESPONSE_FRICTION_THRESHOLDS_MS = {
  good: 1200,
  watch: 2500,
  slow: 5000,
  critical: 9000,
};

export const CHATBOT_RESPONSE_TARGET_MS = RESPONSE_FRICTION_THRESHOLDS_MS.watch;

function nowMs() {
  return Math.round(performance.now());
}

function roundMs(value: number) {
  return Math.max(0, Math.round(value));
}

export function getLatencySeverity(totalMs: number): LatencySeverity {
  if (totalMs <= RESPONSE_FRICTION_THRESHOLDS_MS.good) return 'good';
  if (totalMs <= RESPONSE_FRICTION_THRESHOLDS_MS.watch) return 'watch';
  if (totalMs <= RESPONSE_FRICTION_THRESHOLDS_MS.slow) return 'slow';
  return 'critical';
}

export function createAiLatencyTimer(feature: string) {
  const startedAtMs = nowMs();
  const startedAt = new Date().toISOString();
  let lastMarkMs = startedAtMs;
  const steps: DiagnosticStep[] = [];

  return {
    mark(name: string) {
      const currentMs = nowMs();
      steps.push({ name, ms: roundMs(currentMs - lastMarkMs) });
      lastMarkMs = currentMs;
    },
    complete(openAiMs: number | null): AiLatencyDiagnostic {
      const totalMs = roundMs(nowMs() - startedAtMs);
      const normalizedOpenAiMs = openAiMs === null ? null : roundMs(openAiMs);
      const serverOverheadMs =
        normalizedOpenAiMs === null ? null : roundMs(totalMs - normalizedOpenAiMs);

      return {
        feature,
        totalMs,
        openAiMs: normalizedOpenAiMs,
        serverOverheadMs,
        severity: getLatencySeverity(totalMs),
        thresholdMs: CHATBOT_RESPONSE_TARGET_MS,
        steps,
        startedAt,
      };
    },
  };
}

export function buildServerTimingHeader(diagnostic: AiLatencyDiagnostic) {
  const values = [
    `total;dur=${diagnostic.totalMs}`,
    diagnostic.openAiMs === null ? null : `openai;dur=${diagnostic.openAiMs}`,
    diagnostic.serverOverheadMs === null ? null : `overhead;dur=${diagnostic.serverOverheadMs}`,
    ...diagnostic.steps.map((step) => `${step.name};dur=${step.ms}`),
  ];

  return values.filter(Boolean).join(', ');
}

export function shouldReportLatencyDiagnostic() {
  return process.env.NODE_ENV !== 'production' || process.env.AI_LATENCY_DIAGNOSTICS === 'true';
}
