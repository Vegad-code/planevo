'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { 
  CheckCircle, 
  GraduationCap, 
  Lightning, 
  CalendarBlank, 
  ArrowRight, 
  ShieldCheck, 
  Users, 
  Warning, 
  CaretRight,
  CaretLeft,
  LockKey
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';


const STEPS = [
  'IDENTITY',
  'BELONGING',
  'PROMISE',
  'CANVAS',
  'ENERGY',
  'PREVIEW',
  'PAYWALL'
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [identityChecks, setIdentityChecks] = useState<string[]>([]);
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [energyPreference, setEnergyPreference] = useState('');
  const [testingCanvas, setTestingCanvas] = useState(false);
  
  const [canvasItemsCount, setCanvasItemsCount] = useState(0);
  
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({
          onboarding_complete: true,
          energy_preference: energyPreference,
          canvas_url: canvasUrl,
          canvas_token: canvasToken
        })
        .eq('id', user.id);

      const hasCanvas = !!canvasToken;
      router.push(`/dashboard${hasCanvas ? '' : '?demo=true'}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save onboarding data');
    } finally {
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
      // Import action dynamically to avoid SSR issues if any
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


  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Progress Bar */}
        <div className="flex gap-2 mb-12">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStep ? 'bg-brand-500' : 'bg-surface-200'
              }`} 
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="step-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  Be honest — does this sound like you?
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  Select all that apply. No judgement here.
                </p>
              </div>

              <div className="grid gap-3">
                {[
                  "I missed at least one deadline last week.",
                  "I have 47+ browser tabs open right now.",
                  "I feel 'behind' the moment I wake up.",
                  "Planners usually work for me for exactly 3 days.",
                  "Canvas notifications feel like a personal attack."
                ].map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      if (identityChecks.includes(item)) {
                        setIdentityChecks(identityChecks.filter(i => i !== item));
                      } else {
                        setIdentityChecks([...identityChecks, item]);
                      }
                    }}
                    className={`p-6 border-2 text-left transition-all relative flex items-center gap-4 ${
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

              <Button 
                onClick={nextStep}
                disabled={identityChecks.length === 0}
                className="w-full py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] dark:shadow-[6px_6px_0px_0px_white]"
              >
                Continue <ArrowRight weight="bold" className="ml-2" />
              </Button>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div
              key="step-1"
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
                <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
                  You're exactly who we built this for.
                </h1>
                <p className="text-xl font-bold text-surface-600 max-w-lg mx-auto">
                  Plan Pilot isn't about "discipline." It's about offloading the mental tax of being a student to an AI that doesn't get tired.
                </p>
              </div>
              <Button 
                onClick={nextStep}
                className="px-12 py-8 text-xl font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] dark:shadow-[6px_6px_0px_0px_white]"
              >
                I'm ready <ArrowRight weight="bold" className="ml-2" />
              </Button>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <span className="px-4 py-1 bg-accent-500 text-surface-900 font-black uppercase text-xs rounded-full">The Promise</span>
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-tight">
                  Plan Pilot won't shame you when life slips.
                </h1>
              </div>

              <div className="glass p-8 border-2 border-surface-900 shadow-[8px_8px_0px_0px_var(--brand-500)] space-y-6">
                <div className="flex gap-4">
                  <div className="size-12 bg-surface-900 rounded-2xl flex items-center justify-center shrink-0">
                    <ShieldCheck weight="fill" className="text-accent-500 size-6" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg">Safe Haven Design</h3>
                    <p className="text-surface-500 font-bold text-sm uppercase leading-relaxed">
                      If you miss a task, Ollie doesn't send red notifications. He just quietly reorganizes tomorrow.
                    </p>
                  </div>
                </div>
                <hr className="border-surface-200" />
                <div className="flex gap-4">
                  <div className="size-12 bg-surface-900 rounded-2xl flex items-center justify-center shrink-0">
                    <Lightning weight="fill" className="text-brand-500 size-6" />
                  </div>
                  <div>
                    <h3 className="font-black uppercase tracking-tight text-lg">Zero-Willpower Required</h3>
                    <p className="text-surface-500 font-bold text-sm uppercase leading-relaxed">
                      We automate the "what do I do next?" question so you can save your energy for the actual work.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={prevStep} variant="outline" className="px-8 py-8 uppercase font-black border-2">
                  <CaretLeft weight="bold" />
                </Button>
                <Button 
                  onClick={nextStep}
                  className="flex-1 py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] dark:shadow-[6px_6px_0px_0px_white]"
                >
                  Understood <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  Connect Canvas.
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  This is where the magic happens. We'll pull your assignments into a calm, unified view.
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
                    className="border-2 border-surface-900 py-6 font-bold focus:ring-accent-500"
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

                <div className="bg-surface-50 border-2 border-surface-200 p-4 rounded-2xl space-y-3">
                  <p className="text-[10px] font-bold text-surface-500 uppercase leading-relaxed">
                    Account → Settings → Approved Integrations → + New Access Token. 
                    <br />Name it "Plan Pilot".
                  </p>
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-[10px] font-black uppercase text-brand-500 tracking-widest"
                    onClick={() => {
                      toast.info("Instructions sent to your email!", {
                        description: "Check your inbox for a step-by-step guide on finding your token."
                      });
                    }}
                  >
                    Email me the instructions
                  </Button>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={prevStep} variant="outline" className="px-8 py-8 uppercase font-black border-2">
                  <CaretLeft weight="bold" />
                </Button>
                <Button 
                  onClick={handleTestCanvas}
                  disabled={testingCanvas || !canvasUrl || !canvasToken}
                  className="flex-1 py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] dark:shadow-[6px_6px_0px_0px_white]"
                >
                  {testingCanvas ? 'Syncing...' : 'Verify & Sync'} <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
                <Button 
                  onClick={() => {
                    setCanvasItemsCount(12); // Sample count
                    nextStep();
                  }} 
                  variant="ghost" 
                  className="w-full text-xs font-black uppercase text-surface-400 hover:text-surface-900 transition-colors py-4"
                >
                  I don't have my token handy (Skip for now)
                </Button>

            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
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
                    onClick={() => setEnergyPreference(opt.id)}
                    className={`p-6 border-2 text-left transition-all flex items-center gap-4 ${
                      energyPreference === opt.id
                        ? 'border-accent-500 bg-accent-500/5 shadow-[4px_4px_0px_0px_var(--accent-500)]'
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

              <div className="flex gap-4">
                <Button onClick={prevStep} variant="outline" className="px-8 py-8 uppercase font-black border-2">
                  <CaretLeft weight="bold" />
                </Button>
                <Button 
                  onClick={nextStep}
                  disabled={!energyPreference}
                  className="flex-1 py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] dark:shadow-[6px_6px_0px_0px_white]"
                >
                  Lock it in <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h1 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  Look at your week.
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  It's already handled. Ollie is building your plan right now.
                </p>
              </div>

              <div className="brutalist-card p-8 bg-white border-4 border-surface-900 shadow-[8px_8px_0px_0px_var(--surface-900)] space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2">
                  <div className="size-12 bg-brand-500 rounded-full flex items-center justify-center text-white rotate-12 shadow-lg">
                    <Lightning weight="fill" size={24} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-black uppercase text-2xl tracking-tighter italic">Your Calm Schedule</h3>
                  <div className="h-1 w-24 bg-surface-900" />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 bg-surface-50 p-4 border-2 border-surface-900/10 rounded-xl">
                    <div className="size-10 rounded-lg bg-brand-500 flex items-center justify-center text-white shadow-sm">
                      <CheckCircle weight="bold" size={20} />
                    </div>
                    <div>
                      <p className="font-black uppercase text-sm tracking-tight">
                        {canvasUrl ? `Found ${canvasItemsCount} Assignments` : `Demo: 12 Sample Assignments`}
                      </p>
                      <p className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">
                        {canvasUrl ? 'Ollie is prioritizing by deadline...' : 'Connect Canvas later to see your real deadlines'}
                      </p>
                    </div>

                  </div>

                  <div className="space-y-2 opacity-50 grayscale">
                    <div className="flex gap-3 items-center">
                      <div className="size-3 bg-surface-200 rounded-full" />
                      <div className="h-3 w-40 bg-surface-100 rounded-full" />
                    </div>
                    <div className="flex gap-3 items-center">
                      <div className="size-3 bg-brand-500 rounded-full" />
                      <div className="h-3 w-56 bg-surface-100 rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-accent-500/10 border-2 border-accent-500 rounded-xl">
                  <p className="text-xs font-black uppercase tracking-tight text-accent-700">
                    Ollie's Advice: "Focus on your {energyPreference} peak for the heavy lifting. I've moved everything else out of your way."
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={prevStep} variant="outline" className="px-8 py-8 uppercase font-black border-2">
                  <CaretLeft weight="bold" />
                </Button>
                <Button 
                  onClick={nextStep}
                  className="flex-1 py-8 text-lg font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_var(--surface-900)] dark:shadow-[6px_6px_0px_0px_white]"
                >
                  Final Step <ArrowRight weight="bold" className="ml-2" />
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="space-y-4 text-center">
                <h1 className="text-6xl font-black uppercase tracking-tighter leading-none">
                  Ready to fly?
                </h1>
                <p className="text-surface-500 font-bold uppercase tracking-tight">
                  14 days of focus, on us.
                </p>
              </div>

              <div className="glass p-10 bg-surface-900 text-white border-4 border-surface-900 shadow-[12px_12px_0px_0px_var(--accent-500)] relative overflow-hidden">
                <div className="absolute top-[-20%] right-[-10%] size-64 bg-accent-500/10 blur-[80px] rounded-full" />
                
                <div className="space-y-8 relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-4xl font-black uppercase italic tracking-tighter">Plan Pilot Elite</h2>
                      <p className="text-accent-400 font-black uppercase text-xs">For Students Who Mean Business</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black">$9.99</div>
                      <div className="text-[10px] font-bold uppercase text-surface-400">per month</div>
                    </div>
                  </div>

                  <ul className="space-y-4">
                    {[
                      "Unlimited AI Daily Scheduling",
                      "Automated Canvas Sync",
                      "Google Calendar Integration",
                      "Ollie Chat (Executive Assistant)",
                      "No-Shame Rollover Logic"
                    ].map(item => (
                      <li key={item} className="flex items-center gap-3 text-sm font-black uppercase tracking-tight">
                        <CheckCircle weight="fill" className="text-accent-500 size-5" />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <div className="pt-6 space-y-4">
                    <Button 
                      onClick={completeOnboarding}
                      disabled={loading}
                      className="w-full py-8 text-xl font-black uppercase tracking-widest bg-accent-500 hover:bg-accent-400 text-surface-900 shadow-[6px_6px_0px_0px_white]"
                    >
                      {loading ? 'Finalizing...' : 'Start 14-Day Free Trial'}
                    </Button>
                    <p className="text-[9px] text-center font-bold text-surface-500 uppercase tracking-widest">
                      Cancel anytime. No commitment. You'll be notified 2 days before trial ends.
                    </p>
                  </div>
                </div>
              </div>

              <button 
                onClick={completeOnboarding}
                className="w-full text-center text-xs font-black uppercase text-surface-400 hover:text-surface-900 transition-colors"
              >
                I'll stick with the free version for now
              </button>
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
