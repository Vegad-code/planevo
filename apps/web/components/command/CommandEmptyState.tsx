'use client';

import { BrunoMark } from '@/components/dashboard/sidebar/shared';

/**
 * Empty board state. Uses the existing Bruno character art (not a generic SVG
 * blob, §26.1) and the low-shame copy from §38. The dominant element in the empty
 * state is the capture band above this — this is a quiet companion line.
 */
export function CommandEmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center gap-3 py-8 text-center">
      <BrunoMark size={44} mood="happy" />
      <p className="max-w-xs text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
        Start with the messy version. Planevo will sort it.
      </p>
    </div>
  );
}
