'use client';

import { useState, useRef, useEffect, type ComponentType } from 'react';
import Link from 'next/link';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import {
  CaretLeft,
  CaretRight,
  DotsThree,
  ListChecks,
  Question,
  ArrowsCounterClockwise,
  Plus,
} from '@phosphor-icons/react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { SlackIcon, NotionIcon, LinearIcon } from '@/components/icons/BrandIcons';
import type { ProIntegrationProvider } from '@/lib/integrations/types';
import type { CalendarView } from '@/types/calendar';
import { formatDistanceToNow } from 'date-fns';

const WEEK_STARTS_ON = 0 as const;

const LAYER_ICONS: Record<ProIntegrationProvider, ComponentType<{ className?: string }>> = {
  notion: NotionIcon,
  slack: SlackIcon,
  linear: LinearIcon,
};

const VIEW_OPTIONS: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'list', label: 'Schedule' },
  { id: 'year', label: 'Year' },
];

interface CalendarToolbarProps {
  selectedDate: Date;
  activeView: CalendarView;
  onNavigate: (direction: 'prev' | 'next') => void;
  onToday: () => void;
  onViewChange: (view: CalendarView) => void;
  connectedProviders: ProIntegrationProvider[];
  hiddenLayers: Set<string>;
  onToggleLayer: (provider: string) => void;
  googleConnected: boolean;
  googleLastSyncedAt: string | null;
  onSyncGoogle: () => void;
  onStartFresh: () => void;
  isProcessing: boolean;
  backlogOpen: boolean;
  onToggleBacklog: () => void;
  backlogCount: number;
  onOpenShortcuts: () => void;
  onCreate: () => void;
}

function getRangeLabel(selectedDate: Date, activeView: CalendarView): string {
  switch (activeView) {
    case 'day':
      return format(selectedDate, 'EEEE, MMM d, yyyy');
    case 'week': {
      const start = startOfWeek(selectedDate, { weekStartsOn: WEEK_STARTS_ON });
      const end = endOfWeek(selectedDate, { weekStartsOn: WEEK_STARTS_ON });
      return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
    }
    case 'month':
      return format(selectedDate, 'MMMM yyyy');
    case 'list':
      return format(selectedDate, 'MMM d, yyyy');
    case 'year':
      return format(selectedDate, 'yyyy');
    default:
      return format(selectedDate, 'MMM d, yyyy');
  }
}

function isGoogleStale(lastSyncedAt: string | null): boolean {
  if (!lastSyncedAt) return true;
  const diff = Date.now() - new Date(lastSyncedAt).getTime();
  return diff > 24 * 60 * 60 * 1000;
}

export default function CalendarToolbar({
  selectedDate,
  activeView,
  onNavigate,
  onToday,
  onViewChange,
  connectedProviders,
  hiddenLayers,
  onToggleLayer,
  googleConnected,
  googleLastSyncedAt,
  onSyncGoogle,
  onStartFresh,
  isProcessing,
  backlogOpen,
  onToggleBacklog,
  backlogCount,
  onOpenShortcuts,
  onCreate,
}: CalendarToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const showStaleDot = googleConnected && isGoogleStale(googleLastSyncedAt);

  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2.5">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToday}
          className="text-sm font-medium px-3 py-1.5 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:bg-[var(--color-cream-2)] transition-colors cursor-pointer"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => onNavigate('prev')}
          className="p-1.5 rounded-lg hover:bg-[var(--color-cream-2)] text-[var(--color-ink)] transition-colors cursor-pointer"
          aria-label="Previous"
        >
          <CaretLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('next')}
          className="p-1.5 rounded-lg hover:bg-[var(--color-cream-2)] text-[var(--color-ink)] transition-colors cursor-pointer"
          aria-label="Next"
        >
          <CaretRight className="w-4 h-4" />
        </button>
      </div>

      <h2 className="text-base sm:text-lg font-medium text-[var(--color-ink)] truncate min-w-0 flex-1">
        {getRangeLabel(selectedDate, activeView)}
      </h2>

      <NotificationBell className="shrink-0" />

      <div className="flex bg-[var(--color-cream-2)] p-1 rounded-xl border border-[var(--color-line)]">
        {VIEW_OPTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onViewChange(id)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold uppercase tracking-wider transition-all ${
              activeView === id
                ? 'text-[var(--color-cream)] bg-[var(--color-ink)] shadow-sm'
                : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onCreate}
        title="Create event (N)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-cream)] text-xs font-mono font-bold uppercase tracking-wider transition-colors hover:bg-[var(--color-ink-2)]"
      >
        <Plus className="w-4 h-4" weight="bold" />
        <span className="hidden sm:inline">Create</span>
      </button>

      <button
        type="button"
        onClick={onToggleBacklog}
        title="Toggle backlog (B)"
        className={`relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-mono font-bold uppercase tracking-wider transition-colors ${
          backlogOpen
            ? 'bg-[var(--color-ink)] text-[var(--color-cream)] border-[var(--color-ink)]'
            : 'bg-[var(--color-cream-2)] text-[var(--color-ink-muted)] border-[var(--color-line)] hover:text-[var(--color-ink)]'
        }`}
      >
        <ListChecks className="w-4 h-4" />
        <span className="hidden sm:inline">Tasks</span>
        {backlogCount > 0 && (
          <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--color-paper)] text-[var(--color-ink)] text-[9px] font-bold">
            {backlogCount}
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={onOpenShortcuts}
        title="Keyboard shortcuts (?)"
        className="p-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-cream-2)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors"
        aria-label="Keyboard shortcuts"
      >
        <Question className="w-4 h-4" />
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="relative p-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-cream-2)] text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition-colors"
          aria-label="More actions"
        >
          <DotsThree className="w-5 h-5" weight="bold" />
          {showStaleDot && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500" />
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] shadow-lg z-50 py-1">
            {connectedProviders.length > 0 && (
              <>
                <p className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                  Layers
                </p>
                {connectedProviders.map((provider) => {
                  const Icon = LAYER_ICONS[provider];
                  const active = !hiddenLayers.has(provider);
                  return (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => onToggleLayer(provider)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-cream-2)] transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1 text-left capitalize">{provider}</span>
                      <span
                        className={`text-[10px] font-mono uppercase ${
                          active ? 'text-[var(--color-sage)]' : 'text-[var(--color-ink-muted)]'
                        }`}
                      >
                        {active ? 'On' : 'Off'}
                      </span>
                    </button>
                  );
                })}
                <div className="my-1 border-t border-[var(--color-line)]" />
              </>
            )}

            <p className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
              Google Calendar
            </p>
            {googleConnected ? (
              <button
                type="button"
                onClick={() => {
                  onSyncGoogle();
                  setMenuOpen(false);
                }}
                disabled={isProcessing}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-cream-2)] transition-colors disabled:opacity-50"
              >
                <ArrowsCounterClockwise
                  className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`}
                />
                <span className="flex-1 text-left">Sync Google Calendar</span>
              </button>
            ) : (
              <Link
                href="/dashboard/settings/integrations"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--color-cream-2)] transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <ArrowsCounterClockwise className="w-4 h-4" />
                <span>Connect Google Calendar</span>
              </Link>
            )}
            {googleConnected && googleLastSyncedAt && (
              <p className="px-3 pb-2 text-[10px] font-mono text-[var(--color-ink-muted)]">
                Last synced {formatDistanceToNow(new Date(googleLastSyncedAt))} ago
              </p>
            )}

            <div className="my-1 border-t border-[var(--color-line)]" />

            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onStartFresh();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50/50 transition-colors"
            >
              Start Fresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { WEEK_STARTS_ON, getRangeLabel };
