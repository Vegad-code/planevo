'use client';

import { useEffect, useRef } from 'react';

import type { CalendarView } from '@/types/calendar';

interface CalendarShortcutHandlers {
  onToday: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onViewChange: (view: CalendarView) => void;
  onNewEvent: () => void;
  onToggleBacklog: () => void;
  onJumpToWeekday: (dayIndex: number) => void;
  onOpenShortcuts: () => void;
  onEscape: () => void;
}

interface UseCalendarKeyboardShortcutsOptions {
  enabled?: boolean;
}

function shouldIgnoreShortcuts(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;

  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (el.isContentEditable) return true;
  if (el.closest('[data-calendar-shortcuts-ignore]')) return true;
  if (el.closest('[data-bruno-chat]')) return true;

  return false;
}

function isTodayKey(e: KeyboardEvent): boolean {
  return e.key === 't' || e.key === 'T' || e.code === 'KeyT';
}

export function useCalendarKeyboardShortcuts(
  handlers: CalendarShortcutHandlers,
  options?: UseCalendarKeyboardShortcutsOptions
) {
  const enabled = options?.enabled ?? true;
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.isComposing) return;
      if (shouldIgnoreShortcuts()) return;

      const h = handlersRef.current;
      const key = e.key;

      if (isTodayKey(e)) {
        e.preventDefault();
        e.stopPropagation();
        h.onToday();
        return;
      }

      switch (key) {
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          h.onNavigate('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          h.onNavigate('next');
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          e.stopPropagation();
          h.onViewChange('day');
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          e.stopPropagation();
          h.onViewChange('week');
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          e.stopPropagation();
          h.onViewChange('month');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          e.stopPropagation();
          h.onViewChange('list');
          break;
        case 'y':
        case 'Y':
          e.preventDefault();
          e.stopPropagation();
          h.onViewChange('year');
          break;
        case 'n':
        case 'N':
        case 'c':
        case 'C':
          e.preventDefault();
          e.stopPropagation();
          h.onNewEvent();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          e.stopPropagation();
          h.onToggleBacklog();
          break;
        case '?':
          e.preventDefault();
          e.stopPropagation();
          h.onOpenShortcuts();
          break;
        case 'Escape':
          h.onEscape();
          break;
        default:
          if (key >= '1' && key <= '7') {
            e.preventDefault();
            e.stopPropagation();
            h.onJumpToWeekday(parseInt(key, 10) - 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [enabled]);
}
