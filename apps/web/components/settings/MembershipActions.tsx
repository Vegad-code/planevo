'use client';

import { useState } from 'react';
import Link from 'next/link';
import { redirectToCheckout, redirectToPortal } from '@/hooks/use-subscription';
import { toast } from 'sonner';

interface MembershipActionsProps {
  isFree: boolean;
  hasStripeCustomer?: boolean;
}

type LoadingAction = 'monthly' | 'annual' | 'portal' | null;

export default function MembershipActions({ isFree, hasStripeCustomer = false }: MembershipActionsProps) {
  const [loadingAction, setLoadingAction] = useState<LoadingAction>(null);

  const startCheckout = async (interval: 'monthly' | 'annual') => {
    setLoadingAction(interval);
    try {
      await redirectToCheckout(interval, {
        source: 'membership_settings',
        returnPath: '/dashboard/settings/membership',
      });
    } catch (error) {
      console.error('Failed to redirect to Stripe Checkout:', error);
      toast.error('Could not open billing. Please refresh and try again.');
      setLoadingAction(null);
    }
  };

  const openPortal = async () => {
    setLoadingAction('portal');
    try {
      await redirectToPortal();
    } catch (error) {
      console.error('Failed to redirect to Stripe billing portal:', error);
      toast.error('Could not open billing. Please refresh and try again.');
      setLoadingAction(null);
    }
  };

  if (isFree) {
    return (
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <button
          onClick={() => startCheckout('annual')}
          disabled={loadingAction !== null}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm bg-settings-brand text-white hover:bg-settings-brand/90 hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none"
        >
          {loadingAction === 'annual' ? 'Loading...' : 'Upgrade Annual - Save 34%'}
        </button>
        <button
          onClick={() => startCheckout('monthly')}
          disabled={loadingAction !== null}
          className="px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm bg-settings-card border border-settings-border text-settings-text hover:bg-settings-card-hover disabled:opacity-50 disabled:pointer-events-none"
        >
          {loadingAction === 'monthly' ? 'Loading...' : 'Monthly'}
        </button>
        {hasStripeCustomer ? (
          <button
            onClick={openPortal}
            disabled={loadingAction !== null}
            className="px-4 py-2.5 rounded-xl font-bold text-xs transition-colors text-settings-text-muted hover:text-settings-text disabled:opacity-50 disabled:pointer-events-none"
          >
            {loadingAction === 'portal' ? 'Loading...' : 'Billing history'}
          </button>
        ) : (
          <Link
            href="/pricing"
            className="px-4 py-2.5 rounded-xl font-bold text-xs transition-colors text-settings-text-muted hover:text-settings-text"
          >
            Compare plans
          </Link>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={openPortal}
      disabled={loadingAction !== null}
      className="px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm bg-settings-card border border-settings-border text-settings-text hover:bg-settings-card-hover disabled:opacity-50 disabled:pointer-events-none"
    >
      {loadingAction === 'portal' ? 'Loading...' : 'Manage / Cancel'}
    </button>
  );
}
