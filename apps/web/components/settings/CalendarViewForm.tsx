'use client';

import { useState } from 'react';
import { updateCalendarPreferencesAction } from '../../app/dashboard/settings/calendar/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function CalendarViewForm({ initialData }: { initialData: Record<string, any> }) {
  const [defaultView, setDefaultView] = useState(initialData?.default_view || 'day');
  const [startHour, setStartHour] = useState<number>(initialData?.start_hour ?? 8);
  const [endHour, setEndHour] = useState<number>(initialData?.end_hour ?? 20);
  const [showCompleted, setShowCompleted] = useState<boolean>(initialData?.show_completed ?? true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateCalendarPreferencesAction({ 
      default_view: defaultView,
      start_hour: startHour,
      end_hour: endHour,
      show_completed: showCompleted
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Calendar preferences updated.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update calendar preferences.' });
    }
    
    setSaving(false);
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <SettingsSection 
      title="Calendar View Defaults" 
      description="Configure how your calendar looks by default."
      onSubmit={handleSubmit}
      defaultOpen={true}
    >
      <div className="space-y-0">
        <SettingsRow title="Default View">
          <select
            value={defaultView}
            onChange={(e) => setDefaultView(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Day Start Time" description="The hour your day typically begins.">
          <select
            value={startHour}
            onChange={(e) => setStartHour(parseInt(e.target.value))}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            {hours.map(h => (
              <option key={`start-${h}`} value={h}>
                {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow title="Day End Time" description="The hour your day typically ends.">
          <select
            value={endHour}
            onChange={(e) => setEndHour(parseInt(e.target.value))}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            {hours.map(h => (
              <option key={`end-${h}`} value={h}>
                {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsToggleRow
          title="Show Completed Tasks"
          description="Keep completed tasks visible on the calendar."
          checked={showCompleted}
          onChange={setShowCompleted}
        />
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-settings-brand text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
