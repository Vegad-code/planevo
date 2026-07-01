import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  buildChatClientLatencyDiagnostic,
  reportChatLatencyDiagnostic,
  type ChatClientLatencyDiagnostic,
} from '@/lib/diagnostics/clientLatency';

describe('buildChatClientLatencyDiagnostic', () => {
  it('calculates all timing deltas correctly', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 1000,
      requestStartedAt: 1100,
      responseReceivedAt: 1600,
      parsedAt: 1650,
      answerReadyAt: 1700,
    });

    expect(result.feature).toBe('bruno-chat');
    expect(result.clickToRequestStartMs).toBe(100);
    expect(result.requestRoundTripMs).toBe(500);
    expect(result.responseParseMs).toBe(50);
    expect(result.clickToAnswerReadyMs).toBe(700);
    expect(result.thresholdMs).toBe(2500);
  });

  it('returns severity "good" for fast responses (<=1200ms)', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 0,
      requestStartedAt: 100,
      responseReceivedAt: 800,
      parsedAt: 900,
      answerReadyAt: 1000,
    });
    expect(result.severity).toBe('good');
  });

  it('returns severity "watch" for responses between 1200-2500ms', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 0,
      requestStartedAt: 100,
      responseReceivedAt: 1500,
      parsedAt: 1600,
      answerReadyAt: 2000,
    });
    expect(result.severity).toBe('watch');
  });

  it('returns severity "slow" for responses between 2500-5000ms', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 0,
      requestStartedAt: 100,
      responseReceivedAt: 3000,
      parsedAt: 3100,
      answerReadyAt: 4000,
    });
    expect(result.severity).toBe('slow');
  });

  it('returns severity "critical" for responses over 5000ms', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 0,
      requestStartedAt: 100,
      responseReceivedAt: 5000,
      parsedAt: 5100,
      answerReadyAt: 6000,
    });
    expect(result.severity).toBe('critical');
  });

  it('rounds negative timing deltas to 0', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 1000,
      requestStartedAt: 900,
      responseReceivedAt: 1100,
      parsedAt: 1200,
      answerReadyAt: 1300,
    });
    expect(result.clickToRequestStartMs).toBe(0);
  });

  it('includes server diagnostic when provided', () => {
    const serverDiag = {
      feature: 'bruno-chat',
      totalMs: 500,
      openAiMs: 400,
      serverOverheadMs: 100,
      severity: 'good' as const,
      thresholdMs: 2500,
      steps: [],
      startedAt: new Date().toISOString(),
    };
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 0,
      requestStartedAt: 50,
      responseReceivedAt: 600,
      parsedAt: 650,
      answerReadyAt: 700,
      server: serverDiag,
    });
    expect(result.server).toBe(serverDiag);
  });

  it('omits server diagnostic when not provided', () => {
    const result = buildChatClientLatencyDiagnostic({
      clickAt: 0,
      requestStartedAt: 50,
      responseReceivedAt: 600,
      parsedAt: 650,
      answerReadyAt: 700,
    });
    expect(result.server).toBeUndefined();
  });
});

describe('reportChatLatencyDiagnostic', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('logs info for good severity', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const diag: ChatClientLatencyDiagnostic = {
      feature: 'bruno-chat',
      clickToRequestStartMs: 100,
      requestRoundTripMs: 500,
      responseParseMs: 50,
      clickToAnswerReadyMs: 700,
      severity: 'good',
      thresholdMs: 2500,
    };
    reportChatLatencyDiagnostic(diag);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('logs warn for slow severity', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const diag: ChatClientLatencyDiagnostic = {
      feature: 'bruno-chat',
      clickToRequestStartMs: 100,
      requestRoundTripMs: 3000,
      responseParseMs: 50,
      clickToAnswerReadyMs: 4000,
      severity: 'slow',
      thresholdMs: 2500,
    };
    reportChatLatencyDiagnostic(diag);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('logs warn for critical severity', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const diag: ChatClientLatencyDiagnostic = {
      feature: 'bruno-chat',
      clickToRequestStartMs: 100,
      requestRoundTripMs: 5000,
      responseParseMs: 50,
      clickToAnswerReadyMs: 6000,
      severity: 'critical',
      thresholdMs: 2500,
    };
    reportChatLatencyDiagnostic(diag);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('suppresses in production unless diagnostics flag is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const diag: ChatClientLatencyDiagnostic = {
      feature: 'bruno-chat',
      clickToRequestStartMs: 100,
      requestRoundTripMs: 500,
      responseParseMs: 50,
      clickToAnswerReadyMs: 700,
      severity: 'good',
      thresholdMs: 2500,
    };
    reportChatLatencyDiagnostic(diag);
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('reports in production when diagnostics flag is enabled', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_AI_LATENCY_DIAGNOSTICS', 'true');
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const diag: ChatClientLatencyDiagnostic = {
      feature: 'bruno-chat',
      clickToRequestStartMs: 100,
      requestRoundTripMs: 500,
      responseParseMs: 50,
      clickToAnswerReadyMs: 700,
      severity: 'good',
      thresholdMs: 2500,
    };
    reportChatLatencyDiagnostic(diag);
    expect(spy).toHaveBeenCalledOnce();
  });
});
