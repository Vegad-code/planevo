'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { 
  CheckCircle2, History, Archive, RotateCcw, 
  ChevronDown, ChevronUp, Calendar, Trophy,
  Rocket
} from 'lucide-react';
import type { Task } from '@/types/database';
import { useTaskActions } from '@/hooks/useTaskActions';

export default function TaskHistory() {
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showFullArchive, setShowFullArchive] = useState(false);
  const supabase = createClient();
  const { toggleComplete } = useTaskActions(() => loadHistory());

  const loadHistory = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch all completed tasks that aren't soft-deleted
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', true)
      .is('deleted_at', null)
      .order('completed_at', { ascending: false });
    
    if (data) {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);

      const recent = data.filter(t => t.completed_at && new Date(t.completed_at) > fourDaysAgo);
      const archived = data.filter(t => t.completed_at && new Date(t.completed_at) <= fourDaysAgo);

      setRecentTasks(recent);
      setArchivedTasks(archived);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (loading) return null;

  const totalCompleted = recentTasks.length + archivedTasks.length;

  return (
    <div className="bg-white border-4 border-surface-900 rounded-[2rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 bg-green-50/50 border-b border-surface-100 hover:bg-green-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center shadow-lg shadow-green-200">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest">
              Mission Progress
            </h3>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              {recentTasks.length} deployed in last 4 days • {totalCompleted} total
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {recentTasks.length > 0 && (
            <span className="flex items-center justify-center px-2 py-1 rounded-full bg-green-600 text-white text-[10px] font-black uppercase tracking-tighter">
              +{recentTasks.length} Recent
            </span>
          )}
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-surface-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-surface-400" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto no-scrollbar">
              
              {/* Recent Progress Section */}
              <section>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Rocket className="w-4 h-4 text-brand-500" />
                  <h4 className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
                    Recent Deployments (4 Days)
                  </h4>
                </div>
                
                {recentTasks.length === 0 ? (
                  <div className="py-4 text-center border-2 border-dashed border-surface-100 rounded-2xl">
                    <p className="text-[10px] font-bold text-surface-300 uppercase">No recent activity detected</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentTasks.map((task) => (
                      <div 
                        key={task.id}
                        className="flex items-center gap-3 p-3 bg-surface-50 rounded-2xl border border-surface-100 group hover:border-green-200 transition-all"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-bold text-surface-900 truncate">
                            {task.title}
                          </h4>
                          <p className="text-[10px] font-medium text-surface-400 uppercase">
                            Completed {new Date(task.completed_at!).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleComplete(task.id, true)}
                          className="p-2 rounded-xl bg-white text-surface-400 hover:text-brand-600 border border-surface-100 opacity-0 group-hover:opacity-100 transition-all"
                          title="Undo Completion"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Archive Section */}
              {archivedTasks.length > 0 && (
                <section>
                  <button 
                    onClick={() => setShowFullArchive(!showFullArchive)}
                    className="w-full flex items-center justify-between p-3 bg-surface-100/50 rounded-2xl hover:bg-surface-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Archive className="w-4 h-4 text-surface-400" />
                      <h4 className="text-[10px] font-black text-surface-500 uppercase tracking-widest text-left">
                        Mission Archives ({archivedTasks.length})
                      </h4>
                    </div>
                    {showFullArchive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {showFullArchive && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-2 space-y-2"
                      >
                        {archivedTasks.map((task) => (
                          <div 
                            key={task.id}
                            className="flex items-center gap-3 p-2 px-3 bg-white border border-surface-100 rounded-xl opacity-60 hover:opacity-100 transition-opacity"
                          >
                            <History className="w-4 h-4 text-surface-300" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-surface-700 truncate">
                                {task.title}
                              </h4>
                            </div>
                            <span className="text-[9px] font-bold text-surface-300 uppercase">
                              {new Date(task.completed_at!).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
