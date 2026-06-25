'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Clock, CalendarBlank, ChatCircle } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Task } from '@/types/tasks';
import type { CalendarEvent } from '@/types/calendar';
import { findNextFreeSlot } from '@/lib/calendar/findNextFreeSlot';

interface ScheduleTaskPopoverProps {
  task: Task;
  selectedDate: Date;
  events: CalendarEvent[];
  dayStartHour: number;
  dayEndHour: number;
  onSchedule: (task: Task, time: Date) => void;
  onAskBruno?: (task: Task) => void;
  onClose: () => void;
}

export default function ScheduleTaskPopover({
  task,
  selectedDate,
  events,
  dayStartHour,
  dayEndHour,
  onSchedule,
  onAskBruno,
  onClose,
}: ScheduleTaskPopoverProps) {
  const [pickTime, setPickTime] = useState(false);
  const [timeValue, setTimeValue] = useState('09:00');

  const duration = task.estimated_minutes || 60;
  const nextSlot = findNextFreeSlot({
    date: selectedDate,
    events,
    durationMinutes: duration,
    dayStartHour,
    dayEndHour,
  });

  const handleNextFree = () => {
    if (nextSlot) {
      onSchedule(task, nextSlot);
      onClose();
    }
  };

  const handlePickTime = () => {
    const [h, m] = timeValue.split(':').map(Number);
    const slot = new Date(selectedDate);
    slot.setHours(h, m, 0, 0);
    onSchedule(task, slot);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm bg-[var(--color-paper)] border-[var(--color-line)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-ink)] truncate">
            Schedule &ldquo;{task.title}&rdquo;
          </DialogTitle>
        </DialogHeader>

        {!pickTime ? (
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!nextSlot}
              onClick={handleNextFree}
              className="w-full justify-start gap-2 bg-[var(--color-ink)] text-[var(--color-cream)] hover:bg-[var(--color-ink-2)]"
            >
              <Clock className="w-4 h-4" />
              {nextSlot
                ? `Next free · ${format(nextSlot, 'h:mm a')}`
                : 'No free slots today'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPickTime(true)}
              className="w-full justify-start gap-2 text-[var(--color-ink)]"
            >
              <CalendarBlank className="w-4 h-4" />
              Pick time…
            </Button>
            {onAskBruno && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  onAskBruno(task);
                  onClose();
                }}
                className="w-full justify-start gap-2 text-[var(--color-ink-muted)]"
              >
                <ChatCircle className="w-4 h-4" />
                Ask Bruno
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs font-mono text-[var(--color-ink-muted)]">
                Start time
              </Label>
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="font-mono text-sm mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setPickTime(false)} className="flex-1">
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePickTime}
                className="flex-1 bg-[var(--color-ink)] text-[var(--color-cream)]"
              >
                Schedule
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
