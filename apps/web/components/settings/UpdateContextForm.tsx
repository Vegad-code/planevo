'use client';

import { useState } from 'react';
import { updateProfileAction } from '../../app/dashboard/settings/profile/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SectionBottomActions } from './ui/SectionBottomActions';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function UpdateContextForm({ initialData }: { initialData: Record<string, any> }) {
  const [contextType, setContextType] = useState(initialData?.context_type || 'professional');
  const [schoolName, setSchoolName] = useState(initialData?.school_name || '');
  const [majorRole, setMajorRole] = useState(initialData?.major_role || '');
  const [graduationYear, setGraduationYear] = useState(initialData?.graduation_year || '');
  const [termStart, setTermStart] = useState(initialData?.term_start || '');
  const [termEnd, setTermEnd] = useState(initialData?.term_end || '');
  const [defaultCanvasUrl, setDefaultCanvasUrl] = useState(initialData?.default_canvas_url || '');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateProfileAction({ 
      context_type: contextType,
      school_name: schoolName,
      major_role: majorRole,
      graduation_year: graduationYear,
      term_start: termStart ? new Date(termStart).toISOString() : null,
      term_end: termEnd ? new Date(termEnd).toISOString() : null,
      default_canvas_url: defaultCanvasUrl,
    });
    
    if (res.success) {
      setMessage({ type: 'success', text: 'Context updated successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update context.' });
    }
    
    setSaving(false);
  };

  const formatDateForInput = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  };

  // Determine if student mode toggle is checked based on contextType
  const isStudent = contextType === 'student' || contextType === 'both';

  const handleStudentToggle = (checked: boolean) => {
    if (checked) {
      setContextType(contextType === 'professional' ? 'both' : 'student');
    } else {
      setContextType('professional');
    }
  };

  return (
    <SettingsSection 
      title="School/Work Context" 
      description="Help Bruno understand your environment to better plan your day."
      onSubmit={handleSubmit}
    >
      <div className="space-y-0">
        <SettingsRow title="Primary Environment">
          <select
            value={contextType}
            onChange={(e) => setContextType(e.target.value)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="professional">Professional</option>
            <option value="student">Student</option>
            <option value="both">Both</option>
          </select>
        </SettingsRow>

        <SettingsRow title="School or Company Name">
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. Acme Corp or State University"
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>

        <SettingsRow title="Major or Role">
          <input
            type="text"
            value={majorRole}
            onChange={(e) => setMajorRole(e.target.value)}
            placeholder="e.g. Product Manager or Computer Science"
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>

        <SettingsToggleRow
          title="Student Configuration"
          description="Enable to configure term dates, graduation year, and Canvas integration."
          checked={isStudent}
          onChange={handleStudentToggle}
        >
          <div className="flex flex-col space-y-0 border-t border-settings-border/50 pt-2 mt-2 -ml-4">
            <SettingsRow title="Graduation Year">
              <input
                type="text"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="YYYY"
                className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
              />
            </SettingsRow>

            <div className="grid grid-cols-2 gap-4 px-4 py-2 hover:bg-settings-card-hover transition-colors">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-settings-text">Term Start</label>
                <input
                  type="date"
                  value={formatDateForInput(termStart)}
                  onChange={(e) => setTermStart(e.target.value)}
                  className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-bold text-settings-text">Term End</label>
                <input
                  type="date"
                  value={formatDateForInput(termEnd)}
                  onChange={(e) => setTermEnd(e.target.value)}
                  className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
                />
              </div>
            </div>

            <SettingsRow title="Default Canvas URL" description="Base URL for your institution's Canvas site.">
              <input
                type="url"
                value={defaultCanvasUrl}
                onChange={(e) => setDefaultCanvasUrl(e.target.value)}
                placeholder="https://canvas.instructure.com"
                className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
              />
            </SettingsRow>
          </div>
        </SettingsToggleRow>
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-settings-brand text-settings-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Update Context'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
