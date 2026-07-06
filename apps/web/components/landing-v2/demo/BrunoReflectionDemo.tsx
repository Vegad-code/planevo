'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useInViewStep } from '../motion/useInViewStep';

const USER_MSG =
  'I keep falling behind and then I just shut down. I don\u2019t even know where to start.';

const BRUNO_RESPONSE =
  'That\u2019s a common loop \u2014 falling behind creates pressure, and pressure makes starting harder. You\u2019re not lazy; your brain is protecting you from more overwhelm.';

const BRUNO_STEP =
  'Pick the smallest thing on your list. Give it 15 minutes. That\u2019s it \u2014 no catching up, just one tiny win.';

function useTypewriter(text: string, active: boolean, speedMs = 34): string {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return;
    }
    setCount(0);
    const id = window.setInterval(() => {
      setCount((c) => {
        if (c >= text.length) {
          window.clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [text, active, speedMs]);
  return text.slice(0, count);
}

/**
 * Reflection chat demo — Bruno names the pattern and offers one grounded next step.
 */
export function BrunoReflectionDemo() {
  // 0 typing · 1 sent · 2 thinking · 3 reflects · 4 suggests step · 5 chip
  const { ref, step } = useInViewStep(6, 1800);

  const typed = useTypewriter(USER_MSG, step === 0);
  const showUser = step >= 1;
  const thinking = step === 2;
  const showReflection = step >= 3;
  const showStep = step >= 4;
  const showChip = step >= 5;

  return (
    <div
      ref={ref}
      aria-hidden
      className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl"
    >
      <div className="flex min-h-[240px] flex-col gap-3">
        {!showUser ? (
          <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-ink)] px-3.5 py-2.5 text-left text-[13px] leading-snug text-white">
            {typed}
            <span className="typing-cursor" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-ink)] px-3.5 py-2.5 text-left text-[13px] leading-snug text-white"
          >
            {USER_MSG}
          </motion.div>
        )}

        {step >= 2 && (
          <div className="flex items-start gap-2">
            <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--color-belly)]">
              <Image src="/landing/bruno-face-160.png" alt="" width={28} height={28} />
            </span>
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {thinking ? (
                  <motion.div
                    key="thinking"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-1 rounded-2xl rounded-tl-md bg-[var(--color-surface-muted)] px-3 py-2.5"
                  >
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-[var(--color-ink-faint)]"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                      />
                    ))}
                  </motion.div>
                ) : showReflection ? (
                  <motion.div
                    key="reflection"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col gap-2.5"
                  >
                    <div className="rounded-2xl rounded-tl-md bg-[var(--color-surface-muted)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
                      {BRUNO_RESPONSE}
                    </div>
                    {showStep && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-ink)]"
                      >
                        {BRUNO_STEP}
                      </motion.div>
                    )}
                    {showChip && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex w-fit items-center rounded-full border border-[var(--color-honey)] bg-[var(--color-honey-soft)] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-honey-deep)]"
                      >
                        Try this
                      </motion.span>
                    )}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
