'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { resetBrunoMemoryAction, updateBrunoMemoryAction, updateMemoryLearningSettingsAction } from '../../app/dashboard/settings/bruno/actions';
import { SettingsSection } from './ui/SettingsSection';
import { SettingsToggleRow } from './ui/SettingsToggleRow';
import { SectionBottomActions } from './ui/SectionBottomActions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import type { UserAiMemory } from '@/lib/ai/memory';

type MemoryItemType = 'learned_rules' | 'disliked_patterns' | 'accepted_patterns' | 'task_duration_preferences' | 'task_time_preferences';

interface UnifiedItem {
  id: string;
  originalIndex: number;
  type: MemoryItemType;
  typeLabel: string;
  title: string;
  description: string;
  confidenceOrCount: string;
  originalObject: any;
}

export function MemoryControls({ initialData }: { initialData: UserAiMemory }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [learningEnabled, setLearningEnabled] = useState(initialData.memory_learning_settings.learning_enabled);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [items, setItems] = useState<UnifiedItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<MemoryItemType | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const ruleCount = initialData.learned_rules.length;
  const dislikeCount = initialData.disliked_patterns.length;
  const acceptCount = initialData.accepted_patterns.length;
  const durationCount = initialData.task_duration_preferences.length;
  const timeCount = initialData.task_time_preferences.length;
  const totalLearnings = ruleCount + dislikeCount + acceptCount + durationCount + timeCount;

  useEffect(() => {
    const unified: UnifiedItem[] = [];
    
    initialData.learned_rules.forEach((rule, i) => {
       const isValid = rule.text && rule.text !== 'undefined' && !rule.text.includes('undefined: undefined');
       unified.push({
          id: crypto.randomUUID(),
          originalIndex: i,
          type: 'learned_rules',
          typeLabel: 'Rule',
          title: isValid ? (rule.text.length > 50 ? rule.text.substring(0, 50) + '...' : rule.text) : 'Unknown Rule',
          description: isValid ? `I follow this rule based on your past feedback: ${rule.text}` : 'An invalid or corrupted rule was recorded.',
          confidenceOrCount: `Confidence: ${Math.round(rule.confidence * 100)}% • Seen ${rule.evidence_count} times`,
          originalObject: rule
       });
    });

    initialData.disliked_patterns.forEach((pat, i) => {
       const isValid = pat.label && pat.label !== 'undefined';
       unified.push({
          id: crypto.randomUUID(),
          originalIndex: i,
          type: 'disliked_patterns',
          typeLabel: 'Dislike',
          title: isValid ? `Dislikes: ${pat.label}` : 'Unknown Dislike',
          description: isValid ? `I've noticed you generally don't like: ${pat.detail}` : 'An invalid or corrupted dislike was recorded.',
          confidenceOrCount: `Seen ${pat.count} times`,
          originalObject: pat
       });
    });

    initialData.accepted_patterns.forEach((pat, i) => {
       const isValid = pat.label && pat.label !== 'undefined';
       unified.push({
          id: crypto.randomUUID(),
          originalIndex: i,
          type: 'accepted_patterns',
          typeLabel: 'Preference',
          title: isValid ? `Prefers: ${pat.label}` : 'Unknown Preference',
          description: isValid ? `I've learned that you prefer: ${pat.detail}` : 'An invalid or corrupted preference was recorded.',
          confidenceOrCount: `Seen ${pat.count} times`,
          originalObject: pat
       });
    });

    initialData.task_duration_preferences.forEach((pref, i) => {
       unified.push({
          id: crypto.randomUUID(),
          originalIndex: i,
          type: 'task_duration_preferences',
          typeLabel: 'Duration Pref',
          title: `Duration for ${pref.category}`,
          description: `You usually prefer tasks related to "${pref.category}" to be around ${pref.preferred_minutes} minutes long.`,
          confidenceOrCount: `Seen ${pref.evidence_count} times`,
          originalObject: pref
       });
    });

    initialData.task_time_preferences.forEach((pref, i) => {
       unified.push({
          id: crypto.randomUUID(),
          originalIndex: i,
          type: 'task_time_preferences',
          typeLabel: 'Time Pref',
          title: `Time preference for ${pref.category}`,
          description: `You usually prefer to work on "${pref.category}" tasks during the ${pref.preferred_time}.`,
          confidenceOrCount: `Seen ${pref.evidence_count} times`,
          originalObject: pref
       });
    });
    
    setItems(unified);
  }, [initialData]);

  const handleReset = async () => {
    setSaving(true);
    setMessage(null);

    const res = await resetBrunoMemoryAction();
    
    if (res.success) {
      router.refresh();
      setMessage({ type: 'success', text: 'Memory reset successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to reset memory.' });
    }
    
    setSaving(false);
  };

  const handleToggleLearning = async (enabled: boolean) => {
    setLearningEnabled(enabled);
    setSaving(true);
    const res = await updateMemoryLearningSettingsAction(enabled);
    if (!res.success) {
      setLearningEnabled(!enabled);
      setMessage({ type: 'error', text: res.error || 'Failed to update settings.' });
    }
    setSaving(false);
  };

  const handleDeleteItem = async (item: UnifiedItem) => {
    if (!window.confirm(`Delete this ${item.typeLabel.toLowerCase()}?`)) return;
    setSaving(true);

    const targetArray = [...(initialData[item.type] as any[])];
    targetArray.splice(item.originalIndex, 1);

    const patch = { [item.type]: targetArray };
    const res = await updateBrunoMemoryAction(patch);
    
    if (res.success) {
      setExpandedId(null);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to delete.' });
    }
    setSaving(false);
  };

  const startEditing = (item: UnifiedItem) => {
    setEditingId(item.id);
    setEditTitle(item.title);
    setEditDescription(item.description);
  };

  const handleSaveEdit = async (item: UnifiedItem) => {
    setSaving(true);
    
    const targetArray = [...(initialData[item.type] as any[])];
    const original = { ...targetArray[item.originalIndex] };

    if (item.type === 'learned_rules') {
       original.text = editTitle;
    } else if (item.type === 'disliked_patterns' || item.type === 'accepted_patterns') {
       original.label = editTitle;
       original.detail = editDescription;
    } else if (item.type === 'task_duration_preferences') {
       original.category = editTitle.replace('Preferred duration for ', '');
       original.preferred_minutes = parseInt(editDescription, 10) || original.preferred_minutes;
    } else if (item.type === 'task_time_preferences') {
       original.category = editTitle.replace('Preferred time for ', '');
       original.preferred_time = editDescription;
    }

    targetArray[item.originalIndex] = original;

    const patch = { [item.type]: targetArray };
    const res = await updateBrunoMemoryAction(patch);
    
    if (res.success) {
      setEditingId(null);
    } else {
      setMessage({ type: 'error', text: res.error || 'Failed to save edit.' });
    }
    setSaving(false);
  };

  return (
    <SettingsSection 
      title="Learned Memory" 
      description="Bruno passively learns your habits as you accept or reject his suggestions. You can view, edit, or reset this learning here."
      defaultOpen={true}
    >
      <div className="space-y-0">
        <SettingsToggleRow
          title="Enable Passive Learning"
          description="Allow Bruno to learn rules and patterns based on how you interact with suggestions."
          checked={learningEnabled}
          onChange={handleToggleLearning}
        />
      </div>

      <div className="p-6 space-y-6 pt-0 mt-6 border-t border-settings-border pt-6">
        <div className="bg-settings-card border border-settings-border p-5 rounded-xl flex items-center justify-between">
          <div>
            <h4 className="text-settings-text font-bold text-sm mb-1">Bruno's Knowledge</h4>
            <p className="text-settings-text-muted text-xs">
              Bruno has learned <strong>{totalLearnings}</strong> unique patterns about your workflow.
            </p>
          </div>
          <div className="text-right text-xs font-medium text-settings-text-muted">
            <p>{ruleCount} rules</p>
            <p>{dislikeCount + acceptCount} patterns</p>
            <p>{durationCount + timeCount} time prefs</p>
          </div>
        </div>

        {items.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-sm font-bold text-settings-text">Learned Items</h5>
            <div className="space-y-4">
              {(['learned_rules', 'accepted_patterns', 'disliked_patterns', 'task_duration_preferences', 'task_time_preferences'] as MemoryItemType[]).map(type => {
                const groupItems = items.filter(i => i.type === type);
                if (groupItems.length === 0) return null;
                
                const isCategoryExpanded = expandedCategory === type;
                const categoryLabels: Record<MemoryItemType, string> = {
                  learned_rules: "Rules",
                  accepted_patterns: "Preferences",
                  disliked_patterns: "Dislikes",
                  task_duration_preferences: "Duration Preferences",
                  task_time_preferences: "Time Preferences"
                };

                return (
                  <div key={type} className="bg-settings-card border border-settings-border rounded-xl overflow-hidden">
                    <button 
                      onClick={() => setExpandedCategory(isCategoryExpanded ? null : type)}
                      className="w-full p-4 flex items-center justify-between hover:bg-[var(--color-ink)]/5 dark:hover:bg-[var(--color-sage)]/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm text-settings-text">{categoryLabels[type]}</span>
                        <span className="text-xs bg-[var(--color-ink)]/5 dark:bg-[var(--color-sage)]/10 text-settings-text-muted px-2 py-0.5 rounded-full">{groupItems.length}</span>
                      </div>
                      <svg className={`w-4 h-4 text-settings-text-muted transition-transform ${isCategoryExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isCategoryExpanded && (
                      <div className="border-t border-settings-border divide-y divide-settings-border bg-settings-card/50">
                        {groupItems.map(item => {
                          const isExpanded = expandedId === item.id;
                          const isEditing = editingId === item.id;

                          return (
                            <div key={item.id} className="flex flex-col">
                              <button 
                                onClick={() => !isEditing && setExpandedId(isExpanded ? null : item.id)}
                                className={`p-4 flex flex-col gap-1 text-left transition-colors ${!isEditing ? 'hover:bg-[var(--color-ink)]/5 dark:hover:bg-[var(--color-sage)]/10 cursor-pointer' : ''}`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider bg-[var(--color-ink)]/10 text-[var(--color-ink)] dark:bg-[var(--color-sage)]/20 dark:text-[var(--color-sage)] px-2 py-0.5 rounded-full">
                                      {item.typeLabel}
                                    </span>
                                    <span className="text-sm font-semibold text-settings-text">{item.title}</span>
                                  </div>
                                  <span className="text-xs text-settings-text-muted">{item.confidenceOrCount}</span>
                                </div>
                              </button>

                              {isExpanded && !isEditing && (
                                <div className="px-4 pb-4 pt-1 bg-[var(--color-ink)]/5 dark:bg-[var(--color-sage)]/5 border-t border-settings-border/50 animate-fade-in">
                                  <p className="text-sm text-settings-text-muted mb-4">{item.description}</p>
                                  <div className="flex gap-3">
                                    <button
                                      onClick={() => startEditing(item)}
                                      disabled={saving}
                                      className="text-xs font-bold uppercase tracking-widest text-settings-text hover:opacity-70 disabled:opacity-50"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDeleteItem(item)}
                                      disabled={saving}
                                      className="text-xs text-red-500 hover:text-red-600 font-bold uppercase tracking-widest disabled:opacity-50"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}

                              {isEditing && (
                                <div className="p-4 border-t border-settings-border bg-settings-card">
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-xs font-bold text-settings-text-muted uppercase tracking-wider mb-1 block">Title</label>
                                      <input
                                        type="text"
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                        className="w-full bg-transparent border border-settings-border rounded-lg p-2 text-sm text-settings-text focus:border-settings-text outline-none transition-colors"
                                      />
                                    </div>
                                    {(item.type === 'disliked_patterns' || item.type === 'accepted_patterns' || item.type === 'task_duration_preferences' || item.type === 'task_time_preferences') && (
                                      <div>
                                        <label className="text-xs font-bold text-settings-text-muted uppercase tracking-wider mb-1 block">
                                          {item.type === 'task_duration_preferences' ? 'Minutes' : item.type === 'task_time_preferences' ? 'Time of day' : 'Detailed Description'}
                                        </label>
                                        <textarea
                                          value={editDescription}
                                          onChange={e => setEditDescription(e.target.value)}
                                          className="w-full bg-transparent border border-settings-border rounded-lg p-2 text-sm text-settings-text focus:border-settings-text outline-none transition-colors resize-none min-h-[60px]"
                                        />
                                      </div>
                                    )}
                                    <div className="flex gap-2 pt-2">
                                      <button
                                        onClick={() => handleSaveEdit(item)}
                                        disabled={saving}
                                        className="px-4 py-1.5 bg-[var(--color-ink)] text-[var(--color-paper)] dark:bg-[var(--color-sage)] dark:text-[var(--color-paper)] rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                                      >
                                        {saving ? 'Saving...' : 'Save'}
                                      </button>
                                      <button
                                        onClick={() => setEditingId(null)}
                                        disabled={saving}
                                        className="px-4 py-1.5 bg-transparent border border-settings-border text-settings-text rounded-lg text-xs font-bold uppercase tracking-widest disabled:opacity-50"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-col items-start gap-2 pt-4 border-t border-settings-border">
          <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
            <DialogTrigger asChild>
              <button 
                type="button" 
                disabled={saving || totalLearnings === 0}
                className="px-6 py-2.5 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-900/30 rounded-xl text-xs font-black uppercase tracking-widest shadow-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Resetting...' : 'Reset Learned Memory'}
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-settings-card border-settings-border text-settings-text">
              <DialogHeader>
                <DialogTitle className="text-settings-text">Reset Learned Memory</DialogTitle>
                <DialogDescription className="pt-2 text-settings-text-muted">
                  Are you sure you want to reset Bruno's learned memory? This will wipe the database clean of everything Bruno has learned about you. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="mt-4 flex sm:justify-between gap-2">
                <DialogClose asChild>
                  <button className="flex-1 px-4 py-2 bg-transparent border border-settings-border text-settings-text rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-ink)]/5 dark:hover:bg-[var(--color-sage)]/10 transition-colors">
                    Cancel
                  </button>
                </DialogClose>
                <button 
                  onClick={() => {
                    setIsResetModalOpen(false);
                    handleReset();
                  }}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-700 transition-colors"
                >
                  Confirm Reset
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <p className="text-xs text-settings-text-muted">
            This only clears learned behaviors. Your manual preferences above will remain unchanged.
          </p>
        </div>
      </div>
      
      {message && (
        <SectionBottomActions message={message} />
      )}
    </SettingsSection>
  );
}
