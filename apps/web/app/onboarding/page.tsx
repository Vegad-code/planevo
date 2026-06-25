"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { posthog } from "@/lib/posthog";
import { redirectToCheckout } from "@/hooks/use-subscription";
import { 
  saveOnboardingProgressAction, 
  saveOnboardingDataAction, 
  completeFreeOnboardingAction 
} from "@/lib/canvas/actions";

import { WelcomeIntentStep } from "@/components/onboarding/WelcomeIntentStep";
import { ConnectCalendarStep } from "@/components/onboarding/ConnectCalendarStep";
import { MagicLoadingStep } from "@/components/onboarding/MagicLoadingStep";
import { PlanRevealStep } from "@/components/onboarding/PlanRevealStep";
import { Bruno } from "@/components/onboarding/Bruno";
import { BrunoBubble } from "@/components/onboarding/BrunoBubble";
import { PlanevoLoader, LOADER_SPIN_MS } from "@/components/branding/PlanevoLoader";

const steps = ["welcome", "calendar", "building", "reveal"] as const;
type Step = (typeof steps)[number];

const storageKey = "planevo_onboarding_v3";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mounted, setMounted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [user, setUser] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [loaderMode, setLoaderMode] = useState<'loading' | 'complete'>('loading');
  const [showLoader, setShowLoader] = useState(true);
  const spinStartRef = useRef(0);

  useEffect(() => {
    spinStartRef.current = Date.now();
  }, []);

  // Form State
  const [userName, setUserName] = useState("");
  const [profileType, setProfileType] = useState("student");
  const [energyPreference, setEnergyPreference] = useState("morning");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [isAnnual, setIsAnnual] = useState(true);

  const step = steps[currentStep] as Step;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const isEdu = user?.email?.toLowerCase().endsWith(".edu") || false;

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);

      if (data.user?.user_metadata?.full_name && !userName) {
        setUserName(data.user.user_metadata.full_name);
      }

      if (data.user) {
        if (typeof window !== "undefined" && window.location.search.includes("checkout=success")) {
          setIsPolling(true);
          const pollInterval = setInterval(async () => {
            const { data: check } = await supabase.from("users").select("onboarding_complete").eq("id", data.user.id).single();
            if (check?.onboarding_complete) {
              clearInterval(pollInterval);
              router.replace("/dashboard");
            }
          }, 1500);
          // Set a timeout to stop polling after 10 seconds and just let them in (or show error)
          setTimeout(() => clearInterval(pollInterval), 10000);
          return;
        }

        const { data: profile } = await supabase
          .from("users")
          .select("name, onboarding_complete, energy_preference, google_calendar_connected, scheduling_preferences")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile?.name) setUserName(profile.name);
        if (profile?.energy_preference) setEnergyPreference(profile.energy_preference);
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prefs = profile?.scheduling_preferences as Record<string, any>;
        if (prefs?.onboarding_profile_type) setProfileType(prefs.onboarding_profile_type);

        if (profile?.google_calendar_connected) {
          setGoogleCalendarConnected(true);
        }
        if (profile?.onboarding_complete) {
          router.replace("/dashboard");
          return;
        }
      }

      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          if (typeof draft.currentStep === "number") setCurrentStep(Math.min(draft.currentStep, steps.length - 1));
          if (draft.userName) setUserName(draft.userName);
          if (draft.profileType) setProfileType(draft.profileType);
          if (draft.energyPreference) setEnergyPreference(draft.energyPreference);
          if (typeof draft.googleCalendarConnected === "boolean") setGoogleCalendarConnected(draft.googleCalendarConnected);
          if (typeof draft.isAnnual === "boolean") setIsAnnual(draft.isAnnual);
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }

      setMounted(true);
      posthog.capture("onboarding_v3_started");
    }

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        currentStep,
        userName,
        profileType,
        energyPreference,
        googleCalendarConnected,
        isAnnual,
      })
    );
  }, [mounted, currentStep, userName, profileType, energyPreference, googleCalendarConnected, isAnnual]);

  function goTo(nextStep: number) {
    setError(null);
    setCurrentStep(Math.max(0, Math.min(nextStep, steps.length - 1)));
  }

  async function handleWelcomeNext() {
    if (!user) {
      router.push("/signup?redirect=onboarding");
      return;
    }
    
    // Save progress to DB
    await saveOnboardingProgressAction({
      name: userName,
      profileType,
      energyPreference
    });
    
    posthog.capture("onboarding_v3_step_completed", { step: "welcome" });
    goTo(1); // to calendar
  }

  async function handleConnectCalendar() {
    if (!user) {
      router.push("/signup?redirect=onboarding");
      return;
    }

    setIsConnecting(true);
    // Move to next step locally so when we return we are past calendar
    window.localStorage.setItem(storageKey, JSON.stringify({
       currentStep: 2, userName, profileType, energyPreference, googleCalendarConnected: true, isAnnual 
    }));
    
    await saveOnboardingProgressAction({ googleCalendarConnected: true });

    const redirectTo = `${window.location.origin}/api/auth/callback/google-calendar?next=/onboarding`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        scopes: "https://www.googleapis.com/auth/calendar.readonly",
      },
    });

    if (authError) {
      setError(authError.message);
      setIsConnecting(false);
    }
  }

  async function handleSkipCalendar() {
    posthog.capture("onboarding_v3_step_skipped", { step: "calendar" });
    goTo(2); // to building
  }

  async function saveFinalSetup() {
    if (!user) {
      router.push("/signup?redirect=onboarding");
      return false;
    }

    setSaving(true);
    setError(null);
    const response = await saveOnboardingDataAction({
      name: userName,
      energyPreference,
      canvasUrl: "",
      canvasToken: "",
      identityChecks: {},
      profileType,
      calendarSkipped: !googleCalendarConnected,
      googleCalendarConnected,
    });

    if (!response.success) {
      setError(response.error || "Planevo could not complete that action. Please try again.");
      setSaving(false);
      return false;
    }

    // We no longer remove the localStorage here. This ensures that if a user clicks 
    // "Back" on the Stripe checkout page, they will return to Step 4 (Pricing) instead of Step 1.
    posthog.capture("onboarding_v3_completed", {
      profile_type: profileType,
      energy_preference: energyPreference,
      has_google_calendar: googleCalendarConnected
    });
    return true;
  }

  async function continueWithFreePlan() {
    const saved = await saveFinalSetup();
    if (!saved) return;
    try {
      const result = await completeFreeOnboardingAction();
      if (result.success) {
        window.localStorage.removeItem(storageKey);
        router.replace("/dashboard?onboarding=complete&plan=free");
      } else {
        setError(result.error || "Planevo could not complete that action. Please try again.");
        setSaving(false);
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      setError(e.message || "Could not complete onboarding. Try again.");
      setSaving(false);
    }
  }

  async function startTrial() {
    const saved = await saveFinalSetup();
    if (!saved) return;
    try {
      await redirectToCheckout(isAnnual ? "annual" : "monthly", {
        source: "onboarding_v3",
        returnPath: "/dashboard",
      });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (checkoutError: any) {
      setSaving(false);
      setError(checkoutError?.message || "Could not start checkout. Your setup is saved.");
    }
  }

  useEffect(() => {
    if (!mounted || isPolling) return;

    const elapsed = Date.now() - spinStartRef.current;
    const remaining = Math.max(0, LOADER_SPIN_MS - elapsed);
    const timer = window.setTimeout(() => {
      setLoaderMode('complete');
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [mounted, isPolling]);

  if (showLoader) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#111113]">
        <PlanevoLoader mode={loaderMode} onAnimationFinished={() => setShowLoader(false)} />
        {isPolling && (
          <p className="font-serif text-2xl text-paper animate-pulse absolute mt-40">
            Confirming your subscription...
          </p>
        )}
      </div>
    );
  }

  const showSidebar = step === "welcome" || step === "calendar";

  return (
    <main className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] selection:bg-[var(--color-honey)] selection:text-[var(--color-ink)]">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 border-b border-[var(--color-line)] bg-[var(--color-cream)]/90 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => (currentStep === 0 ? router.push("/") : goTo(currentStep - 1))}
              className={`text-sm font-medium transition ${step === "building" ? "invisible" : "text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]"}`}
            >
              Back
            </button>
            <div className="flex min-w-0 flex-1 flex-col gap-2 max-w-xs mx-auto">
              <div className="flex items-center justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-ink-soft)]">
                  Step {String(currentStep + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-[rgba(26,20,13,0.08)]">
                <div className="h-full rounded-full bg-[var(--color-honey)] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <Link href="/login" className={`text-sm font-medium transition ${user ? 'invisible' : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}`}>
              Sign in
            </Link>
          </div>
        </header>

        <section className={`grid flex-1 items-center gap-8 py-8 lg:py-12 ${showSidebar ? "lg:grid-cols-[0.9fr_1.1fr]" : "grid-cols-1"}`}>
          {showSidebar && (
            <aside className="hidden rounded-[32px] border border-[var(--color-line)] bg-[var(--color-paper)] p-8 lg:block shadow-sm">
              <div className="flex items-center gap-4">
                <Bruno size={108} mood={step === "calendar" ? "curious" : "happy"} wave={step === "welcome"} react={0} />
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-honey-deep)]">
                    Planevo Setup
                  </p>
                  <h2 className="mt-2 font-serif text-4xl leading-none">
                    First plan, then dashboard.
                  </h2>
                </div>
              </div>
              <div className="mt-8">
                <BrunoBubble
                  tone="cream"
                  text={
                    step === "calendar"
                      ? "Calendar tells me where not to put work. That is the difference between a planner and a useful planner."
                      : "We are not doing a generic tour. Every step helps me build a useful day for you."
                  }
                />
              </div>
            </aside>
          )}

          <div className="mx-auto w-full">
            {error && (
              <div className="mb-6 rounded-2xl border border-[var(--color-rose)] bg-[var(--color-rose-soft)] px-4 py-3 text-sm font-medium text-[var(--color-ink)] shadow-sm">
                {error}
              </div>
            )}

            {step === "welcome" && (
              <WelcomeIntentStep
                userName={userName}
                setUserName={setUserName}
                profileType={profileType}
                setProfileType={setProfileType}
                energyPreference={energyPreference}
                setEnergyPreference={setEnergyPreference}
                onNext={handleWelcomeNext}
              />
            )}

            {step === "calendar" && (
              <ConnectCalendarStep
                onConnect={handleConnectCalendar}
                onSkip={handleSkipCalendar}
                isConnecting={isConnecting}
              />
            )}

            {step === "building" && (
              <MagicLoadingStep onComplete={() => goTo(3)} />
            )}

            {step === "reveal" && (
              <PlanRevealStep
                userName={userName || user?.user_metadata?.full_name?.split(" ")[0] || "Pilot"}
                isAnnual={isAnnual}
                setIsAnnual={setIsAnnual}
                onStartTrial={startTrial}
                onContinueFree={continueWithFreePlan}
                isSaving={saving}
                isEdu={isEdu}
                googleCalendarConnected={googleCalendarConnected}
                profileType={profileType}
                energyPreference={energyPreference}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
