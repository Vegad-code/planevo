'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useSubscription, redirectToCheckout } from '@/hooks/use-subscription';
import { 
  CheckCircle, 
  Lightning, 
  ArrowRight, 
  ShieldCheck, 
  Warning, 
  CaretRight,
  CaretLeft,
  LockKey,
  GraduationCap,
  CalendarBlank,
  Users,
  Clock,
  Heart,
  SealCheck
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { OllieMascot, OlliePose } from '@/components/OllieMascot';

const STEPS = [
  'HOOK',             // Screen 1: What is stealing your time?
  'WELCOME',          // Screen 2: Name + Identity
  'STAT_INPUT',       // Screen 3a: Age + Study hours
  'AHA_MOMENT',       // Screen 3b: The Calculation (Limbo)
  'REFLECTION',       // Screen 4: What would you do with extra time?
  'MIRROR',           // Screen 5: I hear you.
  'BELONGING',        // Screen 6: Validation + Auth Gate
  'CANVAS_CONNECT',   // Screen 7: Integration
  'ANALYZING',        // Screen 8: Ollie crunching numbers
  'DISCOVERY',        // Screen 9: Found 12 hours
  'CELEBRATION',      // Screen 10: Gamification + Review
  'ROADMAP',          // Screen 11: 14-day summary
  'PRICE_PIVOT',      // Screen 12: Coffee vs Peace
  'COMMITMENT',       // Screen 13: Commitment level
  'FOUNDER_PROMISE',  // Screen 14: Founder note
  'PAYWALL'           // Screen 15: Final Checkout
];

export default function OnboardingPage() {
  const [persona, setPersona] = useState<'student' | 'professional' | 'builder' | 'other' | ''>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [age, setAge] = useState('');
  const [weeklyStudyHours, setWeeklyStudyHours] = useState<number>(30);
  const [dreamActivity, setDreamActivity] = useState('');
  const [commitmentLevel, setCommitmentLevel] = useState('');
  const [stressor, setStressor] = useState('');
  const [abandonmentCount, setAbandonmentCount] = useState<number | null>(null);
  const [identityChecks, setIdentityChecks] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [priorityCourse, setPriorityCourse] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState<number>(10);
  const [energyPreference, setEnergyPreference] = useState('');
  const [testingCanvas, setTestingCanvas] = useState(false);
  const [canvasItemsCount, setCanvasItemsCount] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isAnnual, setIsAnnual] = useState(true);
  
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Load from localStorage on mount + Redirect if already complete
  useEffect(() => {
    async function checkCompletion() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);
      if (authUser) {
        const { data: profile } = await (supabase.from('users') as any).select('onboarding_complete, plan_type').eq('id', authUser.id).single();
        if (profile?.onboarding_complete) {
          const planType = profile.plan_type || 'free';
          const isActive = ['pro_monthly', 'pro_annual', 'trialing', 'admin'].includes(planType) || authUser.email === 'jabbouranthony720@gmail.com';
          
          if (isActive) {
            console.log('User is active, redirecting to dashboard');
            router.replace('/dashboard');
            return;
          } else {
            console.log('User is complete but not active, showing paywall');
            setCurrentStep(15);
            setMounted(true);
            return;
          }
        }
      } else {
        console.log('No authenticated user found');
      }
      
      const saved = localStorage.getItem('onboarding_draft');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.userName) setUserName(data.userName);
          if (data.persona) setPersona(data.persona);
          if (data.stressor) setStressor(data.stressor);
          if (data.abandonmentCount) setAbandonmentCount(data.abandonmentCount);
          if (data.identityChecks) setIdentityChecks(data.identityChecks);
          if (data.energyPreference) setEnergyPreference(data.energyPreference);
          if (data.priorityCourse) setPriorityCourse(data.priorityCourse);
          if (data.weeklyGoal) setWeeklyGoal(data.weeklyGoal);
          if (data.currentStep && data.currentStep < 6) setCurrentStep(data.currentStep); // Only restore first few steps
        } catch (e) {
          console.error('Failed to load onboarding draft', e);
        }
      }
      
      setMounted(true);
    }
    
    checkCompletion();
  }, [supabase, router]);

  // Save to localStorage on change
  useEffect(() => {
    const draft = {
      userName,
      persona,
      stressor,
      abandonmentCount,
      identityChecks,
      energyPreference,
      priorityCourse,
      weeklyGoal,
      currentStep
    };
    localStorage.setItem('onboarding_draft', JSON.stringify(draft));
  }, [userName, persona, stressor, abandonmentCount, identityChecks, energyPreference, priorityCourse, weeklyGoal, currentStep]);

  const getPose = (): OlliePose => {
    const step = STEPS[currentStep];
    switch (step) {
      case 'HOOK': return 'thinking';
      case 'WELCOME': return 'banner';
      case 'STAT_INPUT': return 'thinking';
      case 'AHA_MOMENT': return 'zen';
      case 'REFLECTION': return 'thinking';
      case 'MIRROR': return 'zen';
      case 'BELONGING': return 'banner';
      case 'CANVAS_CONNECT': return 'syncing';
      case 'ANALYZING': return 'syncing';
      case 'DISCOVERY': return 'zen';
      case 'CELEBRATION': return 'celebrate';
      case 'ROADMAP': return 'calendar';
      case 'PRICE_PIVOT': return 'crystals';
      case 'COMMITMENT': return 'banner';
      case 'FOUNDER_PROMISE': return 'thinking';
      case 'PAYWALL': return 'banner';
      default: return 'thinking';
    }
  };

  const nextStep = async () => {
    const step = STEPS[currentStep];
    
    if (step === 'BELONGING' && !user) {
      toast.info("Let's save your progress!", {
        description: "Create your account to connect your data and see your plan."
      });
      router.push('/signup?redirect=onboarding');
      return;
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const step = STEPS[currentStep];
        // Prevent enter from triggering if input is empty on specific steps
        if (step === 'WELCOME' && !userName) return;
        if (step === 'PRIORITY_FOCUS' && !priorityCourse) return;
        if (step === 'CANVAS_CONNECT' && persona === 'student' && (!canvasUrl || !canvasToken)) return;
        
        // If on the last step, complete onboarding via checkout
        if (currentStep === STEPS.length - 1) {
          handleCheckout();
        } else if (step === 'CANVAS_CONNECT') {
          // Only test Canvas for students who have filled in credentials
          if (persona === 'student' && canvasUrl && canvasToken) {
            handleTestCanvas();
          } else {
            nextStep();
          }
        } else {
          nextStep();
        }
      }
      
      if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        // Don't go back if in an input (unless it's empty or specific logic)
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' && (target as HTMLInputElement).value !== '') return;
        
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, userName, priorityCourse, canvasUrl, canvasToken, persona]);

  const { loading: subLoading } = useSubscription();

  const saveOnboardingData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const cleanEnergyPref = energyPreference || 'morning';

    const { error } = await (supabase.from('users') as any)
      .update({
        onboarding_complete: true,
        name: userName,
        persona: persona || 'other',
        energy_preference: cleanEnergyPref,
        canvas_url: canvasUrl,
        canvas_token: canvasToken,
        scheduling_preferences: {
          preferred_focus_time: cleanEnergyPref,
          stressor,
          abandonment_count: abandonmentCount,
          priority_course: priorityCourse,
          weekly_goal: weeklyGoal,
          identity_checks: identityChecks,
          age,
          weekly_study_hours: weeklyStudyHours,
          dream_activity: dreamActivity,
          commitment_level: commitmentLevel,
          sleep_start: "23:00",
          sleep_end: "07:00",
          unavailable_blocks: []
        }
      })
      .eq('id', user.id);

    if (error) throw error;
    
    // Clear draft on success
    localStorage.removeItem('onboarding_draft');
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      await saveOnboardingData();

      const hasCanvas = !!canvasToken;
      router.push(`/dashboard${hasCanvas ? '' : '?demo=true'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save onboarding data');
      setLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      router.push('/signup?redirect=onboarding');
      return;
    }
    setLoading(true);
    try {
      await saveOnboardingData();
      
      await redirectToCheckout(isAnnual ? 'annual' : 'monthly');
    } catch (err) {
      console.error(err);
      toast.error('Failed to start trial');
      setLoading(false);
    }
  };

  const handleTestCanvas = async () => {
    if (!canvasUrl || !canvasToken) {
      toast.error('Please provide both URL and Token');
      return;
    }
    setTestingCanvas(true);
    
    try {
      const { fetchCanvasUpcomingAction } = await import('@/lib/canvas/actions');
      const items = await fetchCanvasUpcomingAction(canvasUrl, canvasToken);
      
      if (items && items.length > 0) {
        setCanvasItemsCount(items.length);
        toast.success(`Connected! Found ${items.length} assignments.`, {
          icon: <Lightning weight="fill" className="text-yellow-400" />,
          description: "Ollie is already crunching the numbers.",
          duration: 4000,
        });
        nextStep();
      } else if (items) {
        setCanvasItemsCount(0);
        toast.info('Connected, but no upcoming assignments found.');
        nextStep();
      } else {
        toast.error('Connection failed. Check your URL and Token.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Sync failed. Please try again.');
    } finally {
      setTestingCanvas(false);
    }
  };

  const stepName = STEPS[currentStep];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        {/* Header Navigation */}
        <div className="w-full flex items-center justify-between mb-6 px-1">
          <motion.button 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => {
              if (currentStep > 0) {
                prevStep();
              } else {
                window.location.href = '/';
              }
            }}
            className="group flex items-center gap-2 text-meta text-surface-500 hover:text-surface-900 transition-colors relative z-30 cursor-pointer"
          >
            <CaretLeft weight="bold" className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            {currentStep > 0 ? 'Go Back' : 'Home'}
          </motion.button>
          
          <div className="flex items-center gap-6">
            <button 
              onClick={async () => {
                if (user) await supabase.auth.signOut();
                window.location.href = '/signup';
              }}
              className="text-[10px] font-black uppercase text-surface-400 hover:text-surface-900 transition-colors tracking-widest cursor-pointer"
            >
              {user ? `Not ${user.email?.split('@')[0]}?` : 'Exit to Signup'}
            </button>
            <span className="text-meta text-surface-400">Step {currentStep + 1} of {STEPS.length}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex gap-1.5 mb-12">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 flex-1 rounded-full transition-all duration-700 ease-out ${
                i <= currentStep ? 'bg-brand-500 shadow-[0_0_8px_rgba(93,138,102,0.3)]' : 'bg-surface-200'
              }`} 
            />
          ))}
        </div>

        {/* Animated Mascot */}
        {['WELCOME', 'STAT_INPUT', 'AHA_MOMENT', 'ANALYZING', 'CELEBRATION', 'MIRROR'].includes(stepName) && (
          <OllieMascot pose={getPose()} className="mb-8" />
        )}

        <AnimatePresence mode="wait">
          {/* STEP 1: HOOK */}
          {stepName === 'HOOK' && (
            <motion.div
              key="hook"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  What’s stealing your life right now?
                </h1>
                <p className="text-body">
                  Most students don’t have a motivation problem. They have a hidden time leak.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { id: 'panic', label: "I procrastinate until panic mode", icon: Warning },
                  { id: 'forget', label: "I forget assignments constantly", icon: CalendarBlank },
                  { id: 'busy', label: "I’m always “busy” but behind", icon: Clock },
                  { id: 'deciding', label: "I waste hours deciding what to do", icon: Lightning },
                  { id: 'late', label: "I start studying too late", icon: GraduationCap },
                  { id: 'change', label: "My schedule changes every day", icon: Users }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setStressor(item.label); nextStep(); }}
                    className="group relative p-6 bg-surface-900 border-4 border-surface-900 text-white text-left transition-all hover:bg-brand-500 hover:text-surface-900 shadow-[6px_6px_0px_0px_var(--accent-500)] active:translate-x-1 active:translate-y-1 active:shadow-none"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon weight="fill" className="size-8 group-hover:text-surface-900 transition-colors" />
                      <div className="font-display font-bold text-lg leading-none">{item.label}</div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: WELCOME */}
          {stepName === 'WELCOME' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full space-y-10"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  Meet Ollie. Your AI Life Pilot.
                </h1>
                <p className="text-body">
                  Not a calendar. Not another productivity app. Ollie rebuilds your week automatically so you stop living assignment-to-assignment.
                </p>
              </div>

              <div className="bg-white border-4 border-surface-900 p-8 shadow-[8px_8px_0px_0px_var(--brand-500)] space-y-6">
                <div className="space-y-2">
                  <Label className="text-meta">Your First Name</Label>
                  <Input
                    placeholder="Enter your name..."
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="border-2 border-surface-900 py-6 text-xl font-display font-bold focus:ring-brand-500"
                  />
                </div>
                <div className="p-4 bg-brand-500/5 border-l-4 border-brand-500">
                  <p className="text-narrative text-sm">
                    "You're not lazy. You've just been flying without instruments."
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                <Button 
                  onClick={nextStep}
                  disabled={!userName}
                  className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900"
                >
                  Let’s rebuild my schedule <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: STAT_INPUT */}
          {stepName === 'STAT_INPUT' && (
            <motion.div
              key="stat"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  How many hours disappear every week?
                </h1>
                <p className="text-body">
                  Be honest. Most students underestimate it. This includes doomscrolling, panic delays, and "fake studying."
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { value: 4, label: "3–5 hours" },
                  { value: 8, label: "6–10 hours" },
                  { value: 13, label: "11–15 hours" },
                  { value: 20, label: "15+ hours" }
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => { setWeeklyStudyHours(option.value); nextStep(); }}
                    className={`p-6 border-4 text-left transition-all ${
                      weeklyStudyHours === option.value ? 'border-brand-500 bg-brand-500/5 shadow-[4px_4px_0px_0px_var(--brand-500)]' : 'border-surface-900 hover:border-brand-500 bg-white'
                    }`}
                  >
                    <span className="font-black uppercase text-xl">{option.label}</span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={prevStep} className="w-full uppercase font-black text-xs">Back</Button>
            </motion.div>
          )}

          {/* STEP 4: AHA_MOMENT */}
          {stepName === 'AHA_MOMENT' && (
            <motion.div
              key="aha"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="bg-surface-900 text-white border-4 border-surface-900 p-10 shadow-[12px_12px_0px_0px_var(--brand-500)] space-y-10 relative overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] opacity-10">
                  <Clock weight="fill" className="size-64" />
                </div>
                
                <div className="space-y-6 relative z-10">
                  <h1 className="text-h1 text-white">
                    You’re losing nearly {weeklyStudyHours * 52} hours a year.
                  </h1>
                  <div className="space-y-4">
                    <p className="text-xl font-bold text-surface-400 uppercase tracking-tight">That’s:</p>
                    <ul className="space-y-4">
                      {[
                        `${Math.round((weeklyStudyHours * 52) / 24)} full days`,
                        `${Math.round((weeklyStudyHours * 52) / 0.8)} missed workouts`,
                        `${Math.round(weeklyStudyHours * 52 * 2)} lost gaming hours`,
                        "An entire summer disappearing into stress"
                      ].map((text, i) => (
                        <li key={i} className="flex items-center gap-4 text-xl font-black italic">
                          <Warning weight="fill" className="text-brand-500 size-6" />
                          {text}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-4 bg-brand-500/10 border-l-4 border-brand-500">
                  <p className="text-xs font-bold text-brand-500 uppercase italic">
                    "Most students don’t realize they’re losing entire months to indecision." — Ollie
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900"
                >
                  That’s actually insane <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: REFLECTION */}
          {stepName === 'REFLECTION' && (
            <motion.div
              key="reflection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  Who would you become?
                </h1>
                <p className="text-body">
                  If we give you {weeklyStudyHours} hours back every week, what's the first thing you'll do?
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  { id: 'grades', label: "Better grades without burnout", icon: GraduationCap },
                  { id: 'sleep', label: "More sleep", icon: Heart },
                  { id: 'gym', label: "Gym/sports consistency", icon: Lightning },
                  { id: 'friends', label: "More time with friends", icon: Users },
                  { id: 'gaming', label: "More gaming/free time", icon: CalendarBlank },
                  { id: 'stress', label: "Less stress at home", icon: Warning }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setDreamActivity(item.label); nextStep(); }}
                    className={`p-6 border-4 text-left transition-all flex items-center justify-between group ${
                      dreamActivity === item.label ? 'border-brand-500 bg-brand-500/5 shadow-[4px_4px_0px_0px_var(--brand-500)]' : 'border-surface-900 hover:border-brand-500 bg-white'
                    }`}
                  >
                    <span className="font-black uppercase text-lg">{item.label}</span>
                    <item.icon weight="fill" className={`size-6 ${dreamActivity === item.label ? 'text-brand-500' : 'text-surface-300 group-hover:text-brand-500'}`} />
                  </button>
                ))}
              </div>
              
              <div className="p-4 bg-brand-500/5 border-l-4 border-brand-500 text-center">
                <p className="text-xs font-bold text-surface-600 italic">
                  "Recovered time becomes identity. That’s the real upgrade." — Ollie
                </p>
              </div>

              <Button variant="ghost" onClick={prevStep} className="w-full uppercase font-black text-xs">Back</Button>
            </motion.div>
          )}

          {/* STEP 6: MIRROR */}
          {stepName === 'MIRROR' && (
            <motion.div
              key="mirror"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  You don’t need more discipline.
                </h1>
                <p className="text-narrative italic">
                  You need a system that adapts faster than your life changes.
                </p>
              </div>

              <div className="bg-white border-4 border-surface-900 p-8 shadow-[8px_8px_0px_0px_var(--accent-500)] space-y-6">
                <div className="space-y-4">
                  <p className="font-black uppercase text-sm leading-none text-surface-400 italic">Plan Pilot automatically reorganizes:</p>
                  <ul className="space-y-3">
                    {["Assignments", "Study Blocks", "Deadlines", "Recovery Time", "Schedule Shifts"].map((feat, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <CheckCircle weight="fill" className="text-brand-500 size-5" />
                        <span className="font-black uppercase text-lg italic">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  That’s exactly what I need <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 7: BELONGING */}
          {stepName === 'BELONGING' && (
            <motion.div
              key="belonging"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-12 py-6 text-center"
            >
              <div className="size-24 bg-brand-500 border-4 border-surface-900 rounded-3xl mx-auto flex items-center justify-center shadow-[8px_8px_0px_0px_var(--surface-900)]">
                <ShieldCheck weight="fill" className="text-white size-12" />
              </div>
              <div className="space-y-4">
                <h1 className="text-h1">
                  Join the students escaping survival mode.
                </h1>
                <p className="text-body max-w-sm mx-auto">
                  Thousands of students are replacing panic studying and missing assignments with automated structure.
                </p>
              </div>
              
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={() => {
                    if (user) {
                      nextStep();
                    } else {
                      router.push('/signup');
                    }
                  }}
                  className="w-full py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-surface-900 text-white hover:bg-surface-800"
                >
                  {user ? 'Continue' : 'Create My Account'} <ArrowRight weight="bold" className="ml-2" />
                </Button>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-[10px]">Back</Button>
                  <p className="flex-1 text-[10px] font-bold text-surface-400 uppercase tracking-widest italic flex items-center justify-center">Takes less than 15 seconds.</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 8: CANVAS_CONNECT */}
          {stepName === 'CANVAS_CONNECT' && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  Connect Canvas.
                </h1>
                <p className="text-body">
                  Let Ollie see the battlefield. We scan assignments, due dates, and workload spikes to build your recovery plan.
                </p>
              </div>

              <div className="space-y-6 bg-white border-4 border-surface-900 p-8 shadow-[8px_8px_0px_0px_var(--accent-500)]">
                <div className="space-y-2">
                  <Label className="text-meta">Canvas URL</Label>
                  <Input
                    placeholder="https://canvas.youruni.edu"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    className="border-2 border-surface-900 py-6 font-display font-bold focus:ring-brand-500 italic"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-meta">Access Token</Label>
                  <Input
                    type="password"
                    placeholder="Paste your token..."
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    className="border-2 border-surface-900 py-6 font-bold focus:ring-brand-500"
                  />
                </div>
                <div className="p-4 bg-brand-500/5 border-l-4 border-brand-500">
                  <p className="text-narrative text-sm">
                    "Now we stop guessing and start piloting." — Ollie
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                  <Button 
                    onClick={handleTestCanvas}
                    disabled={testingCanvas || !canvasUrl || !canvasToken}
                    className="flex-[2] py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900"
                  >
                    {testingCanvas ? 'Syncing...' : 'Sync My Canvas'} <Lightning weight="fill" className="ml-2" />
                  </Button>
                </div>
                <Button 
                  onClick={() => { setCanvasItemsCount(12); nextStep(); }} 
                  variant="ghost" 
                  className="w-full text-[10px] font-black uppercase text-surface-400 hover:text-surface-900 py-4 italic"
                >
                  I'll do this later (Skip for now)
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 9: ANALYZING */}
          {stepName === 'ANALYZING' && (
            <motion.div
              key="analyzing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-12 text-center"
            >
              <div className="relative size-32 mx-auto">
                <div className="absolute inset-0 border-8 border-surface-100 rounded-full" />
                <motion.div 
                  className="absolute inset-0 border-8 border-brand-500 rounded-full border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <OllieMascot pose="thinking" className="size-16" />
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                  Analyzing your academic pressure map…
                </h1>
                <div className="flex flex-col gap-2 max-w-xs mx-auto">
                  {[
                    "Detecting deadline clusters...",
                    "Finding procrastination risk zones...",
                    "Identifying burnout windows...",
                    "Building recovery schedule...",
                    "Calculating reclaimable hours..."
                  ].map((text, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 2 }}
                      onAnimationComplete={() => { if(i === 4) setTimeout(nextStep, 2500); }}
                      className="flex items-center gap-3 text-left"
                    >
                      <CheckCircle weight="bold" className="text-brand-500 size-4 shrink-0" />
                      <span className="text-[10px] font-bold uppercase text-surface-500 tracking-tight">{text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 10: DISCOVERY */}
          {stepName === 'DISCOVERY' && (
            <motion.div
              key="discovery"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1 text-brand-500">
                  We found {(weeklyStudyHours * 0.25).toFixed(1)} recoverable hours.
                </h1>
                <p className="text-body italic">
                  Ollie identified your biggest leaks.
                </p>
              </div>

              <div className="bg-surface-900 text-white border-4 border-surface-900 p-8 shadow-[10px_10px_0px_0px_var(--accent-500)] space-y-8 relative overflow-hidden">
                <div className="grid gap-4">
                  {[
                    { label: "Fragmented study sessions", color: "text-brand-500" },
                    { label: "Late-start homework", color: "text-accent-500" },
                    { label: "Unplanned downtime", color: "text-white" },
                    { label: "Reactive scheduling", color: "text-brand-500" }
                  ].map((leak, i) => (
                    <div key={i} className="flex items-center gap-4 border-b border-surface-800 pb-3">
                      <Warning weight="fill" className={`${leak.color} size-5`} />
                      <span className="font-black uppercase text-xs italic">{leak.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900 hover:bg-brand-400"
                >
                  Show me the recovery plan <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 11: CELEBRATION */}
          {stepName === 'CELEBRATION' && (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-12 text-center"
            >
              <div className="space-y-4">
                <div className="text-meta text-brand-500 mb-4">
                  PLAN PILOT MEMBER
                </div>
                <h1 className="text-h1">
                  You’re no longer in Trial Mode.
                </h1>
                <p className="text-body max-w-sm mx-auto">
                  You now have an AI recovery system and a personalized success blueprint.
                </p>
              </div>

              <div className="p-8 border-4 border-surface-900 bg-white shadow-[8px_8px_0px_0px_var(--accent-500)] space-y-6">
                <p className="text-xs font-bold text-surface-600 italic">
                  "Passengers react. Pilots anticipate." — Ollie
                </p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                  <Button onClick={nextStep} className="flex-[2] py-6 bg-brand-500 text-surface-900 font-black uppercase shadow-[4px_4px_0px_0px_var(--surface-900)]">View Blueprint</Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 12: ROADMAP */}
          {stepName === 'ROADMAP' && (
            <motion.div
              key="roadmap"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  Your next 14 days are mapped.
                </h1>
                <p className="text-body">
                  Most users report lower stress within the first week.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { day: "Days 1–3", label: "Escape assignment chaos", sub: "Ollie clears your backlog and silences Canvas noise." },
                  { day: "Days 4–7", label: "Build momentum automatically", sub: "You'll notice you're finishing work 2 hours earlier." },
                  { day: "Days 8–10", label: "Reduce stress", sub: "No more late-night catch-up sessions." },
                  { day: "Days 11–14", label: "Total Control", sub: "Feel in control of your future again." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 items-center bg-white border-2 border-surface-900 p-4 shadow-[4px_4px_0px_0px_var(--surface-900)]">
                    <div className="font-black text-brand-500 italic shrink-0 w-20 uppercase text-[10px]">{item.day}</div>
                    <div className="space-y-1">
                      <div className="font-black uppercase text-sm leading-none">{item.label}</div>
                      <p className="text-[10px] font-bold text-surface-400 uppercase tracking-tight leading-none">{item.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-surface-900 text-white"
                >
                  Continue <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 13: PRICE_PIVOT */}
          {stepName === 'PRICE_PIVOT' && (
            <motion.div
              key="price_pivot"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-12 text-center"
            >
              <h1 className="text-h1">
                A fair trade.
              </h1>

              <div className="bg-surface-900 text-white border-4 border-surface-900 p-8 shadow-[10px_10px_0px_0px_var(--brand-500)] space-y-8">
                <div className="space-y-2">
                  <div className="text-6xl font-black text-brand-500 leading-none">$1.52</div>
                  <div className="text-xs font-black uppercase tracking-[0.2em] opacity-50">per week to recover 500+ hours/year</div>
                </div>
                
                <div className="border-t border-surface-800 pt-6">
                  <p className="text-sm font-bold uppercase text-surface-400 italic">
                    Students waste more every month on energy drinks, fast food, and stress spending.
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <p className="text-sm font-black uppercase text-surface-500 max-w-xs mx-auto italic">
                  Investing in your time is the highest ROI you can get in your 20s.
                </p>
                <div className="flex gap-3">
                  <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                  <Button 
                    onClick={nextStep}
                    className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900"
                  >
                    Keep my recovery system active <ArrowRight weight="bold" className="ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 14: COMMITMENT */}
          {stepName === 'COMMITMENT' && (
            <motion.div
              key="commitment"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  So here’s the real question.
                </h1>
                <p className="text-body text-sm">
                  A year from now… do you want to be the student still saying “I’ll start tomorrow”— or the student who finally took control?
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setCommitmentLevel('pilot'); nextStep(); }}
                  className="p-8 border-4 border-surface-900 bg-brand-500 text-surface-900 font-black uppercase text-xl shadow-[8px_8px_0px_0px_var(--surface-900)] transition-all active:translate-x-1 active:translate-y-1 active:shadow-none"
                >
                  I’m ready to become a Pilot
                </button>
                <button
                  onClick={() => { 
                    setCommitmentLevel('drifting');
                    // Skip Founder Promise and go straight to Paywall if they choose to drift
                    setCurrentStep(STEPS.indexOf('PAYWALL'));
                  }}
                  className="p-2 text-surface-400 font-bold uppercase text-[9px] hover:text-surface-600 transition-all opacity-50 hover:opacity-100"
                >
                  Stay a passenger (and lose {weeklyStudyHours * 52} hours this year)
                </button>
              </div>

              <div className="p-4 bg-brand-500/5 border-l-4 border-brand-500 text-center">
                <p className="text-xs font-bold text-surface-600 italic">
                  "The hardest part isn’t managing time. It’s deciding your future self matters enough to protect." — Ollie
                </p>
              </div>

              <Button variant="ghost" onClick={prevStep} className="w-full uppercase font-black text-xs">Back</Button>
            </motion.div>
          )}

          {/* STEP 15: FOUNDER_PROMISE */}
          {stepName === 'FOUNDER_PROMISE' && (
            <motion.div
              key="founder"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="bg-white border-4 border-surface-900 p-10 shadow-[10px_10px_0px_0px_var(--accent-500)] space-y-8">
                <div className="space-y-4">
                  <h1 className="text-4xl font-black uppercase tracking-tighter leading-none italic">
                    I built Plan Pilot because I was drowning too.
                  </h1>
                  <div className="space-y-4 font-bold text-surface-600 text-sm uppercase leading-relaxed italic">
                    <p>I missed deadlines. I underestimated assignments. I spent years confusing stress with productivity.</p>
                    <p>Plan Pilot is the system I wish existed earlier. If it doesn’t reduce your stress, cancel before the trial ends. No games.</p>
                  </div>
                </div>

                <div className="pt-6 border-t-2 border-surface-100 flex justify-between items-end">
                  <div>
                    <div className="font-black uppercase text-lg italic">— Founder</div>
                    <div className="text-[10px] font-black uppercase text-surface-400 tracking-widest">Plan Pilot</div>
                  </div>
                  <div className="size-16 bg-surface-100 rounded-full border-2 border-surface-200" />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="ghost" onClick={prevStep} className="flex-1 uppercase font-black text-xs">Back</Button>
                <Button 
                  onClick={() => {
                    if (user) {
                      nextStep();
                    } else {
                      router.push('/signup');
                    }
                  }}
                  className="flex-[2] py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900 hover:bg-brand-400"
                >
                  Secure My Spot <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 16: PAYWALL */}
          {stepName === 'PAYWALL' && (
            <motion.div
              key="paywall"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-h1">
                  Activate Your 14-Day Recovery Trial
                </h1>
                <p className="text-body">
                  Every day without a system costs you more than this trial ever will.
                </p>
              </div>

              <div className="bg-white border-4 border-surface-900 shadow-[10px_10px_0px_0px_var(--accent-500)] p-8 space-y-6 relative overflow-hidden">
                <div className="flex justify-between items-start pb-4 border-b-2 border-surface-100">
                  <div className="space-y-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-500">Selected Plan</div>
                    <h2 className="text-3xl font-black uppercase italic tracking-tighter">Elite {isAnnual ? 'Annual' : 'Monthly'}</h2>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="text-2xl font-black text-surface-900 leading-none">
                      {isAnnual ? '$6.58' : '$9.99'}
                    </div>
                    <div className="text-[10px] font-black uppercase text-surface-400 mt-1 tracking-tighter">
                      per month
                    </div>
                    {isAnnual && (
                      <div className="flex flex-col items-end">
                        <div className="text-[8px] font-black uppercase text-surface-400 mt-1 italic tracking-widest">
                          Billed annually ($79/yr)
                        </div>
                        <div className="mt-2 px-2 py-0.5 bg-brand-500 text-surface-900 text-[8px] font-black uppercase shadow-[2px_2px_0px_0px_var(--surface-900)]">
                          Save $40
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    "AI schedule automation",
                    "Canvas syncing",
                    "Adaptive study planning",
                    "Smart workload balancing",
                    "Burnout prevention system",
                    "Time recovery analytics"
                  ].map((feat, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <SealCheck weight="fill" className="text-brand-500 size-4" />
                      <span className="text-[10px] font-black uppercase text-surface-600 tracking-tight italic">{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center p-1 bg-surface-50 rounded-xl w-full border-2 border-surface-900 relative h-12">
                  <button
                    onClick={() => setIsAnnual(false)}
                    className={`flex-1 text-[10px] font-black uppercase py-2 z-10 transition-colors ${!isAnnual ? 'text-white' : 'text-surface-400'}`}
                  >
                    Monthly
                  </button>
                  <button
                    onClick={() => setIsAnnual(true)}
                    className={`flex-1 text-[10px] font-black uppercase py-2 z-10 transition-colors ${isAnnual ? 'text-white' : 'text-surface-400'}`}
                  >
                    Annual <span className="text-[8px] opacity-75">(-34%)</span>
                  </button>
                  <motion.div
                    className="absolute top-1 bottom-1 bg-surface-900 rounded-lg z-0"
                    initial={false}
                    animate={{ 
                      left: isAnnual ? '50%' : '4px',
                      width: 'calc(50% - 4px)'
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleCheckout}
                  disabled={loading}
                  className="w-full py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] bg-brand-500 text-surface-900 hover:bg-brand-400"
                >
                  {loading ? 'Redirecting...' : 'Start My Free Trial'} <ArrowRight weight="bold" className="ml-2" />
                </Button>
                <Button variant="ghost" onClick={prevStep} className="w-full uppercase font-black text-xs">Back</Button>
              </div>

              <div className="flex justify-center gap-6 opacity-30 grayscale pointer-events-none">
                 <ShieldCheck weight="bold" className="size-8" />
                 <LockKey weight="bold" className="size-8" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="mt-8 text-center">
          <p className="text-[8px] font-bold text-surface-300 uppercase tracking-widest flex items-center justify-center gap-2">
            <LockKey weight="bold" /> Secure Sync • Plan Pilot 2024
          </p>
        </div>
      </div>
    </div>
  );
}
