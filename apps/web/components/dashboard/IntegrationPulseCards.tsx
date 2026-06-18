'use client';

import { useProIntegrations } from '@/hooks/useProIntegrations';
import { SlackIcon, NotionIcon, LinearIcon } from '@/components/icons/BrandIcons';
import type { ProIntegrationProvider } from '@/lib/integrations/types';

const ICONS: Record<ProIntegrationProvider, React.ComponentType<{ className?: string }>> = {
  notion: NotionIcon,
  slack: SlackIcon,
  linear: LinearIcon,
};

const LABELS: Record<ProIntegrationProvider, string> = {
  notion: 'Notion',
  slack: 'Slack',
  linear: 'Linear',
};

/**
 * Header pills summarizing connected work tools on the dashboard — open count
 * and items due this week, mirroring the Canvas/Calendar source pills.
 */
export function IntegrationPulseCards() {
  const { pulses } = useProIntegrations();
  const connected = pulses.filter((p) => p.connected);

  if (connected.length === 0) return null;

  return (
    <>
      {connected.map((pulse) => {
        const provider = pulse.provider as ProIntegrationProvider;
        const Icon = ICONS[provider];
        const count =
          pulse.dueThisWeek > 0
            ? `${pulse.dueThisWeek} due`
            : `${pulse.openCount} open`;
        return (
          <div
            key={pulse.provider}
            className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-full bg-(--color-paper) border border-line-strong text-[13px] font-sans shadow-sm"
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="text-(--color-ink) font-medium">{LABELS[provider]}</span>
            <span className="font-mono text-[11px] text-(--color-ink-soft)">{count}</span>
            <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-(--color-cream-2) text-(--color-sage) tracking-wider">
              SYNCED
            </span>
          </div>
        );
      })}
    </>
  );
}
