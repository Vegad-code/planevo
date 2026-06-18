'use client';

import { useProIntegrations } from '@/hooks/useProIntegrations';
import { SlackIcon, NotionIcon, LinearIcon } from '@/components/icons/BrandIcons';
import type { ProIntegrationProvider } from '@/lib/integrations/types';

const ICONS: Record<ProIntegrationProvider, React.ComponentType<{ className?: string }>> = {
  notion: NotionIcon,
  slack: SlackIcon,
  linear: LinearIcon,
};

/**
 * Connector pills shown in the Bruno chat header (ChatGPT-style), indicating
 * which work tools Bruno can reach. Renders nothing when none are connected.
 */
export function BrunoIntegrationChips() {
  const { connectedProviders } = useProIntegrations();

  if (connectedProviders.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5" aria-label="Connected work tools">
      {connectedProviders.map((provider) => {
        const Icon = ICONS[provider];
        return (
          <span
            key={provider}
            title={`Bruno can use ${provider}`}
            className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-settings-bg)] border border-[var(--color-settings-border)]"
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        );
      })}
    </div>
  );
}
