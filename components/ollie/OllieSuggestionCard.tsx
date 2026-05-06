'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Check, X } from 'lucide-react';
import OllieAvatar from '../ollie/OllieAvatar';
import type { ConstraintCandidate } from '@/lib/ai/memory';

/**
 * OllieSuggestionCard
 * 
 * Displays constraint suggestions mined from feedback patterns.
 * When Ollie notices the user keeps rejecting schedule blocks at certain times,
 * this card appears to let them confirm or dismiss the pattern.
 * 
 * No API keys are exposed — this calls server-only endpoints.
 */
export default function OllieSuggestionCard() {
  const [candidates, setCandidates] = useState<ConstraintCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCandidates();
  }, []);

  async function fetchCandidates() {
    try {
      const res = await fetch('/api/ai/constraint-suggestions');
      if (!res.ok) return;
      const data = await res.json();
      setCandidates(data.candidates || []);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(candidate: ConstraintCandidate, action: 'accept' | 'dismiss') {
    setProcessing(candidate.id);
    try {
      const res = await fetch('/api/ai/confirm-constraint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate, action }),
      });
      if (res.ok) {
        setDismissed(prev => new Set(prev).add(candidate.id));
      }
    } catch (err) {
      console.error('Failed to process constraint:', err);
    } finally {
      setProcessing(null);
    }
  }

  // Filter out already-dismissed suggestions
  const visible = candidates.filter(c => !dismissed.has(c.id));

  if (loading || visible.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {visible.map((candidate) => (
          <motion.div
            key={candidate.id}
            layout
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="glass border-2 border-accent-200 bg-accent-50/40 p-5 rounded-2xl shadow-[4px_4px_0_0_var(--accent-100)] relative overflow-hidden group"
          >
            {/* Decorative glow */}
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-accent-300/20 rounded-full blur-2xl group-hover:bg-accent-400/30 transition-all duration-500" />

            <div className="relative z-10">
              <div className="flex items-start gap-3 mb-3">
                <div className="mt-0.5">
                  <OllieAvatar mood="thinking" size="sm" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="w-4 h-4 text-accent-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-accent-600">
                      Ollie noticed a pattern
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground leading-relaxed">
                    {candidate.reason}
                  </p>
                  <p className="text-xs text-muted mt-1 italic">
                    Should I avoid scheduling focus blocks from <strong>{candidate.start}</strong> to <strong>{candidate.end}</strong>?
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  onClick={() => handleAction(candidate, 'accept')}
                  disabled={processing === candidate.id}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl border-2 border-surface-900 shadow-[3px_3px_0_0_#22201e] hover:bg-accent-600 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  Yes, avoid this time
                </button>
                <button
                  onClick={() => handleAction(candidate, 'dismiss')}
                  disabled={processing === candidate.id}
                  className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-muted hover:text-foreground border-2 border-surface-200 rounded-xl hover:border-surface-400 transition-all disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
