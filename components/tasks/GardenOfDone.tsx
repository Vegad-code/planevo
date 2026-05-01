'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Task, TaskPriority } from '@/types/database';
import { PRIORITY_COLORS } from '@/lib/taskHelpers';

interface GardenOfDoneProps {
  completedTasks: Task[];
}

const Plant = ({ task, index }: { task: Task; index: number }) => {
  // Deterministic "seed" based on ID
  const seed = task.id.split('-')[0];
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const size = Math.min(60, Math.max(30, (task.estimated_minutes || 30) / 2));
  const color = PRIORITY_COLORS[task.priority as TaskPriority] || '#4ECDC4';
  
  // Geometric variants
  const variant = hash % 4;
  
  return (
    <motion.div
      initial={{ scale: 0, y: 20 }}
      animate={{ scale: 1, y: 0 }}
      transition={{ delay: index * 0.1, type: 'spring', stiffness: 100 }}
      className="relative flex flex-col items-center group"
    >
      <div className="relative cursor-help" title={task.title}>
        <svg width={size * 1.5} height={size * 2} viewBox="0 0 100 150" fill="none">
          {variant === 0 && (
            <>
              <rect x="45" y="80" width="10" height="70" fill="#333" />
              <rect x="25" y="30" width="50" height="50" fill={color} className="opacity-80" />
              <rect x="35" y="10" width="30" height="30" fill={color} />
            </>
          )}
          {variant === 1 && (
            <>
              <rect x="48" y="60" width="4" height="90" fill="#333" />
              <circle cx="50" cy="50" r="40" fill={color} className="opacity-60" />
              <circle cx="50" cy="50" r="20" fill={color} />
            </>
          )}
          {variant === 2 && (
            <>
              <path d="M50 150L50 60" stroke="#333" strokeWidth="8" />
              <path d="M10 60L50 10L90 60H10Z" fill={color} />
              <rect x="30" y="70" width="40" height="10" fill={color} className="opacity-50" />
            </>
          )}
          {variant === 3 && (
            <>
              <rect x="45" y="100" width="10" height="50" fill="#333" />
              <rect x="20" y="20" width="60" height="80" fill={color} className="opacity-70" transform="rotate(45 50 60)" />
              <circle cx="50" cy="60" r="15" fill={color} />
            </>
          )}
        </svg>
      </div>
      <div className="opacity-0 group-hover:opacity-100 absolute -bottom-8 bg-[#1e1e1e] border border-border px-2 py-1 text-[10px] whitespace-nowrap z-10 transition-opacity">
        {task.title}
      </div>
    </motion.div>
  );
};

export default function GardenOfDone({ completedTasks }: GardenOfDoneProps) {
  const recentCompleted = completedTasks
    .filter(t => t.completed)
    .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
    .slice(0, 12);

  if (recentCompleted.length === 0) return null;

  return (
    <div className="mt-12 pt-8 border-t-2 border-border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-[#888]">Garden of Done</h2>
          <p className="text-xs text-[#555] mt-1">Abstract roots of your recent growth.</p>
        </div>
      </div>
      
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-12 py-8 bg-[#1a1a1a]/30 border-2 border-dashed border-border/50 min-h-[200px]">
        {recentCompleted.map((task, i) => (
          <Plant key={task.id} task={task} index={i} />
        ))}
      </div>
    </div>
  );
}
