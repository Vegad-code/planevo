'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { 
  Package, ChevronDown, ChevronUp, Zap, Clock, 
  ArrowRight, Rocket, GripVertical, Plus
} from 'lucide-react';
import type { Task } from '@/types/database';

interface CargoBayProps {
  onDockAll: (tasks: Task[]) => void;
  onDockOne: (task: Task) => void;
  isProcessing: boolean;
}

function CargoItem({ task, onDock, index }: { task: Task; onDock: (t: Task) => void; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.05, once: true });

  const energyColor = {
    low: 'bg-green-500/20 text-green-600 border-green-500/30',
    medium: 'bg-amber-500/20 text-amber-600 border-amber-500/30',
    high: 'bg-red-500/20 text-red-600 border-red-500/30',
  }[task.energy_level_required || 'medium'];

  return (
    <motion.div
      ref={ref}
      draggable
      onDragStart={(e: any) => {
        // We set the drag data to the task JSON so the drop target knows what task it is
        e.dataTransfer.setData('application/json', JSON.stringify(task));
        e.dataTransfer.effectAllowed = 'move';
        
        // Optional: create a drag image or just rely on default element dragging
        e.currentTarget.style.opacity = '0.5';
      }}
      onDragEnd={(e: any) => {
        e.currentTarget.style.opacity = '1';
      }}
      initial={{ scale: 0.95, opacity: 0, y: 8 }}
      animate={inView ? { scale: 1, opacity: 1, y: 0 } : { scale: 0.95, opacity: 0, y: 8 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.02, 0.15) }}
      className="group flex items-center gap-3 p-3 bg-white rounded-2xl border-2 border-surface-100 hover:border-brand-300 transition-all hover:shadow-md cursor-grab active:cursor-grabbing"
    >
      <GripVertical className="w-4 h-4 text-surface-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-black uppercase tracking-tight text-surface-900 truncate">
          {task.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          {task.estimated_minutes && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-surface-400">
              <Clock className="w-3 h-3" />
              {task.estimated_minutes}m
            </span>
          )}
          <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full border ${energyColor}`}>
            {task.energy_level_required || 'med'}
          </span>
          {task.due_date && (
            <span className="text-[10px] font-bold text-surface-400">
              Due {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      
      <button
        onClick={() => onDock(task)}
        className="p-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-all active:scale-90 opacity-0 group-hover:opacity-100 border border-brand-200"
        title="Send to Schedule"
      >
        <ArrowRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function CargoBay({ onDockAll, onDockOne, isProcessing }: CargoBayProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const supabase = createClient();

  const loadUnscheduledTasks = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    
    if (data) setTasks(data as Task[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadUnscheduledTasks();
  }, [loadUnscheduledTasks]);

  const handleDockOne = (task: Task) => {
    onDockOne(task);
    // Optimistically remove from Cargo Bay
    setTasks(prev => prev.filter(t => t.id !== task.id));
  };

  const handleDockAll = () => {
    if (tasks.length === 0) return;
    onDockAll(tasks);
    // Optimistically clear
    setTasks([]);
  };

  const unscheduledCount = tasks.length;

  return (
    <div className="bg-white border-4 border-surface-900 rounded-[2rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 bg-surface-50/80 border-b border-surface-100 hover:bg-surface-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-900 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest">
              Cargo Bay
            </h3>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              {unscheduledCount} task{unscheduledCount !== 1 ? 's' : ''} waiting for deployment
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {unscheduledCount > 0 && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand-600 text-white text-[10px] font-black">
              {unscheduledCount}
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-surface-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-surface-400" />
          )}
        </div>
      </button>

      {/* Body */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto no-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : tasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-bold text-surface-400">Cargo Bay is clear! ✅</p>
                  <p className="text-[10px] text-surface-300 mt-1">
                    All tasks are docked or completed.
                  </p>
                </div>
              ) : (
                tasks.map((task, i) => (
                  <CargoItem
                    key={task.id}
                    task={task}
                    onDock={handleDockOne}
                    index={i}
                  />
                ))
              )}
            </div>
            
            {/* Auto-Dock Button */}
            {tasks.length > 0 && (
              <div className="p-4 pt-0">
                <button
                  onClick={handleDockAll}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-surface-900 hover:bg-surface-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Rocket className="w-4 h-4" />
                  {isProcessing ? 'Docking...' : `Auto-Dock All (${unscheduledCount})`}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
