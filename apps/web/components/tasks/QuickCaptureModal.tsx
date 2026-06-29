'use client';

import React, { useState, useEffect } from 'react';
import { Plus } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useUIStore } from '@/lib/store/ui-store';
import { useTaskActions } from '@/hooks/useTaskActions';
import { parseTaskInput } from '@/lib/taskParser';
import { NaturalLanguageInput } from '@/components/nlp/NaturalLanguageInput';
import { useSmartSchedulingPreference } from '@/hooks/useSmartSchedulingPreference';
import { showTaskCreatedUndoToast } from '@/lib/nlp/taskCreatedToast';
import { NLP_SUBMIT_LABEL } from '@/lib/nlp/copy';
import { GlassPanel } from '@/components/ui/glass-panel';
import { GlassSheet } from '@/components/ui/glass-sheet';

export default function QuickCaptureModal() {
  const { quickCaptureOpen, setQuickCaptureOpen } = useUIStore();
  const [title, setTitle] = useState('');
  const [parseRefDate, setParseRefDate] = useState(() => new Date());
  const { smartSchedulingEnabled } = useSmartSchedulingPreference();

  const resetForm = () => {
    setTitle('');
  };

  const { addTask, deleteTask } = useTaskActions({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setQuickCaptureOpen(!quickCaptureOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickCaptureOpen, setQuickCaptureOpen]);

  useEffect(() => {
    if (quickCaptureOpen) {
      setParseRefDate(new Date());
    }
  }, [quickCaptureOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;

    const parsed = parseTaskInput(trimmed, parseRefDate, {
      smartSchedulingEnabled,
    });

    setQuickCaptureOpen(false);
    resetForm();

    void addTask({
      title: parsed.title || trimmed,
      estimated_minutes: parsed.estimatedMinutes ?? 30,
      due_date: parsed.isBacklog ? undefined : parsed.dueDate,
      priority: parsed.priority,
      is_recurring: parsed.isRecurring,
      recurrence_pattern: parsed.recurrencePattern,
    }).then((result) => {
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.task) {
        showTaskCreatedUndoToast(result.task, async (taskId) => {
          await deleteTask(taskId, parsed.title || trimmed);
        });
      }
    });
  };

  return (
    <>
      <div className="fixed bottom-20 right-6 z-40 sm:hidden">
        <button
          type="button"
          onClick={() => setQuickCaptureOpen(true)}
          className="w-14 h-14 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-transform"
          aria-label="Quick capture task"
        >
          <GlassPanel
            variant="pill"
            interactive
            className="w-14 h-14 flex items-center justify-center"
          >
            <Plus size={24} weight="bold" className="text-[var(--color-ink)]" />
          </GlassPanel>
        </button>
      </div>

      <GlassSheet
        open={quickCaptureOpen}
        onClose={() => setQuickCaptureOpen(false)}
        position="bottom"
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <NaturalLanguageInput
            id="quick-capture-title"
            value={title}
            onChange={setTitle}
            refDate={parseRefDate}
            enabled={smartSchedulingEnabled}
            smartSchedulingEnabled={smartSchedulingEnabled}
            showChips
            showHint
            ghostExample
            autoFocus
          />

          <button
            type="submit"
            disabled={!title.trim()}
            className="w-full py-3 rounded-xl bg-[var(--color-ink)] text-[var(--color-paper)] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            {NLP_SUBMIT_LABEL}
          </button>
        </form>
      </GlassSheet>
    </>
  );
}
