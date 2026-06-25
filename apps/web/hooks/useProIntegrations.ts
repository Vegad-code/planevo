'use client';

import { PRO_PROVIDER_LABELS } from '@/lib/integrations/types';
import { useProIntegrationsContext } from '@/components/providers/ProIntegrationsProvider';

/**
 * Client hook powering every Pro integration surface (dashboard rail, Bruno
 * chips, tasks/daily-plan sync). Reads connection status from Composio and
 * pulse counts from `source_items`. Server routes enforce real Pro gating.
 */
export function useProIntegrations() {
  return useProIntegrationsContext();
}

export { PRO_PROVIDER_LABELS };
