'use client';

import type { CommandBoard as CommandBoardData, ResponsibilityItem } from '@/lib/command/types';
import type { CommandBoardSection } from '@/lib/command/types';
import { CommandSection } from './CommandSection';
import { SECTION_ORDER } from './format';

/**
 * The board: ordered sections, top-weighted. `Now` leads; everything below is
 * progressively quieter. Kanban columns are banned (§26.1) — this is a single
 * scannable column, Things 3 / Linear style.
 */
export function CommandBoard({
  board,
  now,
  selectedId,
  onSelect,
  onToggleDone,
}: {
  board: CommandBoardData;
  now: Date;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleDone: (item: ResponsibilityItem) => void;
}) {
  function emphasisFor(section: CommandBoardSection): 'lead' | 'normal' | 'quiet' {
    if (section === 'now') return 'lead';
    if (section === 'onMyPlate' || section === 'waiting' || section === 'done') return 'quiet';
    return 'normal';
  }

  return (
    <div>
      {SECTION_ORDER.map((section) => (
        <CommandSection
          key={section}
          section={section}
          items={board[section]}
          now={now}
          emphasis={emphasisFor(section)}
          selectedId={selectedId}
          onSelect={onSelect}
          onToggleDone={onToggleDone}
        />
      ))}
    </div>
  );
}
