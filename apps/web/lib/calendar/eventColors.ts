import type { CalendarEvent } from '@/types/calendar';

/** Google Calendar–inspired event color palette */
export const EVENT_COLOR_PALETTE = [
  { id: 'tomato', hex: '#D50000' },
  { id: 'flamingo', hex: '#E67C73' },
  { id: 'tangerine', hex: '#F4511E' },
  { id: 'banana', hex: '#F6BF26' },
  { id: 'sage', hex: '#33B679' },
  { id: 'basil', hex: '#0B8043' },
  { id: 'peacock', hex: '#039BE5' },
  { id: 'blueberry', hex: '#3F51B5' },
  { id: 'lavender', hex: '#7986CB' },
  { id: 'grape', hex: '#8E24AA' },
  { id: 'graphite', hex: '#616161' },
  { id: 'cocoa', hex: '#795548' },
] as const;

export type EventColorId = (typeof EVENT_COLOR_PALETTE)[number]['id'];

export const DEFAULT_EVENT_COLOR = '#039BE5';

const SOURCE_HEX: Record<string, string> = {
  manual: DEFAULT_EVENT_COLOR,
  google_calendar: '#5B8DCF',
  canvas: '#C56B5E',
  blueprint: '#6B8B69',
  schedule: '#D08741',
  cargo_bay: '#7c5cbf',
  focus_block: '#B96E2A',
  rollover: '#C56B5E',
  notion: '#111827',
  slack: '#4A154B',
  linear: '#5E6AD2',
};

export interface EventDisplayColor {
  bg: string;
  text: string;
  border: string;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Relative luminance for WCAG contrast */
function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function getContrastText(bgHex: string): string {
  if (!bgHex.startsWith('#')) return '#ffffff';
  return getLuminance(bgHex) > 0.45 ? '#1A140D' : '#ffffff';
}

function toDisplayColor(bg: string): EventDisplayColor {
  return { bg, text: getContrastText(bg), border: bg };
}

/**
 * Resolve display color for a calendar event.
 * Priority: user color > source brand > deterministic palette hash.
 */
export function getEventColor(event: CalendarEvent): EventDisplayColor {
  if (event.color) {
    return toDisplayColor(event.color);
  }

  const sourceHex = SOURCE_HEX[event.source];
  if (sourceHex) {
    return toDisplayColor(sourceHex);
  }

  const idx = hashString(event.id) % EVENT_COLOR_PALETTE.length;
  return toDisplayColor(EVENT_COLOR_PALETTE[idx].hex);
}

export function isPaletteColor(hex: string): boolean {
  return EVENT_COLOR_PALETTE.some((c) => c.hex.toLowerCase() === hex.toLowerCase());
}
