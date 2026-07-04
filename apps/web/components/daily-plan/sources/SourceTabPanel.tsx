'use client';

import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowsClockwise, Plugs } from '@phosphor-icons/react';
import { toast } from 'sonner';
import type { SourceListItem, SourceProvider } from '@/lib/plan/source-items';
import { SOURCE_PROVIDER_LABELS } from '@/lib/plan/source-items';
import { refreshSourceAction } from '@/lib/plan/refresh-sources-action';
import { SourceList } from './SourceList';
import { SmoothSurface } from '../SmoothSurface';

interface SourceTabPanelProps {
  provider: SourceProvider;
  connected: boolean;
  items: SourceListItem[];
  onSelectItem: (item: SourceListItem) => void;
}

export function SourceTabPanel({
  provider,
  connected,
  items,
  onSelectItem,
}: SourceTabPanelProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [refreshing, setRefreshing] = useState(false);

  const label = SOURCE_PROVIDER_LABELS[provider];

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    startRefresh(async () => {
      const result = await refreshSourceAction(provider);
      setRefreshing(false);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(`${label} synced`);
      router.refresh();
    });
  }, [label, provider, router]);

  const busy = isRefreshing || refreshing;

  if (!connected) {
    return (
      <SmoothSurface
        cornerRadius={28}
        cornerSmoothing={0.88}
        className="border border-dashed border-line bg-[var(--color-surface-raised)]"
      >
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] dark:bg-[var(--color-surface-muted)]">
            <Plugs weight="bold" className="h-6 w-6" />
          </div>
          <div className="max-w-sm">
            <p className="m-0 text-lg font-semibold text-ink">
              {label} is not connected
            </p>
            <p className="m-0 mt-2 text-sm leading-6 text-[var(--color-ink-soft)]">
              Connect {label} in settings to see synced items here.
            </p>
          </div>
          <Link
            href="/dashboard/settings/integrations"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-paper transition hover:bg-ink/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
          >
            Connect in settings
          </Link>
        </div>
      </SmoothSurface>
    );
  }

  if (items.length === 0) {
    return (
      <SmoothSurface
        cornerRadius={28}
        cornerSmoothing={0.88}
        className="border border-dashed border-line bg-[var(--color-surface-raised)]"
      >
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <p className="m-0 text-lg font-semibold text-ink">
            Nothing synced yet
          </p>
          <p className="m-0 max-w-sm text-sm leading-6 text-[var(--color-ink-soft)]">
            Bruno will pull items from {label} on the next sync. You can refresh
            now to check.
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-transparent px-5 text-sm font-semibold text-ink transition hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-60"
          >
            <ArrowsClockwise weight="bold" className={cnSpin(busy)} />
            Refresh
          </button>
        </div>
      </SmoothSurface>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-soft)]">
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-[var(--color-ink-soft)] transition hover:bg-[var(--color-surface-muted)] hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-60"
        >
          <ArrowsClockwise
            weight="bold"
            className={cnSpin(busy, 'w-3.5 h-3.5')}
          />
          Refresh
        </button>
      </div>
      <SourceList items={items} onSelect={onSelectItem} />
    </div>
  );
}

function cnSpin(busy: boolean, className = 'w-4 h-4') {
  return busy ? `${className} animate-spin` : className;
}
