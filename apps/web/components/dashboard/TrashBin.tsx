'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { 
  Trash2, RotateCcw, XCircle, AlertCircle,
  ChevronDown, ChevronUp
} from 'lucide-react';
import type { Task } from '@/types/database';
import { useTaskActions } from '@/hooks/useTaskActions';

export default function TrashBin() {
  const [deletedTasks, setDeletedTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const supabase = createClient();
  const loadTrash = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch soft-deleted tasks
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (data) {
      const fourDaysAgo = new Date();
      fourDaysAgo.setDate(fourDaysAgo.getDate() - 4);
      
      const recentDeleted = data.filter(t => t.deleted_at && new Date(t.deleted_at) > fourDaysAgo);
      setDeletedTasks(recentDeleted);
    }
    setLoading(false);
  }, [supabase]);

  const { restoreTask, permanentlyDeleteTask } = useTaskActions(() => loadTrash());

  useEffect(() => {
    requestAnimationFrame(() => {
      void loadTrash();
    });
  }, [loadTrash]);

  if (loading || (deletedTasks.length === 0 && !expanded)) return null;

  return (
    <div className="bg-white border-4 border-surface-900 rounded-[2rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 bg-red-50/50 border-b border-surface-100 hover:bg-red-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-200">
            <Trash2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-black text-surface-900 uppercase tracking-widest">
              Recovery Bay
            </h3>
            <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wide">
              {deletedTasks.length} task{deletedTasks.length !== 1 ? 's' : ''} in containment
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {deletedTasks.length > 0 && (
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-600 text-white text-[10px] font-black">
              {deletedTasks.length}
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
            <div className="p-4 space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {deletedTasks.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm font-bold text-surface-300">Recovery Bay is empty.</p>
                </div>
              ) : (
                deletedTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-surface-100 group hover:border-brand-300 transition-all shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-surface-900 truncate">
                        {task.title}
                      </h4>
                      <p className="text-[10px] font-medium text-surface-400 uppercase">
                        Deleted {new Date(task.deleted_at!).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => restoreTask(task.id)}
                        className="p-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 border border-brand-200 transition-all"
                        title="Restore Task"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Permanently delete this task? This cannot be undone.')) {
                            permanentlyDeleteTask(task.id);
                          }
                        }}
                        className="p-2 rounded-xl bg-surface-50 text-surface-400 hover:bg-red-50 hover:text-red-600 border border-surface-100 transition-all"
                        title="Delete Permanently"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}

              <div className="mt-4 p-3 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                  Deleted tasks are kept in recovery for 4 days before automated deep-space disposal.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
