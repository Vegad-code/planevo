'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/use-subscription';
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
  'WELCOME',
  'PERSONA',
  'STRESSOR',
  'ABANDONMENT',
  'IDENTITY',
  'BELONGING',
  'CANVAS_CONNECT',
  'PRIORITY_FOCUS',
  'WEEKLY_GOAL',
  'ENERGY',
  'PREVIEW',
  'TRANSPARENCY',
  'PAYWALL'
];

export default function OnboardingPage() {
  const [persona, setPersona] = useState<'student' | 'professional' | 'builder' | 'other' | ''>('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [stressor, setStressor] = useState('');
  const [abandonmentCount, setAbandonmentCount] = useState<number | null>(null);
  const [identityChecks, setIdentityChecks] = useState<string[]>([]);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [priorityCourse, setPriorityCourse] = useState('');
  const [weeklyGoal, setWeeklyGoal] = useState<number>(10);
  const [energyPreference, setEnergyPreference] = useState('');
  const [testingCanvas, setTestingCanvas] = useState(false);
  const [canvasItemsCount, setCanvasItemsCount] = useState(0);
  
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Sync state with pose
  const getPose = (): OlliePose => {
    switch (STEPS[currentStep]) {
      case 'PERSONA': return 'crystals';
      case 'STRESSOR': return 'thinking';
      case 'ABANDONMENT': return 'grumpy';
      case 'CANVAS_CONNECT': return 'syncing';
      case 'PRIORITY_FOCUS': return 'crystals';
      case 'WEEKLY_GOAL': return 'banner';
      case 'PREVIEW': return 'calendar';
      case 'TRANSPARENCY': return 'zen';
      default: return 'thinking';
    }
  };

  const nextStep = () => {
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
        // Prevent enter from triggering if input is empty on name step
        if (STEPS[currentStep] === 'WELCOME' && !userName) return;
        if (STEPS[currentStep] === 'PRIORITY_FOCUS' && !priorityCourse) return;
        if (STEPS[currentStep] === 'CANVAS_CONNECT' && persona === 'student' && (!canvasUrl || !canvasToken)) return;
        
        // If on the last step, complete onboarding via checkout
        if (currentStep === STEPS.length - 1) {
          handleCheckout();
        } else if (STEPS[currentStep] === 'CANVAS_CONNECT') {
          handleTestCanvas();
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
  }, [currentStep, userName, priorityCourse, canvasUrl, canvasToken]);

  const { redirectToCheckout } = useSubscription();

  const saveOnboardingData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('users')
      .update({
        onboarding_complete: true,
        name: userName,
        persona: persona || 'other',
        energy_preference: energyPreference,
        canvas_url: canvasUrl,
        canvas_token: canvasToken,
        scheduling_preferences: {
          stressor,
          abandonment_count: abandonmentCount,
          priority_course: priorityCourse,
          weekly_goal: weeklyGoal,
          identity_checks: identityChecks
        }
      })
      .eq('id', user.id);

    if (error) throw error;
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
    setLoading(true);
    try {
      await saveOnboardingData();
      
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY;
      if (!priceId) {
        throw new Error('Price ID not configured');
      }

      await redirectToCheckout({ priceId });
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

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 overflow-hidden relative">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10 flex flex-col items-center">
        {/* Progress Bar */}
        <div className="w-full flex gap-1 mb-12">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-700 ease-out ${
                i <= currentStep ? 'bg-brand-500' : 'bg-surface-200'
              }`} 
            />
          ))}
        </div>

        {/* Animated Mascot - Only show if not on purely text steps or paywall */}
        {['PERSONA', 'STRESSOR', 'ABANDONMENT', 'CANVAS_CONNECT', 'PRIORITY_FOCUS', 'WEEKLY_GOAL', 'PREVIEW', 'TRANSPARENCY'].includes(stepName) && (
          <OllieMascot pose={getPose()} className="mb-8" />
        )}

        <AnimatePresence mode="wait">
          {/* STEP 0: WELCOME */}
          {stepName === 'WELCOME' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8 text-center"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  Welcome to Plan Pilot.
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  First, what should we call you?
                </p>
              </div>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your Name"
                className="text-center text-2xl font-black border-2 border-surface-900 py-8 focus:ring-brand-500 uppercase italic"
              />
              <Button 
                onClick={nextStep}
                disabled={!userName}
                className="w-full py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
              >
                Let's Go <ArrowRight weight="bold" className="ml-2" />
              </Button>
            </motion.div>
          )}

          {/* STEP 1: PERSONA */}
          {stepName === 'PERSONA' && (
            <motion.div
              key="persona"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-4xl font-black uppercase tracking-tighter">
                  What's your primary focus?
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  We'll tailor your experience to match your world.
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  { id: 'student', label: 'Student', icon: GraduationCap, desc: 'College, Grad School, or Bootcamp' },
                  { id: 'professional', label: 'Professional', icon: ShieldCheck, desc: 'Early career, Corporate, or Tech' },
                  { id: 'builder', label: 'Creative / Builder', icon: Lightning, desc: 'Freelance, Founders, or Makers' },
                  { id: 'other', label: 'Life Pilot', icon: Heart, desc: 'Just trying to stay organized' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPersona(p.id as any); nextStep(); }}
                    className={`p-6 border-2 text-left transition-all flex items-center gap-4 ${
                      persona === p.id ? 'border-brand-500 bg-brand-500/5 shadow-[4px_4px_0px_0px_var(--brand-500)]' : 'border-surface-200 hover:border-brand-500 bg-surface-50'
                    }`}
                  >
                    <p.icon weight="fill" className="text-brand-500 size-8 shrink-0" />
                    <div className="flex-1">
                      <h3 className="font-black uppercase tracking-tight">{p.label}</h3>
                      <p className="text-[10px] font-bold text-surface-500 uppercase">{p.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={prevStep} className="w-full">Back</Button>
            </motion.div>
          )}

          {/* STEP 1: STRESSOR */}
          {stepName === 'STRESSOR' && (
            <motion.div
              key="stressor"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-4xl font-black uppercase tracking-tighter">
                  What's the biggest stressor for you right now, {userName}?
                </h1>
              </div>
              <div className="grid gap-3">
                {(persona === 'student' ? [
                  "Assignments piling up",
                  "Unpredictable workload",
                  "Missing deadlines",
                  "The Canvas 'Red Dot' of doom"
                ] : persona === 'professional' ? [
                  "Back-to-back meetings",
                  "Slack/Email noise",
                  "Missing critical tasks",
                  "Feeling busy but not productive"
                ] : [
                  "Creative block",
                  "Too many ideas, no execution",
                  "Inconsistent focus",
                  "Scope creep"
                ]).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setStressor(s); nextStep(); }}
                    className={`p-6 border-2 text-left transition-all uppercase font-black text-sm tracking-tight ${
                      stressor === s ? 'border-brand-500 bg-brand-500/5' : 'border-surface-200 hover:border-brand-500'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={prevStep} className="w-full">Back</Button>
            </motion.div>
          )}

          {/* STEP 3: ABANDONMENT */}
          {stepName === 'ABANDONMENT' && (
            <motion.div
              key="abandonment"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full space-y-8 text-center"
            >
              <h1 className="text-4xl font-black uppercase tracking-tighter">
                Be honest: How many planners have you started... then stopped using after 3 days?
              </h1>
              <div className="flex justify-center gap-4">
                {[1, 2, 3, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setAbandonmentCount(n); nextStep(); }}
                    className="size-16 border-4 border-surface-900 flex items-center justify-center text-2xl font-black shadow-[4px_4px_0px_0px_var(--surface-900)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
                  >
                    {n}
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={prevStep} className="w-full">Back</Button>
              <p className="text-xs font-bold text-surface-400 uppercase tracking-widest">
                (It's okay. Plan Pilot is designed for the 3-day burnout.)
              </p>
            </motion.div>
          )}

          {/* STEP 4: IDENTITY */}
          {stepName === 'IDENTITY' && (
            <motion.div
              key="identity"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  Does this sound like you?
                </h1>
              </div>

              <div className="grid gap-3">
                {(persona === 'student' ? [
                  "I have 47+ browser tabs open right now.",
                  "I feel 'behind' the moment I wake up.",
                  "Deadline notifications feel like a personal attack.",
                  "I work best under the pressure of a deadline."
                ] : persona === 'professional' ? [
                  "I spend my morning planning, but never follow it.",
                  "I struggle to find time for deep work.",
                  "My calendar is a source of anxiety.",
                  "I thrive on clear priorities."
                ] : [
                  "I hyperfocus on the wrong things.",
                  "I hate traditional rigid planners.",
                  "I need a tool that adapts to my energy.",
                  "I want to offload the logistics of my day."
                ]).map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (identityChecks.includes(item)) {
                        setIdentityChecks(identityChecks.filter(i => i !== item));
                      } else {
                        setIdentityChecks([...identityChecks, item]);
                      }
                    }}
                    className={`p-6 border-2 text-left transition-all flex items-center gap-4 ${
                      identityChecks.includes(item)
                        ? 'border-brand-500 bg-brand-500/5 shadow-[4px_4px_0px_0px_var(--brand-500)]'
                        : 'border-surface-200 hover:border-surface-400 bg-surface-50'
                    }`}
                  >
                    <div className={`size-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      identityChecks.includes(item) ? 'bg-brand-500 border-brand-500' : 'border-surface-300'
                    }`}>
                      {identityChecks.includes(item) && <CheckCircle weight="fill" className="text-white size-4" />}
                    </div>
                    <span className="font-bold text-sm uppercase tracking-tight">{item}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={prevStep} className="flex-1">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  Continue <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 5: BELONGING */}
          {stepName === 'BELONGING' && (
            <motion.div
              key="belonging"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="text-center space-y-12 py-12"
            >
              <div className="flex justify-center">
                <div className="size-24 bg-brand-500 border-4 border-surface-900 rounded-3xl flex items-center justify-center shadow-[8px_8px_0px_0px_var(--surface-900)]">
                  <Users weight="fill" className="text-white size-12" />
                </div>
              </div>
              <div className="space-y-6">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  You're exactly who we built this for.
                </h1>
                <p className="text-xl font-bold text-surface-600 max-w-lg mx-auto uppercase">
                  Plan Pilot isn't about "discipline." It's about offloading the mental tax of planning to an AI that doesn't get tired.
                </p>
              </div>
              <div className="flex gap-4">
                <Button variant="ghost" onClick={prevStep} className="flex-1">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] px-12 py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  I'm ready <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 6: CANVAS_CONNECT */}
          {stepName === 'CANVAS_CONNECT' && (
            <motion.div
              key="canvas"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  {persona === 'student' ? 'Connect Canvas.' : 'Connect Your Tasks.'}
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  This is where the magic happens. We'll pull your {persona === 'student' ? 'assignments' : 'tasks'} into a calm, unified view.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="onboarding-canvas-url" className="text-xs font-black uppercase text-surface-500">Canvas URL</Label>
                  <Input
                    id="onboarding-canvas-url"
                    placeholder="https://canvas.youruniversity.edu"
                    value={canvasUrl}
                    onChange={(e) => setCanvasUrl(e.target.value)}
                    className="border-2 border-surface-900 py-6 font-bold focus:ring-accent-500 uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="onboarding-canvas-token" className="text-xs font-black uppercase text-surface-500">Access Token</Label>
                  <Input
                    id="onboarding-canvas-token"
                    type="password"
                    placeholder="Paste your token..."
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    className="border-2 border-surface-900 py-6 font-bold focus:ring-accent-500"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex gap-4">
                  <Button variant="ghost" onClick={prevStep}>Back</Button>
                  {persona === 'student' ? (
                    <Button 
                      onClick={handleTestCanvas}
                      disabled={testingCanvas || !canvasUrl || !canvasToken}
                      className="flex-1 py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                    >
                      {testingCanvas ? 'Syncing...' : 'Verify & Sync'} <ArrowRight weight="bold" className="ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={nextStep}
                      className="flex-1 py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                    >
                      Next Step <ArrowRight weight="bold" className="ml-2" />
                    </Button>
                  )}
                </div>
                {persona === 'student' && (
                  <Button 
                    onClick={() => {
                      setCanvasItemsCount(12);
                      nextStep();
                    }} 
                    variant="ghost" 
                    className="w-full text-xs font-black uppercase text-surface-400 hover:text-surface-900 py-4"
                  >
                    Skip for now (I'll do it later)
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {/* STEP 7: PRIORITY_FOCUS */}
          {stepName === 'PRIORITY_FOCUS' && (
            <motion.div
              key="priority"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-4xl font-black uppercase tracking-tighter">
                  {persona === 'student' ? 'Which course is giving you the most grief?' : 'What is your highest priority right now?'}
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  Ollie will focus extra energy here.
                </p>
              </div>
              <Input
                value={priorityCourse}
                onChange={(e) => setPriorityCourse(e.target.value)}
                placeholder={persona === 'student' ? 'e.g. Organic Chemistry, CS101' : 'e.g. Project Launch, Client Work'}
                className="text-center text-xl font-black border-2 border-surface-900 py-8 focus:ring-brand-500 uppercase italic"
              />
              <div className="flex gap-4">
                <Button variant="ghost" onClick={prevStep} className="flex-1">Back</Button>
                <Button 
                  onClick={nextStep}
                  disabled={!priorityCourse}
                  className="flex-[2] py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  Focus on this <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 8: WEEKLY_GOAL */}
          {stepName === 'WEEKLY_GOAL' && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="w-full space-y-8 text-center"
            >
              <h1 className="text-4xl font-black uppercase tracking-tighter">
                {persona === 'student' ? 'How many assignments do you want to CRUSH this week?' : 'How many tasks do you want to CRUSH this week?'}
              </h1>
              <div className="flex flex-col items-center gap-8">
                <div className="text-7xl font-black italic tracking-tighter text-brand-500">
                  {weeklyGoal}
                </div>
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={weeklyGoal} 
                  onChange={(e) => setWeeklyGoal(parseInt(e.target.value))}
                  className="w-full h-4 bg-surface-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
                />
              </div>
              <div className="flex flex-col gap-4">
                <Button 
                  onClick={nextStep}
                  className="w-full py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  Set My Target <ArrowRight weight="bold" className="ml-2" />
                </Button>
                <Button variant="ghost" onClick={prevStep} className="w-full">Back</Button>
              </div>
            </motion.div>
          )}

          {/* STEP 9: ENERGY */}
          {stepName === 'ENERGY' && (
            <motion.div
              key="energy"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  When does your brain work?
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  We'll schedule your hardest tasks for your peak energy.
                </p>
              </div>

              <div className="grid gap-4">
                {[
                  { id: 'morning', label: 'Morning Person', icon: '☀️', desc: 'Focus peaks before 11 AM' },
                  { id: 'afternoon', label: 'Afternoon Grind', icon: '🌤️', desc: 'Second wind hits after lunch' },
                  { id: 'evening', label: 'Night Owl', icon: '🌙', desc: 'I work best when the world is quiet' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setEnergyPreference(opt.id); nextStep(); }}
                    className={`p-6 border-2 text-left transition-all flex items-center gap-4 ${
                      energyPreference === opt.id
                        ? 'border-brand-500 bg-brand-500/5 shadow-[4px_4px_0px_0px_var(--brand-500)]'
                        : 'border-surface-200 hover:border-surface-400 bg-surface-50'
                    }`}
                  >
                    <span className="text-3xl">{opt.icon}</span>
                    <div className="flex-1">
                      <h3 className="font-black uppercase tracking-tight">{opt.label}</h3>
                      <p className="text-[10px] font-bold text-surface-500 uppercase">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button variant="ghost" onClick={prevStep} className="w-full">Back</Button>
            </motion.div>
          )}

          {/* STEP 10: PREVIEW */}
          {stepName === 'PREVIEW' && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  Look at your week.
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  It's already handled. Ollie is building your plan right now.
                </p>
              </div>

              <div className="p-8 bg-white border-4 border-surface-900 shadow-[8px_8px_0px_0px_var(--surface-900)] space-y-6 relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-brand-500/10 p-4 border-2 border-brand-500 rounded-xl">
                    <SealCheck weight="fill" className="text-brand-500 size-8" />
                    <div>
                      <p className="font-black uppercase text-sm tracking-tight">
                        {canvasUrl ? `${canvasItemsCount} Assignments Synced` : `Demo Active: 12 Tasks`}
                      </p>
                      <p className="text-[10px] font-bold text-surface-500 uppercase">
                        {priorityCourse || (persona === 'student' ? 'Your classes' : 'Your focus')} is at the top of the list.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 opacity-30 grayscale">
                    <div className="h-4 w-full bg-surface-100 rounded-full" />
                    <div className="h-4 w-3/4 bg-surface-100 rounded-full" />
                    <div className="h-4 w-1/2 bg-surface-100 rounded-full" />
                  </div>
                </div>

                <div className="p-4 bg-accent-500 text-surface-900 rounded-xl font-black uppercase text-xs text-center italic">
                  "I've scheduled your heavy lifting for your {energyPreference} peak." — Ollie
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={prevStep} className="flex-1">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  See the Mission <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 11: TRANSPARENCY */}
          {stepName === 'TRANSPARENCY' && (
            <motion.div
              key="transparency"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-4xl font-black uppercase tracking-tighter">
                  Transparency & Trust.
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  No fake social proof. Just our promise to you.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="flex gap-4 items-start p-6 bg-surface-50 border-2 border-surface-200 rounded-2xl">
                  <ShieldCheck weight="fill" className="text-brand-500 size-8 shrink-0" />
                  <div>
                    <h3 className="font-black uppercase text-sm">Your Data is Yours</h3>
                    <p className="text-xs text-surface-500 font-bold uppercase leading-relaxed">
                      We never sell your academic data. Your Canvas connection is encrypted and used only to build your schedule.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-6 bg-surface-50 border-2 border-surface-200 rounded-2xl">
                  <Clock weight="fill" className="text-accent-500 size-8 shrink-0" />
                  <div>
                    <h3 className="font-black uppercase text-sm">One-Click Cancellation</h3>
                    <p className="text-xs text-surface-500 font-bold uppercase leading-relaxed">
                      If Plan Pilot doesn't change your productivity, you can cancel in one click from your settings. No hoops.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4 items-start p-6 bg-surface-50 border-2 border-surface-200 rounded-2xl">
                  <Heart weight="fill" className="text-red-500 size-8 shrink-0" />
                  <div>
                    <h3 className="font-black uppercase text-sm">Built for Busy Minds</h3>
                    <p className="text-xs text-surface-500 font-bold uppercase leading-relaxed">
                      Designed by high-performers who struggled with the same planning friction you feel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button variant="ghost" onClick={prevStep} className="flex-1">Back</Button>
                <Button 
                  onClick={nextStep}
                  className="flex-[2] py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)]"
                >
                  Finish Onboarding <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 11: PAYWALL */}
          {stepName === 'PAYWALL' && (
            <motion.div
              key="paywall"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
                  Ready to fly?
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  14 days of absolute focus, on us.
                </p>
              </div>

              <div className="glass p-10 bg-surface-900 text-white border-4 border-surface-900 shadow-[12px_12px_0px_0px_var(--accent-500)] relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] size-64 bg-accent-500/10 blur-[80px] rounded-full" />
                
                <div className="space-y-8 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter">Elite Pilot</h2>
                      <p className="text-accent-400 font-black uppercase text-xs">Full Academic Mastery</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black">$9.99</div>
                      <div className="text-[10px] font-bold uppercase text-surface-400">per month</div>
                    </div>
                  </div>

                  <ul className="space-y-4">
                    {[
                      "Unlimited AI Daily Scheduling",
                      "Full Canvas Mastery Sync",
                      "Ollie 24/7 Executive Assistant",
                      "Priority Focus Mode",
                      "Custom Priority Class Tuning"
                    ].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm font-black uppercase tracking-tight">
                        <CheckCircle weight="fill" className="text-accent-500 size-5" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6 space-y-4">
                    <Button 
                      onClick={handleCheckout}
                      disabled={loading}
                      className="w-full py-8 text-xl font-black uppercase tracking-widest bg-accent-500 hover:bg-accent-400 text-surface-900 shadow-[6px_6px_0px_0px_white]"
                    >
                      {loading ? 'Finalizing...' : 'Start 14-Day Free Trial'}
                    </Button>
                    <p className="text-[9px] text-center font-bold text-surface-500 uppercase tracking-widest">
                      Cancel anytime. No commitment. We'll email you before the trial ends.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <Button variant="ghost" onClick={prevStep} className="w-full text-[10px]">Back to Plan</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-[10px] font-bold text-surface-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <LockKey weight="bold" /> Securely synced with Supabase + Canvas
          </p>
        </div>
      </div>
    </div>
  );
}
