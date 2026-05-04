'use client';

import { useState, useCallback, useRef } from 'react';
import { pixelToTime } from '@/lib/calendar/layoutEngine';

const HOUR_HEIGHT = 72;
const SNAP_INTERVAL_MINUTES = 15;
const LONG_PRESS_MS = 400;

export interface DragState {
  eventId: string | null;
  isDragging: boolean;
  isLifted: boolean;
  offsetY: number;
  originalTop: number;
  snappedTop: number;
}

interface UseDragRescheduleOptions {
  dayStartHour: number;
  referenceDate: Date;
  onReschedule: (eventId: string, newStart: Date, newEnd: Date) => void;
}

export function useDragReschedule({
  dayStartHour,
  referenceDate,
  onReschedule,
}: UseDragRescheduleOptions) {
  const [dragState, setDragState] = useState<DragState>({
    eventId: null,
    isDragging: false,
    isLifted: false,
    offsetY: 0,
    originalTop: 0,
    snappedTop: 0,
  });

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationRef = useRef(0);

  /**
   * Snap a pixel Y value to the nearest 15-minute grid line.
   */
  const snapToGrid = useCallback((pixelY: number): number => {
    const minuteHeight = HOUR_HEIGHT / 60;
    const snapPx = SNAP_INTERVAL_MINUTES * minuteHeight;
    return Math.round(pixelY / snapPx) * snapPx;
  }, []);

  /**
   * Begin a long-press → lift sequence.
   * Called from onPointerDown on the EventCard.
   */
  const handlePointerDown = useCallback(
    (eventId: string, currentTop: number, eventDurationMs: number, e: React.PointerEvent) => {
      e.stopPropagation();
      durationRef.current = eventDurationMs;

      longPressTimer.current = setTimeout(() => {
        setDragState({
          eventId,
          isDragging: true,
          isLifted: true,
          offsetY: 0,
          originalTop: currentTop,
          snappedTop: snapToGrid(currentTop),
        });
      }, LONG_PRESS_MS);
    },
    [snapToGrid]
  );

  /**
   * While dragging — update the Y offset and compute snapped position.
   */
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.isDragging) return;

      const deltaY = e.movementY;

      setDragState((prev) => {
        const newTop = prev.originalTop + prev.offsetY + deltaY;
        return {
          ...prev,
          offsetY: prev.offsetY + deltaY,
          snappedTop: snapToGrid(newTop),
        };
      });
    },
    [dragState.isDragging, snapToGrid]
  );

  /**
   * Drop — compute the new start/end times and fire the callback.
   */
  const handlePointerUp = useCallback(() => {
    // Clear long-press timer if still pending
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    if (!dragState.isDragging || !dragState.eventId) {
      setDragState((prev) => ({ ...prev, isDragging: false, isLifted: false, eventId: null }));
      return;
    }

    // Convert snapped pixel position back to a time
    const newStart = pixelToTime(dragState.snappedTop, dayStartHour, referenceDate);
    const newEnd = new Date(newStart.getTime() + durationRef.current);

    onReschedule(dragState.eventId, newStart, newEnd);

    // Reset
    setDragState({
      eventId: null,
      isDragging: false,
      isLifted: false,
      offsetY: 0,
      originalTop: 0,
      snappedTop: 0,
    });
  }, [dragState, dayStartHour, referenceDate, onReschedule]);

  /**
   * Cancel — pointer leaves the container or escape is pressed.
   */
  const handleCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    setDragState({
      eventId: null,
      isDragging: false,
      isLifted: false,
      offsetY: 0,
      originalTop: 0,
      snappedTop: 0,
    });
  }, []);

  return {
    dragState,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleCancel,
    snapToGrid,
  };
}
