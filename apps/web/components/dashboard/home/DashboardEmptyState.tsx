'use client';

import { useRouter } from 'next/navigation';
import { Check, Circle } from '@phosphor-icons/react';
import type { DashboardMode, SetupStep } from '@/lib/dashboard/types';
import type { Task } from '@/types/tasks';
import { BrunoMark } from './BrunoMark';
import { useUIStore } from '@/lib/store/ui-store';

interface DashboardEmptyStateProps {
  mode: DashboardMode;
  setupSteps: SetupStep[];
  unscheduledTasks: Task[];
}

export function DashboardEmptyState({
  mode,
  setupSteps,
  unscheduledTasks,
}: DashboardEmptyStateProps) {
  const router = useRouter();
  const setQuickCaptureOpen = useUIStore((s) => s.setQuickCaptureOpen);

  if (mode === 'active_day') return null;

  if (mode === 'onboarding') {
    const completedCount = setupSteps.filter((s) => s.completed).length;

    return (
      <div className="bg-(--color-paper) rounded-[22px] p-6 md:p-8 border border-line shadow-sm mb-6">
        <div className="flex items-start gap-4 mb-6">
          <BrunoMark size={44} mood="happy" />
          <div>
            <div className="font-mono text-[11px] text-(--color-ink-soft) tracking-[0.16em] mb-2">
              GETTING STARTED
            </div>
            <h2 className="font-serif text-3xl text-(--color-ink) m-0 leading-tight">
              Let&apos;s get your <em className="text-(--color-honey-deep) not-italic">first plan</em>{' '}
              ready.
            </h2>
            <p className="text-(--color-ink-soft) text-[15px] mt-2 mb-0 max-w-lg">
              Bruno works best when he knows your classes, calendar, and tasks. Complete these
              steps to unlock your dashboard.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-6">
          {setupSteps.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => router.push(step.href)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-line hover:bg-(--color-cream-2)/50 transition-colors text-left cursor-pointer w-full"
            >
              {step.completed ? (
                <span className="flex items-center justify-center size-7 rounded-full bg-(--color-sage-soft) text-(--color-sage)">
                  <Check weight="bold" className="size-4" />
                </span>
              ) : (
                <span className="flex items-center justify-center size-7 rounded-full border border-line-strong text-(--color-ink-soft)">
                  <Circle className="size-4" />
                </span>
              )}
              <span
                className={`text-[15px] font-medium ${step.completed ? 'text-(--color-ink-soft) line-through' : 'text-(--color-ink)'}`}
              >
                {step.label}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-1.5 bg-(--color-cream-2) rounded-full overflow-hidden">
            <div
              className="h-full bg-(--color-honey) rounded-full transition-all"
              style={{ width: `${(completedCount / setupSteps.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[11px] text-(--color-ink-soft)">
            {completedCount}/{setupSteps.length}
          </span>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => router.push('/dashboard/settings/integrations')}
            className="bg-(--color-honey) text-(--color-ink) px-5 py-2.5 rounded-full text-sm font-medium hover:bg-(--color-honey-soft) transition-colors cursor-pointer"
          >
            Connect Canvas or Calendar
          </button>
          <button
            type="button"
            onClick={() => setQuickCaptureOpen(true)}
            className="bg-transparent text-(--color-ink) border border-line-strong px-5 py-2.5 rounded-full text-sm font-medium hover:bg-(--color-cream-2) transition-colors cursor-pointer"
          >
            Add a task manually
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'needs_plan' && unscheduledTasks.length > 0) {
    return (
      <div className="bg-(--color-paper) rounded-[22px] p-6 border border-line shadow-sm mb-6">
        <div className="font-mono text-[11px] text-(--color-ink-soft) tracking-[0.16em] mb-2">
          READY TO SCHEDULE
        </div>
        <h2 className="font-serif text-2xl text-(--color-ink) m-0 mb-4">
          Tasks waiting for <em>a plan.</em>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
          {unscheduledTasks.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-line p-4 bg-(--color-cream-2)/30"
            >
              <span className="font-mono text-[10px] text-(--color-honey-deep) tracking-wider uppercase">
                {task.source === 'canvas' ? 'Canvas' : 'Task'}
              </span>
              <div className="font-medium text-(--color-ink) mt-1 line-clamp-2">{task.title}</div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => router.push('/dashboard/daily-plan')}
          className="bg-(--color-honey) text-(--color-ink) px-5 py-2.5 rounded-full text-sm font-medium hover:bg-(--color-honey-soft) transition-colors cursor-pointer"
        >
          Let Bruno build today&apos;s plan →
        </button>
      </div>
    );
  }

  if (mode === 'caught_up') {
    return (
      <div className="bg-(--color-paper) rounded-[22px] p-6 border border-line shadow-sm mb-6 text-center">
        <BrunoMark size={40} mood="happy" />
        <h2 className="font-serif text-2xl text-(--color-ink) mt-4 mb-2">
          You&apos;re in a <em>good spot.</em>
        </h2>
        <p className="text-(--color-ink-soft) max-w-md mx-auto mb-5">
          No urgent tasks or events this week. Add something when you&apos;re ready — no pressure.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            type="button"
            onClick={() => setQuickCaptureOpen(true)}
            className="bg-(--color-honey) text-(--color-ink) px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer"
          >
            Add a task
          </button>
          <button
            type="button"
            onClick={() => router.push('/dashboard/calendar')}
            className="border border-line-strong text-(--color-ink) px-5 py-2.5 rounded-full text-sm font-medium cursor-pointer"
          >
            Open calendar
          </button>
        </div>
      </div>
    );
  }

  return null;
}
