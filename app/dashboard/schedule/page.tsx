'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ScheduleTimeline from '@/components/dashboard/ScheduleTimeline';
import OllieChatSidebar from '@/components/dashboard/OllieChatSidebar';
import CargoBay from '@/components/dashboard/CargoBay';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { Activity, BatteryMedium, Sliders, Save, Rocket } from 'lucide-react';
import type { Task } from '@/types/database';

const DEFAULT_PREFERENCES = {
  unavailable_blocks: [
    { label: 'School', start: '08:00', end: '15:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] }
  ],
  preferred_focus_time: 'afternoon',
  pomodoro_length: 50,
  break_length: 15,
  sleep_start: '22:30',
  sleep_end: '07:00'
};

export default function SchedulePage() {
  const [showChat, setShowChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'focus' | 'energy'>('focus');
  const [schedule, setSchedule] = useState<any[] | null>(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // 1. Load Schedule
      const { data: scheduleData } = await supabase
        .from('schedules')
        .select('schedule_json')
        .eq('user_id', user.id)
        .eq('date', format(new Date(), 'yyyy-MM-dd'))
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (scheduleData?.[0]) {
        const raw = scheduleData[0].schedule_json as any[];
        const seenIds = new Set();
        const sanitized = raw.map((b: any, idx: number) => {
          let id = b.id || Math.random().toString(36).substr(2, 9);
          if (seenIds.has(id)) {
            id = `${id}-dup-${idx}`;
          }
          seenIds.add(id);
          return { ...b, id };
        });
        setSchedule(sanitized);
      }

      // 2. Load Preferences
      const { data: userData } = await supabase
        .from('users')
        .select('scheduling_preferences')
        .eq('id', user.id)
        .single();
      
      if (userData?.scheduling_preferences && Object.keys(userData.scheduling_preferences).length > 0) {
        setPreferences(userData.scheduling_preferences as any);
      }
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCommand = async (message: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/ai/schedule-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchedule: schedule,
          userMessage: message,
          userPreferences: preferences
        }),
      });

      if (!response.ok) throw new Error('Failed to reach Ollie');

      const data = await response.json();
      
      // Ensure all blocks have unique IDs
      const seenIds = new Set();
      const sanitized = (data.updated_schedule || []).map((b: any, idx: number) => {
        let id = b.id || Math.random().toString(36).substr(2, 9);
        if (seenIds.has(id)) {
          id = `${id}-dup-${idx}`;
        }
        seenIds.add(id);
        return { ...b, id };
      });
      
      setSchedule(sanitized);
      
      if (data.learned_preference) {
        toast.success(`Ollie learned something new!`, {
          description: `Logged: ${data.learned_preference.rule}`
        });
      }

      return data.ollie_response;
    } catch (err) {
      toast.error("Ollie's connection is a bit fuzzy. Try again?");
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeconstruct = async (blockId: string) => {
    const block = schedule?.find(b => b.id === blockId);
    if (!block) return;
    
    setShowChat(true);
    await handleCommand(`Deconstruct the "${block.title}" task into smaller, manageable steps.`);
  };

  // --- CARGO BAY HANDLERS ---
  const handleDockOne = async (task: Task) => {
    toast.info(`Docking "${task.title}" into your Flight Plan...`, { 
      icon: <Rocket className="w-4 h-4" /> 
    });
    await handleCommand(
      `Add a new focus block for "${task.title}" (estimated ${task.estimated_minutes || 30} minutes, energy: ${task.energy_level_required || 'medium'}). Find the best slot in my current schedule.`
    );
  };

  const handleDockAll = async (tasks: Task[]) => {
    if (tasks.length === 0) return;
    
    toast.info(`Auto-Docking ${tasks.length} tasks...`, { 
      icon: <Rocket className="w-4 h-4" /> 
    });

    const taskList = tasks.map(t => 
      `"${t.title}" (${t.estimated_minutes || 30}m, energy: ${t.energy_level_required || 'medium'})`
    ).join(', ');
    
    await handleCommand(
      `Integrate these tasks from my Cargo Bay into today's schedule. Find the best slots based on energy levels and available gaps: ${taskList}. Preserve existing blocks.`
    );
  };

  const saveSchedule = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !schedule) return;

    const { error } = await supabase
      .from('schedules')
      .upsert({
        user_id: user.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        schedule_json: schedule,
        created_at: new Date().toISOString()
      });

    if (error) {
      toast.error("Failed to save schedule");
    } else {
      toast.success("Flight Plan Secured", {
        description: "Your schedule is now synced across all devices.",
        icon: <Save className="w-4 h-4 text-green-500" />
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        <h2 className="mt-6 text-xl font-black text-surface-900 uppercase tracking-tighter">Syncing Cockpit...</h2>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Top Navigation / Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-surface-900 uppercase tracking-tighter leading-none mb-1">
            Schedule
          </h1>
          <p className="text-surface-500 text-sm font-bold uppercase tracking-widest">
            {format(new Date(), 'EEEE, MMMM do')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-surface-200 p-1 rounded-xl border border-surface-300">
            <button 
              onClick={() => setActiveTab('focus')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'focus' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-900'
              }`}
            >
              <Activity className={`w-3.5 h-3.5 ${activeTab === 'focus' ? 'text-brand-500' : ''}`} />
              Focus Mode
            </button>
            <button 
              onClick={() => setActiveTab('energy')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                activeTab === 'energy' ? 'bg-white shadow-sm text-surface-900' : 'text-surface-500 hover:text-surface-900'
              }`}
            >
              <BatteryMedium className={`w-3.5 h-3.5 ${activeTab === 'energy' ? 'text-brand-500' : ''}`} />
              Energy
            </button>
          </div>
          <button 
            onClick={saveSchedule}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-brand-500/20 active:scale-95"
          >
            <Save className="w-4 h-4" />
            Lock In
          </button>
        </div>
      </div>

      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main Schedule Timeline */}
        <div className={`${showChat ? 'lg:col-span-8' : 'lg:col-span-12'} transition-all duration-500 space-y-6`}>
          
          {/* Timeline Card */}
          <div className="bg-white border-4 border-surface-900 rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.1)]">
            <div className="p-6 border-b border-surface-100 bg-surface-50/50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <OllieAvatar mood={isProcessing ? 'thinking' : 'happy'} size="sm" />
                <p className="text-sm font-bold text-surface-600">
                  {isProcessing ? "Ollie is recalculating..." : "Drag to reorder. Ollie handles the rest."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowChat(!showChat)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase transition-all border-2 ${
                    showChat ? 'bg-surface-900 text-white border-surface-900' : 'bg-white text-surface-900 border-surface-200 hover:border-surface-900'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  {showChat ? 'Close Ollie' : 'Ask Ollie'}
                </button>
              </div>
            </div>

            <div className="p-4">
              {schedule ? (
                <ScheduleTimeline 
                  initialBlocks={schedule} 
                  onUpdate={setSchedule}
                  onDeconstruct={handleDeconstruct}
                />
              ) : (
                <div className="p-12 text-center">
                  <OllieAvatar mood="thinking" size="lg" />
                  <h3 className="mt-4 text-xl font-black text-surface-900 uppercase">No plan active</h3>
                  <p className="text-surface-500 mt-2">Visit the Blueprint to launch your day.</p>
                  <button 
                    onClick={() => window.location.href = '/dashboard/briefing'}
                    className="mt-6 px-8 py-3 bg-brand-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl"
                  >
                    Blueprint
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Cargo Bay — sits below the timeline */}
          <CargoBay 
            onDockAll={handleDockAll}
            onDockOne={handleDockOne}
            isProcessing={isProcessing}
          />
        </div>

        {/* Conversational Sidebar (Collapsible) */}
        {showChat && (
          <div className="lg:col-span-4 sticky top-8 animate-in slide-in-from-right duration-300">
            <OllieChatSidebar 
              onCommand={handleCommand}
              isProcessing={isProcessing}
            />
          </div>
        )}
      </div>
    </div>
  );
}
