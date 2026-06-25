'use client';

import CalendarComposer from './CalendarComposer';
import type { CalendarEvent } from '@/types/calendar';

interface EventDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onSave: (id: string, updates: Partial<CalendarEvent>) => void;
  onDelete: (id: string) => void;
  onSaveToNotion?: (event: CalendarEvent) => void;
}

export default function EventDialog({
  isOpen,
  onOpenChange,
  event,
  onSave,
  onDelete,
  onSaveToNotion,
}: EventDialogProps) {
  if (!event) return null;

  return (
    <CalendarComposer
      state={isOpen ? { mode: 'edit', event } : { mode: 'closed' }}
      onClose={() => onOpenChange(false)}
      onSaveSchedule={async () => {}}
      onSaveBacklog={async () => {}}
      onSaveEdit={onSave}
      onDelete={onDelete}
      onSaveToNotion={onSaveToNotion}
    />
  );
}
