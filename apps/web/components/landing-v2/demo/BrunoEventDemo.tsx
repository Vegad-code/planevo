'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CalendarPlus } from '@phosphor-icons/react';
import { useInViewStep } from '../motion/useInViewStep';

const USER_MSG = 'Add my dentist appointment Thursday at 2pm to my calendar';
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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
 * Meet-Bruno demo: the user asks Bruno in plain language, he thinks, proposes
 * a calendar event, the user confirms, and it drops onto the week — the same
 * propose → approve → execute loop Bruno runs inside the product.
 */
export function BrunoEventDemo() {
  // 0 typing · 1 sent · 2 thinking · 3 proposes · 4 approved · 5 on calendar
  const { ref, step } = useInViewStep(6, 1500);

  const typed = useTypewriter(USER_MSG, step === 0);
  const showUser = step >= 1;
  const thinking = step === 2;
  const showProposal = step >= 3;
  const approved = step >= 4;
  const onCalendar = step >= 5;

  return (
    <div
      ref={ref}
      aria-hidden
      className="mx-auto grid w-full max-w-md gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl"
    >
      {/* Chat column */}
      <div className="flex min-h-[188px] flex-col gap-3">
        {/* User message / input */}
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

        {/* Bruno */}
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
                ) : showProposal ? (
                  <motion.div
                    key="proposal"
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 22 }}
                    className="rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3"
                  >
                    <p className="mb-2 text-[12px] leading-snug text-[var(--color-ink-soft)]">
                      Here&rsquo;s the event — want me to add it?
                    </p>
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-2">
                      <CalendarPlus size={16} weight="bold" className="text-[var(--color-honey-deep)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-[var(--color-ink)]">
                          Dentist appointment
                        </span>
                        <span className="block font-mono text-[9px] uppercase tracking-wider text-[var(--color-ink-soft)]">
                          Thu · 2:00–3:00 PM
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider transition-colors ${
                          approved
                            ? 'bg-[var(--color-forest)] text-white'
                            : 'bg-[var(--color-ink)] text-white'
                        }`}
                      >
                        {approved && <Check size={9} weight="bold" />}
                        {approved ? 'Added' : 'Approve'}
                      </span>
                      {!approved && (
                        <span className="rounded-full border border-[var(--color-line)] px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
                          Edit
                        </span>
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Mini week — the event lands here */}
      <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2">
        {WEEK.map((d) => (
          <div key={d} className="flex flex-col items-center gap-1">
            <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-ink-soft)]">
              {d}
            </span>
            <div className="relative h-12 w-full rounded-md bg-[var(--color-paper)]">
              {d === 'Thu' && (
                <AnimatePresence>
                  {onCalendar && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                      className="absolute inset-x-0.5 top-4 rounded-[5px] bg-[var(--color-honey-soft)] px-1 py-0.5 text-center"
                      style={{ borderLeft: '2px solid var(--color-honey)' }}
                    >
                      <span className="block truncate text-[7px] font-semibold leading-tight text-[var(--color-honey-deep)]">
                        Dentist
                      </span>
                      <span className="block font-mono text-[6px] text-[var(--color-honey-deep)]/70">
                        2 PM
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
