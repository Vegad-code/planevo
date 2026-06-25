'use client';

import { format } from 'date-fns';
import type { CalendarEvent } from '@/types/calendar';
import { getEventColor } from '@/lib/calendar/eventColors';

interface RbcEventBlockProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
  timeFormat?: '12h' | '24h';
}

export default function RbcEventBlock({ event, timeFormat = '12h' }: RbcEventBlockProps) {
  const original = event.resource as CalendarEvent | undefined;
  const use12h = timeFormat === '12h';
  const start = event.start as Date;
  const end = event.end as Date;

  const timeLabel =
    start && end
      ? `${format(start, use12h ? 'h:mm a' : 'HH:mm')} – ${format(end, use12h ? 'h:mm a' : 'HH:mm')}`
      : '';

  if (!original) {
    return (
      <div className="h-full w-full px-1.5 py-0.5 overflow-hidden">
        <div className="text-xs font-semibold truncate leading-tight">{event.title}</div>
      </div>
    );
  }

  const { text } = getEventColor(original);

  return (
    <div className="h-full w-full px-1.5 py-0.5 overflow-hidden" style={{ color: text }}>
      <div className="text-xs font-semibold truncate leading-tight">{event.title}</div>
      {timeLabel && (
        <div className="text-[10px] opacity-90 truncate leading-tight mt-0.5">{timeLabel}</div>
      )}
    </div>
  );
}
