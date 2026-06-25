'use client';

import { useEffect, useCallback } from 'react';

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

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useCalendarKeyboardShortcuts(handlers: CalendarShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      const key = e.key;

      switch (key) {
        case 't':
        case 'T':
          e.preventDefault();
          handlers.onToday();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handlers.onNavigate('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          handlers.onNavigate('next');
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          handlers.onViewChange('day');
          break;
        case 'w':
        case 'W':
          e.preventDefault();
          handlers.onViewChange('week');
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handlers.onViewChange('month');
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          handlers.onViewChange('list');
          break;
        case 'y':
        case 'Y':
          e.preventDefault();
          handlers.onViewChange('year');
          break;
        case 'n':
        case 'N':
        case 'c':
        case 'C':
          e.preventDefault();
          handlers.onNewEvent();
          break;
        case 'b':
        case 'B':
          e.preventDefault();
          handlers.onToggleBacklog();
          break;
        case '?':
          e.preventDefault();
          handlers.onOpenShortcuts();
          break;
        case 'Escape':
          handlers.onEscape();
          break;
        default:
          if (key >= '1' && key <= '7') {
            e.preventDefault();
            handlers.onJumpToWeekday(parseInt(key, 10) - 1);
          }
          break;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
