'use client';

import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import type { ScheduleBlock as BaseScheduleBlock } from '@/lib/ai/agentic-scheduler';

import { CheckCircle, Clock, Lightning, Coffee, CalendarBlank, Lock, Scissors, ArrowSquareOut, WarningCircle, ThumbsUp } from '@phosphor-icons/react';

interface ScheduleBlock extends BaseScheduleBlock {
  completed?: boolean;
  status?: 'pending' | 'confirmed' | 'rejected';
  is_ai_suggested?: boolean;
}

interface ScheduleTimelineProps {
  initialBlocks: ScheduleBlock[];
  onUpdate: (blocks: ScheduleBlock[]) => void;
  onDeconstruct: (blockId: string) => void;
  onFeedback?: (block: ScheduleBlock, action: 'accept' | 'too_vague' | 'too_many_breaks' | 'wrong_time') => void | Promise<void>;
}

const getSourceColor = (block: ScheduleBlock) => {
  if (block.externalUrl || block.title.toLowerCase().includes('canvas')) return 'bg-(--color-rose)';
  if (block.type === 'event' || block.title.toLowerCase().includes('google calendar') || block.title.toLowerCase().includes('classes')) return 'bg-(--color-blue)';
  return 'bg-(--color-honey)';
};

const isBlockNow = (timeStr: string, durationMin: number) => {
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const now = new Date();
    const blockStart = new Date();
    blockStart.setHours(hours, minutes, 0, 0);
    const blockEnd = new Date(blockStart.getTime() + durationMin * 60 * 1000);
    return now >= blockStart && now <= blockEnd;
  } catch {
    return false;
  }
};

export default function ScheduleTimeline({ initialBlocks, onUpdate, onDeconstruct, onFeedback }: ScheduleTimelineProps) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    (async () => {
      await Promise.resolve();
      setIsMounted(true);
      requestAnimationFrame(() => {
        setBlocks(initialBlocks);
      });
    })();
  }, [initialBlocks]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(blocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setBlocks(items);
    onUpdate(items);
  };

  const handleToggleComplete = (blockId: string) => {
    const newBlocks = blocks.map(b => 
      b.id === blockId ? { ...b, completed: !b.completed } : b
    );
    setBlocks(newBlocks);
    onUpdate(newBlocks);
  };

  if (!isMounted) {
    return null; // Prevent hydration errors with DnD
  }

  return (
    <div className="relative h-full overflow-hidden">
      <div className="overflow-y-auto overflow-x-hidden relative no-scrollbar pb-10">
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="schedule-timeline">
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="space-y-2 min-h-12.5"
              >
                <AnimatePresence mode="popLayout">
                  {blocks.map((block, i) => (
                    <ScheduleBlockItem 
                      key={block.id || `fallback-${i}`}
                      block={block}
                      index={i}
                      onDeconstruct={onDeconstruct}
                      onToggleComplete={() => handleToggleComplete(block.id)}
                      onFeedback={onFeedback}
                    />
                  ))}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}

function ScheduleBlockItem({
  block,
  index,
  onDeconstruct,
  onToggleComplete,
  onFeedback,
}: {
  block: ScheduleBlock;
  index: number;
  onDeconstruct: (id: string) => void;
  onToggleComplete: () => void;
  onFeedback?: (block: ScheduleBlock, action: 'accept' | 'too_vague' | 'too_many_breaks' | 'wrong_time') => void | Promise<void>;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.05, once: true });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'focus': return <Lightning className="w-4 h-4 text-(--color-honey)" />;
      case 'break': return <Coffee className="w-4 h-4 text-(--color-sage)" />;
      case 'event': return <CalendarBlank className="w-4 h-4 text-(--color-blue)" />;
      case 'constraint': return <Lock className="w-4 h-4 text-(--color-ink-soft)" />;
      default: return <Clock className="w-4 h-4 text-(--color-ink-soft)" />;
    }
  };

  const isNow = isBlockNow(block.time, block.duration);
  const sourceColor = getSourceColor(block);

  return (
    <Draggable draggableId={block.id || `fallback-${index}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          {...({ style: Object.assign({}, provided.draggableProps.style, snapshot.isDragging ? { zIndex: 50 } : {}) })}
        >
          <motion.div
            ref={ref}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
            className={`relative group cursor-grab active:cursor-grabbing p-4 rounded-xl border transition-all duration-300 flex items-stretch gap-4 ${
              snapshot.isDragging
                ? 'bg-(--color-cream-2) scale-[1.02] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.05)] border-line-strong'
                : isNow 
                  ? 'bg-[rgba(208,135,65,0.08)] border-[rgba(208,135,65,0.3)] shadow-sm' 
                  : 'bg-transparent border-line hover:bg-(--color-cream-2)/50'
            }`}
          >
            {/* Time and Duration Column */}
            <div className="min-w-17.5 flex flex-col justify-center shrink-0">
              <span className={`font-mono text-xs font-semibold ${isNow ? 'text-(--color-honey-deep)' : 'text-(--color-ink)'}`}>
                {block.time}
              </span>
              <span className="font-mono text-[10px] text-(--color-ink-soft) mt-0.5">
                {block.duration}m
              </span>
            </div>

            {/* Source-Colored Vertical Bar */}
            <div className={`w-1 rounded-full shrink-0 self-stretch ${sourceColor}`} />

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-1.5">
                  {getTypeIcon(block.type)}
                  <span className="font-mono text-[10px] uppercase tracking-wider text-(--color-ink-soft)">
                    {block.type}
                  </span>
                </div>

                {/* Inline Status Badges */}
                <div className="flex items-center gap-2">
                  {isNow && (
                    <span className="bg-(--color-honey) text-(--color-ink) text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                      ● NOW
                    </span>
                  )}
                  {block.completed && (
                    <span className="text-(--color-sage) text-[9px] font-mono font-bold tracking-wider uppercase">
                      ✓ DONE
                    </span>
                  )}
                </div>
              </div>

              <div className="relative inline-block max-w-full">
                <h3 className={`text-[15px] font-medium leading-tight mb-1 truncate transition-all duration-300 ${block.completed ? 'text-(--color-ink-soft) line-through' : 'text-(--color-ink)'}`}>
                  {block.title}
                </h3>
              </div>

              {block.originalTitle && block.originalTitle !== block.title && !block.completed && (
                <p className="font-mono text-[10px] text-(--color-ink-soft) bg-(--color-cream-2) w-fit px-2 py-0.5 rounded-full border border-line mb-1">
                  {block.originalTitle}
                </p>
              )}
              
              <p className="text-xs text-(--color-ink-soft) leading-normal mt-1">{block.description}</p>

              <div className="mt-3.5 grid gap-2.5">
                <DetailRow
                  icon={<Lightning className="w-3.5 h-3.5" />}
                  label={block.type === 'break' ? 'Break Plan' : 'What To Do'}
                  value={block.specific_action || fallbackAction(block)}
                />
                <DetailRow
                  icon={<CheckCircle className="w-3.5 h-3.5" />}
                  label="Done When"
                  value={block.success_condition || fallbackSuccess(block)}
                />
                {block.why_now && (
                  <DetailRow
                    icon={<Clock className="w-3.5 h-3.5" />}
                    label="Why Now"
                    value={block.why_now}
                  />
                )}
                {block.break_reason && (
                  <DetailRow
                    icon={<Coffee className="w-3.5 h-3.5" />}
                    label="Break Reason"
                    value={block.break_reason}
                  />
                )}
                {block.fallback_if_stuck && block.type === 'focus' && (
                  <DetailRow
                    icon={<WarningCircle className="w-3.5 h-3.5" />}
                    label="If Stuck"
                    value={block.fallback_if_stuck}
                  />
                )}
              </div>

              {block.materials_needed && block.materials_needed.length > 0 && !block.completed && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {block.materials_needed.map((material) => (
                    <span
                      key={material}
                      className="font-mono text-[10px] text-(--color-ink-soft) px-2 py-0.5 rounded-full bg-(--color-cream-2) border border-line"
                    >
                      {material}
                    </span>
                  ))}
                </div>
              )}
              
              {block.externalUrl && !block.completed && (
                <a
                  href={block.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-mono tracking-widest text-(--color-ink) transition-colors bg-(--color-cream-2) hover:bg-line-strong px-3 py-1.5 rounded-full border border-line shadow-sm"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ArrowSquareOut className="w-3.5 h-3.5" />
                  View on Canvas
                </a>
              )}

              {/* Feedback buttons */}
              {!block.completed && onFeedback && (
                <div className="mt-4 pt-3 border-t border-line flex flex-wrap gap-2">
                  <FeedbackButton label="Looks Good" onClick={() => onFeedback(block, 'accept')} icon={<ThumbsUp className="w-3 h-3" />} />
                  <FeedbackButton label="Too Vague" onClick={() => onFeedback(block, 'too_vague')} />
                  <FeedbackButton label="Wrong Time" onClick={() => onFeedback(block, 'wrong_time')} />
                  {block.type === 'break' && (
                    <FeedbackButton label="Too Many Breaks" onClick={() => onFeedback(block, 'too_many_breaks')} />
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons Column */}
            <div className="flex flex-col gap-2 shrink-0 self-start">
              {block.status === 'pending' ? (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFeedback?.(block, 'accept');
                    }}
                    className="p-2 bg-(--color-ink) text-(--color-paper) rounded-full shadow-sm active:scale-90 transition-all cursor-pointer"
                    title="Confirm"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeconstruct(block.id);
                    }}
                    className="p-2 bg-(--color-cream-2) text-(--color-ink-soft) rounded-full active:scale-90 transition-all hover:bg-(--color-rose-soft) hover:text-(--color-rose) cursor-pointer"
                    title="Reject"
                  >
                    <Scissors className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    title={block.completed ? "Mark incomplete" : "Mark complete"}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleComplete();
                    }}
                    className={`p-2 rounded-full transition-all active:scale-90 border cursor-pointer ${
                      block.completed 
                        ? 'bg-(--color-sage) border-(--color-sage) text-(--color-paper) shadow-sm' 
                        : 'bg-transparent border-line text-(--color-ink-soft) hover:border-(--color-ink) hover:text-(--color-ink)'
                    }`}
                  >
                    <CheckCircle className={`w-4 h-4 ${block.completed ? 'fill-current' : ''}`} />
                  </button>
                  
                  {!block.completed && block.type === 'focus' && block.duration > 40 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeconstruct(block.id);
                      }}
                      className="p-2 hover:bg-(--color-cream-2) rounded-full transition-colors group/btn bg-transparent border border-line cursor-pointer"
                      title="Break down task"
                    >
                      <Scissors className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Progress Indicator (Simulated) */}
            {block.type === 'focus' && !block.completed && isNow && (
              <div className="absolute bottom-0 left-0 h-0.5 bg-line w-full">
                <motion.div 
                  className="h-full bg-(--color-honey)"
                  initial={{ width: 0 }}
                  animate={{ width: "30%" }}
                />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </Draggable>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="mt-0.5 text-(--color-ink-soft) shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="font-mono text-[9px] text-(--color-ink-soft) tracking-wider mb-1 uppercase">{label}</p>
        <p className="text-[13px] font-medium leading-snug text-(--color-ink)">{value}</p>
      </div>
    </div>
  );
}

function FeedbackButton({ label, onClick, icon }: { label: string; onClick: () => void; icon?: ReactNode }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-(--color-cream-2) hover:bg-line-strong border border-line text-[10px] font-mono tracking-wider text-(--color-ink-soft) hover:text-(--color-ink) transition-colors cursor-pointer"
    >
      {icon}
      {label}
    </button>
  );
}

function fallbackAction(block: ScheduleBlock): string {
  if (block.type === 'break') return 'Step away from the screen and reset before the next block.';
  if (block.type === 'event') return `Attend ${block.title}.`;
  if (block.type === 'constraint') return `Keep this time protected for ${block.title}.`;
  if (block.type === 'buffer') return 'Use this open time intentionally or leave it open.';
  return `Work directly on "${block.originalTitle || block.title}".`;
}

function fallbackSuccess(block: ScheduleBlock): string {
  if (block.type === 'break') return 'You return with enough energy for the next block.';
  if (block.type === 'event') return 'The event is handled.';
  if (block.type === 'constraint') return 'This protected time stays unscheduled.';
  if (block.type === 'buffer') return 'The time is used deliberately.';
  return 'A visible next step is complete.';
}
