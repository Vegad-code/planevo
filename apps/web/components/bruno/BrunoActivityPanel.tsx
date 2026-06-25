'use client';

import { CaretDown, CheckCircle, Circle, XCircle } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import type { BrunoProgressStep } from '@/lib/bruno/brunoProgressState';
import { PlanevoLogoSpinner } from '@/components/bruno/PlanevoLogoSpinner';
import { cn } from '@/lib/utils';

interface BrunoActivityPanelProps {
  steps: BrunoProgressStep[];
  summary: string | null;
  isExpanded: boolean;
  isWorking: boolean;
  onToggle: () => void;
}

function StepIcon({ status }: { status: BrunoProgressStep['status'] }) {
  switch (status) {
    case 'done':
      return (
        <CheckCircle
          weight="fill"
          className="h-4 w-4 shrink-0 text-[var(--color-sage)]"
        />
      );
    case 'error':
      return (
        <XCircle
          weight="fill"
          className="h-4 w-4 shrink-0 text-[var(--color-rose)]"
        />
      );
    case 'active':
      return (
        <Circle
          weight="fill"
          className="h-3 w-3 shrink-0 animate-pulse text-[var(--color-settings-brand)]"
        />
      );
    case 'pending':
    default:
      return (
        <Circle
          className="h-3 w-3 shrink-0 text-[var(--color-settings-text-muted)]/40"
        />
      );
  }
}

export function BrunoActivityPanel({
  steps,
  summary,
  isExpanded,
  isWorking,
  onToggle,
}: BrunoActivityPanelProps) {
  if (!isWorking && steps.length === 0) {
    return null;
  }

  const headline = summary ?? 'Working on your request';

  return (
    <div className="mr-auto w-full max-w-[min(90%,44rem)]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-3 rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/80 px-4 py-3 text-left transition-colors hover:bg-[var(--color-settings-card)]"
      >
        {isWorking ? (
          <PlanevoLogoSpinner size={22} />
        ) : (
          <CheckCircle
            weight="fill"
            className="h-5 w-5 shrink-0 text-[var(--color-sage)]"
          />
        )}
        <span
          className={cn(
            'min-w-0 flex-1 text-sm font-medium text-[var(--color-settings-text)]',
            isWorking && 'animate-pulse'
          )}
        >
          {headline}
        </span>
        <CaretDown
          weight="bold"
          className={cn(
            'h-4 w-4 shrink-0 text-[var(--color-settings-text-muted)] transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {isExpanded && steps.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl border border-[var(--color-settings-border)] bg-[var(--color-settings-card)]/50 px-4 py-3">
              <ul className="flex flex-col gap-2.5">
                {steps.map((step) => (
                  <li key={step.id} className="flex items-start gap-2.5">
                    <span className="mt-0.5">
                      <StepIcon status={step.status} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-[13px] leading-5',
                          step.status === 'active'
                            ? 'font-medium text-[var(--color-settings-text)]'
                            : 'text-[var(--color-settings-text-muted)]'
                        )}
                      >
                        {step.label}
                      </p>
                      {step.detail && (
                        <p className="mt-0.5 text-[12px] leading-4 text-[var(--color-settings-text-muted)]">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
