'use client';

import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MOTION } from '@/lib/calendar/motion';
import { getSourceColor, getSourceLabel } from '@/lib/calendar/layoutEngine';
import type { DayLayoutEvent } from '@/types/calendar';
import { Check, Zap, Settings, Moon, MapPin, RotateCcw, Sparkles, GripVertical } from 'lucide-react';
import { useState, useRef, useCallback } from 'react';

interface EventCardProps {
  event: DayLayoutEvent;
  onComplete?: (id: string) => void;
  onClick?: (event: DayLayoutEvent) => void;
  onDragEnd?: (eventId: string, deltaY: number) => void;
  onResizeEnd?: (eventId: string, deltaHeight: number) => void;
  style?: React.CSSProperties;
  isCompact?: boolean;
}

const SNAP_PX = 72 / 4; // 15-minute snap = hourHeight / 4

export default function EventCard({
  event,
  onComplete,
  onClick,
  onDragEnd,
  onResizeEnd,
  style,
  isCompact = false,
}: EventCardProps) {
  const isRollover = event.source === 'rollover';
  const sourceColor = isRollover ? 'var(--color-amber-500)' : getSourceColor(event.source);
  const sourceLabel = getSourceLabel(event.source);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragY = useMotionValue(0);
  const resizeDelta = useMotionValue(0);
  const cardHeight = useTransform(resizeDelta, (v) =>
    Math.max(40, event.height + v)
  );
  const pointerStartRef = useRef({ y: 0, time: 0 });

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const timeLabel = `${formatTime(startDate)} – ${formatTime(endDate)}`;

  const energyIcon =
    event.energy_level === 'high' ? (
      <Zap className="w-3 h-3" />
    ) : event.energy_level === 'medium' ? (
      <Settings className="w-3 h-3" />
    ) : event.energy_level === 'low' ? (
      <Moon className="w-3 h-3" />
    ) : null;

  const energyLabel = event.energy_level
    ? `${event.energy_level.charAt(0).toUpperCase() + event.energy_level.slice(1)} Energy`
    : null;

  // Snap value to nearest 15-min grid
  const snap = (v: number) => Math.round(v / SNAP_PX) * SNAP_PX;

  const handleDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setIsDragging(false);
      const snappedDelta = snap(info.offset.y);
      if (Math.abs(snappedDelta) >= SNAP_PX && onDragEnd) {
        onDragEnd(event.id, snappedDelta);
      }
      dragY.set(0);
    },
    [event.id, onDragEnd, dragY]
  );

  // Bottom-edge resize handler
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setIsResizing(true);
      pointerStartRef.current = { y: e.clientY, time: Date.now() };
      resizeDelta.set(0);

      const handleMove = (me: PointerEvent) => {
        const dy = me.clientY - pointerStartRef.current.y;
        resizeDelta.set(dy);
      };

      const handleUp = () => {
        setIsResizing(false);
        const snapped = snap(resizeDelta.get());
        if (Math.abs(snapped) >= SNAP_PX && onResizeEnd) {
          onResizeEnd(event.id, snapped);
        }
        resizeDelta.set(0);
        window.removeEventListener('pointermove', handleMove);
        window.removeEventListener('pointerup', handleUp);
      };

      window.addEventListener('pointermove', handleMove);
      window.addEventListener('pointerup', handleUp);
    },
    [event.id, onResizeEnd, resizeDelta]
  );

  // Swipe-left to complete (mobile)
  const handleSwipeDragEnd = useCallback(
    (_e: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -100 && onComplete) {
        onComplete(event.id);
      }
    },
    [event.id, onComplete]
  );

  return (
    <motion.div
      layout
      {...MOTION.cardEnter}
      drag="y"
      dragConstraints={{ top: -400, bottom: 400 }}
      dragElastic={0.05}
      dragSnapToOrigin={!onDragEnd}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileDrag={{
        scale: 1.03,
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        zIndex: 100,
        cursor: 'grabbing',
      }}
      whileHover={!isDragging ? { scale: 1.01, backgroundColor: 'var(--bg-tertiary)' } : undefined}
      onClick={() => {
        if (!isDragging) onClick?.(event);
      }}
      className={`
        absolute cursor-grab select-none touch-none
        rounded-xl overflow-visible
        transition-shadow duration-200
        ${event.is_completed ? 'opacity-40' : 'hover:shadow-lg'}
        ${isDragging ? 'z-50' : ''}
      `}
      data-event-card="true"
      style={{
        top: `${event.top}px`,
        height: isResizing ? undefined : `${event.height}px`,
        left: `${event.column * (100 / event.totalColumns)}%`,
        width: `${100 / event.totalColumns}%`,
        minHeight: '40px',
        y: dragY,
        ...style,
      }}
    >
      {/* Inner card with sleek glassmorphism and left accent */}
      <motion.div
        className={`h-full w-full flex rounded-xl border relative overflow-hidden backdrop-blur-md shadow-sm transition-all hover:shadow-md
          ${isRollover 
            ? 'bg-amber-500/15 dark:bg-amber-500/10 border-amber-500/40' 
            : 'bg-background/90 dark:bg-background/60 border-border/80 hover:border-surface-300'
          }
        `}
        style={{
          borderLeft: `4px solid ${sourceColor}`,
          boxShadow: `inset 0 0 20px color-mix(in srgb, ${sourceColor} 5%, transparent)`,
          height: isResizing ? cardHeight : '100%',
        }}
      >
        {/* Drag grip indicator — visible on hover */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40" />
        </div>

        <div className="flex-1 p-2.5 min-w-0 flex flex-col justify-between overflow-hidden">
          {/* Top row: title + time */}
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3
                className={`
                  font-semibold leading-tight truncate
                  text-foreground
                  ${isCompact ? 'text-xs' : 'text-sm'}
                  ${event.is_completed ? 'line-through opacity-60' : ''}
                `}
              >
                {event.icon && <span className="mr-1">{event.icon}</span>}
                {event.title}
              </h3>
            </div>

            {/* Time label */}
            {!isCompact && (
              <p className="text-[10px] font-mono text-muted-foreground mt-0.5 tracking-tight">
                {timeLabel}
              </p>
            )}
          </div>

          {/* Bottom row: badges */}
          {event.height > 56 && !isCompact && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {/* Source badge */}
              <span
                className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: `color-mix(in srgb, ${sourceColor} 15%, transparent)`,
                  color: sourceColor,
                }}
              >
                {sourceLabel}
              </span>

              {/* Energy badge */}
              {energyLabel && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-muted-foreground">
                  {energyIcon}
                  {energyLabel}
                </span>
              )}

              {/* Location */}
              {event.location && event.height > 72 && (
                <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground truncate">
                  <MapPin className="w-2.5 h-2.5 shrink-0" />
                  {event.location}
                </span>
              )}

              {/* Rollover badge */}
              {isRollover && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-rollover)]">
                  <RotateCcw className="w-2.5 h-2.5" />
                  Rolled
                </span>
              )}

              {/* Ollie badge */}
              {event.source === 'schedule' && event.ollie_notes && (
                <span className="flex items-center gap-0.5 text-[9px] font-bold text-[var(--color-ollie)]">
                  <Sparkles className="w-2.5 h-2.5" />
                  Ollie
                </span>
              )}
            </div>
          )}
        </div>

        {/* Completion checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onComplete?.(event.id);
          }}
          className={`
            absolute top-2.5 right-2.5
            w-5 h-5 rounded-full border-2 
            flex items-center justify-center
            transition-all duration-200 hover:scale-110 active:scale-95
            ${
              event.is_completed
                ? 'bg-[var(--color-success)] border-[var(--color-success)] text-white shadow-[0_0_10px_var(--color-success)]'
                : 'border-surface-300 hover:border-surface-400 bg-background/50 backdrop-blur-sm'
            }
          `}
        >
          <motion.div
            initial={false}
            animate={{ scale: event.is_completed ? 1 : 0, opacity: event.is_completed ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <Check className="w-3 h-3 stroke-[3]" />
          </motion.div>
        </button>

        {/* Resize handle — bottom edge */}
        <div
          onPointerDown={handleResizePointerDown}
          className={`
            absolute bottom-0 left-2 right-2 h-3
            cursor-ns-resize flex items-center justify-center
            rounded-b-xl
            opacity-0 hover:opacity-100 transition-opacity
            ${isResizing ? 'opacity-100' : ''}
          `}
        >
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30" />
        </div>
      </motion.div>
    </motion.div>
  );
}
