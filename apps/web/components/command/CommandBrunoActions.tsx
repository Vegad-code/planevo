'use client';

import { useBruno, useRegisterBrunoContext } from '@/components/bruno/BrunoProvider';
import { BrunoMark } from '@/components/dashboard/sidebar/shared';
import { GlassPanel } from '@/components/ui/glass-panel';
import type { CommandBoardSummary, ResponsibilityItem } from '@/lib/command/types';

/**
 * Bruno inside Command is a PRESENCE, not a feature grid (§26.1). This is a
 * CLOSED affordance: bear art + one suggestion sentence + up to two action chips.
 * It is never an editable text field — opening a real conversation routes to the
 * existing BrunoDock (the one place chat-shaped UI is earned). It also registers
 * the compact Command context so Bruno arrives already knowing the board state
 * (§11.4 — board snapshot + selected item only, never the whole life history).
 */
export function CommandBrunoActions({
  summary,
  selectedItem,
}: {
  summary: CommandBoardSummary;
  selectedItem: ResponsibilityItem | null;
}) {
  const { openBruno } = useBruno();

  useRegisterBrunoContext({
    source: 'command',
    page: 'command',
    label: 'Command',
    payload: {
      surface: 'command',
      selectedItemId: selectedItem?.id,
      boardSnapshot: summary,
      selectedItem: selectedItem
        ? {
            id: selectedItem.id,
            title: selectedItem.title,
            type: selectedItem.type,
            dueAt: selectedItem.dueAt,
            sourceType: selectedItem.sourceType,
            status: selectedItem.status,
            notes: selectedItem.description,
          }
        : undefined,
    },
  });

  // Suggestion + chips adapt to whether an item is selected.
  const suggestion = selectedItem
    ? `Want help with “${truncate(selectedItem.title, 40)}”?`
    : summary.unsortedCount > 0
      ? `${summary.unsortedCount} item${summary.unsortedCount === 1 ? '' : 's'} still need a date or class.`
      : 'Ask Bruno about this plate.';

  const chips: string[] = selectedItem
    ? ['Break down', 'Find time']
    : ['Plan my day', 'What matters now'];

  function ask(prompt: string) {
    openBruno({
      source: 'command',
      page: 'command',
      label: 'Command',
      payload: { intent: prompt, selectedItemId: selectedItem?.id },
    });
  }

  return (
    <GlassPanel variant="card" className="flex items-start gap-3 p-3.5">
      <BrunoMark size={30} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-snug text-[var(--color-ink-soft)]">{suggestion}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => ask(chip)}
              className="rounded-full border border-[var(--glass-border)] bg-[var(--color-surface-raised)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-accent-warm)]/40 hover:text-[var(--color-ink)]"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>
    </GlassPanel>
  );
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
