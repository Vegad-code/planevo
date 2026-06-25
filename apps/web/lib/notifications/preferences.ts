export type NotificationChannel = 'push' | 'email';

export type NotificationType =
  | 'daily_plan'
  | 'deadline_rescue'
  | 'upcoming_reminders'
  | 'canvas_assignments'
  | 'calendar_events'
  | 'work_slack'
  | 'work_linear'
  | 'work_notion'
  | 'weekly_review'
  | 'account'
  | 'billing'
  | 'system';

export const DEFAULT_MORNING_TIME = '09:00';
export const DEFAULT_EVENING_TIME = '18:00';

export interface NotificationPreferences {
  master_toggle: boolean;
  channels: Record<NotificationChannel, boolean>;
  quiet_hours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  types: Record<NotificationType, boolean>;
}

export const defaultNotificationPreferences: NotificationPreferences = {
  master_toggle: true,
  channels: { push: true, email: true },
  quiet_hours: { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC' },
  types: {
    daily_plan: true,
    deadline_rescue: true,
    upcoming_reminders: true,
    canvas_assignments: false,
    calendar_events: true,
    work_slack: false,
    work_linear: false,
    work_notion: false,
    weekly_review: true,
    account: true,
    billing: true,
    system: true,
  },
};

export function normalizeNotificationPreferences(
  input: Partial<NotificationPreferences> | null | undefined
): NotificationPreferences {
  return {
    master_toggle: input?.master_toggle ?? defaultNotificationPreferences.master_toggle,
    channels: {
      ...defaultNotificationPreferences.channels,
      ...(input?.channels ?? {}),
    },
    quiet_hours: {
      ...defaultNotificationPreferences.quiet_hours,
      ...(input?.quiet_hours ?? {}),
    },
    types: {
      ...defaultNotificationPreferences.types,
      ...(input?.types ?? {}),
    },
  };
}

/** Coerce a Supabase JSON preferences row into a partial preferences object. */
export function parseNotificationPreferencesRow(
  raw: unknown
): Partial<NotificationPreferences> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  return raw as Partial<NotificationPreferences>;
}

export function isQuietHour(
  date: Date,
  timezone: string,
  startStr: string,
  endStr: string
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    });

    const parts = formatter.formatToParts(date);
    const hStr = parts.find((part) => part.type === 'hour')?.value || '0';
    const mStr = parts.find((part) => part.type === 'minute')?.value || '0';
    const currentMinutes = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);

    const [startH, startM] = startStr.split(':').map(Number);
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    const [endH, endM] = endStr.split(':').map(Number);
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    if (startMinutes < endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } catch (error) {
    console.error('[notifications] Timezone parsing error:', error);
    return false;
  }
}

export function getLocalDateKey(date: Date, timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value || '0000';
    const month = parts.find((part) => part.type === 'month')?.value || '00';
    const day = parts.find((part) => part.type === 'day')?.value || '00';
    return `${year}-${month}-${day}`;
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export function isPastLocalTime(date: Date, timezone: string, targetTime: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((part) => part.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((part) => part.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const [targetHour, targetMinute] = targetTime.split(':').map(Number);
    const targetMinutes = (targetHour || 0) * 60 + (targetMinute || 0);

    return currentMinutes >= targetMinutes;
  } catch {
    return false;
  }
}

export function isLocalTimeWithinWindow(
  date: Date,
  timezone: string,
  targetTime: string,
  windowMinutes = 60
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const hour = parseInt(parts.find((part) => part.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((part) => part.type === 'minute')?.value || '0', 10);
    const currentMinutes = hour * 60 + minute;

    const [targetHour, targetMinute] = targetTime.split(':').map(Number);
    const targetMinutes = (targetHour || 0) * 60 + (targetMinute || 0);

    return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + windowMinutes;
  } catch {
    return false;
  }
}

export function isSameLocalDate(date: Date, reference: Date, timezone: string): boolean {
  return getLocalDateKey(date, timezone) === getLocalDateKey(reference, timezone);
}

export function canSendNotification(
  rawPreferences: Partial<NotificationPreferences> | null | undefined,
  channel: NotificationChannel,
  type: NotificationType,
  options: { now?: Date; respectQuietHours?: boolean } = {}
): boolean {
  const preferences = normalizeNotificationPreferences(rawPreferences);
  if (!preferences.master_toggle) return false;
  if (!preferences.channels[channel]) return false;
  if (!preferences.types[type]) return false;

  if (options.respectQuietHours && preferences.quiet_hours.enabled) {
    const now = options.now ?? new Date();
    return !isQuietHour(
      now,
      preferences.quiet_hours.timezone,
      preferences.quiet_hours.start,
      preferences.quiet_hours.end
    );
  }

  return true;
}
