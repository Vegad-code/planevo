'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseLLMImportAction, updateBrunoMemoryAction } from '../../app/dashboard/settings/bruno/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SectionBottomActions } from './ui/SectionBottomActions';
import type { UserAiMemory } from '@/lib/ai/memory';

export function LLMImportForm({ initialData }: { initialData: UserAiMemory }) {
  const router = useRouter();
  const [rawText, setRawText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    
    setParsing(true);
    setMessage(null);

    const res = await parseLLMImportAction(rawText);
    
    if (res.success && res.data) {
      setParsedData(res.data);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to parse instructions.' });
    }
    
    setParsing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Deeply remove nulls because the Zod patch schema expects undefined for optional fields, not null.
    const stripNulls = (obj: any): any => {
      if (obj === null) return undefined;
      if (typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(stripNulls).filter(x => x !== undefined);
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleaned = stripNulls(value);
        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      }
      return result;
    };

    // Map the string arrays into Planevo's memory objects
    let patchData = { ...parsedData };
    
    if (patchData.explicit_rules && patchData.explicit_rules.length > 0) {
      const newRules = patchData.explicit_rules.map((ruleText: string) => ({
        id: crypto.randomUUID(),
        text: ruleText,
        feature: 'global',
        confidence: 1.0,
        evidence_count: 1
      }));
      patchData.learned_rules = [...(initialData.learned_rules || []), ...newRules];
    }
    delete patchData.explicit_rules;

    if (patchData.disliked_things && patchData.disliked_things.length > 0) {
      const newDislikes = patchData.disliked_things.map((text: string) => ({
        label: text.substring(0, 80),
        detail: text,
        feature: 'global'
      }));
      patchData.disliked_patterns = [...(initialData.disliked_patterns || []), ...newDislikes];
    }
    delete patchData.disliked_things;

    if (patchData.accepted_things && patchData.accepted_things.length > 0) {
      const newLikes = patchData.accepted_things.map((text: string) => ({
        label: text.substring(0, 80),
        detail: text,
        feature: 'global'
      }));
      patchData.accepted_patterns = [...(initialData.accepted_patterns || []), ...newLikes];
    }
    delete patchData.accepted_things;

    patchData = stripNulls(patchData);

    const res = await updateBrunoMemoryAction(patchData);
    
    if (res.success) {
      router.refresh();
      setMessage({ type: 'success', text: 'Imported preferences saved!' });
      setParsedData(null);
      setRawText('');
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save imported preferences.' });
    }
    
    setSaving(false);
  };

  const handleDiscard = () => {
    setParsedData(null);
    setRawText('');
    setMessage(null);
  };

  return (
    <SettingsSection 
      title="Import Custom Instructions" 
      description="Paste your custom instructions or memories from ChatGPT/Claude. We'll securely extract your preferences and discard the raw text."
      onSubmit={handleParse}
      defaultOpen={true}
    >
      <div className="p-6">
        {!parsedData ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] text-[10px] font-bold">1</span>
                <span className="text-sm font-bold text-settings-text">Copy this prompt into a chat with your other AI provider</span>
              </div>
              <div className="relative group">
                <div className="bg-settings-card border border-settings-border p-4 rounded-xl text-sm text-settings-text-muted pr-20 font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto">
                  Export all of my stored memories and any context you've learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and scheduling preferences.<br/><br/>
                  
                  ## Categories (output in this order):<br/><br/>
                  
                  1. <strong>Instructions</strong>: Rules I've explicitly asked you to follow going forward — tone, format, style, detail level, "always do X", "never do Y".<br/>
                  2. <strong>Identity & Context</strong>: Career, education, roles, and what I generally do day-to-day.<br/>
                  3. <strong>Projects & Courses</strong>: Major projects or classes I'm committed to. Include what it is and any specific habits I have for it.<br/>
                  4. <strong>Productivity & Planning Preferences</strong>: How I like to work. Preferred focus hours, break lengths, whether I like strict back-to-back scheduling or flexible buffers, and proactivity preferences.<br/>
                  5. <strong>General Tastes</strong>: Other working-style preferences that apply broadly.<br/><br/>
                  
                  ## Format:<br/><br/>
                  
                  Use section headers for each category. Within each category, list one entry per line, sorted by oldest date first. Format each line as:<br/>
                  [YYYY-MM-DD] - Entry content here.<br/>
                  If no date is known, use [unknown] instead.<br/><br/>
                  
                  ## Output:<br/>
                  - Wrap the entire export in a single code block for easy copying.<br/>
                  - After the code block, state whether this is the complete set or if more remain.
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const text = `Export all of my stored memories and any context you've learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and scheduling preferences.

## Categories (output in this order):

1. **Instructions**: Rules I've explicitly asked you to follow going forward — tone, format, style, detail level, "always do X", "never do Y".
2. **Identity & Context**: Career, education, roles, and what I generally do day-to-day.
3. **Projects & Courses**: Major projects or classes I'm committed to. Include what it is and any specific habits I have for it.
4. **Productivity & Planning Preferences**: How I like to work. Preferred focus hours, break lengths, whether I like strict back-to-back scheduling or flexible buffers, and proactivity preferences.
5. **General Tastes**: Other working-style preferences that apply broadly.

## Format:

Use section headers for each category. Within each category, list one entry per line, sorted by oldest date first. Format each line as:

[YYYY-MM-DD] - Entry content here.

If no date is known, use [unknown] instead.

## Output:
- Wrap the entire export in a single code block for easy copying.
- After the code block, state whether this is the complete set or if more remain.`;
                    navigator.clipboard.writeText(text);
                    const btn = document.getElementById('copy-prompt-btn');
                    if (btn) {
                      const originalText = btn.innerText;
                      btn.innerText = 'Copied!';
                      setTimeout(() => btn.innerText = originalText, 2000);
                    }
                  }}
                  id="copy-prompt-btn"
                  className="absolute top-4 right-4 px-3 py-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H136V24a8,8,0,0,0-8-8H40a8,8,0,0,0-8,8V184a8,8,0,0,0,8,8h80v16a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8V48A8,8,0,0,0,216,40ZM120,176H48V32h72Zm88,32H136V192h80Z"></path></svg>
                  Copy
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] text-[10px] font-bold">2</span>
                <span className="text-sm font-bold text-settings-text">Paste results below to add to Bruno's memory</span>
              </div>
              <textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste your memory details here..."
                className="w-full h-32 bg-settings-card border border-settings-border p-4 rounded-xl text-sm focus:outline-none focus:border-settings-text transition-colors text-settings-text resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-settings-text mb-2">Review Extracted Preferences:</h3>
            <div className="bg-settings-card border border-settings-border rounded-xl p-4 text-sm text-settings-text-muted space-y-2">
              {parsedData.tone_preference?.style && <p><strong>Style:</strong> {parsedData.tone_preference.style}</p>}
              {parsedData.tone_preference?.emoji_level && <p><strong>Emoji Level:</strong> {parsedData.tone_preference.emoji_level}</p>}
              {parsedData.tone_preference?.avoid_phrases?.length > 0 && <p><strong>Avoid Phrases:</strong> {parsedData.tone_preference.avoid_phrases.join(', ')}</p>}
              
              {parsedData.task_detail_preference?.detail_level && <p><strong>Detail Level:</strong> {parsedData.task_detail_preference.detail_level}</p>}
              {parsedData.task_detail_preference?.require_success_condition !== undefined && <p><strong>Require Success Condition:</strong> {parsedData.task_detail_preference.require_success_condition ? 'Yes' : 'No'}</p>}
              {parsedData.task_detail_preference?.require_materials !== undefined && <p><strong>Require Materials:</strong> {parsedData.task_detail_preference.require_materials ? 'Yes' : 'No'}</p>}
              {parsedData.task_detail_preference?.require_why_now !== undefined && <p><strong>Require "Why Now":</strong> {parsedData.task_detail_preference.require_why_now ? 'Yes' : 'No'}</p>}
              
              {parsedData.planning_style?.mode && <p><strong>Planning Mode:</strong> {parsedData.planning_style.mode}</p>}
              
              {parsedData.explicit_rules?.length > 0 && (
                <div className="mt-4 border-t border-settings-border pt-4">
                  <p className="font-bold text-settings-text mb-2">New Rules Captured:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {parsedData.explicit_rules.map((rule: string, i: number) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsedData.disliked_things?.length > 0 && (
                <div className="mt-4 border-t border-settings-border pt-4">
                  <p className="font-bold text-settings-text mb-2">Dislikes to Avoid:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {parsedData.disliked_things.map((rule: string, i: number) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
              {parsedData.accepted_things?.length > 0 && (
                <div className="mt-4 border-t border-settings-border pt-4">
                  <p className="font-bold text-settings-text mb-2">Preferences to Encourage:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {parsedData.accepted_things.map((rule: string, i: number) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="text-xs text-settings-text-muted">
              Note: The raw text will be permanently discarded to protect your privacy and ensure Bruno's core instructions aren't overridden.
            </p>
          </div>
        )}
      </div>

      <SectionBottomActions message={message}>
        {!parsedData ? (
          <button 
            type="submit" 
            disabled={parsing || !rawText.trim()}
            className="px-6 py-2.5 bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-[var(--color-ink-soft)] dark:hover:bg-[#5A7A58] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {parsing ? 'Parsing...' : 'Parse Instructions'}
          </button>
        ) : (
          <div className="flex gap-3">
            <button 
              type="button" 
              onClick={handleDiscard}
              disabled={saving}
              className="px-6 py-2.5 bg-settings-card border border-settings-border text-settings-text rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:border-settings-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Discard
            </button>
            <button 
              type="button" 
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-[var(--color-ink-soft)] dark:hover:bg-[#5A7A58] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {saving ? 'Saving...' : 'Save Preferences'}
            </button>
          </div>
        )}
      </SectionBottomActions>
    </SettingsSection>
  );
}
