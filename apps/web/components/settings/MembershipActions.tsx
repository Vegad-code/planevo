'use client';

import { useState } from 'react';
import { redirectToCheckout, redirectToPortal } from '@/hooks/use-subscription';

interface MembershipActionsProps {
  isFree: boolean;
}

export default function MembershipActions({ isFree }: MembershipActionsProps) {
  const [loading, setLoading] = useState(false);

  const handleAction = async () => {
    setLoading(true);
    try {
      if (isFree) {
        await redirectToCheckout('monthly');
      } else {
        await redirectToPortal();
      }
    } catch (error) {
      console.error('Failed to redirect to Stripe:', error);
      alert('Failed to connect to billing portal. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleAction}
      disabled={loading}
      className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${
        isFree
          ? 'bg-settings-brand text-white hover:bg-settings-brand/90 hover:shadow-md hover:-translate-y-0.5'
          : 'bg-settings-card border border-settings-border text-settings-text hover:bg-settings-card-hover'
      } disabled:opacity-50 disabled:pointer-events-none`}
    >
      {loading ? 'Loading...' : isFree ? 'Upgrade to Pro' : 'Manage Billing'}
    </button>
  );
}
