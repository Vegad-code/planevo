'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const SHORTCUTS = [
  { keys: ['T'], description: 'Go to today and scroll to current time' },
  { keys: ['←', '→'], description: 'Previous / next period' },
  { keys: ['D', 'W', 'M', 'L', 'Y'], description: 'Day / Week / Month / Schedule / Year view' },
  { keys: ['N', 'C'], description: 'Create new event (toolbar or click a time slot)' },
  { keys: ['B'], description: 'Toggle task backlog panel' },
  { keys: ['1', '–', '7'], description: 'Jump to Sun–Sat of current week' },
  { keys: ['?'], description: 'Show this help' },
  { keys: ['Esc'], description: 'Close dialogs' },
];

interface CalendarShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CalendarShortcutHelp({
  open,
  onOpenChange,
}: CalendarShortcutHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-[var(--color-paper)] border-[var(--color-line)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)]">Keyboard shortcuts</DialogTitle>
          <DialogDescription className="text-[var(--color-ink-muted)]">
            Navigate the calendar without reaching for the mouse.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 mt-2">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.description}
              className="flex items-center justify-between gap-4 py-1.5"
            >
              <span className="text-sm text-[var(--color-ink)]">{shortcut.description}</span>
              <div className="flex items-center gap-1 shrink-0">
                {shortcut.keys.map((key, i) => (
                  <span key={`${key}-${i}`} className="flex items-center gap-1">
                    {i > 0 && key !== '–' && (
                      <span className="text-[var(--color-ink-muted)] text-xs">/</span>
                    )}
                    {key !== '–' && (
                      <kbd className="px-2 py-0.5 rounded-md border border-[var(--color-line)] bg-[var(--color-cream-2)] font-mono text-[11px] text-[var(--color-ink)]">
                        {key}
                      </kbd>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] font-mono text-[var(--color-ink-muted)] mt-2">
          Cmd/Ctrl+K opens Quick Capture · Cmd/Ctrl+L opens Bruno
        </p>
      </DialogContent>
    </Dialog>
  );
}
