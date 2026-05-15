'use client';

import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion, Reorder, AnimatePresence, useInView } from 'framer-motion';
import type { ScheduleBlock as BaseScheduleBlock } from '@/lib/ai/agentic-scheduler';

import { CheckCircle2, Clock, Zap, Coffee, Calendar, Lock, Scissors, ExternalLink, MessageSquareWarning, ThumbsUp } from 'lucide-react';

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

export default function ScheduleTimeline({ initialBlocks, onUpdate, onDeconstruct, onFeedback }: ScheduleTimelineProps) {
  const [blocks, setBlocks] = useState(initialBlocks);

  useEffect(() => {
    requestAnimationFrame(() => {
      setBlocks(initialBlocks);
    });
  }, [initialBlocks]);

  const handleReorder = (newOrder: ScheduleBlock[]) => {
    setBlocks(newOrder);
    onUpdate(newOrder);
  };

  const handleToggleComplete = (blockId: string) => {
    const newBlocks = blocks.map(b => 
      b.id === blockId ? { ...b, completed: !b.completed } : b
    );
    setBlocks(newBlocks);
    onUpdate(newBlocks);
  };



  return (
    <div className="relative h-full overflow-hidden">
      {/* Time Axis Line */}
      <div className="absolute left-[70px] top-0 bottom-0 w-px bg-surface-200 z-0" />

      <div className="max-h-[700px] overflow-y-auto overflow-x-hidden p-6 relative no-scrollbar">
        <Reorder.Group axis="y" values={blocks} onReorder={handleReorder} className="space-y-4">
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
        </Reorder.Group>
      </div>

      {/* Gradient Overlays for that premium feel */}
      <div className="absolute top-0 left-0 right-0 h-12 bg-gradient-to-b from-white to-transparent pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
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

  const getTypeStyles = (type: string, completed?: boolean, status?: string) => {
    if (completed) return 'border-surface-200 bg-surface-50 text-surface-400 opacity-60';
    if (status === 'pending') return 'border-dashed border-brand-400 bg-brand-50/30 text-brand-700 opacity-80 shadow-none';

    switch (type) {
      case 'focus':
        return 'border-accent-500 bg-accent-500/10 text-accent-700 shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]';
      case 'break':
        return 'border-green-500 bg-green-500/10 text-green-700';
      case 'event':
        return 'border-brand-500 bg-brand-500/10 text-brand-700';
      case 'constraint':
        return 'border-surface-400 bg-surface-200 text-surface-500 opacity-80';
      default:
        return 'border-surface-300 bg-surface-50 text-surface-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'focus': return <Zap className="w-4 h-4" />;
      case 'break': return <Coffee className="w-4 h-4" />;
      case 'event': return <Calendar className="w-4 h-4" />;
      case 'constraint': return <Lock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={{ scale: 0.95, opacity: 0, y: 10 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.2) }}
    >
      <Reorder.Item
        value={block}
        whileDrag={{ scale: 1.02, boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1)" }}
        className={`relative group cursor-grab active:cursor-grabbing p-5 rounded-3xl border-2 transition-all duration-500 ${getTypeStyles(block.type, block.completed, block.status)}`}
      >
        {/* Time Marker on Axis */}
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-meta w-12 text-right">
            {block.time}
          </span>
          <div className={`w-3 h-3 rounded-full border-2 transition-all z-10 ${block.completed ? 'bg-green-500 border-green-500' : 'bg-white border-surface-200 group-hover:border-brand-500'}`} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center gap-2 mb-1.5">
              {getTypeIcon(block.type)}
              <span className="text-meta opacity-70">
                {block.type} • {block.duration}m
              </span>
            </div>
            
            <div className="relative inline-block max-w-full">
              <h3 className={`text-lg font-display font-bold leading-tight tracking-tight mb-1 truncate transition-all duration-500 ${block.completed ? 'text-surface-400' : ''}`}>
                {block.title}
              </h3>
              
              {/* Strike-through Animation */}
              <AnimatePresence>
                {block.completed && (
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    exit={{ width: 0 }}
                    className="absolute top-[55%] left-0 h-1 bg-surface-400 z-10 rounded-full"
                  />
                )}
              </AnimatePresence>
            </div>

            {block.originalTitle && block.originalTitle !== block.title && !block.completed && (
              <p className="text-meta text-brand-600 bg-brand-50 w-fit px-2 py-0.5 rounded-full border border-brand-200 mb-2">
                {block.originalTitle}
              </p>
            )}
            <p className="text-sm font-medium opacity-80">{block.description}</p>

            <div className="mt-4 grid gap-3">
              <DetailRow
                icon={<Zap className="w-3.5 h-3.5" />}
                label={block.type === 'break' ? 'Break Plan' : 'What To Do'}
                value={block.specific_action || fallbackAction(block)}
              />
              <DetailRow
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
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
                  icon={<MessageSquareWarning className="w-3.5 h-3.5" />}
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
                    className="text-meta px-2 py-1 rounded-full bg-white/60 border border-current/10"
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
                className="inline-flex items-center gap-1.5 mt-3 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 transition-colors bg-white/50 hover:bg-white px-3 py-1.5 rounded-xl border-2 border-brand-100 hover:border-brand-300 shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                View on Canvas
              </a>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {block.status === 'pending' ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onFeedback?.(block, 'accept');
                  }}
                  className="p-2.5 bg-brand-500 text-white rounded-xl shadow-lg shadow-brand-500/20 active:scale-90 transition-all"
                  title="Confirm"
                >
                  <ThumbsUp className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeconstruct(block.id);
                  }}
                  className="p-2.5 bg-surface-100 text-surface-500 rounded-xl active:scale-90 transition-all hover:bg-red-50 hover:text-red-500"
                  title="Reject"
                >
                  <Scissors className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete();
                  }}
                  className={`p-2.5 rounded-xl transition-all active:scale-90 border-2 ${
                    block.completed 
                      ? 'bg-green-500 border-green-500 text-white shadow-lg shadow-green-500/20' 
                      : 'bg-white border-surface-200 text-surface-400 hover:border-brand-500 hover:text-brand-500'
                  }`}
                >
                  <Zap className={`w-4 h-4 ${block.completed ? 'fill-current' : ''}`} />
                </button>
                
                {!block.completed && block.type === 'focus' && block.duration > 40 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeconstruct(block.id);
                    }}
                    className="p-2.5 hover:bg-white/30 rounded-xl transition-colors group/btn bg-white/10"
                    title="Break down task"
                  >
                    <Scissors className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Progress Indicator (Simulated) */}
        {block.type === 'focus' && !block.completed && (
          <div className="absolute bottom-0 left-0 h-1.5 bg-accent-500/20 rounded-full overflow-hidden w-full">
            <motion.div 
              className="h-full bg-accent-500"
              initial={{ width: 0 }}
              animate={{ width: "30%" }}
            />
          </div>
        )}

        {!block.completed && onFeedback && (
          <div className="mt-4 pt-3 border-t border-current/10 flex flex-wrap gap-2">
            <FeedbackButton label="Looks Good" onClick={() => onFeedback(block, 'accept')} icon={<ThumbsUp className="w-3 h-3" />} />
            <FeedbackButton label="Too Vague" onClick={() => onFeedback(block, 'too_vague')} />
            <FeedbackButton label="Wrong Time" onClick={() => onFeedback(block, 'wrong_time')} />
            {block.type === 'break' && (
              <FeedbackButton label="Too Many Breaks" onClick={() => onFeedback(block, 'too_many_breaks')} />
            )}
          </div>
        )}
      </Reorder.Item>
    </motion.div>
  );
}

function DetailRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <span className="mt-0.5 opacity-70 shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-meta opacity-60 mb-1">{label}</p>
        <p className="text-sm font-medium leading-snug opacity-90">{value}</p>
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
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white border border-current/10 text-meta transition-colors"
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
