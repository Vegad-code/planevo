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
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center rounded-2xl border border-dashed border-line bg-paper/50">
        <div className="w-12 h-12 rounded-full bg-(--color-honey)/20 flex items-center justify-center">
          <Plugs weight="bold" className="w-6 h-6 text-(--color-honey-deep)" />
        </div>
        <div className="max-w-sm">
          <p className="font-serif text-lg text-ink m-0">{label} isn&apos;t connected</p>
          <p className="font-sans text-sm text-(--color-ink-soft) mt-2 mb-0 leading-relaxed">
            Connect {label} in settings to see synced items here.
          </p>
        </div>
        <Link
          href="/dashboard/settings/integrations"
          className="inline-flex items-center justify-center rounded-full bg-ink text-paper px-5 py-2.5 text-sm font-medium hover:scale-105 transition-transform"
        >
          Connect in settings
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center rounded-2xl border border-dashed border-line bg-paper/50">
        <p className="font-serif text-lg text-ink m-0">Nothing synced yet</p>
        <p className="font-sans text-sm text-(--color-ink-soft) max-w-sm mb-0 leading-relaxed">
          Bruno will pull items from {label} on the next sync. You can refresh now to check.
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full border border-line bg-paper px-5 py-2.5 text-sm font-medium text-ink hover:bg-(--color-honey)/10 transition-colors disabled:opacity-60"
        >
          <ArrowsClockwise weight="bold" className={cnSpin(busy)} />
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] tracking-[0.14em] text-(--color-ink-soft) uppercase m-0">
          {items.length} item{items.length === 1 ? '' : 's'}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={busy}
          className="inline-flex items-center gap-1.5 font-sans text-[13px] text-(--color-ink-soft) hover:text-ink transition-colors disabled:opacity-60"
        >
          <ArrowsClockwise weight="bold" className={cnSpin(busy, 'w-3.5 h-3.5')} />
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
