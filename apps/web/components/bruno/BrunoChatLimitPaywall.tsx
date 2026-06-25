'use client';

import { useCallback, useState } from 'react';
import { usePathname } from 'next/navigation';
import BrunoAvatar from '@/components/bruno/BrunoAvatar';
import { redirectToCheckout } from '@/hooks/use-subscription';
import type { BrunoRateLimitPayload } from '@/lib/bruno/types';
import {
  getRateLimitCopy,
  useResetCountdown,
} from '@/lib/bruno/rate-limit-client';

interface BrunoChatLimitPaywallProps {
  rateLimit: BrunoRateLimitPayload;
  isDismissed: boolean;
  onDismiss: () => void;
  onExpired: () => void;
}

export function BrunoChatLimitPaywall({
  rateLimit,
  isDismissed,
  onDismiss,
  onExpired,
}: BrunoChatLimitPaywallProps) {
  const pathname = usePathname();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const countdown = useResetCountdown(rateLimit.resetAt, onExpired);
  const { title, bodyPrefix } = getRateLimitCopy(rateLimit.limitType);

  const handleUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    try {
      await redirectToCheckout('monthly', {
        source: 'bruno_limit_paywall',
        returnPath: pathname || '/dashboard',
      });
    } catch (error) {
      console.error('Failed to start checkout from Bruno paywall:', error);
      setIsUpgrading(false);
    }
  }, [pathname]);

  if (isDismissed) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-[var(--color-settings-bg)]/90 p-6 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bruno-limit-paywall-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)] p-6 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <BrunoAvatar mood="gentle" size="lg" />
        </div>

        <h4
          id="bruno-limit-paywall-title"
          className="font-sans text-base font-bold text-[var(--color-settings-text)]"
        >
          {title}
        </h4>

        <p className="mt-3 text-sm leading-6 text-[var(--color-settings-text-muted)]">
          {bodyPrefix}{' '}
          <strong className="font-semibold text-[var(--color-settings-text)]">
            {countdown}
          </strong>
          . Upgrade to Pro for unlimited chat with Bruno.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => void handleUpgrade()}
            disabled={isUpgrading}
            className="rounded-xl bg-[var(--color-settings-brand)] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isUpgrading ? 'Opening checkout…' : 'Upgrade to keep chatting'}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-sm font-medium text-[var(--color-settings-text-muted)] transition-colors hover:text-[var(--color-settings-text)]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
