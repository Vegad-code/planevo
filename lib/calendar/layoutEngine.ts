import type { CalendarEvent, DayLayoutEvent } from '@/types/calendar';

const HOUR_HEIGHT = 72; // px per hour — matches --timeline-hour-height
const MIN_CARD_HEIGHT = 40; // minimum height for very short events

/**
 * Convert a Date or ISO string to a Y-pixel offset from the top of the timeline.
 * dayStartHour anchors the top of the grid (e.g. 6 = 6 AM).
 */
export function timeToPixel(time: Date | string, dayStartHour: number): number {
  const d = typeof time === 'string' ? new Date(time) : time;
  const hours = d.getHours() + d.getMinutes() / 60;
  return (hours - dayStartHour) * HOUR_HEIGHT;
}

/**
 * Convert a Y-pixel offset back to a Date on the given day.
 * Snaps to the nearest 15-minute interval.
 */
export function pixelToTime(px: number, dayStartHour: number, referenceDate: Date): Date {
  const totalMinutes = (px / HOUR_HEIGHT) * 60 + dayStartHour * 60;
  const snapped = Math.round(totalMinutes / 15) * 15;
  const result = new Date(referenceDate);
  result.setHours(Math.floor(snapped / 60), snapped % 60, 0, 0);
  return result;
}

/**
 * Calculate the pixel height for an event based on its duration.
 */
export function durationToHeight(startTime: string, endTime: string): number {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60);
  const height = (durationMinutes / 60) * HOUR_HEIGHT;
  return Math.max(height, MIN_CARD_HEIGHT);
}

/**
 * Check if two events overlap in time.
 */
function eventsOverlap(a: CalendarEvent, b: CalendarEvent): boolean {
  const aStart = new Date(a.start_time).getTime();
  const aEnd = new Date(a.end_time).getTime();
  const bStart = new Date(b.start_time).getTime();
  const bEnd = new Date(b.end_time).getTime();
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Assign column positions to overlapping events.
 * Uses a greedy algorithm similar to Google Calendar's layout.
 * 
 * Returns events with `column`, `totalColumns`, `top`, and `height` computed.
 */
export function computeDayLayout(
  events: CalendarEvent[],
  dayStartHour: number
): DayLayoutEvent[] {
  if (events.length === 0) return [];

  // Sort by start time, then by duration (longer first for better layout)
  const sorted = [...events].sort((a, b) => {
    const startDiff = new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    if (startDiff !== 0) return startDiff;
    // Longer events first
    const aDur = new Date(a.end_time).getTime() - new Date(a.start_time).getTime();
    const bDur = new Date(b.end_time).getTime() - new Date(b.start_time).getTime();
    return bDur - aDur;
  });

  // Build overlap groups — clusters of events that all overlap transitively
  const groups: CalendarEvent[][] = [];
  let currentGroup: CalendarEvent[] = [];
  let groupEnd = 0;

  for (const event of sorted) {
    const eventStart = new Date(event.start_time).getTime();
    const eventEnd = new Date(event.end_time).getTime();

    if (currentGroup.length === 0 || eventStart < groupEnd) {
      // Overlaps with current group
      currentGroup.push(event);
      groupEnd = Math.max(groupEnd, eventEnd);
    } else {
      // New group
      groups.push(currentGroup);
      currentGroup = [event];
      groupEnd = eventEnd;
    }
  }
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  // Assign columns within each group
  const layoutEvents: DayLayoutEvent[] = [];

  for (const group of groups) {
    const columns: CalendarEvent[][] = [];

    for (const event of group) {
      // Find the first column where this event doesn't overlap with the last event
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        if (!eventsOverlap(lastInCol, event)) {
          columns[col].push(event);
          layoutEvents.push({
            ...event,
            column: col,
            totalColumns: 0, // Will be set after
            top: timeToPixel(event.start_time, dayStartHour),
            height: durationToHeight(event.start_time, event.end_time),
          });
          placed = true;
          break;
        }
      }

      if (!placed) {
        // Need a new column
        columns.push([event]);
        layoutEvents.push({
          ...event,
          column: columns.length - 1,
          totalColumns: 0,
          top: timeToPixel(event.start_time, dayStartHour),
          height: durationToHeight(event.start_time, event.end_time),
        });
      }
    }

    // Set totalColumns for all events in this group
    const totalCols = columns.length;
    for (const le of layoutEvents) {
      if (group.some(e => e.id === le.id)) {
        le.totalColumns = totalCols;
      }
    }
  }

  return layoutEvents;
}

/**
 * Generate the hour labels for the time gutter.
 */
export function generateHourLabels(
  startHour: number,
  endHour: number,
  format: '12h' | '24h'
): { hour: number; label: string; top: number }[] {
  const labels: { hour: number; label: string; top: number }[] = [];

  for (let h = startHour; h <= endHour; h++) {
    let label: string;
    if (format === '24h') {
      label = `${h.toString().padStart(2, '0')}:00`;
    } else {
      if (h === 0) label = '12 AM';
      else if (h < 12) label = `${h} AM`;
      else if (h === 12) label = '12 PM';
      else label = `${h - 12} PM`;
    }

    labels.push({
      hour: h,
      label,
      top: (h - startHour) * HOUR_HEIGHT,
    });
  }

  return labels;
}

/**
 * Get the source color CSS variable name for a calendar source.
 */
export function getSourceColor(source: CalendarEvent['source']): string {
  const map: Record<string, string> = {
    manual: 'var(--color-manual)',
    google_calendar: 'var(--color-google)',
    canvas: 'var(--color-canvas)',
    blueprint: 'var(--color-blueprint)',
    schedule: 'var(--color-ollie)',
    cargo_bay: 'var(--color-cargo)',
    focus_block: 'var(--color-focus)',
    rollover: 'var(--color-rollover)',
  };
  return map[source] || 'var(--color-manual)';
}

/**
 * Get a human-readable label for a calendar source.
 */
export function getSourceLabel(source: CalendarEvent['source']): string {
  const map: Record<string, string> = {
    manual: 'Manual',
    google_calendar: 'Google',
    canvas: 'Canvas',
    blueprint: 'Blueprint',
    schedule: 'Ollie',
    cargo_bay: 'Cargo Bay',
    focus_block: 'Focus',
    rollover: 'Rolled Over',
  };
  return map[source] || source;
}
