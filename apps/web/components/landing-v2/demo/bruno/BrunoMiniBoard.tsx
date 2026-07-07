'use client';

import { motion } from 'framer-motion';
import type { BrunoTaskRow } from './types';
import { cn } from '@/lib/utils';

interface BrunoMiniBoardProps {
  tasks: BrunoTaskRow[];
  visibleCount?: number;
  title?: string;
}

export function BrunoMiniBoard({ tasks, visibleCount, title = 'Tasks' }: BrunoMiniBoardProps) {
  const shown = visibleCount === undefined ? tasks : tasks.slice(0, visibleCount);

  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-2.5">
      <p className="mb-2 font-mono text-[8px] font-bold uppercase tracking-widest text-[var(--color-ink-soft)]">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {shown.map((task, i) => (
          <motion.li
            key={task.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-line)] bg-[var(--color-paper)] px-2 py-1.5"
          >
            <span className="truncate text-[11px] font-medium text-[var(--color-ink)]">{task.title}</span>
            <span
              className={cn(
                'shrink-0 font-mono text-[8px] uppercase tracking-wider',
                task.priority === 'urgent'
                  ? 'text-[var(--color-rose)]'
                  : task.priority === 'high'
                    ? 'text-[var(--color-honey-deep)]'
                    : 'text-[var(--color-ink-soft)]',
              )}
            >
              {task.meta}
            </span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}
