'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useSubscription, redirectToCheckout } from '@/hooks/use-subscription';
import { Bruno } from '@/components/onboarding/Bruno';
import { BrunoBubble } from '@/components/onboarding/BrunoBubble';
import { testCanvasConnectionAction, saveOnboardingDataAction } from '@/lib/canvas/actions';

const STEPS = [
  'WELCOME',     // 01
  'IDENTITY',    // 02
  'NAME',        // 03
  'ENERGY',      // 04
  'CANVAS',      // 05
  'CALENDAR',    // 06
  'FIRST_PLAN',  // 07
  'TRIAL'        // 08
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Form State
  const [identityChecks, setIdentityChecks] = useState<Record<number, boolean>>({ 0: true, 2: true });
  const [userName, setUserName] = useState('');
  const [energyPreference, setEnergyPreference] = useState('morning');
  const [canvasUrl, setCanvasUrl] = useState('');
  const [canvasToken, setCanvasToken] = useState('');
  const [isAnnual, setIsAnnual] = useState(true);

  const [reactBump, setReactBump] = useState(0);
  const [testingCanvas, setTestingCanvas] = useState(false);
  const [canvasError, setCanvasError] = useState<string | null>(null);

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
          const isAdminEmail = authUser.email?.toLowerCase() === 'jabbouranthony720@gmail.com';
          const isActive = ['pro_monthly', 'pro_annual', 'trialing', 'premium'].includes(planType) || (planType === 'admin' && isAdminEmail) || isAdminEmail;
          
          if (isActive) {
            router.replace('/dashboard');
            return;
          } else {
            setCurrentStep(7); // Jump to Trial/Paywall
            setMounted(true);
            return;
          }
        }
      }
      
      const saved = localStorage.getItem('onboarding_draft');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.userName) setUserName(data.userName);
          if (data.identityChecks) setIdentityChecks(data.identityChecks);
          if (data.energyPreference) setEnergyPreference(data.energyPreference);
          if (data.currentStep && data.currentStep < 7) setCurrentStep(data.currentStep);
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
      identityChecks,
      energyPreference,
      currentStep
    };
    localStorage.setItem('onboarding_draft', JSON.stringify(draft));
  }, [userName, identityChecks, energyPreference, currentStep]);

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

  const saveOnboardingData = async () => {
    const res = await saveOnboardingDataAction({
      name: userName,
      energyPreference,
      canvasUrl,
      canvasToken,
      identityChecks
    });
    if (!res.success) {
      throw new Error(res.error || 'Failed to save onboarding data');
    }
    localStorage.removeItem('onboarding_draft');
  };

  const handleConnectCalendar = async () => {
    try {
      setLoading(true);
      const draft = {
        userName,
        identityChecks,
        energyPreference,
        currentStep: 6
      };
      localStorage.setItem('onboarding_draft', JSON.stringify(draft));
      
      const redirectTo = `${window.location.origin}/api/auth/callback/google-calendar?next=/onboarding`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          },
          scopes: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly'
        }
      });
      if (error) throw error;
    } catch (err) {
      console.error('Error connecting Google Calendar:', err);
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
      setLoading(false);
    }
  };

  const stepName = STEPS[currentStep];

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[var(--color-bruno)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] font-sans flex flex-col items-center justify-center overflow-hidden relative selection:bg-[var(--color-honey-soft)]">
      <div className="w-[720px] max-w-[100vw] h-[960px] max-h-[100vh] bg-[var(--color-cream)] flex flex-col relative overflow-hidden">
        
        {/* Onboard Chrome */}
        <div className="pt-6 px-8 relative z-10">
          <div className="flex justify-between items-center mb-3">
            <button 
              onClick={() => {
                if (currentStep > 0) prevStep();
                else window.location.href = '/';
              }} 
              className="bg-transparent border-none font-sans text-sm text-[var(--color-ink-soft)] cursor-pointer flex items-center gap-1.5 py-1.5 pr-2.5"
            >
              <span className="text-base">←</span> Back
            </button>
            <div className="text-right font-mono text-[11px] tracking-[0.16em] text-[var(--color-ink-soft)] uppercase">
              STEP {String(currentStep + 1).padStart(2, '0')} <span className="opacity-50">/ {String(STEPS.length).padStart(2, '0')}</span>
            </div>
          </div>
          <div className="h-1 bg-[rgba(26,20,13,0.08)] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[var(--color-honey)] rounded-full transition-all duration-600 ease-in-out" 
              style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 p-6 sm:px-12 pt-6 pb-5 flex flex-col overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            {/* STEP 1: WELCOME */}
            {stepName === 'WELCOME' && (
              <motion.div key="1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex-1 flex flex-col justify-center items-center">
                  <div className="bg-[var(--color-paper)] border border-[var(--color-line)] rounded-3xl py-6 px-8 mb-6 flex justify-center items-center">
                    <Bruno size={140} mood="happy" wave />
                  </div>
                  <div className="text-center max-w-[600px] mb-6 mx-auto">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-3.5 uppercase">WELCOME</div>
                    <h1 className="font-serif text-[46px] leading-[1.04] tracking-[-0.02em] m-0 font-normal text-[var(--color-ink)] text-balance">
                      Hi, I'm <em className="text-[var(--color-honey-deep)] not-italic">Bruno.</em><br/>Want me to plan your week?
                    </h1>
                    <p className="font-sans text-base text-[var(--color-ink-soft)] leading-[1.55] mt-[18px] text-pretty">
                      60 seconds of setup. Then I read your school, your calendar, and your to-dos — and quietly build your day every morning.
                    </p>
                  </div>
                </div>
                
                <div className="bg-[var(--color-paper)] rounded-[20px] border border-[var(--color-line)] p-5.5 max-w-[400px] mx-auto w-full">
                  <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-ink-soft)] mb-3.5 uppercase text-center">START FREE · 14 DAYS</div>
                  <div className="flex flex-col gap-2.5">
                    <button 
                      onClick={() => user ? nextStep() : router.push('/signup?redirect=onboarding')}
                      className="bg-[var(--color-ink)] text-[var(--color-paper)] border-none py-3.5 px-4 rounded-full font-sans text-sm font-medium cursor-pointer flex items-center justify-center gap-2.5 hover:scale-[1.02] transition-transform"
                    >
                      <span className="w-[22px] h-[22px] rounded-full bg-[var(--color-paper)] text-[var(--color-ink)] inline-flex items-center justify-center font-bold text-[13px] font-mono">G</span> 
                      Continue with Google
                    </button>
                    <button 
                      onClick={() => user ? nextStep() : router.push('/signup?redirect=onboarding')}
                      className="bg-transparent text-[var(--color-ink)] border border-[var(--color-line-strong)] py-3.5 px-4 rounded-full font-sans text-sm font-medium cursor-pointer hover:bg-[var(--color-line)] transition-colors"
                    >
                      Continue with email
                    </button>
                  </div>
                  <div className="text-[11px] text-[var(--color-ink-soft)] mt-3.5 text-center leading-[1.5]">
                    By continuing you agree to our <u>Terms</u> and <u>Privacy</u>.
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: IDENTITY */}
            {stepName === 'IDENTITY' && (
              <motion.div key="2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex items-center gap-4.5 mb-4.5">
                  <Bruno size={72} mood="curious" react={reactBump} />
                  <div className="flex-1">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-2 uppercase">HONESTLY · NO WRONG ANSWERS</div>
                    <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.02em] m-0 font-normal">
                      Which of these sound <em className="text-[var(--color-honey-deep)] not-italic">familiar?</em>
                    </h1>
                  </div>
                </div>
                <p className="text-[15px] text-[var(--color-ink-soft)] m-0 mb-4 leading-[1.55]">
                  Pick all that apply — I use these to figure out what's actually getting in your way.
                </p>

                <div className="flex flex-col gap-2.5">
                  {[
                    "I plan the perfect week, then real life happens by Tuesday.",
                    "I keep moving deadlines and feel a little worse each time.",
                    "I open my planner, see red badges, and close it again.",
                    "I waste real time deciding what to work on first.",
                    "I'm great at the work — I'm bad at the logistics."
                  ].map((o, i) => {
                    const on = !!identityChecks[i];
                    return (
                      <label 
                        key={i} 
                        onClick={() => {
                          setIdentityChecks(p => ({ ...p, [i]: !p[i] }));
                          setReactBump(r => r + 1);
                        }} 
                        className={`flex items-center gap-3.5 py-3.5 px-4.5 bg-[var(--color-paper)] rounded-[14px] cursor-pointer transition-all duration-150 ${on ? 'border-2 border-[var(--color-honey)] translate-x-[2px]' : 'border border-[var(--color-line)] translate-x-0'}`}
                      >
                        <div className={`w-[22px] h-[22px] rounded-md flex items-center justify-center shrink-0 transition-colors duration-150 ${on ? 'bg-[var(--color-honey)] border-none' : 'bg-transparent border-[1.5px] border-[var(--color-line-strong)]'}`}>
                          {on && <span className="text-[var(--color-ink)] text-[13px] font-bold">✓</span>}
                        </div>
                        <span className="text-[15px] leading-[1.4] select-none">{o}</span>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-3.5">
                  <BrunoBubble
                    tone="dark"
                    text={Object.values(identityChecks).filter(Boolean).length === 0
                      ? "Tap whichever ones ring true — no judgement."
                      : Object.values(identityChecks).filter(Boolean).length >= 3
                        ? "Oof — you're not lazy, that's a system problem. I can fix that."
                        : "Got it. You're not alone, by the way."}
                  />
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-6">
                  <button 
                    onClick={nextStep}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] hover:scale-[1.02] transition-transform"
                  >
                    That's me · continue <span className="ml-1.5">→</span>
                  </button>
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em] uppercase">
                    {Object.values(identityChecks).filter(Boolean).length} SELECTED
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: NAME */}
            {stepName === 'NAME' && (
              <motion.div key="3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex flex-col items-center flex-1 justify-center">
                  <Bruno size={120} mood={userName.length % 2 === 1 ? 'thinking' : 'happy'} className={userName.length > 0 ? 'tilt' : ''} />
                  
                  <div className="mt-6 text-center max-w-[600px]">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-3.5 uppercase">GOOD · YOU'RE EXACTLY WHO I'M FOR</div>
                    <h1 className="font-serif text-[46px] leading-[1.04] tracking-[-0.02em] m-0 font-normal">
                      What should I <em className="text-[var(--color-honey-deep)] not-italic">call</em> you?
                    </h1>
                    <p className="font-sans text-base text-[var(--color-ink-soft)] leading-[1.55] mt-[18px]">
                      I'll use this when I check in. No formal titles — just whatever your friends call you.
                    </p>
                  </div>

                  <div className="w-full max-w-[500px] mt-2">
                    <input
                      value={userName}
                      onChange={(e) => {
                        setUserName(e.target.value);
                      }}
                      placeholder="Type your name…"
                      className="w-full bg-[var(--color-paper)] border-2 border-[var(--color-honey)] rounded-[14px] py-4 px-5 font-serif text-[26px] text-[var(--color-ink)] outline-none tracking-[-0.01em] box-border focus:shadow-[0_0_0_4px_rgba(208,135,65,0.2)] transition-shadow"
                    />
                    <div className="mt-3.5">
                      <BrunoBubble
                        text={userName.trim() ? `Hey ${userName.trim()} — nice to meet you. I'll keep things light unless you tell me otherwise.` : "Whenever you're ready."}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-6">
                  <button 
                    onClick={nextStep}
                    disabled={!userName.trim()}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  >
                    Continue · 5 more steps <span className="ml-1.5">→</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 4: ENERGY */}
            {stepName === 'ENERGY' && (() => {
              const opts = [
                { id: 'morning',   label: 'Morning',           desc: 'I think clearest before 11 AM',           hours: '6 — 11',   ico: '☀️', mood: 'happy' as const },
                { id: 'afternoon', label: 'Afternoon',         desc: 'I hit my stride after lunch',             hours: '12 — 5',   ico: '🥪', mood: 'normal' as const },
                { id: 'night',     label: 'Night',             desc: 'My brain wakes up after 9 PM',            hours: '9 — 1',    ico: '🌙', mood: 'sleepy' as const },
                { id: 'chaos',     label: 'Honestly, it varies', desc: 'It changes day to day — Bruno adapts', hours: 'all day',  ico: '🎲', mood: 'curious' as const },
              ];
              const currentMood = opts.find(o => o.id === energyPreference)?.mood || 'normal';

              return (
              <motion.div key="4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex items-start gap-4.5 mb-4.5">
                  <Bruno size={80} mood={currentMood} react={reactBump} />
                  <div className="flex-1">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-2 uppercase">QUICK ONE</div>
                    <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.02em] m-0 font-normal">
                      When does your brain <em className="text-[var(--color-honey-deep)] not-italic">actually</em> work?
                    </h1>
                    <p className="text-[14px] text-[var(--color-ink-soft)] mt-2.5 mb-0 leading-[1.5]">
                      Not when you wish it did — when it really does. I'll put hard work in those windows.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mt-1.5">
                  {opts.map((o) => {
                    const on = energyPreference === o.id;
                    return (
                      <div 
                        key={o.id} 
                        onClick={() => { setEnergyPreference(o.id); setReactBump(b => b + 1); }} 
                        className={`flex items-center gap-4 py-4 px-5 bg-[var(--color-paper)] rounded-[14px] cursor-pointer transition-all duration-150 ${on ? 'border-2 border-[var(--color-honey)] scale-[1.01]' : 'border border-[var(--color-line)] scale-100'}`}
                      >
                        <div className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-[22px] ${on ? 'bg-[var(--color-honey-soft)]' : 'bg-[var(--color-cream)]'}`}>
                          {o.ico}
                        </div>
                        <div className="flex-1">
                          <div className="font-serif text-[22px] tracking-[-0.01em]">{o.label}</div>
                          <div className="text-[12px] text-[var(--color-ink-soft)] mt-0.5">{o.desc}</div>
                        </div>
                        <div className={`font-mono text-[11px] tracking-[0.08em] uppercase ${on ? 'text-[var(--color-honey-deep)]' : 'text-[var(--color-ink-soft)]'}`}>
                          {o.hours}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-6">
                  <button 
                    onClick={nextStep}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] hover:scale-[1.02] transition-transform"
                  >
                    Continue <span className="ml-1.5">→</span>
                  </button>
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em] uppercase">
                    Bruno picks the rest
                  </div>
                </div>
              </motion.div>
              );
            })()}

            {/* STEP 5: CANVAS */}
            {stepName === 'CANVAS' && (
              <motion.div key="5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex items-start gap-4.5 mb-4.5">
                  <Bruno size={80} mood="curious" className="peek" />
                  <div className="flex-1">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-2 uppercase">THE WOW MOMENT · 30 SECONDS</div>
                    <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.02em] m-0 font-normal">
                      Let me read your <em className="text-[var(--color-honey-deep)] not-italic">Canvas.</em>
                    </h1>
                    <p className="text-[14px] text-[var(--color-ink-soft)] mt-2.5 mb-0 leading-[1.5]">
                      I'll pull deadlines, quizzes, and class times — that's it. Never your essays, grades, or private docs.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--color-paper)] rounded-[18px] border border-[var(--color-line)] p-5.5 mt-2">
                  <div className="flex items-center gap-3.5 py-1">
                    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[var(--color-paper)] font-mono text-base font-semibold bg-[var(--color-rose)]">C</div>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium">Canvas LMS</div>
                      <input 
                        value={canvasUrl}
                        onChange={(e) => setCanvasUrl(e.target.value)}
                        placeholder="https://canvas.instructure.com"
                        className="text-[12px] text-[var(--color-ink)] mt-0.5 font-mono bg-[var(--color-cream)] border border-[var(--color-line)] rounded px-2 py-1 w-full outline-none focus:border-[var(--color-honey)]" 
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3.5 py-2 mt-2">
                    <div className="flex-1 pl-[52px]">
                      <input 
                        type="password"
                        value={canvasToken}
                        onChange={(e) => setCanvasToken(e.target.value)}
                        placeholder="Paste Access Token..."
                        className="text-[12px] text-[var(--color-ink)] font-mono bg-[var(--color-cream)] border border-[var(--color-line)] rounded px-2 py-1.5 w-full outline-none focus:border-[var(--color-honey)]" 
                      />
                    </div>
                  </div>

                  {canvasError && (
                    <div className="mt-3 bg-[rgba(235,94,85,0.08)] border border-[var(--color-rose)] text-[var(--color-rose)] rounded-xl p-3 text-[13px] flex items-center gap-2">
                      <span>⚠️</span> {canvasError}
                    </div>
                  )}

                  <div className="mt-5.5 p-4 bg-[var(--color-cream)] rounded-xl">
                    <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--color-ink-soft)] mb-3 uppercase">I'LL READ</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px]"><span className="text-[var(--color-sage)] font-bold text-[14px] w-4 inline-block">✓</span> Course names & assignment titles</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px]"><span className="text-[var(--color-sage)] font-bold text-[14px] w-4 inline-block">✓</span> Due dates & times</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px]"><span className="text-[var(--color-sage)] font-bold text-[14px] w-4 inline-block">✓</span> Class schedule</div>
                    <div className="font-mono text-[10px] tracking-[0.16em] text-[var(--color-ink-soft)] mt-3.5 mb-3 uppercase">I WON'T READ</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[var(--color-ink-soft)]"><span className="text-[var(--color-rose)] font-bold text-[14px] w-4 inline-block">×</span> Essays, submissions, or grades</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[var(--color-ink-soft)]"><span className="text-[var(--color-rose)] font-bold text-[14px] w-4 inline-block">×</span> Messages or discussion posts</div>
                  </div>
                </div>
                
                <div className="text-center mt-3.5">
                  <button onClick={nextStep} className="bg-transparent border-none text-[var(--color-ink-soft)] text-[13px] cursor-pointer underline p-1.5">
                    I'll connect later
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-4">
                  <button 
                    onClick={async () => {
                      if (canvasUrl && canvasToken) {
                        setTestingCanvas(true);
                        setCanvasError(null);
                        const isOk = await testCanvasConnectionAction(canvasUrl, canvasToken);
                        setTestingCanvas(false);
                        if (isOk) {
                          nextStep();
                        } else {
                          setCanvasError('Failed to connect. Please check your URL and Access Token.');
                        }
                      } else {
                        nextStep();
                      }
                    }}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] hover:scale-[1.02] transition-transform"
                  >
                    {testingCanvas ? 'Syncing...' : 'Connect Canvas · 30s'} <span className="ml-1.5">→</span>
                  </button>
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em] uppercase">
                    Encrypted in transit & at rest
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 6: CALENDAR */}
            {stepName === 'CALENDAR' && (
              <motion.div key="6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex items-start gap-4.5 mb-4.5">
                  <Bruno size={80} mood="thinking" />
                  <div className="flex-1">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-2 uppercase">ONE MORE · ALMOST THERE</div>
                    <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.02em] m-0 font-normal">
                      Now your <em className="text-[var(--color-honey-deep)] not-italic">calendar.</em>
                    </h1>
                    <p className="text-[14px] text-[var(--color-ink-soft)] mt-2.5 mb-0 leading-[1.5]">
                      So I don't schedule deep work over your bio lab. I read events, never meeting notes.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--color-paper)] rounded-[18px] border border-[var(--color-line)] p-5.5 mt-2">
                  <div className="flex items-center gap-3.5 py-1">
                    <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-[var(--color-paper)] font-mono text-base font-semibold bg-[var(--color-blue)]">G</div>
                    <div className="flex-1">
                      <div className="text-[14px] font-medium">Google Calendar</div>
                      <div className="text-[12px] text-[var(--color-ink-soft)] mt-0.5 font-mono">{user?.email || 'email@example.com'}</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3.5 px-4 bg-[var(--color-cream)] rounded-xl">
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px]"><span className="text-[var(--color-sage)] font-bold text-[14px] w-4 inline-block">✓</span> Event titles & times</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px]"><span className="text-[var(--color-sage)] font-bold text-[14px] w-4 inline-block">✓</span> Recurring class blocks</div>
                    <div className="flex items-center gap-2.5 py-1.5 text-[13px] text-[var(--color-ink-soft)]"><span className="text-[var(--color-rose)] font-bold text-[14px] w-4 inline-block">×</span> Meeting notes or attachments</div>
                  </div>
                </div>

                <div className="mt-3.5">
                  <BrunoBubble
                    tone="dark"
                    text="I'll look for empty windows between your classes and slot in the right work — never on top of your calendar."
                  />
                </div>
                
                <div className="text-center mt-3.5">
                  <button onClick={nextStep} className="bg-transparent border-none text-[var(--color-ink-soft)] text-[13px] cursor-pointer underline p-1.5">
                    I'll connect later
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-4">
                  <button 
                    onClick={handleConnectCalendar}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] hover:scale-[1.02] transition-transform"
                  >
                    Connect Calendar · 20s <span className="ml-1.5">→</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 7: FIRST PLAN */}
            {stepName === 'FIRST_PLAN' && (
              <motion.div key="7" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex items-start gap-4.5 mb-3.5">
                  <Bruno size={76} mood="happy" className="pop" />
                  <div className="flex-1">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-2 uppercase">HERE'S WHAT I FOUND</div>
                    <h1 className="font-serif text-[38px] leading-[1.05] tracking-[-0.02em] m-0 font-normal">
                      Your first <em className="text-[var(--color-honey-deep)] not-italic">plan</em>, {userName || 'Pilot'}.
                    </h1>
                    <p className="text-[13px] text-[var(--color-ink-soft)] mt-2 mb-0 leading-[1.5]">
                      23 items from Canvas + Calendar, built around your {energyPreference} energy. You can edit anything.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-1 mb-3.5">
                  <div className="bg-[var(--color-paper)] rounded-xl border border-[var(--color-line)] p-3 px-3.5 flex-1">
                    <div className="font-serif text-[26px] tracking-[-0.02em] leading-none text-[var(--color-ink)]">23</div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-soft)] tracking-[0.12em] mt-1.5 uppercase">ITEMS READ</div>
                  </div>
                  <div className="bg-[var(--color-paper)] rounded-xl border border-[var(--color-line)] p-3 px-3.5 flex-1">
                    <div className="font-serif text-[26px] tracking-[-0.02em] leading-none text-[var(--color-honey-deep)]">6</div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-soft)] tracking-[0.12em] mt-1.5 uppercase">BLOCKS PLANNED</div>
                  </div>
                  <div className="bg-[var(--color-paper)] rounded-xl border border-[var(--color-line)] p-3 px-3.5 flex-1">
                    <div className="font-serif text-[26px] tracking-[-0.02em] leading-none text-[var(--color-sage)]">2h 30m</div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-soft)] tracking-[0.12em] mt-1.5 uppercase">DEEP FOCUS</div>
                  </div>
                  <div className="bg-[var(--color-paper)] rounded-xl border border-[var(--color-line)] p-3 px-3.5 flex-1">
                    <div className="font-serif text-[26px] tracking-[-0.02em] leading-none text-[var(--color-rose)]">1</div>
                    <div className="font-mono text-[9px] text-[var(--color-ink-soft)] tracking-[0.12em] mt-1.5 uppercase">DUE THIS WEEK</div>
                  </div>
                </div>

                <div className="bg-[var(--color-paper)] rounded-2xl border border-[var(--color-line)] p-4.5">
                  <div className="flex justify-between items-center mb-2.5 pb-3 border-b border-[var(--color-line)]">
                    <div className="font-serif text-[20px]">Tomorrow · <em className="text-[var(--color-honey-deep)] not-italic">Tue May 19</em></div>
                    <div className="font-mono text-[10px] text-[var(--color-sage)] tracking-[0.1em] uppercase">● BRUNO BUILT THIS</div>
                  </div>
                  {[
                    { t: '09:00', dur: '90m', tx: 'Calculus PS8 — your morning sharp', src: 'var(--color-rose)', lbl: 'CANVAS · DUE WED' },
                    { t: '10:30', dur: '15m', tx: 'Stretch — phone away', src: 'var(--color-honey)', lbl: 'BRUNO RECOVERY' },
                    { t: '11:00', dur: '60m', tx: 'Bio lab w/ Dr. Marin', src: 'var(--color-blue)', lbl: 'CALENDAR' },
                    { t: '14:00', dur: '60m', tx: 'History reading + outline', src: 'var(--color-rose)', lbl: 'CANVAS · LIGHTER TIME' },
                  ].map((r, i) => (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <div className="font-mono text-[11px] text-[var(--color-ink-soft)] min-w-[44px]">{r.t}</div>
                      <div className="w-[3px] rounded-sm self-stretch" style={{ background: r.src }} />
                      <div className="flex-1">
                        <div className="text-[13px] font-medium">{r.tx}</div>
                        <div className="font-mono text-[9px] text-[var(--color-ink-soft)] tracking-[0.08em] mt-0.5">{r.lbl}</div>
                      </div>
                      <div className="font-mono text-[10px] text-[var(--color-ink-soft)]">{r.dur}</div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-6">
                  <button 
                    onClick={nextStep}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] hover:scale-[1.02] transition-transform"
                  >
                    Looks good — keep going <span className="ml-1.5">→</span>
                  </button>
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em] uppercase">
                    You can edit later · always
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 8: TRIAL */}
            {stepName === 'TRIAL' && (
              <motion.div key="8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className="flex-1 flex flex-col">
                <div className="flex flex-col items-center">
                  <Bruno size={86} mood="celebrating" className="pop" />
                  <div className="mt-3 text-center max-w-[600px] mb-6">
                    <div className="font-mono text-[11px] tracking-[0.18em] text-[var(--color-bruno-deep)] mb-3.5 uppercase">ONE LAST THING · 14 DAYS FREE</div>
                    <h1 className="font-serif text-[46px] leading-[1.04] tracking-[-0.02em] m-0 font-normal">
                      Keep Bruno <em className="text-[var(--color-honey-deep)] not-italic">on your side.</em>
                    </h1>
                    <p className="font-sans text-base text-[var(--color-ink-soft)] leading-[1.55] mt-[18px]">
                      14 days free. Then {user?.email?.toLowerCase().endsWith('.edu') ? '$4.99/mo' : '$9.99/mo'} — or $4.99 with your .edu email. Card on file so we keep planning the day you forget.
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--color-ink)] text-[var(--color-paper)] rounded-[18px] p-6 mb-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-mono text-[10px] tracking-[0.18em] text-[var(--color-honey)] mb-2 uppercase">PLANEVO · ALL OF IT</div>
                      <div className="font-serif text-[40px] text-[var(--color-paper)] tracking-[-0.025em] leading-none">
                        $0<span className="text-[18px] opacity-60 ml-1">· 14 days</span>
                      </div>
                      <div className="font-mono text-[11px] text-[rgba(251,246,234,0.5)] mt-1.5 tracking-[0.06em] uppercase">
                        THEN {user?.email?.toLowerCase().endsWith('.edu') ? '$4.99/MO' : '$9.99/MO'} · CANCEL ANY TIME
                      </div>
                    </div>
                    {user?.email?.toLowerCase().endsWith('.edu') && (
                      <div className="bg-[rgba(208,135,65,0.12)] border border-[rgba(208,135,65,0.3)] rounded-[10px] p-2.5 px-3.5 text-right">
                        <div className="font-mono text-[9px] tracking-[0.12em] text-[var(--color-honey)] uppercase">.EDU DETECTED</div>
                        <div className="font-serif text-[22px] text-[var(--color-paper)] mt-1">
                          $4.99<span className="text-[12px] opacity-60">/mo</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 mt-5.5 pt-4.5 border-t border-[rgba(251,246,234,0.1)]">
                    {[
                      'Daily Plan, written each morning',
                      'No-Shame Rollover when life slips',
                      'Unlimited Bruno chat & rescheduling',
                      'iOS & Android · sync everywhere',
                    ].map((p, i) => (
                      <div key={i} className="text-[12px] text-[rgba(251,246,234,0.75)] flex items-center gap-2">
                        <span className="text-[var(--color-honey)]">✓</span> {p}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-1.5 mt-2 bg-[var(--color-paper)] p-1 rounded-full border border-[var(--color-line)]">
                  <button 
                    onClick={() => setIsAnnual(false)} 
                    className={`flex-1 bg-transparent border-none py-2.5 px-3.5 rounded-full font-sans text-[13px] font-medium cursor-pointer transition-colors ${!isAnnual ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'text-[var(--color-ink-soft)]'}`}
                  >
                    Monthly <span className="opacity-60">· {user?.email?.toLowerCase().endsWith('.edu') ? '$4.99' : '$9.99'}</span>
                  </button>
                  <button 
                    onClick={() => setIsAnnual(true)} 
                    className={`flex-1 bg-transparent border-none py-2.5 px-3.5 rounded-full font-sans text-[13px] font-medium cursor-pointer transition-colors ${isAnnual ? 'bg-[var(--color-ink)] text-[var(--color-paper)]' : 'text-[var(--color-ink-soft)]'}`}
                  >
                    Annual <span className="bg-[var(--color-honey)] text-[var(--color-ink)] py-0.5 px-1.5 rounded text-[9px] font-mono ml-1">SAVE 34%</span>
                  </button>
                </div>

                <div className="flex flex-col items-center gap-3.5 mt-auto pt-6">
                  <button 
                    onClick={handleCheckout}
                    disabled={loading}
                    className="bg-[var(--color-honey)] text-[var(--color-ink)] border-none py-4 px-8 rounded-full font-sans text-[15px] font-medium cursor-pointer min-w-[280px] inline-flex items-center justify-center shadow-[0_1px_0_var(--color-honey-deep)] disabled:opacity-50 hover:scale-[1.02] transition-transform"
                  >
                    {loading ? 'Processing...' : 'Start my 14 days free'} <span className="ml-1.5">→</span>
                  </button>
                  <div className="font-mono text-[11px] text-[var(--color-ink-soft)] tracking-[0.1em] uppercase">
                    No charge until day 15 · email reminder
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Brand Footer */}
        <div className="pt-3.5 px-8 pb-5 flex justify-center">
          <span className="font-mono text-[10px] text-[var(--color-ink-faint)] tracking-[0.16em] uppercase">
            🔒 SECURE · PLANEVO
          </span>
        </div>
      </div>
    </div>
  );
}
