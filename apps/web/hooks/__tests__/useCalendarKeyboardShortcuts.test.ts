import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useCalendarKeyboardShortcuts } from '@/hooks/useCalendarKeyboardShortcuts';

function createHandlers() {
  return {
    onToday: vi.fn(),
    onNavigate: vi.fn(),
    onViewChange: vi.fn(),
    onNewEvent: vi.fn(),
    onToggleBacklog: vi.fn(),
    onJumpToWeekday: vi.fn(),
    onOpenShortcuts: vi.fn(),
    onEscape: vi.fn(),
  };
}

describe('useCalendarKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls onToday when T is pressed outside typing targets', () => {
    const handlers = createHandlers();
    renderHook(() => useCalendarKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 't',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(handlers.onToday).toHaveBeenCalledTimes(1);
  });

  it('calls onToday when KeyT code is used', () => {
    const handlers = createHandlers();
    renderHook(() => useCalendarKeyboardShortcuts(handlers));

    const event = new KeyboardEvent('keydown', {
      key: 'Dead',
      code: 'KeyT',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(handlers.onToday).toHaveBeenCalledTimes(1);
  });

  it('does not call onToday when focus is in an input', () => {
    const handlers = createHandlers();
    renderHook(() => useCalendarKeyboardShortcuts(handlers));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 't',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);

    expect(handlers.onToday).not.toHaveBeenCalled();
    input.remove();
  });

  it('does not register shortcuts when disabled', () => {
    const handlers = createHandlers();
    renderHook(() =>
      useCalendarKeyboardShortcuts(handlers, { enabled: false })
    );

    const event = new KeyboardEvent('keydown', {
      key: 't',
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: document.body });
    document.dispatchEvent(event);

    expect(handlers.onToday).not.toHaveBeenCalled();
  });
});
