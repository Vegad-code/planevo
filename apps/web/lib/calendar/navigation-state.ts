import type { CalendarView } from '@/types/calendar';

export const CALENDAR_NAV_STORAGE_KEY = 'planevo:calendar-nav';

const CALENDAR_VIEWS: CalendarView[] = ['day', 'week', 'month', 'list', 'year'];

export interface StoredCalendarNav {
  selectedDate: string;
  activeView: CalendarView;
  backlogOpen?: boolean;
}

function isStoredCalendarNav(value: unknown): value is StoredCalendarNav {
  if (!value || typeof value !== 'object') return false;
  const parsed = value as Partial<StoredCalendarNav>;
  if (!parsed.selectedDate || !isCalendarView(parsed.activeView)) return false;
  if (parsed.backlogOpen !== undefined && typeof parsed.backlogOpen !== 'boolean') {
    return false;
  }
  return true;
}

function isCalendarView(value: unknown): value is CalendarView {
  return typeof value === 'string' && CALENDAR_VIEWS.includes(value as CalendarView);
}

export function readStoredCalendarNav(): StoredCalendarNav | null {
  if (typeof sessionStorage === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(CALENDAR_NAV_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredCalendarNav(parsed)) return null;

    const date = new Date(parsed.selectedDate);
    if (Number.isNaN(date.getTime())) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredCalendarNav(state: StoredCalendarNav): void {
  if (typeof sessionStorage === 'undefined') return;

  try {
    sessionStorage.setItem(CALENDAR_NAV_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota / private-mode errors.
  }
}

export function hasStoredCalendarNav(): boolean {
  return readStoredCalendarNav() !== null;
}
