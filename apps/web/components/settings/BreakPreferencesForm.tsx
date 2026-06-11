'use client';

import { useState } from 'react';
import { updateBreakPreferencesAction } from '../../app/dashboard/settings/calendar/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function BreakPreferencesForm({ initialData }: { initialData: Record<string, any> }) {
  const [frequency, setFrequency] = useState<'minimal' | 'balanced' | 'frequent'>(initialData?.frequency || 'balanced');
  const [preferredMinutes, setPreferredMinutes] = useState<number>(initialData?.preferred_minutes || 15);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateBreakPreferencesAction({ 
      frequency,
      preferred_minutes: preferredMinutes
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Break preferences updated.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update break preferences.' });
    }
    
    setSaving(false);
  };

  return (
    <SettingsSection 
      title="Break Preferences" 
      description="Control how often and how long you rest between focus blocks."
      onSubmit={handleSubmit}
      defaultOpen={true}
    >
      <div className="space-y-0">
        <SettingsRow title="Break Frequency" description="How frequently Bruno should schedule breaks during deep work sessions.">
          <select
            value={frequency}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setFrequency(e.target.value as any)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="minimal">Minimal (Fewer, longer blocks)</option>
            <option value="balanced">Balanced (Standard Pomodoro-ish)</option>
            <option value="frequent">Frequent (More frequent, shorter blocks)</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Preferred Break Duration" description="How many minutes your typical break should last.">
          <select
            value={preferredMinutes}
            onChange={(e) => setPreferredMinutes(parseInt(e.target.value))}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="5">5 Minutes</option>
            <option value="10">10 Minutes</option>
            <option value="15">15 Minutes</option>
            <option value="20">20 Minutes</option>
            <option value="30">30 Minutes</option>
            <option value="45">45 Minutes</option>
          </select>
        </SettingsRow>
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-settings-brand text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save Breaks'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
