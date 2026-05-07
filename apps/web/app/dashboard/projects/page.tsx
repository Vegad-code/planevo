'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ensureUserProfile } from '@/lib/supabase/ensure-profile';
import { showToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ClarificationForm } from '@/components/goals/ClarificationForm';
import OllieAvatar from '@/components/ollie/OllieAvatar';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface Blueprint {
  tasks: Array<{
    title: string;
    description: string;
    priority: string;
    estimated_minutes: number;
    day: number;
  }>;
  realism_check?: {
    is_realistic: boolean;
    suggested_timeline?: string | null;
    reasoning: string;
  };
  resources?: Array<{
    title: string;
    url: string;
    description: string;
  }>;
}

interface Project {
  id: string;
  title: string;
  deadline: string | null;
  status: 'active' | 'completed' | 'archived';
  created_at: string;
  blueprint: Blueprint | null;
}

interface SubtaskCount {
  goal_id: string;
  total: number;
  completed: number;
}

const PROJECT_CATEGORIES = [
  {
    name: 'Coding & Tech',
    ideas: [
      { title: 'Build a Portfolio Site', deadline: 14 },
      { title: 'Create a Weather App', deadline: 7 },
      { title: 'Launch a Chrome Extension', deadline: 21 },
      { title: 'Develop a Discord Bot', deadline: 10 },
      { title: 'Build a React Native App', deadline: 30 },
      { title: 'Contribute to Open Source', deadline: 45 },
      { title: 'Master Tailwind CSS', deadline: 14 },
      { title: 'Learn TypeScript Basics', deadline: 14 },
      { title: 'Build a Personal Dashboard', deadline: 20 },
      { title: 'Deploy a Next.js Site', deadline: 5 },
    ]
  },
  {
    name: 'Education',
    ideas: [
      { title: 'Study for SATs/GRE', deadline: 60 },
      { title: 'Learn Calculus I', deadline: 90 },
      { title: 'Master Organic Chemistry', deadline: 120 },
      { title: 'Write a History Thesis', deadline: 30 },
      { title: 'Practice Public Speaking', deadline: 14 },
      { title: 'Learn Italian (Level B1)', deadline: 180 },
      { title: 'Finish Online Specialization', deadline: 45 },
      { title: 'Read 12 Technical Books', deadline: 365 },
      { title: 'Learn Data Structures', deadline: 30 },
      { title: 'Master SQL Queries', deadline: 14 },
    ]
  },
  {
    name: 'Health & Fitness',
    ideas: [
      { title: 'Run a Half Marathon', deadline: 120 },
      { title: '30-Day Yoga Challenge', deadline: 30 },
      { title: 'Complete 75 Hard', deadline: 75 },
      { title: 'Learn Meal Prepping', deadline: 14 },
      { title: 'Build Lean Muscle', deadline: 90 },
      { title: 'Improve Sleep Quality', deadline: 21 },
      { title: 'Daily 10k Steps Streak', deadline: 30 },
      { title: 'Master Handstands', deadline: 60 },
      { title: 'Swim 1 Mile Non-stop', deadline: 90 },
      { title: 'Cycle 100km', deadline: 60 },
    ]
  },
  {
    name: 'Career',
    ideas: [
      { title: 'Network with 20 Recruiters', deadline: 30 },
      { title: 'Optimize LinkedIn Profile', deadline: 3 },
      { title: 'Learn AWS Architecture', deadline: 45 },
      { title: 'Start a Side Hustle', deadline: 60 },
      { title: 'Get PMP Certified', deadline: 120 },
      { title: 'Improve Cold Emailing', deadline: 14 },
      { title: 'Learn Project Management', deadline: 30 },
      { title: 'Build a Personal Brand', deadline: 90 },
      { title: 'Negotiate a Promotion', deadline: 60 },
      { title: 'Transition to AI Engineering', deadline: 180 },
    ]
  }
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTargetDate, setNewTargetDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [userPlan, setUserPlan] = useState<string>('free');
  const [activeCategory, setActiveCategory] = useState(0);

  // Blueprint states
  const [decomposingId, setDecomposingId] = useState<string | null>(null);
  const [architectingId, setArchitectingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [reviewingProject, setReviewingProject] = useState<Project | null>(null);
  const [isClarifying, setIsClarifying] = useState(false);
  const [clarificationData, setClarificationData] = useState<{
    questions: Question[];
    ollieMessage: string;
    type: 'quick' | 'architect';
    project: Project;
  } | null>(null);
  const [subtaskCounts, setSubtaskCounts] = useState<Record<string, SubtaskCount>>({});
  const [isFetchingClarification, setIsFetchingClarification] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchProjects = useCallback(async () => {
    const { data } = await supabase
      .from('goals')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setProjects(data as Project[]);
    setLoading(false);
  }, [supabase]);

  const fetchSubtaskCounts = useCallback(async () => {
    // Get subtask links
    const { data: subtasks } = await supabase
      .from('subtasks')
      .select('goal_id, task_id');

    if (!subtasks || subtasks.length === 0) return;

    const taskIds = subtasks.map(s => s.task_id);
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, completed')
      .in('id', taskIds);

    if (!tasks) return;

    const taskMap = new Map(tasks.map(t => [t.id, t.completed]));
    const counts: Record<string, SubtaskCount> = {};

    for (const s of subtasks) {
      if (!counts[s.goal_id]) {
        counts[s.goal_id] = { goal_id: s.goal_id, total: 0, completed: 0 };
      }
      counts[s.goal_id].total++;
      if (taskMap.get(s.task_id)) {
        counts[s.goal_id].completed++;
      }
    }

    setSubtaskCounts(counts);
  }, [supabase]);

  const fetchUserPlan = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('plan_type')
        .eq('id', user.id)
        .single();
      if (profile?.plan_type) setUserPlan(profile.plan_type);
    }
  }, [supabase]);

  useEffect(() => {
    requestAnimationFrame(() => {
      void fetchProjects();
      void fetchSubtaskCounts();
      void fetchUserPlan();
    });
  }, [fetchProjects, fetchSubtaskCounts, fetchUserPlan]);

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);

    try {
      // Enforce free tier limit
      if (userPlan === 'free') {
        const activeCount = projects.filter(p => p.status === 'active').length;
        if (activeCount >= 1) {
          showToast.warning('Project Limit Reached', 'Free plan is limited to 1 active project. Upgrade to Pro for unlimited projects!');
          setSaving(false);
          return;
        }
      }

      const { user, error: profileError } = await ensureUserProfile(supabase);
      if (profileError || !user) {
        showToast.error('Session Expired', 'Please log in again.');
        return;
      }

      const { error } = await supabase.from('goals').insert({
        user_id: user.id,
        title: newTitle.trim(),
        deadline: newTargetDate || null,
        status: 'active',
      });

      if (error) {
        console.error('Insert error:', JSON.stringify(error, null, 2));
        showToast.error('Creation Failed', error.message || error.details || JSON.stringify(error));
      } else {
        setNewTitle('');
        setNewTargetDate('');
        setShowAddModal(false);
        fetchProjects();
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      showToast.error('Error', 'An unexpected error occurred.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteProject(projectId: string) {
    if (!confirm('Delete this project and all linked tasks?')) return;
    await supabase.from('goals').delete().eq('id', projectId);
    fetchProjects();
  }

  async function toggleProjectStatus(projectId: string, currentStatus: string) {
    const newStatus = currentStatus === 'completed' ? 'active' : 'completed';
    await supabase.from('goals').update({ status: newStatus }).eq('id', projectId);
    fetchProjects();
  }

  async function startClarification(project: Project, type: 'quick' | 'architect') {
    setIsFetchingClarification(true);

    try {
      const response = await fetch('/api/ai/clarify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectTitle: project.title }),
      });

      if (!response.ok) {
        throw new Error(`Clarify API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.questions || data.questions.length === 0) {
        throw new Error('No questions returned');
      }

      setClarificationData({
        questions: data.questions,
        ollieMessage: data.ollie_message || `Let me ask you a few quick questions to personalize your plan for "${project.title}"!`,
        type,
        project
      });
      setIsClarifying(true);
    } catch (err) {
      console.error('Clarification error:', err);
      // Only fall back on network errors, not rate limits
      showToast.error('Ollie hit a snag', 'Had trouble preparing your questions. Please try again.');
    } finally {
      setIsFetchingClarification(false);
    }
  }

  async function architectProject(project: Project, context?: Record<string, string | number | boolean>[]) {
    setArchitectingId(project.id);
    try {
      const response = await fetch('/api/ai/architect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          goalId: project.id, 
          goalTitle: project.title,
          context 
        }),
      });
      const data = await response.json();
      if (data.success) {
        await fetchProjects();
        // Fetch the specific updated project to avoid stale state
        const { data: updatedGoal } = await supabase
          .from('goals')
          .select('*')
          .eq('id', project.id)
          .single();
        if (updatedGoal) setReviewingProject(updatedGoal as Project);
      } else {
        showToast.error('Ollie hit a snag', 'Try again later.');
      }
    } catch (err) {
      console.error(err);
      showToast.error('Connection Error', 'Failed to connect to the Architect.');
    } finally {
      setArchitectingId(null);
    }
  }

  async function decomposeProject(project: Project, context?: Record<string, string | number | boolean>[]) {
    setDecomposingId(project.id);
    try {
      const response = await fetch('/api/ai/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: project.id,
          projectTitle: project.title,
          deadline: project.deadline,
          context
        }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchProjects();
        // Fetch the specific updated project to avoid stale state
        const { data: updatedGoal } = await supabase
          .from('goals')
          .select('*')
          .eq('id', project.id)
          .single();
        if (updatedGoal) setReviewingProject(updatedGoal as Project);
      } else if (data.upgrade) {
        showToast.warning('Pro Feature', 'This feature requires a Pro plan.');
      } else {
        showToast.error('Breakdown Failed', data.error || 'Failed to break down project.');
      }
    } catch (err) {
      console.error(err);
      showToast.error('Connection Error', 'Failed to connect to the Architect.');
    } finally {
      setDecomposingId(null);
    }
  }

  async function importBlueprint(projectId: string) {
    setImportingId(projectId);
    try {
      const response = await fetch('/api/ai/import-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: projectId }),
      });
      const data = await response.json();
      if (data.success) {
        showToast.success('Plan Ready!', 'Your tasks are now in your Daily Plan.');
        setReviewingProject(null);
        // Seamless transition to the Daily Plan to see the new tasks
        setTimeout(() => {
          router.push('/dashboard/daily-plan?launch=true');
        }, 1500);
      } else {
        showToast.error('Import Failed', data.error || 'Failed to import tasks.');
      }
    } catch (err) {
      console.error(err);
      showToast.error('Import Failed', 'Failed to import plan.');
    } finally {
      setImportingId(null);
    }
  }

  function getProgressPercent(projectId: string): number {
    const counts = subtaskCounts[projectId];
    if (!counts || counts.total === 0) return 0;
    return Math.round((counts.completed / counts.total) * 100);
  }

  function getProjectStatus(project: Project): { label: string; color: string } {
    if (project.status === 'completed') return { label: 'Completed', color: 'text-brand-500 bg-brand-500/10' };
    if (project.blueprint) return { label: 'Pending Plan', color: 'text-brand-500 bg-brand-500/10 border border-brand-500 animate-pulse' };
    const counts = subtaskCounts[project.id];
    if (!counts || counts.total === 0) return { label: 'Needs Planning', color: 'text-amber-500 bg-amber-500/10' };
    if (project.deadline) {
      // Use a stable reference for "now" during this render tick to satisfy purity rules
      const now = new Date().getTime();
      const daysLeft = Math.ceil((new Date(project.deadline).getTime() - now) / (1000 * 60 * 60 * 24));
      if (daysLeft < 0) return { label: 'Overdue', color: 'text-red-500 bg-red-500/10' };
      if (daysLeft <= 3) return { label: 'Due Soon', color: 'text-orange-500 bg-orange-500/10' };
    }
    return { label: 'On Track', color: 'text-blue-500 bg-blue-500/10' };
  }

  const isPro = userPlan === 'pro' || userPlan === 'elite' || userPlan === 'team';
  const canAddMore = userPlan !== 'free' || projects.filter(p => p.status === 'active').length < 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-surface-900 uppercase tracking-tight">Projects</h1>
        <button
          id="projects-add-button"
          onClick={() => canAddMore ? setShowAddModal(true) : showToast.warning('Project Limit Reached', 'Free plan is limited to 1 active project. Upgrade to Pro for unlimited projects!')}
          className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200 active:scale-[0.98] flex items-center gap-2 ${
            canAddMore
              ? 'bg-brand-600 hover:bg-brand-500 text-white hover:shadow-[var(--shadow-glow)]'
              : 'bg-surface-300 text-surface-500 cursor-not-allowed'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Free tier limit banner */}
      {userPlan === 'free' && projects.filter(p => p.status === 'active').length >= 1 && (
        <div className="bg-accent-50 border-2 border-accent-200 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-xl">🔒</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-accent-900">Free plan: 1 Active Project</p>
            <p className="text-xs text-accent-700 mt-0.5">Upgrade to Pro to unlock unlimited projects + the Breakdown tool.</p>
          </div>
          <a href="/pricing" className="px-4 py-2 bg-accent-600 text-white text-xs font-black uppercase rounded-xl hover:bg-accent-500 transition-colors">
            Upgrade
          </a>
        </div>
      )}

        {/* Clarification Modal */}
        <AnimatePresence>
          {isClarifying && clarificationData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
            >
              <div className="absolute inset-0 bg-surface-900/60 backdrop-blur-md" onClick={() => setIsClarifying(false)} />
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 20, opacity: 0, scale: 0.95 }}
                className="relative w-full max-w-3xl bg-surface-100 border-4 border-surface-900 shadow-[20px_20px_0_0_rgba(0,0,0,0.2)] rounded-[3rem] p-10 overflow-hidden"
              >
                <ClarificationForm
                  questions={clarificationData.questions}
                  ollieMessage={clarificationData.ollieMessage}
                  isSubmitting={decomposingId !== null || architectingId !== null}
                  onCancel={() => setIsClarifying(false)}
                  onComplete={async (answers) => {
                    if (clarificationData.type === 'quick') {
                      await decomposeProject(clarificationData.project, answers);
                    } else {
                      await architectProject(clarificationData.project, answers);
                    }
                    setIsClarifying(false);
                    setClarificationData(null);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      {loading ? (
        <div className="bg-surface-100 border-2 border-surface-900 rounded-2xl p-12 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface-100 border-2 border-surface-900 shadow-[var(--shadow-color)] rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <OllieAvatar mood="thinking" size="lg" />
          <h2 className="mt-4 text-lg font-semibold text-surface-900 uppercase">No projects yet</h2>
          <p className="mt-2 text-surface-600 text-sm max-w-sm font-medium">
            What&apos;s something big you&apos;d like to achieve? Tell me, and I&apos;ll break it down into a daily roadmap.
          </p>
          <button
            id="projects-empty-add-button"
            onClick={() => setShowAddModal(true)}
            className="mt-6 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl transition-all duration-200 hover:shadow-[var(--shadow-glow)] active:scale-[0.98]"
          >
            + Start your first project
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const progress = getProgressPercent(project.id);
            const status = getProjectStatus(project);
            const counts = subtaskCounts[project.id];

            return (
              <div key={project.id} className="bg-surface-100 border-2 border-surface-900 shadow-[var(--shadow-color)] rounded-2xl p-6 group hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className={`font-bold uppercase ${project.status === 'completed' ? 'line-through text-surface-400' : 'text-surface-900'}`}>
                      {project.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => toggleProjectStatus(project.id, project.status)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        project.status === 'completed'
                          ? 'text-brand-400 bg-brand-500/10'
                          : 'text-slate-500 hover:text-brand-400 hover:bg-brand-500/10'
                      }`}
                      title={project.status === 'completed' ? 'Reactivate' : 'Mark completed'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteProject(project.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                {counts && counts.total > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-surface-500 mb-1.5">
                      <span>Progress</span>
                      <span>{counts.completed}/{counts.total} tasks • {progress}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-surface-200 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-brand-500 to-accent-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}

                {/* Status & Actions */}
                <div className="flex justify-between items-center mt-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.color}`}>{status.label}</span>

                    {project.status !== 'completed' && (
                      <>
                        {project.blueprint ? (
                          <button
                            onClick={() => setReviewingProject(project)}
                            className="text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-500 flex items-center gap-1"
                          >
                            👁️ Review Plan
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => startClarification(project, 'quick')}
                              disabled={isFetchingClarification || decomposingId === project.id}
                              className="flex-1 py-3 bg-white border-2 border-surface-200 hover:border-brand-500 hover:text-brand-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                              {(isFetchingClarification || decomposingId === project.id) ? (
                                <div className="w-3 h-3 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
                              ) : 'Quick Task'}
                            </button>

                            {isPro && (
                              <button
                                onClick={() => startClarification(project, 'architect')}
                                disabled={isFetchingClarification || architectingId === project.id}
                                className="flex-1 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-[0_4px_0_0_var(--brand-900)] active:shadow-none active:translate-y-1 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {(isFetchingClarification || architectingId === project.id) ? (
                                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <span className="text-xs">✨</span>
                                    Architect
                                  </>
                                )}
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {project.deadline && (
                    <span className="text-xs text-slate-500">
                      📅 {new Date(project.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Blueprint Review Modal */}
      <AnimatePresence>
        {reviewingProject && reviewingProject.blueprint && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-start justify-center pt-24 sm:pt-32 px-4 pb-12"
          >
            <div className="absolute inset-0 bg-surface-900/60 backdrop-blur-md" onClick={() => setReviewingProject(null)} />
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="relative w-full max-w-5xl bg-surface-100 border-4 border-surface-900 shadow-[24px_24px_0_0_rgba(0,0,0,0.15)] rounded-[3rem] max-h-[calc(100vh-180px)] flex flex-col overflow-hidden"
            >
              {/* Sticky Header */}
              <div className="sticky top-0 bg-surface-100 z-20 p-8 sm:p-10 border-b-4 border-surface-900/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-6">
                  <OllieAvatar mood="happy" size="md" />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-black text-surface-900 uppercase tracking-tight leading-none italic">The Plan</h2>
                    <p className="text-[10px] text-surface-400 font-black uppercase tracking-[0.3em] mt-3 flex items-center gap-2">
                      <span className="w-8 h-0.5 bg-brand-500" />
                      {reviewingProject.title}
                    </p>
                  </div>
                </div>
                <button onClick={() => setReviewingProject(null)} className="p-2 hover:bg-surface-200 rounded-xl transition-colors">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-6 custom-scrollbar">
                {reviewingProject.blueprint.realism_check && (
                  <div className="bg-amber-50 border-2 border-amber-900/10 rounded-2xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">⚖️</span>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-900">Realism Check</h3>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-amber-900 leading-relaxed">{reviewingProject.blueprint.realism_check.reasoning}</p>
                    {reviewingProject.blueprint.realism_check.suggested_timeline && (
                      <div className="mt-3 pt-3 border-t border-amber-900/10 flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 opacity-60">Verdict:</span>
                        <span className="text-xs font-black text-amber-900">{reviewingProject.blueprint.realism_check.suggested_timeline}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-8 mb-16">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-[0.4em] text-surface-400">Project Plan</h3>
                    <div className="h-0.5 flex-1 bg-surface-900/5 ml-6" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {reviewingProject.blueprint.tasks?.map((task, i: number) => (
                      <div key={i} className="p-6 bg-white border-3 border-surface-200 rounded-[2.5rem] flex flex-col hover:border-brand-500 hover:shadow-2xl transition-all group relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-brand-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-6 h-6 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center text-[10px] font-black shrink-0">
                            {i + 1}
                          </div>
                          <h4 className="text-sm font-black text-surface-900 leading-tight uppercase line-clamp-2">{task.title}</h4>
                        </div>
                        <p className="text-[11px] text-surface-500 leading-relaxed font-bold opacity-70 mb-6 flex-1 line-clamp-3">{task.description}</p>
                          <div className="flex items-center gap-4 pt-4 border-t-2 border-surface-50">
                            <span className="text-[9px] font-black uppercase text-brand-600 px-3 py-1 bg-brand-50 border-2 border-brand-100 rounded-xl">
                              {task.priority || 'Med'}
                            </span>
                            <span className="text-[9px] font-black uppercase text-surface-400 flex items-center gap-2">
                              ⏱️ {task.estimated_minutes || 30}M
                            </span>
                            {task.day && (
                              <span className="text-[9px] font-black uppercase text-surface-400 ml-auto flex items-center gap-1.5">
                                📅 Day {task.day}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

              {reviewingProject.blueprint.resources && reviewingProject.blueprint.resources.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-surface-400 mb-3">Verified Resources</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {reviewingProject.blueprint.resources.map((res, i: number) => (
                      <a
                        key={i}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-4 border-2 border-surface-200 rounded-2xl hover:border-brand-500 hover:bg-brand-50 transition-all group"
                      >
                        <h4 className="text-xs font-black text-surface-900 group-hover:text-brand-600 uppercase mb-1">{res.title}</h4>
                        <p className="text-[10px] text-surface-400 font-medium line-clamp-2">{res.description}</p>
                      </a>
                    ))}
                  </div>
                </div>
                )}
              </div>

                {/* Sticky Footer */}
                <div className="sticky bottom-0 bg-white/80 backdrop-blur-xl px-10 py-10 border-t-4 border-surface-900 flex gap-6 shrink-0">
                  <button
                    onClick={() => setReviewingProject(null)}
                    className="flex-1 py-5 bg-surface-200 hover:bg-surface-300 text-surface-900 font-black uppercase text-sm tracking-[0.2em] rounded-[1.5rem] transition-all border-b-6 border-surface-400 active:border-b-0 active:translate-y-[4px]"
                  >
                    Save for Later
                  </button>
                  <button
                    onClick={() => importBlueprint(reviewingProject.id)}
                    disabled={importingId === reviewingProject.id}
                    className="flex-[2] py-5 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-sm tracking-[0.2em] rounded-[1.5rem] transition-all shadow-[0_8px_0_0_var(--brand-900)] active:shadow-none active:translate-y-[6px] disabled:opacity-50 flex items-center justify-center gap-3"
                  >
                    {importingId === reviewingProject.id ? (
                      <>
                        <div className="w-4 h-4 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        Initializing...
                      </>
                    ) : (
                      <>
                        <span>🚀 Activate Plan</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-surface-900/60 backdrop-blur-md" 
              onClick={() => setShowAddModal(false)} 
            />
            <motion.div 
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-surface-100 border-4 border-surface-900 shadow-[12px_12px_0_0_var(--shadow-color)] rounded-3xl p-10 text-center"
            >
              <h2 className="text-2xl font-black text-surface-900 mb-8 uppercase tracking-tight">Start a New Project</h2>
              <form onSubmit={handleAddProject} className="space-y-6">
                <div className="mb-8">
                  <label className="block text-[10px] font-black text-surface-400 mb-3 uppercase tracking-[0.2em]">Quick Start Library</label>
                  
                  {/* Category Tabs */}
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide no-scrollbar">
                    {PROJECT_CATEGORIES.map((cat, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActiveCategory(i)}
                        className={`px-4 py-2 whitespace-nowrap text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border-2 ${
                          activeCategory === i 
                          ? 'bg-brand-600 text-white border-brand-600 shadow-[4px_4px_0_0_var(--surface-900)]' 
                          : 'bg-white text-surface-500 border-surface-200 hover:border-surface-400'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Ideas List (Scrollable) */}
                  <div className="max-h-32 overflow-y-auto pr-1 custom-scrollbar space-y-2 text-left">
                    {PROJECT_CATEGORIES[activeCategory].ideas.map((idea, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setNewTitle(idea.title);
                          const date = new Date();
                          date.setDate(date.getDate() + idea.deadline);
                          setNewTargetDate(date.toISOString().split('T')[0]);
                        }}
                        className="w-full px-4 py-2 text-xs font-bold text-surface-700 bg-white border-2 border-surface-100 hover:border-brand-300 hover:bg-brand-50 rounded-xl transition-all flex justify-between items-center group"
                      >
                        <span>{idea.title}</span>
                        <span className="text-[10px] text-surface-400 group-hover:text-brand-500">{idea.deadline}d</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-surface-900 mb-2 uppercase text-center">What&apos;s the project?</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Build a SaaS MVP"
                    required
                    autoFocus
                    className="w-full px-4 py-4 bg-white border-2 border-surface-900 rounded-2xl text-surface-900 placeholder-surface-300 focus:outline-none focus:ring-4 focus:ring-brand-500/20 font-bold text-center text-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-surface-900 mb-2 uppercase">Target Deadline</label>
                  <input
                    type="date"
                    value={newTargetDate}
                    onChange={(e) => setNewTargetDate(e.target.value)}
                    className="w-full px-4 py-4 bg-white border-2 border-surface-900 rounded-2xl text-surface-900 focus:outline-none focus:ring-4 focus:ring-brand-500/20 font-bold text-center text-lg"
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-4 bg-surface-200 hover:bg-surface-300 text-surface-900 font-black uppercase text-xs tracking-widest rounded-2xl transition-all"
                  >
                    Cancel
                </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all shadow-[6px_6px_0_0_var(--brand-900)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-50"
                  >
                    {saving ? 'Creating...' : 'Start Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
