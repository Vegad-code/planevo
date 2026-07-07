'use client';

import { motion } from 'framer-motion';
import { NotePencil } from '@phosphor-icons/react';
import { BrunoDemoShell } from './BrunoDemoShell';
import { useBrunoDemoScript } from './useBrunoDemoScript';
import { useBrunoPersona } from './BrunoPersonaContext';

export function BrunoNotesDemo() {
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 5, intervalMs: 1500 });
  const { scenario } = useBrunoPersona();

  const showNote = step >= 3;
  const saved = step >= 4;

  return (
    <div ref={ref} aria-hidden>
      <BrunoDemoShell
        userMessage={scenario.notesMessage}
        step={step}
        thinkingStep={2}
        minHeight="220px"
        showReplay={finished}
        onReplay={replay}
      >
        {showNote && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3"
          >
            <div className="mb-2 flex items-center gap-2">
              <NotePencil size={14} weight="bold" className="text-[var(--color-honey-deep)]" />
              <span className="text-[12px] font-semibold text-[var(--color-ink)]">{scenario.notesTitle}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[var(--color-ink-soft)]">{scenario.notesPreview}</p>
            <div className="mt-2 flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
                  saved
                    ? 'bg-[var(--color-forest)] text-white'
                    : 'bg-[var(--color-ink)] text-white'
                }`}
              >
                {saved ? 'Saved to Notes' : 'Save to Notes'}
              </span>
              {!saved && (
                <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-ink-soft)]">
                  8 free saves/mo
                </span>
              )}
            </div>
          </motion.div>
        )}
      </BrunoDemoShell>
    </div>
  );
}
