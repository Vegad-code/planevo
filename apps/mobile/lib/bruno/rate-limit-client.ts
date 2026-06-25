import { useEffect, useState } from 'react';
import type { BrunoRateLimitPayload } from '@/lib/bruno/types';

function isBrunoRateLimitPayload(value: unknown): value is BrunoRateLimitPayload {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.error === 'rate_limit_reached' &&
    (record.limitType === 'daily' || record.limitType === 'hourly') &&
    typeof record.resetAt === 'string'
  );
}

function tryParseJsonObject(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

export function parseBrunoRateLimitError(error: unknown): BrunoRateLimitPayload | null {
  if (!error) return null;

  if (isBrunoRateLimitPayload(error)) {
    return error;
  }

  if (error instanceof Error) {
    const fromMessage = tryParseJsonObject(error.message);
    if (isBrunoRateLimitPayload(fromMessage)) {
      return fromMessage;
    }

    const legacyMatch = error.message.match(/\{[\s\S]*\}/);
    if (legacyMatch) {
      const parsed = tryParseJsonObject(legacyMatch[0]);
      if (isBrunoRateLimitPayload(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

export function formatResetCountdown(resetAt: string, nowMs = Date.now()): string {
  const targetMs = new Date(resetAt).getTime();
  const diffMs = targetMs - nowMs;

  if (!Number.isFinite(targetMs) || diffMs <= 0) {
    return 'any moment now';
  }

  const totalMinutes = Math.ceil(diffMs / (60 * 1000));
  if (totalMinutes < 60) {
    return totalMinutes === 1 ? '1 minute' : `${totalMinutes} minutes`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return hours === 1 ? '1 hour' : `${hours} hours`;
  }
  return `${hours}h ${minutes}m`;
}

export function isRateLimitActive(
  rateLimit: BrunoRateLimitPayload | null,
  nowMs = Date.now()
): boolean {
  if (!rateLimit) return false;
  return new Date(rateLimit.resetAt).getTime() > nowMs;
}

export function getRateLimitCopy(limitType: BrunoRateLimitPayload['limitType']): {
  title: string;
  bodyPrefix: string;
} {
  if (limitType === 'hourly') {
    return {
      title: 'Slow down a sec',
      bodyPrefix:
        "You're sending messages quickly — free accounts get 2 per hour. Try again in",
    };
  }

  return {
    title: "You've hit your free Bruno limit",
    bodyPrefix:
      "You've used all your free Bruno messages for today. Your limit resets in",
  };
}

export function useResetCountdown(
  resetAt: string | null,
  onExpired?: () => void
): string {
  const [label, setLabel] = useState(() =>
    resetAt ? formatResetCountdown(resetAt) : ''
  );

  useEffect(() => {
    if (!resetAt) {
      setLabel('');
      return;
    }

    const tick = () => {
      const next = formatResetCountdown(resetAt);
      setLabel(next);
      if (next === 'any moment now') {
        onExpired?.();
      }
    };

    tick();
    const intervalId = setInterval(tick, 60_000);
    return () => clearInterval(intervalId);
  }, [resetAt, onExpired]);

  return label;
}
