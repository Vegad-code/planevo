'use client';

import { useState, useCallback, useRef } from 'react';

const HOUR_HEIGHT = 72;
const MIN_EVENT_MINUTES = 15;
const SNAP_INTERVAL_MINUTES = 15;

interface UseResizeOptions {
  dayStartHour: number;
  onResize: (eventId: string, newEndTime: Date, referenceDate: Date) => void;
  referenceDate: Date;
}

export interface ResizeState {
  eventId: string | null;
  isResizing: boolean;
  originalHeight: number;
  currentHeight: number;
}

export function useEventResize({ dayStartHour, onResize, referenceDate }: UseResizeOptions) {
  const [resizeState, setResizeState] = useState<ResizeState>({
    eventId: null,
    isResizing: false,
    originalHeight: 0,
    currentHeight: 0,
  });

  const startYRef = useRef(0);
  const eventTopRef = useRef(0);

  const snapHeight = useCallback((height: number): number => {
    const minuteHeight = HOUR_HEIGHT / 60;
    const snapPx = SNAP_INTERVAL_MINUTES * minuteHeight;
    const minPx = MIN_EVENT_MINUTES * minuteHeight;
    return Math.max(minPx, Math.round(height / snapPx) * snapPx);
  }, []);

  const handleResizeStart = useCallback(
    (eventId: string, currentHeight: number, eventTop: number, e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      startYRef.current = e.clientY;
      eventTopRef.current = eventTop;

      setResizeState({
        eventId,
        isResizing: true,
        originalHeight: currentHeight,
        currentHeight,
      });
    },
    []
  );

  const handleResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeState.isResizing) return;

      const deltaY = e.clientY - startYRef.current;
      const newHeight = snapHeight(resizeState.originalHeight + deltaY);

      setResizeState((prev) => ({
        ...prev,
        currentHeight: newHeight,
      }));
    },
    [resizeState.isResizing, resizeState.originalHeight, snapHeight]
  );

  const handleResizeEnd = useCallback(() => {
    if (!resizeState.isResizing || !resizeState.eventId) {
      setResizeState({ eventId: null, isResizing: false, originalHeight: 0, currentHeight: 0 });
      return;
    }

    // Calculate new end time from top + snapped height
    const totalMinutesFromStart =
      ((eventTopRef.current + resizeState.currentHeight) / HOUR_HEIGHT) * 60 + dayStartHour * 60;
    const snappedMinutes = Math.round(totalMinutesFromStart / SNAP_INTERVAL_MINUTES) * SNAP_INTERVAL_MINUTES;

    const newEnd = new Date(referenceDate);
    newEnd.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);

    onResize(resizeState.eventId, newEnd, referenceDate);

    setResizeState({
      eventId: null,
      isResizing: false,
      originalHeight: 0,
      currentHeight: 0,
    });
  }, [resizeState, dayStartHour, referenceDate, onResize]);

  const handleResizeCancel = useCallback(() => {
    setResizeState({
      eventId: null,
      isResizing: false,
      originalHeight: 0,
      currentHeight: 0,
    });
  }, []);

  return {
    resizeState,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleResizeCancel,
  };
}
