'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { showToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Target, 
  Timer, 
  Sparkles, 
  X, 
  ChevronRight,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import OllieAvatar from '../ollie/OllieAvatar';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import { useFocusStore } from '@/store/useFocusStore';
import type { Task } from '@/types/database';

// Modularized Daily Plan Logic
interface DailyPlanItem {
  id: string;
  title: string;
  reason: string;
}

interface DailyPlanData {
  plan: DailyPlanItem[];
  message: string;
  plan_name: string;
  vibe: string;
  focus_score: number;
}

export default function CommandCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'menu' | 'daily-plan' | 'add-task' | 'add-project' | 'start-focus'>('menu');
  const [energy, setEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DailyPlanData | null>(null);
  
  // Inline Form States
  const [taskTitle, setTaskTitle] = useState('');
  const [taskEst, setTaskEst] = useState(30);
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDeadline, setProjectDeadline] = useState('');
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const focusStore = useFocusStore();

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    setMode('menu');
    setPlan(null);
    resetForms();
  };

  const resetForms = () => {
    setTaskTitle('');
    setTaskEst(30);
    setProjectTitle('');
    setProjectDeadline('');
    setSelectedTaskId('');
  };

  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('completed', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) setAvailableTasks(data as Task[]);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    setLoading(true);
    try {
      const { user } = await ensureUserProfile(supabase);
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase.from('tasks').insert({
        user_id: user.id,
        title: taskTitle.trim(),
        estimated_minutes: taskEst,
        energy_level_required: 'medium',
        status: 'todo',
        priority: 'medium'
      });
      if (error) throw error;
      
      toggleOpen();
      router.refresh(); // Refresh dashboard to show new task
      showToast.success('Task Added', `"${taskTitle.trim()}" is now in your task list.`);
    } catch (err) {
      console.error(err);
      showToast.error('Action Failed', 'Failed to add task to the list.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectTitle.trim()) return;
    setLoading(true);
    try {
      const { user } = await ensureUserProfile(supabase);
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title: projectTitle.trim(),
        deadline: projectDeadline || null,
        status: 'active'
      });
      if (error) throw error;

      toggleOpen();
      router.refresh();
      showToast.success('Project Created', `"${projectTitle.trim()}" is now active.`);
    } catch (err) {
      console.error(err);
      showToast.error('Creation Failed', 'Failed to create the project.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartFocus = () => {
    const task = availableTasks.find(t => t.id === selectedTaskId);
    if (task) {
      focusStore.setActiveTask(task);
      focusStore.startTimer(task.estimated_minutes || 25);
      router.push('/dashboard/focus');
      toggleOpen();
    }
  };

  const generatePlan = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/daily-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ energyLevel: energy }),
      });
      const data = await res.json();
      setPlan({
        ...data,
        plan_name: data.schedule_name // Map API schedule_name to internal plan_name
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const menuActions = [
    { 
      label: 'Add New Task', 
      icon: <CheckCircle2 className="w-5 h-5" />, 
      mode: 'add-task' as const, 
      color: 'bg-brand-500' 
    },
    { 
      label: 'Start Project', 
      icon: <Target className="w-5 h-5" />, 
      mode: 'add-project' as const, 
      color: 'bg-accent-500' 
    },
    { 
      label: 'Start Focus', 
      icon: <Timer className="w-5 h-5" />, 
      mode: 'start-focus' as const, 
      color: 'bg-info',
      onClick: fetchTasks 
    },
  ];

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleOpen}
              className="fixed inset-0 bg-surface-900/40 backdrop-blur-sm"
            />

            {/* Expanded Content */}
            <motion.div
              layoutId="fab-container"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              className={`absolute bottom-0 right-0 origin-bottom-right overflow-hidden ${
                ['daily-plan', 'add-task', 'add-project', 'start-focus'].includes(mode) ? 'w-[400px]' : 'w-72'
              } bg-white border-4 border-surface-900 shadow-[12px_12px_0_0_#22201e] rounded-[2.5rem]`}
            >
              {mode === 'menu' ? (
                <div className="p-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black uppercase tracking-tighter text-xl">Planning Tools</h3>
                    <button onClick={toggleOpen} className="p-2 hover:bg-surface-100 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuActions.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => {
                          setMode(action.mode);
                          action.onClick?.();
                        }}
                        className="w-full group flex items-center justify-between p-4 border-2 border-surface-900 bg-white hover:bg-surface-50 transition-all hover:-translate-y-1 active:translate-y-0 shadow-[4px_4px_0_0_#22201e] hover:shadow-[6px_6px_0_0_#22201e]"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`p-2 rounded-xl text-white ${action.color}`}>
                            {action.icon}
                          </span>
                          <span className="font-black uppercase tracking-tight text-sm">{action.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>

                  <div className="pt-4 border-t-2 border-surface-100">
                    <button
                      onClick={() => setMode('daily-plan')}
                      className="w-full flex items-center justify-center gap-3 p-5 bg-surface-900 text-white font-black uppercase tracking-widest text-sm border-2 border-surface-900 hover:bg-surface-800 transition-all shadow-[6px_6px_0_0_#ff6b00] active:shadow-none active:translate-x-1 active:translate-y-1"
                    >
                      <Sparkles className="w-5 h-5 text-accent-500" />
                      Generate Daily Plan
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <button onClick={() => setMode('menu')} className="text-xs font-black uppercase text-surface-400 hover:text-surface-900 flex items-center gap-1 transition-colors">
                      <ChevronRight className="w-4 h-4 rotate-180" /> Back
                    </button>
                    <button onClick={toggleOpen} className="p-2 hover:bg-surface-100 rounded-full transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {mode === 'add-task' && (
                    <form onSubmit={handleAddTask} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div>
                        <h4 className="font-black uppercase tracking-tighter text-2xl">Create Task</h4>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1 italic">Adding to your task list</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Task Title</label>
                          <input 
                            autoFocus
                            value={taskTitle}
                            onChange={(e) => setTaskTitle(e.target.value)}
                            placeholder="e.g. Study for biology midterm"
                            className="w-full p-4 border-2 border-surface-900 rounded-xl font-bold placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Est. Time (min)</label>
                            <div className="relative">
                              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                              <input 
                                type="number"
                                value={taskEst}
                                onChange={(e) => setTaskEst(parseInt(e.target.value))}
                                className="w-full pl-10 pr-4 py-4 border-2 border-surface-900 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                            </div>
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              disabled={loading || !taskTitle}
                              className="w-full py-4 bg-brand-600 text-white border-2 border-surface-900 rounded-xl font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_0_#22201e] hover:bg-brand-500 disabled:opacity-50 transition-all"
                            >
                              {loading ? 'Saving...' : 'Save Task'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </form>
                  )}

                  {mode === 'add-project' && (
                    <form onSubmit={handleAddProject} className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div>
                        <h4 className="font-black uppercase tracking-tighter text-2xl text-accent-600">Start Project</h4>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1 italic">Define your next big objective</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Project Scope</label>
                          <input 
                            autoFocus
                            value={projectTitle}
                            onChange={(e) => setProjectTitle(e.target.value)}
                            placeholder="e.g. Build a SaaS MVP, Lose 20lbs"
                            className="w-full p-4 border-2 border-surface-900 rounded-xl font-bold placeholder-surface-300 focus:outline-none focus:ring-2 focus:ring-accent-500"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Target Deadline</label>
                          <input 
                            type="date"
                            value={projectDeadline}
                            onChange={(e) => setProjectDeadline(e.target.value)}
                            className="w-full p-4 border-2 border-surface-900 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-accent-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={loading || !projectTitle}
                          className="w-full py-5 bg-accent-600 text-white border-2 border-surface-900 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[6px_6px_0_0_#22201e] hover:bg-accent-500 disabled:opacity-50 transition-all"
                        >
                          {loading ? 'Saving...' : 'Start Project'}
                        </button>
                      </div>
                    </form>
                  )}

                  {mode === 'start-focus' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                      <div>
                        <h4 className="font-black uppercase tracking-tighter text-2xl text-info">Deep Focus</h4>
                        <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest mt-1 italic">Minimizing distractions</p>
                      </div>

                      <div className="space-y-4">
                        {availableTasks.length > 0 ? (
                          <>
                            <label className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-1.5 block">Select Task for Focus</label>
                            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                              {availableTasks.map(task => (
                                <button
                                  key={task.id}
                                  onClick={() => setSelectedTaskId(task.id)}
                                  className={`w-full p-4 border-2 text-left transition-all rounded-xl ${
                                    selectedTaskId === task.id
                                      ? 'border-info bg-info/10 shadow-none translate-x-1 translate-y-1'
                                      : 'border-surface-900 bg-white shadow-[4px_4px_0_0_#22201e] hover:-translate-y-0.5'
                                  }`}
                                >
                                  <h5 className="font-bold text-sm">{task.title}</h5>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-surface-400" />
                                    <span className="text-[10px] font-black text-surface-500">{task.estimated_minutes}m</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={handleStartFocus}
                              disabled={!selectedTaskId}
                              className="w-full py-5 bg-info text-white border-2 border-surface-900 rounded-2xl font-black uppercase tracking-widest text-sm shadow-[6px_6px_0_0_#22201e] hover:bg-blue-600 disabled:opacity-50 transition-all"
                            >
                              Start Focus Mode →
                            </button>
                          </>
                        ) : (
                          <div className="text-center py-8">
                            <OllieAvatar mood="thinking" size="sm" />
                            <p className="mt-4 text-xs font-bold text-surface-500 uppercase tracking-widest">No active tasks found</p>
                            <button
                              onClick={() => setMode('add-task')}
                              className="mt-4 text-[10px] font-black uppercase text-brand-600 hover:underline"
                            >
                              Create a task first
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {mode === 'daily-plan' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                      <div className="text-center">
                        <OllieAvatar mood="thinking" size="md" />
                        <h4 className="mt-4 font-black uppercase tracking-tighter text-2xl">Daily Plan</h4>
                        <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mt-1 italic">Ready for optimization</p>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-surface-400 text-center">Select Current Energy Level</p>
                        <div className="grid grid-cols-3 gap-3">
                          {(['low', 'medium', 'high'] as const).map((e) => (
                            <button
                              key={e}
                              onClick={() => setEnergy(e)}
                              className={`py-6 border-2 border-surface-900 flex flex-col items-center gap-1 transition-all rounded-2xl ${
                                energy === e 
                                  ? 'bg-accent-500 text-surface-900 shadow-none translate-x-1 translate-y-1' 
                                  : 'bg-white text-surface-900 shadow-[4px_4px_0_0_#22201e] hover:-translate-y-0.5'
                              }`}
                            >
                              <span className="text-2xl">
                                {e === 'low' && '🐌'}
                                {e === 'medium' && '🏃'}
                                {e === 'high' && '⚡'}
                              </span>
                              <span className="text-[10px] font-black uppercase">{e}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={generatePlan}
                        disabled={loading}
                        className="w-full py-5 bg-surface-900 text-white font-black uppercase tracking-widest text-sm border-2 border-surface-900 hover:bg-surface-800 transition-all shadow-[6px_6px_0_0_#ff6b00] active:shadow-none active:translate-x-1 active:translate-y-1 disabled:opacity-50 rounded-2xl"
                      >
                        {loading ? 'Building Plan...' : 'Generate Daily Plan'}
                      </button>
                    </div>
                  )}

                  {mode === 'daily-plan' && plan && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 mt-6">
                      <div className="bg-surface-900 text-white p-5 rounded-2xl border-2 border-surface-900 shadow-[6px_6px_0_0_#ff6b00]">
                        <span className="text-[10px] font-black uppercase text-accent-500 tracking-widest">Active Plan</span>
                        <h3 className="text-2xl font-black uppercase tracking-tighter mt-1">{plan.plan_name}</h3>
                        <p className="text-[10px] font-bold text-surface-400 uppercase italic mt-1">Suggested Plan</p>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {plan.plan.map((item, idx) => (
                          <div key={idx} className="p-4 border-2 border-surface-900 bg-white rounded-xl shadow-[4px_4px_0_0_#22201e]">
                            <h5 className="font-black uppercase text-xs text-brand-600 mb-1">Step 0{idx + 1}</h5>
                            <h4 className="font-black uppercase text-sm">{item.title}</h4>
                            <p className="text-[10px] font-medium text-surface-500 mt-1">{item.reason}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setPlan(null)}
                          className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-surface-400 hover:text-surface-900 transition-colors"
                        >
                          Adjust Plan
                        </button>
                        <button
                          onClick={() => {
                            router.push('/dashboard/daily-plan');
                            toggleOpen();
                          }}
                          className="flex-[2] py-4 bg-brand-600 text-white border-2 border-surface-900 rounded-xl font-black uppercase tracking-widest text-xs shadow-[4px_4px_0_0_#22201e] hover:bg-brand-500 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                        >
                          Start Plan →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        layoutId="fab-container"
        onClick={toggleOpen}
        whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(255, 130, 130, 0.3)' }}
        whileTap={{ scale: 0.95 }}
        className={`w-20 h-20 rounded-full flex items-center justify-center border-4 border-surface-900 shadow-[8px_8px_0_0_#22201e] transition-all relative overflow-hidden ${
          isOpen ? 'bg-surface-900 text-white' : 'bg-[#ff7a7a] text-white hover:bg-[#ff6b6b]'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 135 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <Plus className="w-10 h-10" strokeWidth={3} />
        </motion.div>
      </motion.button>
    </div>
  );
}
