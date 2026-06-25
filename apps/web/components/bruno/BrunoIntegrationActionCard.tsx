'use client';

import { ArrowSquareOut, CheckCircle, Circle, XCircle } from '@phosphor-icons/react';
import { SlackIcon, NotionIcon, LinearIcon } from '@/components/icons/BrandIcons';

export type IntegrationActionStatus = 'running' | 'success' | 'error';

interface BrunoIntegrationActionCardProps {
  toolName: string;
  status: IntegrationActionStatus;
  url?: string | null;
  errorText?: string | null;
}

function providerFromToolName(toolName: string): 'notion' | 'slack' | 'linear' | null {
  const upper = toolName.toUpperCase();
  if (upper.startsWith('NOTION')) return 'notion';
  if (upper.startsWith('SLACK')) return 'slack';
  if (upper.startsWith('LINEAR')) return 'linear';
  return null;
}

/** Turns "LINEAR_CREATE_ISSUE" into "Linear · Create issue". */
function humanizeToolName(toolName: string): string {
  const parts = toolName.split('_');
  if (parts.length <= 1) return toolName;
  const provider = parts[0];
  const action = parts
    .slice(1)
    .join(' ')
    .toLowerCase()
    .replace(/\b\w/, (c) => c.toUpperCase());
  const providerLabel =
    provider.charAt(0).toUpperCase() + provider.slice(1).toLowerCase();
  return `${providerLabel} · ${action}`;
}

const PROVIDER_ICONS = {
  notion: NotionIcon,
  slack: SlackIcon,
  linear: LinearIcon,
};

/**
 * Inline status card for a Composio tool call Bruno made on a connected work
 * app. Shows the action, provider icon, running/success/error state, and a
 * deeplink when the tool returns one.
 */
export function BrunoIntegrationActionCard({
  toolName,
  status,
  url,
  errorText,
}: BrunoIntegrationActionCardProps) {
  const provider = providerFromToolName(toolName);
  const Icon = provider ? PROVIDER_ICONS[provider] : null;

  return (
    <div className="my-2 flex items-center gap-3 rounded-xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)] px-3 py-2.5">
      {Icon && (
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200/50 text-black">
          <Icon className="h-4 w-4" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-[var(--color-settings-text)]">
          {humanizeToolName(toolName)}
        </div>
        {status === 'error' && errorText && (
          <div className="truncate text-[11px] text-[var(--color-rose)]">
            {errorText}
          </div>
        )}
      </div>

      {status === 'running' && (
        <Circle className="h-4 w-4 animate-pulse text-[var(--color-settings-text-muted)]" />
      )}
      {status === 'success' && (
        <CheckCircle weight="fill" className="h-4 w-4 text-[var(--color-sage)]" />
      )}
      {status === 'error' && (
        <XCircle weight="fill" className="h-4 w-4 text-[var(--color-rose)]" />
      )}

      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => {
            event.preventDefault();
            window.open(url, '_blank', 'noopener,noreferrer');
          }}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-settings-brand)] hover:underline"
        >
          Open <ArrowSquareOut className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}
