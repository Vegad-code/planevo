'use client';

import { Label } from '@/components/ui/label';
import { useSmartSchedulingPreference } from '@/hooks/useSmartSchedulingPreference';

export function SmartSchedulingForm() {
  const { prefs, loading, setSmartSchedulingEnabled, updatePrefs } =
    useSmartSchedulingPreference();

  if (loading) {
    return (
      <div className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-settings-card)] p-5 animate-pulse h-28" />
    );
  }

  return (
    <section className="rounded-[18px] border border-[var(--color-line)] bg-[var(--color-settings-card)] p-5 flex flex-col gap-4">
      <div>
        <h2 className="text-base font-medium text-[var(--color-ink)]">
          Smart scheduling from text
        </h2>
        <p className="text-sm text-[var(--color-ink-soft)] mt-1">
          Parse dates, times, duration, and priority while you type in Quick Capture and tasks.
        </p>
      </div>

      <label className="flex items-center justify-between gap-4 cursor-pointer">
        <span className="text-sm text-[var(--color-ink)]">Enable smart parsing</span>
        <input
          type="checkbox"
          checked={prefs.smart_scheduling_from_text}
          onChange={(e) => setSmartSchedulingEnabled(e.target.checked)}
          className="size-4 accent-[var(--color-honey-deep)]"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="date-order" className="text-xs text-[var(--color-ink-soft)]">
            Date order
          </Label>
          <select
            id="date-order"
            value={prefs.date_order}
            onChange={(e) =>
              updatePrefs({
                date_order: e.target.value as 'month-first' | 'day-first',
              })
            }
            className="h-10 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-sm"
          >
            <option value="month-first">Month first (US)</option>
            <option value="day-first">Day first</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="week-starts" className="text-xs text-[var(--color-ink-soft)]">
            Week starts on
          </Label>
          <select
            id="week-starts"
            value={prefs.week_starts_on}
            onChange={(e) =>
              updatePrefs({
                week_starts_on: e.target.value as 'sunday' | 'monday',
              })
            }
            className="h-10 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-sm"
          >
            <option value="sunday">Sunday</option>
            <option value="monday">Monday</option>
          </select>
        </div>
      </div>
    </section>
  );
}
