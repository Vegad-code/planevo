'use client';

import { useState } from 'react';
import { updateFocusWindowsAction } from '../../app/dashboard/settings/calendar/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SectionBottomActions } from './ui/SectionBottomActions';
import { Plus, X } from '@phosphor-icons/react';

interface FocusWindow {
  label: string;
  start: string;
  end: string;
  days: string[];
}

export function FocusWindowsForm({ 
  initialPreferred, 
  initialAvoided 
}: { 
  initialPreferred: FocusWindow[];
  initialAvoided: FocusWindow[];
}) {
  const [preferred, setPreferred] = useState<FocusWindow[]>(initialPreferred || []);
  const [avoided, setAvoided] = useState<FocusWindow[]>(initialAvoided || []);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateFocusWindowsAction({ 
      preferred_focus_windows: preferred,
      avoided_focus_windows: avoided
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Focus windows updated.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update focus windows.' });
    }
    
    setSaving(false);
  };

  const addWindow = (type: 'preferred' | 'avoided') => {
    const newWindow = { label: 'New Window', start: '09:00', end: '11:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] };
    if (type === 'preferred') setPreferred([...preferred, newWindow]);
    else setAvoided([...avoided, newWindow]);
  };

  const removeWindow = (type: 'preferred' | 'avoided', index: number) => {
    if (type === 'preferred') {
      const nw = [...preferred];
      nw.splice(index, 1);
      setPreferred(nw);
    } else {
      const nw = [...avoided];
      nw.splice(index, 1);
      setAvoided(nw);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateWindow = (type: 'preferred' | 'avoided', index: number, field: keyof FocusWindow, value: any) => {
    if (type === 'preferred') {
      const nw = [...preferred];
      nw[index] = { ...nw[index], [field]: value };
      setPreferred(nw);
    } else {
      const nw = [...avoided];
      nw[index] = { ...nw[index], [field]: value };
      setAvoided(nw);
    }
  };

  const renderWindows = (windows: FocusWindow[], type: 'preferred' | 'avoided') => {
    return (
      <div className="space-y-3 p-4">
        {windows.length === 0 && (
          <p className="text-xs text-settings-text-muted italic">No windows configured.</p>
        )}
        {windows.map((w, i) => (
          <div key={i} className="flex flex-col gap-2 p-3 border border-settings-border rounded-xl bg-settings-bg/50 relative">
            <button 
              type="button" 
              onClick={() => removeWindow(type, i)} 
              className="absolute top-2 right-2 text-settings-text-muted hover:text-red-500"
            >
              <X weight="bold" />
            </button>
            
            <input 
              type="text" 
              value={w.label} 
              onChange={e => updateWindow(type, i, 'label', e.target.value)}
              placeholder="Label (e.g. Morning Deep Work)"
              className="w-full bg-settings-card border border-settings-border p-2 rounded-lg font-bold text-xs focus:outline-none focus:border-settings-text transition-colors text-settings-text pr-8"
            />
            <div className="flex gap-2">
              <input 
                type="time" 
                value={w.start} 
                onChange={e => updateWindow(type, i, 'start', e.target.value)}
                className="flex-1 bg-settings-card border border-settings-border p-2 rounded-lg font-bold text-xs focus:outline-none focus:border-settings-text transition-colors text-settings-text"
              />
              <span className="flex items-center text-xs text-settings-text-muted">to</span>
              <input 
                type="time" 
                value={w.end} 
                onChange={e => updateWindow(type, i, 'end', e.target.value)}
                className="flex-1 bg-settings-card border border-settings-border p-2 rounded-lg font-bold text-xs focus:outline-none focus:border-settings-text transition-colors text-settings-text"
              />
            </div>
            {/* Days could be a multiselect, keeping it simple as string input for now or checkboxes. Let's do string input for simplicity of the UI since this is advanced. */}
            <input 
              type="text" 
              value={w.days.join(', ')} 
              onChange={e => {
                const days = e.target.value.split(',').map(d => d.trim()).filter(Boolean);
                updateWindow(type, i, 'days', days);
              }}
              placeholder="Days (e.g. Mon, Tue, Wed)"
              className="w-full bg-settings-card border border-settings-border p-2 rounded-lg font-bold text-xs focus:outline-none focus:border-settings-text transition-colors text-settings-text"
            />
          </div>
        ))}
        <button 
          type="button" 
          onClick={() => addWindow(type)}
          className="flex items-center gap-2 text-xs font-bold text-settings-text-muted hover:text-settings-text transition-colors"
        >
          <Plus weight="bold" /> Add {type === 'preferred' ? 'Preferred' : 'Avoided'} Window
        </button>
      </div>
    );
  };

  return (
    <SettingsSection 
      title="Focus Windows" 
      description="Explicitly define times you want to protect for deep work, or times Bruno should never schedule."
      onSubmit={handleSubmit}
      defaultOpen={true}
    >
      <div className="border-b border-settings-border">
        <h3 className="px-4 pt-4 text-sm font-bold text-settings-text">Preferred Focus Times</h3>
        <p className="px-4 text-xs text-settings-text-muted">Bruno will try to schedule your deep work during these windows.</p>
        {renderWindows(preferred, 'preferred')}
      </div>

      <div>
        <h3 className="px-4 pt-4 text-sm font-bold text-settings-text">Avoided Times</h3>
        <p className="px-4 text-xs text-settings-text-muted">Bruno will avoid scheduling anything during these blocks.</p>
        {renderWindows(avoided, 'avoided')}
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-settings-brand text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save Windows'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
