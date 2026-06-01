'use client';

import { useState } from 'react';
import { updateProfileAction } from '../../app/dashboard/settings/profile/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

export function UpdateIdentityForm({ initialData }: { initialData: Record<string, any> }) {
  const [name, setName] = useState(initialData?.name || '');
  const [preferredName, setPreferredName] = useState(
    initialData?.preferred_name || 
    (initialData?.name ? initialData.name.split(' ')[0] : '')
  );
  const [timezone, setTimezone] = useState(initialData?.timezone || 'UTC');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateProfileAction({ 
      name, 
      preferred_name: preferredName,
      timezone,
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Identity updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update identity.' });
    }
    
    setSaving(false);
  };

  return (
    <SettingsSection 
      title="Personal Info" 
      description="Your personal information and how Bruno addresses you."
      onSubmit={handleSubmit}
      defaultOpen={true}
    >
      <div className="space-y-0">
        <SettingsRow 
          title="Email Address" 
          description="Your email is linked to your authentication provider."
        >
          <input
            type="email"
            value={initialData?.email || ''}
            disabled
            className="w-full bg-settings-bg/50 border border-settings-border p-3 rounded-xl font-bold text-sm text-settings-text-muted cursor-not-allowed"
          />
        </SettingsRow>

        <SettingsRow title="Full Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>

        <SettingsRow title="Preferred Name" description="What Bruno should call you.">
          <input
            type="text"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            placeholder="Preferred Name"
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>

        <SettingsRow title="Timezone">
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT/BST)</option>
            <option value="Europe/Paris">Central Europe (CET/CEST)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
          </select>
        </SettingsRow>
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving || (!name.trim())}
          className="px-6 py-2.5 bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-[var(--color-ink-soft)] dark:hover:bg-[#5A7A58] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Update Identity'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
