'use client';

import { useState } from 'react';
import { updateBrunoDataAccessAction } from '../../app/dashboard/settings/bruno/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

type BrunoDataAccessFormProps = {
  initialPreferences: Record<string, unknown> | null;
};

type AccessKey =
  | 'bruno_access_tasks'
  | 'bruno_access_calendar'
  | 'bruno_access_canvas'
  | 'bruno_access_integrations';

export function BrunoDataAccessForm({
  initialPreferences,
}: BrunoDataAccessFormProps) {
  const prefs = (initialPreferences || {}) as Record<string, unknown>;
  const [tasks, setTasks] = useState(prefs.bruno_access_tasks !== false);
  const [calendar, setCalendar] = useState(
    prefs.bruno_access_calendar !== false
  );
  const [canvas, setCanvas] = useState(prefs.bruno_access_canvas !== false);
  const [integrations, setIntegrations] = useState(
    prefs.bruno_access_integrations !== false
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleToggle = async (
    key: AccessKey,
    value: boolean,
    setter: (v: boolean) => void
  ) => {
    setter(value); // optimistic update
    setSaving(true);
    setMessage(null);
    const res = await updateBrunoDataAccessAction(key, value);
    if (!res.success) {
      setter(!value); // rollback on failure
      setMessage({
        type: 'error',
        text: res.error || 'Failed to update settings.',
      });
    }
    setSaving(false);
  };

  return (
    <SettingsSection
      title="Bruno Data Access & Security"
      description="Choose which data categories Bruno is allowed to read, search, and analyze. Enabled by default for maximum intelligence."
      defaultOpen={true}
    >
      <div className="space-y-0">
        <SettingsToggleRow
          title="Tasks Access"
          description="Allow Bruno to read, search, and analyze your local tasks, priorities, and checklists."
          checked={tasks}
          onChange={(v) =>
            handleToggle('bruno_access_tasks', v, setTasks)
          }
          disabled={saving}
        />
        <SettingsToggleRow
          title="Calendar Access"
          description="Allow Bruno to read, search, and analyze your local calendar events and synced Google Calendars."
          checked={calendar}
          onChange={(v) =>
            handleToggle('bruno_access_calendar', v, setCalendar)
          }
          disabled={saving}
        />
        <SettingsToggleRow
          title="Canvas Access"
          description="Allow Bruno to read and analyze assignments, courses, and syllabus details from your connected Canvas account."
          checked={canvas}
          onChange={(v) =>
            handleToggle('bruno_access_canvas', v, setCanvas)
          }
          disabled={saving}
        />
        <SettingsToggleRow
          title="Work Integrations Access"
          description="Allow Bruno to search and read data from Notion, Slack, and Linear when connected."
          checked={integrations}
          onChange={(v) =>
            handleToggle('bruno_access_integrations', v, setIntegrations)
          }
          disabled={saving}
        />
      </div>

      {message && <SectionBottomActions message={message} />}
    </SettingsSection>
  );
}
