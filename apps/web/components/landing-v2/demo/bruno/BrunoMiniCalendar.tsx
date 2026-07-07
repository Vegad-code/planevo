'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { WEEK_DAYS } from './constants';

interface BrunoMiniCalendarProps {
  highlightDay: string;
  eventLabel: string;
  eventTime: string;
  showEvent: boolean;
}

export function BrunoMiniCalendar({ highlightDay, eventLabel, eventTime, showEvent }: BrunoMiniCalendarProps) {
  return (
    <div className="grid grid-cols-5 gap-1.5 rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2">
      {WEEK_DAYS.map((d) => (
        <div key={d} className="flex flex-col items-center gap-1">
          <span className="font-mono text-[8px] uppercase tracking-wider text-[var(--color-ink-soft)]">
            {d}
          </span>
          <div className="relative h-12 w-full rounded-md bg-[var(--color-paper)]">
            {d === highlightDay && (
              <AnimatePresence>
                {showEvent && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 20 }}
                    className="absolute inset-x-0.5 top-4 rounded-[5px] bg-[var(--color-honey-soft)] px-1 py-0.5 text-center"
                    style={{ borderLeft: '2px solid var(--color-honey)' }}
                  >
                    <span className="block truncate text-[7px] font-semibold leading-tight text-[var(--color-honey-deep)]">
                      {eventLabel}
                    </span>
                    <span className="block font-mono text-[6px] text-[var(--color-honey-deep)]/70">
                      {eventTime}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
