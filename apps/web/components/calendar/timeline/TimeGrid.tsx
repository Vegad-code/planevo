'use client';

import { generateHourLabels } from '@/lib/calendar/layoutEngine';

interface TimeGridProps {
  startHour: number;
  endHour: number;
  timeFormat: '12h' | '24h';
  hourHeight?: number;
}

/**
 * Background grid with hour labels on the left and faint horizontal guide lines.
 * Also renders the dotted vertical "rail" line (like Structured's timeline spine).
 */
export default function TimeGrid({
  startHour,
  endHour,
  timeFormat,
  hourHeight = 72,
}: TimeGridProps) {
  const hours = generateHourLabels(startHour, endHour, timeFormat);
  const totalHeight = (endHour - startHour) * hourHeight;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ height: `${totalHeight}px` }}>
      {/* Dotted vertical rail — the Structured-style spine */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: '20px',
          width: '2px',
          backgroundImage: `repeating-linear-gradient(
            to bottom,
            var(--rail-color) 0px,
            var(--rail-color) 4px,
            transparent 4px,
            transparent 10px
          )`,
        }}
      />

      {/* Hour rows */}
      {hours.map(({ hour, label, top }) => (
        <div
          key={hour}
          className="absolute left-0 right-0"
          style={{ top: `${top}px` }}
        >
          {/* Hour label in the gutter */}
          <span className="absolute text-[10px] font-mono font-medium text-muted-foreground whitespace-nowrap select-none"
            style={{
              right: 'calc(100% - 0px)',
              top: '-7px',
              width: '52px',
              textAlign: 'right',
              paddingRight: '8px',
            }}
          >
            {label}
          </span>

          {/* Dot on the rail */}
          <div
            className="absolute rounded-full"
            style={{
              left: '17px',
              top: '-3px',
              width: '8px',
              height: '8px',
              backgroundColor: 'var(--rail-color)',
            }}
          />

          {/* Horizontal guide line */}
          <div
            className="absolute h-px"
            style={{
              left: '32px',
              right: '0',
              backgroundColor: 'var(--rail-color)',
              opacity: 0.5,
            }}
          />
        </div>
      ))}
    </div>
  );
}
