import { GraduationCap, CalendarBlank, ArrowsClockwise, Check } from '@phosphor-icons/react/dist/ssr';
import { FeatureShowcase } from './FeatureShowcase';

const SYNCED_ROWS = [
  { title: 'Bio lab report', due: 'Fri', source: 'canvas' },
  { title: 'Problem set 4', due: 'Mon', source: 'canvas' },
  { title: 'Group project check-in', due: 'Wed · 2:00 PM', source: 'cal' },
];

function SourcesDemoCard() {
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-3">
      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-rose-soft)]">
              <GraduationCap size={17} weight="duotone" className="text-[var(--color-rose)]" />
            </span>
            <span className="text-[14px] font-medium text-[var(--color-ink)]">Canvas</span>
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-sage)]">
            <Check size={12} weight="bold" /> Connected
          </span>
        </div>
        <div className="flex items-center justify-between pt-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-blue-soft)]">
              <CalendarBlank size={17} weight="duotone" className="text-[var(--color-blue)]" />
            </span>
            <span className="text-[14px] font-medium text-[var(--color-ink)]">Google Calendar</span>
          </div>
          <span className="flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--color-sage)]">
            <Check size={12} weight="bold" /> Connected
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)]">
        <ArrowsClockwise size={12} weight="bold" />
        Synced 2 minutes ago
      </div>

      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-xl">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-ink-soft)]">
          Landed on your board
        </p>
        <div className="flex flex-col">
          {SYNCED_ROWS.map((row) => (
            <div
              key={row.title}
              className="flex items-center gap-3 border-b border-[var(--color-line)] py-2 last:border-b-0"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--color-ink)]">
                {row.title}
              </span>
              <span className="flex-none text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)]">
                {row.source === 'canvas' ? 'canvas' : 'cal'}
              </span>
              <span className="flex-none text-[12px] tabular-nums text-[var(--color-ink-faint)]">
                {row.due}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FeatureSources() {
  return (
    <FeatureShowcase
      id="sources"
      eyebrow="Sources · Canvas first"
      headline="Canvas deadlines land by themselves."
      body="Connect Canvas and Google Calendar once. Assignments and events flow onto your board with their dates attached — you never re-type a due date again."
      backdrop="meadow"
      learnMoreHref="/signup"
      reverse
    >
      <SourcesDemoCard />
    </FeatureShowcase>
  );
}
