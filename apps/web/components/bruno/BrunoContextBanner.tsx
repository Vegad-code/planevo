'use client';

import { useBruno } from '@/components/bruno/BrunoProvider';

export function BrunoContextBanner() {
  const { currentContext } = useBruno();
  const label = currentContext?.label ?? 'Planevo';

  return (
    <div className="border-b border-[var(--color-settings-border)] bg-[var(--color-settings-card)] px-4 py-2.5 text-xs text-[var(--color-settings-text-muted)]">
      <span className="mr-2 inline-block h-2 w-2 rounded-full bg-emerald-400" />
      Bruno is looking at:{' '}
      <span className="font-medium text-[var(--color-settings-text)]">
        {label}
      </span>
    </div>
  );
}
