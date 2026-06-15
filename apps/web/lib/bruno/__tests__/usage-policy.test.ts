import { describe, expect, it, vi } from 'vitest';
import {
  buildBrunoEntitlement,
  type BrunoCreditLedgerEntry,
} from '@/lib/bruno/usagePolicy';
import {
  completeBrunoUsage,
  getBrunoEntitlement,
  logBrunoRouteEvent,
  refundBrunoDeepAccess,
  reserveBrunoDeepAccess,
} from '@/lib/bruno/usageService';

const now = new Date('2026-06-14T12:00:00.000Z');

describe('buildBrunoEntitlement', () => {
  it('tracks lifetime free credits without a daily refill', () => {
    const ledger: BrunoCreditLedgerEntry[] = [
      {
        creditType: 'onboarding_deep',
        delta: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      {
        creditType: 'onboarding_deep',
        delta: -1,
        createdAt: '2026-02-01T00:00:00.000Z',
      },
      {
        creditType: 'onboarding_deep',
        delta: -1,
        createdAt: '2026-06-13T00:00:00.000Z',
      },
    ];

    const result = buildBrunoEntitlement({
      isPro: false,
      ledger,
      now,
    });

    expect(result.onboardingDeepCreditsRemaining).toBe(1);
    expect(result.monthlyDeepRequestsRemaining).toBe(0);
  });

  it('counts only the current UTC month against the Pro cap', () => {
    const ledger: BrunoCreditLedgerEntry[] = [
      {
        creditType: 'pro_monthly_deep',
        delta: -40,
        createdAt: '2026-05-20T00:00:00.000Z',
      },
      {
        creditType: 'pro_monthly_deep',
        delta: -121,
        createdAt: '2026-06-10T00:00:00.000Z',
      },
      {
        creditType: 'pro_monthly_deep',
        delta: 1,
        createdAt: '2026-06-11T00:00:00.000Z',
      },
    ];

    const result = buildBrunoEntitlement({
      isPro: true,
      ledger,
      now,
    });

    expect(result.monthlyDeepRequestsRemaining).toBe(30);
  });
});

describe('deep access RPC service', () => {
  it('reserves through the atomic database function', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [{ reserved: true, credit_type: 'onboarding_deep' }],
      error: null,
    });

    const result = await reserveBrunoDeepAccess(
      { rpc },
      {
        userId: 'user-1',
        requestId: 'request-1',
        source: 'onboarding_credit',
      }
    );

    expect(result).toEqual({
      reserved: true,
      creditType: 'onboarding_deep',
    });
    expect(rpc).toHaveBeenCalledWith('reserve_bruno_deep_access', {
      p_user_id: 'user-1',
      p_request_id: 'request-1',
      p_source: 'onboarding_deep',
      p_monthly_limit: 150,
    });
  });

  it('refunds by request id when generation fails before provider execution', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: true,
      error: null,
    });

    await refundBrunoDeepAccess(
      { rpc },
      { userId: 'user-1', requestId: 'request-1' }
    );

    expect(rpc).toHaveBeenCalledWith('refund_bruno_deep_access', {
      p_user_id: 'user-1',
      p_request_id: 'request-1',
    });
  });
});

describe('Bruno usage repository orchestration', () => {
  it('loads ledger rows and builds an entitlement', async () => {
    const repository = {
      listLedger: vi.fn().mockResolvedValue([
        {
          creditType: 'onboarding_deep',
          delta: 3,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          creditType: 'onboarding_deep',
          delta: -1,
          createdAt: '2026-06-01T00:00:00.000Z',
        },
      ]),
      updateUsage: vi.fn(),
      insertRouteEvent: vi.fn(),
    };

    const result = await getBrunoEntitlement(repository, {
      userId: 'user-1',
      isPro: false,
      now,
    });

    expect(result.onboardingDeepCreditsRemaining).toBe(2);
    expect(repository.listLedger).toHaveBeenCalledWith('user-1');
  });

  it('updates the reserved usage row and writes one route event', async () => {
    const repository = {
      listLedger: vi.fn(),
      updateUsage: vi.fn().mockResolvedValue(undefined),
      insertRouteEvent: vi.fn().mockResolvedValue(undefined),
    };

    await completeBrunoUsage(repository, {
      usageLogId: 'usage-1',
      model: 'gpt-5.4-mini',
      mode: 'academic_tutoring',
      tier: 'deep',
      inputTokens: 1000,
      outputTokens: 500,
      estimatedCostCents: 0.3,
      latencyMs: 1200,
      status: 'completed',
    });
    await logBrunoRouteEvent(repository, {
      userId: 'user-1',
      requestId: 'request-1',
      mode: 'academic_tutoring',
      confidence: 0.9,
      routeSource: 'obvious_mode',
      selectedTier: 'deep',
      selectedModel: 'gpt-5.4-mini',
      isPro: false,
      usedDeepCredit: true,
      upgradeCardShown: false,
      safetyStatus: 'clear',
      inputTokens: 1000,
      outputTokens: 500,
      estimatedCostCents: 0.3,
      latencyMs: 1200,
      rationale: 'academic tutoring request',
    });

    expect(repository.updateUsage).toHaveBeenCalledOnce();
    expect(repository.insertRouteEvent).toHaveBeenCalledOnce();
  });
});
