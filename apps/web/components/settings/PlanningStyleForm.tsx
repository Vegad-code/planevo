'use client';

import { useState } from 'react';
import { updatePlanningStyleAction } from '../../app/dashboard/settings/calendar/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function PlanningStyleForm({ initialData }: { initialData: Record<string, any> }) {
  const [mode, setMode] = useState<'strict' | 'balanced' | 'flexible'>(initialData?.mode || 'balanced');
  const [maxMinutes, setMaxMinutes] = useState<number>(initialData?.max_planned_minutes_per_day || 240);
  const [allowBuffers, setAllowBuffers] = useState<boolean>(initialData?.allow_buffers ?? true);
  const [rolloverStyle, setRolloverStyle] = useState<'automatic' | 'review' | 'manual'>(initialData?.rollover_style || 'automatic');
  const [weeklyReviewDay, setWeeklyReviewDay] = useState<string>(initialData?.weekly_review_day || 'Sunday');
  const [weeklyReviewTime, setWeeklyReviewTime] = useState<string>(initialData?.weekly_review_time || '17:00');
  
  const [workHoursStart, setWorkHoursStart] = useState<string>(initialData?.work_hours?.start || '09:00');
  const [workHoursEnd, setWorkHoursEnd] = useState<string>(initialData?.work_hours?.end || '17:00');
  const [workHoursDays, setWorkHoursDays] = useState<string>(initialData?.work_hours?.days?.join(', ') || 'Mon, Tue, Wed, Thu, Fri');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updatePlanningStyleAction({ 
      mode,
      max_planned_minutes_per_day: maxMinutes,
      allow_buffers: allowBuffers,
      rollover_style: rolloverStyle,
      weekly_review_day: weeklyReviewDay,
      weekly_review_time: weeklyReviewTime,
      work_hours: {
        label: 'Work/School',
        start: workHoursStart,
        end: workHoursEnd,
        days: workHoursDays.split(',').map(d => d.trim()).filter(Boolean),
        confidence: 1.0,
        source: 'manual'
      }
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Planning style updated.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update planning style.' });
    }
    
    setSaving(false);
  };

  return (
    <SettingsSection 
      title="AI Planning Style" 
      description="Control how Bruno generates your daily schedule."
      onSubmit={handleSubmit}
      defaultOpen={true}
    >
      <div className="space-y-0">
        <SettingsRow title="Aggressiveness Mode" description="Strict mode packs the schedule tightly. Flexible leaves room for changes.">
          <select
            value={mode}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setMode(e.target.value as any)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="flexible">Flexible</option>
            <option value="balanced">Balanced</option>
            <option value="strict">Strict</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Max Planned Minutes" description="Maximum minutes of deep work to schedule per day.">
          <input
            type="number"
            min="30"
            max="720"
            step="15"
            value={maxMinutes}
            onChange={(e) => setMaxMinutes(parseInt(e.target.value))}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>

        <SettingsToggleRow
          title="Allow Transition Buffers"
          description="Automatically insert short buffer times between distinct focus blocks."
          checked={allowBuffers}
          onChange={setAllowBuffers}
        />

        <SettingsRow title="Rollover Style" description="How unfinished tasks are handled at the end of the day.">
          <select
            value={rolloverStyle}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onChange={(e) => setRolloverStyle(e.target.value as any)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="automatic">Automatic (No-Shame Rollover)</option>
            <option value="review">Ask me to review</option>
            <option value="manual">Manual only</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Work / School Hours" description="Times you are generally unavailable or at work.">
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-2">
              <input 
                type="time" 
                value={workHoursStart} 
                onChange={e => setWorkHoursStart(e.target.value)}
                className="flex-1 bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
              />
              <span className="flex items-center text-sm font-bold text-settings-text-muted">to</span>
              <input 
                type="time" 
                value={workHoursEnd} 
                onChange={e => setWorkHoursEnd(e.target.value)}
                className="flex-1 bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
              />
            </div>
            <input 
              type="text" 
              value={workHoursDays} 
              onChange={e => setWorkHoursDays(e.target.value)}
              placeholder="Days (e.g. Mon, Tue, Wed, Thu, Fri)"
              className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
            />
          </div>
        </SettingsRow>

        <SettingsRow title="Weekly Review Day" description="The day Bruno helps you review your week.">
          <select
            value={weeklyReviewDay}
            onChange={(e) => setWeeklyReviewDay(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="Monday">Monday</option>
            <option value="Tuesday">Tuesday</option>
            <option value="Wednesday">Wednesday</option>
            <option value="Thursday">Thursday</option>
            <option value="Friday">Friday</option>
            <option value="Saturday">Saturday</option>
            <option value="Sunday">Sunday</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Weekly Review Time">
          <input
            type="time"
            value={weeklyReviewTime}
            onChange={(e) => setWeeklyReviewTime(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-settings-brand text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save Style'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
