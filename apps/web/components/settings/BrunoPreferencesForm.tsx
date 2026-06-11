'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateBrunoMemoryAction } from '../../app/dashboard/settings/bruno/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsRow } from './ui/SettingsRow';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SectionBottomActions } from './ui/SectionBottomActions';
import type { UserAiMemory } from '@/lib/ai/memory';

export function BrunoPreferencesForm({ initialData }: { initialData: UserAiMemory }) {
  const router = useRouter();
  const [style, setStyle] = useState(initialData.tone_preference.style);
  const [responseLength, setResponseLength] = useState(initialData.tone_preference.response_length);
  const [emojiLevel, setEmojiLevel] = useState(initialData.tone_preference.emoji_level);
  
  const [detailLevel, setDetailLevel] = useState(initialData.task_detail_preference.detail_level);
  const [requireSuccess, setRequireSuccess] = useState(initialData.task_detail_preference.require_success_condition);
  const [requireMaterials, setRequireMaterials] = useState(initialData.task_detail_preference.require_materials);
  const [requireWhyNow, setRequireWhyNow] = useState(initialData.task_detail_preference.require_why_now);

  const [planningMode, setPlanningMode] = useState(initialData.planning_style.mode);
  const [proactivity, setProactivity] = useState(initialData.planning_style.proactivity);
  const [maxFocusBlocks, setMaxFocusBlocks] = useState(initialData.planning_style.max_focus_blocks_per_day);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const res = await updateBrunoMemoryAction({
      tone_preference: {
        ...initialData.tone_preference,
        style: style as 'direct' | 'warm' | 'coach',
        response_length: responseLength as 'brief' | 'standard' | 'detailed',
        emoji_level: emojiLevel as 'none' | 'low' | 'medium',
      },
      task_detail_preference: {
        ...initialData.task_detail_preference,
        detail_level: detailLevel as 'brief' | 'standard' | 'high',
        require_success_condition: requireSuccess,
        require_materials: requireMaterials,
        require_why_now: requireWhyNow,
      },
      planning_style: {
        ...initialData.planning_style,
        mode: planningMode as 'strict' | 'balanced' | 'flexible',
        proactivity: proactivity as 'silent' | 'light' | 'active' | 'high',
        max_focus_blocks_per_day: maxFocusBlocks,
      }
    });
    
    if (res.success) {
      router.refresh();
      setMessage({ type: 'success', text: 'Bruno preferences updated.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to update preferences.' });
    }
    
    setSaving(false);
  };

  return (
    <SettingsSection 
      title="Bruno Preferences" 
      description="Customize how Bruno talks to you and plans your week."
      onSubmit={handleSubmit}
      defaultOpen={false}
    >
      <div className="space-y-0">
        <SettingsRow title="Tone & Style">
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as 'direct' | 'warm' | 'coach')}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="direct">Direct & No-Nonsense</option>
            <option value="warm">Warm & Encouraging</option>
            <option value="coach">Strict Coach</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Response Length">
          <select
            value={responseLength}
            onChange={(e) => setResponseLength(e.target.value as 'brief' | 'standard' | 'detailed')}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="brief">Brief</option>
            <option value="standard">Standard</option>
            <option value="detailed">Detailed</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Emoji Level">
          <select
            value={emojiLevel}
            onChange={(e) => setEmojiLevel(e.target.value as 'none' | 'low' | 'medium')}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="none">None</option>
            <option value="low">Low (1-2 per message)</option>
            <option value="medium">Medium</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Task Detail Level">
          <select
            value={detailLevel}
            onChange={(e) => setDetailLevel(e.target.value as 'brief' | 'standard' | 'high')}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="brief">Brief</option>
            <option value="standard">Standard</option>
            <option value="high">High & Highly Specific</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Planning Personality">
          <select
            value={planningMode}
            onChange={(e) => setPlanningMode(e.target.value as 'strict' | 'balanced' | 'flexible')}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="flexible">Flexible (Fewer blocks, more buffer)</option>
            <option value="balanced">Balanced</option>
            <option value="strict">Strict (Back-to-back blocking)</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Proactivity">
          <select
            value={proactivity}
            onChange={(e) => setProactivity(e.target.value as 'silent' | 'light' | 'active' | 'high')}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text appearance-none"
          >
            <option value="silent">Silent unless asked</option>
            <option value="light">Light nudges</option>
            <option value="active">Active planning partner</option>
            <option value="high">High accountability</option>
          </select>
        </SettingsRow>

        <SettingsRow title="Max Focus Blocks per Day">
          <input
            type="number"
            min={1}
            max={12}
            value={maxFocusBlocks}
            onChange={(e) => setMaxFocusBlocks(parseInt(e.target.value) || 5)}
            className="w-full bg-settings-card border border-settings-border p-3 rounded-xl font-bold text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text"
          />
        </SettingsRow>

        <SettingsToggleRow
          title="Require Success Conditions"
          description="Bruno must define exactly what 'done' looks like for each task."
          checked={requireSuccess}
          onChange={setRequireSuccess}
        />
        
        <SettingsToggleRow
          title="Require Materials"
          description="Bruno must link or list resources needed for the task."
          checked={requireMaterials}
          onChange={setRequireMaterials}
        />

        <SettingsToggleRow
          title="Require 'Why Now'"
          description="Bruno must explain why a task was scheduled at its particular time."
          checked={requireWhyNow}
          onChange={setRequireWhyNow}
        />
      </div>

      <SectionBottomActions message={message}>
        <button 
          type="submit" 
          disabled={saving}
          className="px-6 py-2.5 bg-settings-brand text-settings-bg rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </button>
      </SectionBottomActions>
    </SettingsSection>
  );
}
