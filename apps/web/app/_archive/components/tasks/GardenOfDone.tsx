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
      initial={{ scale: 0, y: 40, rotate: -10 }}
      animate={{ scale: 1, y: 0, rotate: 0 }}
      whileHover={{ 
        scale: 1.1, 
        rotate: [0, -2, 2, 0],
        transition: { duration: 0.3 } 
      }}
      transition={{ 
        delay: index * 0.08, 
        type: 'spring', 
        stiffness: 120, 
        damping: 12 
      }}
      className="relative flex flex-col items-center group"
    >
      <div className="relative cursor-help" title={task.title}>
        <motion.div
          animate={{ 
            y: [0, -4, 0],
            rotate: [0, 1, -1, 0]
          }}
          transition={{ 
            duration: 4 + (hash % 3), 
            repeat: Infinity, 
            ease: "easeInOut" 
          }}
        >
          <svg width={size * 1.5} height={size * 2} viewBox="0 0 100 150" fill="none" className="drop-shadow-lg">
            {variant === 0 && (
              <>
                <motion.rect 
                  initial={{ height: 0 }} 
                  animate={{ height: 70 }} 
                  x="45" y="80" width="10" fill="#3A3A3A" 
                />
                <motion.rect 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  x="25" y="30" width="50" height="50" fill={color} className="opacity-80" 
                />
                <motion.rect 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: index * 0.1 + 0.2 }}
                  x="35" y="10" width="30" height="30" fill={color} 
                />
              </>
            )}
            {variant === 1 && (
              <>
                <motion.rect 
                  initial={{ height: 0 }} 
                  animate={{ height: 90 }} 
                  x="48" y="60" width="4" fill="#3A3A3A" 
                />
                <motion.circle 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  cx="50" cy="50" r="40" fill={color} className="opacity-60" 
                />
                <motion.circle 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: index * 0.1 + 0.2 }}
                  cx="50" cy="50" r="20" fill={color} 
                />
              </>
            )}
            {variant === 2 && (
              <>
                <motion.path 
                  initial={{ pathLength: 0 }} 
                  animate={{ pathLength: 1 }} 
                  d="M50 150L50 60" stroke="#3A3A3A" strokeWidth="8" 
                />
                <motion.path 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  d="M10 60L50 10L90 60H10Z" fill={color} 
                />
                <motion.rect 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: index * 0.1 + 0.2 }}
                  x="30" y="70" width="40" height="10" fill={color} className="opacity-50" 
                />
              </>
            )}
            {variant === 3 && (
              <>
                <motion.rect 
                  initial={{ height: 0 }} 
                  animate={{ height: 50 }} 
                  x="45" y="100" width="10" fill="#3A3A3A" 
                />
                <motion.rect 
                  initial={{ scale: 0, rotate: 0 }} 
                  animate={{ scale: 1, rotate: 45 }} 
                  x="20" y="20" width="60" height="80" fill={color} className="opacity-70" transform="rotate(45 50 60)" 
                />
                <motion.circle 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ delay: index * 0.1 + 0.2 }}
                  cx="50" cy="60" r="15" fill={color} 
                />
              </>
            )}
          </svg>
        </motion.div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-surface-900 text-white border border-surface-700 px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap z-20 transition-all transform translate-y-2 group-hover:translate-y-0 shadow-xl pointer-events-none">
        {task.title}
        <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-900 rotate-45 border-r border-b border-surface-700"></div>
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
