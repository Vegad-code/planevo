'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from '@/components/ui/popover';
import type { ComposerState } from '@/types/calendar';
import CalendarComposerContent, {
  type CalendarComposerContentProps,
} from './CalendarComposerContent';

type CalendarComposerShellProps = Omit<CalendarComposerContentProps, 'state'> & {
  state: ComposerState;
};

export default function CalendarComposerShell({
  state,
  onClose,
  ...contentProps
}: CalendarComposerShellProps) {
  const isOpen = state.mode !== 'closed';
  const anchor = state.mode !== 'closed' ? state.anchor : undefined;
  const useAnchoredPopover = !!anchor;

  if (!isOpen) return null;

  const isCreate = state.mode === 'create';
  const title = isCreate ? 'New event' : state.mode === 'edit' ? 'Edit event' : '';

  const content = (
    <CalendarComposerContent state={state} onClose={onClose} {...contentProps} />
  );

  if (useAnchoredPopover && anchor) {
    return (
      <Popover open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <PopoverAnchor asChild>
          <span
            aria-hidden
            className="fixed pointer-events-none size-px"
            style={{
              left: anchor.x,
              top: anchor.y + (anchor.height ?? 0),
            }}
          />
        </PopoverAnchor>
        <PopoverContent
          side="right"
          align="start"
          collisionPadding={16}
          className="z-[100] w-[min(95vw,400px)] p-0 border-[var(--color-line)] bg-[var(--color-paper)] shadow-2xl rounded-2xl overflow-hidden"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        hideOverlay
        className="p-0 overflow-hidden w-[95vw] sm:max-w-[400px] bg-[var(--color-paper)] border-[var(--color-line)] shadow-2xl rounded-2xl max-h-[90vh] gap-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isCreate ? 'Add to your calendar or backlog' : 'Modify event details'}
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
