'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, Reorder, AnimatePresence, useInView } from 'framer-motion';
import { format, addMinutes, startOfDay, differenceInMinutes } from 'date-fns';
import { Clock, Zap, Coffee, Calendar, Lock, Scissors } from 'lucide-react';

interface ScheduleBlock {
  id: string;
  time: string;
  title: string;
  type: 'focus' | 'break' | 'event' | 'constraint' | 'buffer';
  duration: number;
  description: string;
  originalTitle?: string;
}

interface ScheduleTimelineProps {
  initialBlocks: ScheduleBlock[];
  onUpdate: (blocks: ScheduleBlock[]) => void;
  onDeconstruct: (blockId: string) => void;
}

export default function ScheduleTimeline({ initialBlocks, onUpdate, onDeconstruct }: ScheduleTimelineProps) {
  const [blocks, setBlocks] = useState(initialBlocks);

  useEffect(() => {
    setBlocks(initialBlocks);
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

  const getTypeStyles = (type: string) => {
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

function ScheduleBlockItem({ block, index, onDeconstruct, onToggleComplete }: { block: any, index: number, onDeconstruct: (id: string) => void, onToggleComplete: () => void }) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.05, once: true });

  const getTypeStyles = (type: string, completed?: boolean) => {
    if (completed) return 'border-surface-200 bg-surface-50 text-surface-400 opacity-60';

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
        className={`relative group cursor-grab active:cursor-grabbing p-5 rounded-3xl border-2 transition-all duration-500 ${getTypeStyles(block.type, block.completed)}`}
      >
        {/* Time Marker on Axis */}
        <div className="absolute -left-16 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <span className="text-[10px] font-black text-surface-400 uppercase tracking-tighter w-12 text-right">
            {block.time}
          </span>
          <div className={`w-3 h-3 rounded-full border-2 transition-all z-10 ${block.completed ? 'bg-green-500 border-green-500' : 'bg-white border-surface-200 group-hover:border-brand-500'}`} />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 relative">
            <div className="flex items-center gap-2 mb-1.5">
              {getTypeIcon(block.type)}
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">
                {block.type} • {block.duration}m
              </span>
            </div>
            
            <div className="relative inline-block max-w-full">
              <h3 className={`text-xl font-black uppercase leading-tight tracking-tight mb-1 truncate transition-all duration-500 ${block.completed ? 'text-surface-400' : ''}`}>
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
              <p className="text-[10px] font-black uppercase text-brand-600 bg-brand-50 w-fit px-2 py-0.5 rounded-full border border-brand-200 mb-2">
                {block.originalTitle}
              </p>
            )}
            <p className="text-sm font-medium opacity-80 line-clamp-1">{block.description}</p>
          </div>

          <div className="flex flex-col gap-2">
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
                title="Shatter (Deconstruct)"
              >
                <Scissors className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
              </button>
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
      </Reorder.Item>
    </motion.div>
  );
}
