'use client';

import { useState } from 'react';
import { updateProfileAction } from '../../app/dashboard/settings/profile/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

export function UpdateBaselineForm({ initialData }: { initialData: Record<string, any> }) {
  const [energyPreference, setEnergyPreference] = useState(initialData?.energy_preference || 'morning');
  const [workloadStyle, setWorkloadStyle] = useState(initialData?.workload_style || 'balanced');
  const [defaultTaskDuration, setDefaultTaskDuration] = useState(initialData?.default_task_duration || 30);
  const [preferredPlanningTime, setPreferredPlanningTime] = useState(initialData?.preferred_planning_time || 'morning');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateProfileAction({ 
      energy_preference: energyPreference,
      workload_style: workloadStyle,
      default_task_duration: Number(defaultTaskDuration),
      preferred_planning_time: preferredPlanningTime
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Baseline updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update baseline.' });
    }
    
    setSaving(false);
  };

  return (
    <SettingsSection 
      title="Planning Baseline" 
      description="Set defaults for how tasks are created and scheduled."
      onSubmit={handleSubmit}
    >
      <div className="space-y-0">
        <SettingsRow 
          title="Energy Preference" 
          description="Helps Bruno schedule your deep work when you're most productive."
        >
          <select
            value={energyPreference}
            onChange={(e) => setEnergyPreference(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="morning">Morning (I work best early)</option>
            <option value="afternoon">Afternoon (I hit my stride after lunch)</option>
            <option value="evening">Evening (Night owl)</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Workload Style">
          <select
            value={workloadStyle}
            onChange={(e) => setWorkloadStyle(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="light">Light (Protect my free time)</option>
            <option value="balanced">Balanced (Sustainable pace)</option>
            <option value="intense">Intense (Maximize output)</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Default Task Duration" description="In minutes. Used when no duration is specified.">
          <input
            type="number"
            min="5"
            step="5"
            value={defaultTaskDuration}
            onChange={(e) => setDefaultTaskDuration(Number(e.target.value))}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>
        
        <SettingsRow title="Preferred Planning Time" description="When do you usually sit down to plan your day/week?">
          <select
            value={preferredPlanningTime}
            onChange={(e) => setPreferredPlanningTime(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="morning">Morning (Start of day)</option>
            <option value="evening">Evening (For the next day)</option>
            <option value="sunday">Sunday (For the whole week)</option>
          </select>
        </SettingsRow>
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-[var(--color-ink-soft)] dark:hover:bg-[#5A7A58] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Update Baseline'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
