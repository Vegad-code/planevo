'use client';

// COMMAND-INTEGRATION: Mount this inside components/command/CommandView.tsx only
// when FEATURES.COMMAND_SOURCE_SYNC is on, as a secondary panel below the Bruno
// rail (<CommandBrunoActions>) and above <CommandBoard> — the board stays the
// dominant element (§26.1). This component fetches its own data from
// `/api/command/sources`; CommandView does not need to fetch or pass sources in,
// only to pass its existing board-refresh callback:
//
//   {FEATURES.COMMAND_SOURCE_SYNC && (
//     <div className="mt-4">
//       <CommandSourcePanel onConverted={loadBoard} />
//     </div>
//   )}
//
// It renders nothing (returns null) when there is nothing to show, so it never
// scaffolds an empty section (§26.1).

import { useCallback, useEffect, useState } from 'react';
import { Plus } from '@phosphor-icons/react';
import { GlassPanel } from '@/components/ui/glass-panel';

type SourceRowKind = 'source' | 'calendar';

interface SourceItemPayload {
  id: string;
  provider: 'canvas' | 'notion' | 'slack' | 'linear';
  sourceType: string;
  itemType: string;
  title: string;
  label: string;
  url: string | null;
  snippet: string | null;
  dueAt: string | null;
  converted: boolean;
}

interface CalendarCommitmentPayload {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  isAllDay: boolean;
  location: string | null;
  converted: boolean;
}

interface SourceRow {
  key: string;
  kind: SourceRowKind;
  id: string;
  title: string;
  glyph: string;
  label: string;
  url: string | null;
  snippet: string | null;
  when: string | null;
}

/**
 * Muted glyph text per source. Kept local to this component (not imported from
 * `./format.ts`) per de-confliction with a parallel edit to that file — the
 * values match the board row convention (`SOURCE_GLYPH` in format.ts) so the
 * panel reads consistently with the rest of Command.
 */
const SOURCE_GLYPH: Record<string, string> = {
  canvas: 'canvas',
  notion: 'notion',
  slack: 'slack',
  linear: 'linear',
  calendar: 'cal',
};

/** Source URLs are untrusted external content (§29) — only ever render as a link when plain http(s). */
function isSafeHref(url: string | null): url is string {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

function formatWhen(iso: string, isAllDay?: boolean): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (isAllDay) return day;
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function toRows(
  sourceItems: SourceItemPayload[],
  calendarEvents: CalendarCommitmentPayload[],
): SourceRow[] {
  const fromSources: SourceRow[] = sourceItems
    .filter((item) => !item.converted)
    .map((item) => ({
      key: `source:${item.id}`,
      kind: 'source' as const,
      id: item.id,
      title: item.title,
      glyph: SOURCE_GLYPH[item.provider] ?? item.provider,
      label: item.label,
      url: item.url,
      snippet: item.snippet,
      when: item.dueAt ? formatWhen(item.dueAt) : null,
    }));

  const fromCalendar: SourceRow[] = calendarEvents
    .filter((event) => !event.converted)
    .map((event) => ({
      key: `calendar:${event.id}`,
      kind: 'calendar' as const,
      id: event.id,
      title: event.title,
      glyph: SOURCE_GLYPH.calendar,
      label: 'Calendar',
      url: null,
      snippet: event.location,
      when: formatWhen(event.startAt, event.isAllDay),
    }));

  return [...fromSources, ...fromCalendar];
}

/**
 * Source context panel (Phase 7, §16.4 / §23). A `GlassPanel` is used
 * deliberately — this is a genuinely separate plane (like the capture band,
 * preview panel, and Bruno rail), never a per-item card (§26.1). Rows inside
 * stay dense typographic rows: a muted source glyph, the title, an optional
 * due/time, and a quiet "Add" affordance. Clicking the glyph reveals context
 * (label / snippet / link) inline rather than stacking badges.
 */
export function CommandSourcePanel({ onConverted }: { onConverted?: () => void }) {
  const [rows, setRows] = useState<SourceRow[] | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [convertingKey, setConvertingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
      const res = await fetch(`/api/command/sources?timezone=${encodeURIComponent(timezone)}`);
      if (!res.ok) {
        setRows([]);
        return;
      }
      const data = (await res.json()) as {
        sourceItems?: SourceItemPayload[];
        calendarEvents?: CalendarCommitmentPayload[];
      };
      setRows(toRows(data.sourceItems ?? [], data.calendarEvents ?? []));
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function convert(row: SourceRow) {
    if (convertingKey) return;
    setConvertingKey(row.key);
    setExpandedKey((cur) => (cur === row.key ? null : cur));
    // Optimistic removal — once conversion is requested the row's job is done.
    setRows((prev) => (prev ? prev.filter((r) => r.key !== row.key) : prev));
    try {
      const res = await fetch('/api/command/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          row.kind === 'source' ? { sourceItemId: row.id } : { calendarEventId: row.id },
        ),
      });
      if (!res.ok) throw new Error(String(res.status));
      onConverted?.();
    } catch {
      // Conversion failed — nothing was created, so put the row back.
      setRows((prev) => (prev ? [row, ...prev] : prev));
    } finally {
      setConvertingKey(null);
    }
  }

  if (!rows || rows.length === 0) return null;

  return (
    <GlassPanel variant="card" className="p-3.5">
      <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-faint)]">
        From your sources
      </p>
      <div>
        {rows.map((row) => {
          const expanded = expandedKey === row.key;
          const converting = convertingKey === row.key;
          return (
            <div
              key={row.key}
              className="border-b border-[var(--glass-border)]/60 py-2 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setExpandedKey((cur) => (cur === row.key ? null : row.key))}
                  aria-label={`${row.label} source details`}
                  aria-expanded={expanded}
                  className="flex-none rounded px-1 text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] transition-colors hover:text-[var(--color-ink-soft)]"
                >
                  {row.glyph}
                </button>

                <span className="min-w-0 flex-1 truncate text-[14px] leading-snug text-[var(--color-ink)]">
                  {row.title}
                </span>

                {row.when && (
                  <span className="flex-none text-[12px] tabular-nums text-[var(--color-ink-faint)]">
                    {row.when}
                  </span>
                )}

                <button
                  type="button"
                  aria-label={`Add "${row.title}" to your plate`}
                  disabled={converting}
                  onClick={() => convert(row)}
                  className="flex-none rounded-full p-1 text-[var(--color-ink-faint)] transition-colors hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent-warm)] disabled:opacity-40"
                >
                  <Plus weight="bold" size={14} />
                </button>
              </div>

              {expanded && (
                <div className="mt-1.5 pl-7 text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
                  <p>{row.label}</p>
                  {row.snippet && <p className="mt-0.5">{row.snippet}</p>}
                  {isSafeHref(row.url) && (
                    <a
                      href={row.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="mt-0.5 inline-block text-[var(--color-accent-warm)] hover:underline"
                    >
                      Open
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}
