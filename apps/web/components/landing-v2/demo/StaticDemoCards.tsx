'use client';

import { useState } from 'react';
import { Check, Circle } from '@phosphor-icons/react';
import { CommandBoard } from '@/components/command/CommandBoard';
import { CaptureFlowDemo } from './CaptureFlowDemo';
import {
  LANDING_CALENDAR_EVENTS,
  LANDING_NOTES,
  LANDING_TASKS,
  makeBoardFixture,
} from './fixtures';

const noop = () => {};

export function CaptureDemoCard() {
  return <CaptureFlowDemo compact />;
}

export function BoardDemoCard() {
  const [now] = useState(() => new Date());
  const board = makeBoardFixture(now);

  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl sm:p-5"
    >
      <CommandBoard
        board={board}
        now={now}
        selectedId={null}
        onSelect={noop}
        onToggleDone={noop}
      />
    </div>
  );
}

export function TasksDemoCard() {
  return (
    <div
      aria-hidden
      className="mx-auto max-w-md overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-xl"
    >
      <div className="border-b border-[var(--color-line)] px-5 py-3.5">
        <h3 className="font-serif text-[19px] font-semibold text-[var(--color-ink)]">
          Due this week
        </h3>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
          4 open tasks
        </p>
      </div>
      <ul className="flex flex-col">
        {LANDING_TASKS.map((task) => (
          <li
            key={task.title}
            className="flex items-center gap-3 border-b border-[var(--color-line)] px-5 py-3.5 last:border-b-0"
          >
            {task.done ? (
              <Check size={18} weight="bold" className="flex-none text-[var(--color-sage)]" />
            ) : (
              <Circle size={18} className="flex-none text-[var(--color-ink-faint)]" />
            )}
            <span
              className={`min-w-0 flex-1 text-[14px] ${task.done ? 'text-[var(--color-ink-faint)] line-through' : 'text-[var(--color-ink)]'}`}
            >
              {task.title}
            </span>
            <span className="flex-none font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
              {task.due}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CalendarDemoCard() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dates = [14, 15, 16, 17, 18, 19, 20];

  return (
    <div
      aria-hidden
      className="mx-auto max-w-lg overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-5 shadow-xl"
    >
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {days.map((day, i) => (
          <div
            key={day}
            className={`flex min-w-[48px] flex-col items-center rounded-xl border px-2.5 py-2 ${
              i === 2
                ? 'border-[var(--color-ink)] bg-[var(--color-ink)] text-white'
                : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)]'
            }`}
          >
            <span className="font-mono text-[9px] uppercase tracking-wider">{day}</span>
            <span className="mt-1 font-serif text-lg leading-none">{dates[i]}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {LANDING_CALENDAR_EVENTS.map((event) => (
          <div
            key={event.title}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-line)] px-3 py-2.5"
            style={{ borderLeftWidth: 3, borderLeftColor: event.color }}
          >
            <span className="flex-none font-mono text-[10px] text-[var(--color-ink-faint)]">
              {event.time}
            </span>
            <span className="text-[14px] font-medium text-[var(--color-ink)]">{event.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NotesDemoCard() {
  return (
    <div
      aria-hidden
      className="mx-auto flex max-w-lg overflow-hidden rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] shadow-xl"
    >
      <div className="w-36 flex-none border-r border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3">
        <p className="mb-2 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-ink-faint)]">
          Notebooks
        </p>
        {LANDING_NOTES.map((note) => (
          <div
            key={note.title}
            className={`mb-1 rounded-lg px-2 py-1.5 text-[12px] ${
              note.active
                ? 'bg-[var(--color-paper)] font-medium text-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-ink-soft)]'
            }`}
          >
            {note.notebook}
          </div>
        ))}
      </div>
      <div className="min-w-0 flex-1 p-4">
        <h3 className="font-serif text-[18px] text-[var(--color-ink)]">
          {LANDING_NOTES.find((n) => n.active)?.title}
        </h3>
        <p className="mt-3 text-[13px] leading-relaxed text-[var(--color-ink-soft)]">
          {LANDING_NOTES.find((n) => n.active)?.preview}
        </p>
      </div>
    </div>
  );
}
