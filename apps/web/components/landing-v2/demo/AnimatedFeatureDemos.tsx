'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Check, Circle, ArrowUp } from '@phosphor-icons/react';
import { useInViewStep } from '../motion/useInViewStep';

/* ============================================================
   Tasks — items check off, then an overdue task rolls up to Today
   ============================================================ */

interface TaskRow {
  id: string;
  title: string;
  due: string;
}

const TASK_ROWS: TaskRow[] = [
  { id: 'read', title: 'Read ch. 4 for English', due: 'Today' },
  { id: 'algebra', title: 'Algebra quiz review', due: 'Tomorrow' },
  { id: 'bio', title: 'Bio lab report', due: 'Fri' },
];

const OVERDUE_ROW: TaskRow = {
  id: 'teacher',
  title: 'Email teacher about missing work',
  due: 'Overdue',
};

export function AnimatedTasksDemo() {
  // 0: idle · 1: check first · 2: check second · 3: overdue rolls to Today
  const { ref, step } = useInViewStep(4, 1500);

  const doneCount = step >= 2 ? 2 : step === 1 ? 1 : 0;
  const rolledOver = step >= 3;

  const rows = rolledOver
    ? [{ ...OVERDUE_ROW, due: 'Today' }, ...TASK_ROWS]
    : [...TASK_ROWS, OVERDUE_ROW];

  return (
    <div
      ref={ref}
      aria-hidden
      className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-5 py-3.5">
        <div>
          <h3 className="font-serif text-[19px] text-[var(--color-ink)]">Due this week</h3>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)]">
            {4 - doneCount} open tasks
          </p>
        </div>
      </div>
      <ul className="flex flex-col">
        {rows.map((task) => {
          const isDone =
            task.id === 'read'
              ? doneCount >= 1
              : task.id === 'algebra'
                ? doneCount >= 2
                : false;
          const justMoved = rolledOver && task.id === 'teacher';
          return (
            <motion.li
              key={task.id}
              layout
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={`flex items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5 last:border-b-0 ${
                justMoved ? 'bg-[var(--color-honey-soft)]' : ''
              }`}
            >
              <motion.span
                animate={isDone ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                transition={{ duration: 0.35 }}
                className="flex-none"
              >
                {isDone ? (
                  <Check size={18} weight="bold" className="text-[var(--color-forest)]" />
                ) : (
                  <Circle size={18} className="text-[var(--color-ink-soft)]" />
                )}
              </motion.span>
              <span
                className={`min-w-0 flex-1 text-[14px] transition-colors ${
                  isDone ? 'text-[var(--color-ink-soft)] line-through' : 'text-[var(--color-ink)]'
                }`}
              >
                {task.title}
              </span>
              {justMoved ? (
                <span className="flex flex-none items-center gap-1 rounded-full bg-[var(--color-markup)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink)]">
                  <ArrowUp size={9} weight="bold" />
                  Today
                </span>
              ) : (
                <span
                  className={`flex-none font-mono text-[10px] uppercase tracking-wider ${
                    task.due === 'Overdue'
                      ? 'text-[var(--color-rose)]'
                      : 'text-[var(--color-ink-soft)]'
                  }`}
                >
                  {task.due}
                </span>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/* ============================================================
   Calendar — events drop in, a gap highlights, a plan block fills it
   ============================================================ */

interface CalEvent {
  time: string;
  title: string;
  color: string;
}

const CAL_EVENTS: CalEvent[] = [
  { time: '10:00', title: 'Chemistry lecture', color: 'var(--color-blue)' },
  { time: '14:00', title: 'Soccer practice', color: 'var(--color-rose)' },
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DATES = [14, 15, 16, 17, 18, 19, 20];

export function AnimatedCalendarDemo() {
  // 0: empty · 1: event 1 · 2: event 2 · 3: gap highlights · 4: plan block fills
  const { ref, step } = useInViewStep(5, 1200);

  const visibleEvents = Math.min(step, CAL_EVENTS.length);
  const gapHighlight = step === 3;
  const gapFilled = step >= 4;

  return (
    <div
      ref={ref}
      aria-hidden
      className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-5 shadow-xl"
    >
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {DAYS.map((day, i) => (
          <div
            key={day}
            className={`flex min-w-[46px] flex-col items-center rounded-xl border px-2.5 py-2 ${
              i === 2
                ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)]'
            }`}
          >
            <span className="font-mono text-[9px] uppercase tracking-wider">{day}</span>
            <span className="mt-1 font-serif text-lg leading-none">{DATES[i]}</span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {CAL_EVENTS.slice(0, 1).map((event) => (
          <EventRow key={event.title} event={event} show={visibleEvents >= 1} />
        ))}

        {/* The gap that gets planned into */}
        <motion.div
          animate={
            gapHighlight
              ? { borderColor: 'var(--color-honey)', backgroundColor: 'var(--color-honey-soft)' }
              : { borderColor: 'var(--color-line)', backgroundColor: 'rgba(0,0,0,0)' }
          }
          transition={{ duration: 0.3 }}
          className="relative flex min-h-[46px] items-center gap-3 rounded-xl border border-dashed px-3 py-2.5"
        >
          <AnimatePresence mode="wait">
            {gapFilled ? (
              <motion.div
                key="filled"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="flex w-full items-center gap-3"
                style={{ borderLeft: '3px solid var(--color-honey)' }}
              >
                <span className="flex-none font-mono text-[10px] text-[var(--color-honey-deep)]">
                  12:15
                </span>
                <span className="text-[14px] font-medium text-[var(--color-ink)]">
                  Bio lab report block
                </span>
                <span className="ml-auto flex-none font-mono text-[9px] uppercase tracking-wider text-[var(--color-honey-deep)]">
                  Planned
                </span>
              </motion.div>
            ) : (
              <motion.span
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-soft)]"
              >
                {gapHighlight ? 'Free · 90 min' : 'Open gap'}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {CAL_EVENTS.slice(1).map((event) => (
          <EventRow key={event.title} event={event} show={visibleEvents >= 2} />
        ))}
      </div>
    </div>
  );
}

function EventRow({ event, show }: { event: CalEvent; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] px-3 py-2.5"
          style={{ borderLeftWidth: 3, borderLeftColor: event.color }}
        >
          <span className="flex-none font-mono text-[10px] text-[var(--color-ink-soft)]">
            {event.time}
          </span>
          <span className="text-[14px] font-medium text-[var(--color-ink)]">{event.title}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============================================================
   Notes — a note links itself to a day, then a flashcard flips
   ============================================================ */

export function AnimatedNotesDemo() {
  // 0: note only · 1: link chip appears · 2: flashcard flips
  const { ref, step } = useInViewStep(3, 1700);

  const linked = step >= 1;
  const flipped = step >= 2;

  return (
    <div
      ref={ref}
      aria-hidden
      className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-xl"
    >
      <div className="flex">
        <div className="w-32 flex-none border-r border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3">
          <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
            Notebooks
          </p>
          {['Biology', 'Algebra', 'English'].map((nb, i) => (
            <div
              key={nb}
              className={`mb-1 rounded-lg px-2 py-1.5 text-[12px] ${
                i === 0
                  ? 'bg-[var(--color-paper)] font-medium text-[var(--color-ink)] shadow-sm'
                  : 'text-[var(--color-ink-soft)]'
              }`}
            >
              {nb}
            </div>
          ))}
        </div>

        <div className="min-w-0 flex-1 p-4">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-[18px] text-[var(--color-ink)]">Lab report outline</h3>
            <AnimatePresence>
              {linked && (
                <motion.span
                  initial={{ opacity: 0, x: -6, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  className="flex flex-none items-center gap-1 rounded-full bg-[var(--color-forest-soft)] px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-forest)]"
                >
                  Linked · Thu block
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
            Hypothesis: enzyme activity increases with temperature up to 37°C. Methods from
            Tuesday lab — cite the control group.
          </p>

          {/* Flashcard flip */}
          <div className="mt-4" style={{ perspective: 800 }}>
            <motion.div
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 22 }}
              style={{ transformStyle: 'preserve-3d' }}
              className="relative h-16 w-full"
            >
              <div
                className="absolute inset-0 flex items-center justify-center rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 text-center text-[13px] font-medium text-[var(--color-ink)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                Q · Optimal enzyme temperature?
              </div>
              <div
                className="absolute inset-0 flex items-center justify-center rounded-xl border border-[var(--color-forest)]/40 bg-[var(--color-forest-soft)] px-3 text-center text-[13px] font-semibold text-[var(--color-forest)]"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                A · 37°C
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
