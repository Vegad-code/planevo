"use client";

import { motion, type Variants } from "framer-motion";
import { ArrowRight, Check, Lightning, Brain, ShieldCheck } from "@phosphor-icons/react";

export function PlanRevealStep({
  userName,
  isAnnual,
  setIsAnnual,
  onStartTrial,
  onContinueFree,
  isSaving,
  isEdu,
  googleCalendarConnected,
  profileType,
  energyPreference
}: {
  userName: string;
  isAnnual: boolean;
  setIsAnnual: (val: boolean) => void;
  onStartTrial: () => void;
  onContinueFree: () => void;
  isSaving: boolean;
  isEdu: boolean;
  googleCalendarConnected: boolean;
  profileType: string;
  energyPreference: string;
}) {
  const stagger: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const item: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", bounce: 0.4 } },
  };

  // Profile Specific Strategy Texts
  const isStudent = profileType === "student";
  const energyLabel = energyPreference.charAt(0).toUpperCase() + energyPreference.slice(1);
  
  let energyStrategy = "Scheduling deep work when you naturally focus best.";
  if (energyPreference === "morning") energyStrategy = "Protecting your 8am-11am window for deep work.";
  if (energyPreference === "afternoon") energyStrategy = "Reserving your 12pm-5pm block for maximum output.";
  if (energyPreference === "night") energyStrategy = "Keeping your late night hours sacred for deep work.";
  if (energyPreference === "chaos") energyStrategy = "Adapting dynamically to your shifting energy levels.";

  const profileStrategy = isStudent 
    ? "Auto-shifting tasks when classes or labs run late."
    : "Batching admin tasks to keep your project blocks clean.";

  // Standard Fake Events for Connected State
  const planItems = [
    { time: "9:00 AM", title: "Deep work block", meta: "High Energy" },
    { time: "11:30 AM", title: "Class / Meeting", meta: "Calendar" },
    { time: "2:00 PM", title: "Light Tasks", meta: "Low Energy" },
  ];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-5xl"
    >
      <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <motion.div variants={item}>
          {googleCalendarConnected ? (
             <>
               <h1 className="font-serif text-[44px] leading-tight sm:text-[52px]">
                 Your first <span className="italic text-[var(--color-honey-deep)]">plan</span>, {userName}.
               </h1>
               <p className="mt-4 text-lg text-[var(--color-ink-soft)]">
                 We&apos;ve set up the foundations of your week. With Planevo, you&apos;ll always know exactly what to do next.
               </p>

               <div className="mt-8 overflow-hidden rounded-[32px] border border-[var(--color-line)] bg-[var(--color-paper)] p-2 shadow-[0_20px_50px_rgba(26,20,13,0.05)]">
                  <div className="rounded-[24px] bg-[var(--color-cream)] p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="font-serif text-2xl">Today</h3>
                      <span className="rounded-full bg-[var(--color-honey-soft)] px-3 py-1 text-xs font-bold uppercase tracking-wider text-[var(--color-honey-deep)]">Preview</span>
                    </div>
                    
                    <div className="space-y-4">
                      {planItems.map((p, idx) => (
                        <motion.div 
                          key={idx}
                          whileHover={{ x: 4 }}
                          className="flex items-center gap-4 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper)] p-4 shadow-sm transition hover:border-[var(--color-honey)]"
                        >
                          <div className="w-[68px] font-mono text-xs font-medium text-[var(--color-ink-soft)]">{p.time}</div>
                          <div className="h-8 w-1 rounded-full bg-[var(--color-honey)]" />
                          <div className="flex-1">
                            <div className="text-sm font-bold">{p.title}</div>
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-soft)]">{p.meta}</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
               </div>
             </>
          ) : (
            <>
               <h1 className="font-serif text-[44px] leading-tight sm:text-[52px]">
                 Your <span className="italic text-[var(--color-honey-deep)]">Strategy</span>, {userName}.
               </h1>
               <p className="mt-4 text-lg text-[var(--color-ink-soft)]">
                 Since you&apos;re connecting your calendar later, here is how Bruno will orchestrate your week as a {isStudent ? "Student" : "Builder"}.
               </p>

               <div className="mt-8 space-y-4">
                 <motion.div whileHover={{ scale: 1.02 }} className="flex gap-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-sm">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)]">
                     <Lightning size={24} weight="fill" />
                   </div>
                   <div>
                     <h3 className="font-serif text-xl">{energyLabel} Focus</h3>
                     <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{energyStrategy}</p>
                   </div>
                 </motion.div>

                 <motion.div whileHover={{ scale: 1.02 }} className="flex gap-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-sm">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-blue-soft)] text-[var(--color-blue)]">
                     <Brain size={24} weight="fill" />
                   </div>
                   <div>
                     <h3 className="font-serif text-xl">Smart Automation</h3>
                     <p className="mt-1 text-sm text-[var(--color-ink-soft)]">{profileStrategy}</p>
                   </div>
                 </motion.div>

                 <motion.div whileHover={{ scale: 1.02 }} className="flex gap-5 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 shadow-sm">
                   <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-sage-soft)] text-[var(--color-sage)]">
                     <ShieldCheck size={24} weight="fill" />
                   </div>
                   <div>
                     <h3 className="font-serif text-xl">No-Shame Rollover</h3>
                     <p className="mt-1 text-sm text-[var(--color-ink-soft)]">When life happens, unfinished tasks safely roll to tomorrow.</p>
                   </div>
                 </motion.div>
               </div>
            </>
          )}
        </motion.div>

        <motion.div variants={item} className="flex flex-col justify-center">
          <div className="rounded-[32px] bg-[var(--color-ink)] p-8 text-[var(--color-paper)] shadow-2xl">
            <h2 className="font-serif text-3xl">Ready to begin?</h2>
            <p className="mt-2 text-[var(--color-ink-faint)]">14 days free. Cancel anytime.</p>
            
            <div className="mt-8 border-t border-white/10 pt-8">
              <div className="font-serif text-5xl">$0 <span className="text-xl text-white/55">/ 14 days</span></div>
              <div className="mt-2 font-mono text-xs uppercase tracking-widest text-[var(--color-honey)]">
                Then {isAnnual ? "$79.00/yr" : (isEdu ? "$4.99/mo" : "$9.99/mo")}
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-center gap-3 text-sm text-white/80"><Check size={18} className="text-[var(--color-honey)]" /> Auto-scheduling</div>
              <div className="flex items-center gap-3 text-sm text-white/80"><Check size={18} className="text-[var(--color-honey)]" /> Canvas & Calendar Sync</div>
              <div className="flex items-center gap-3 text-sm text-white/80"><Check size={18} className="text-[var(--color-honey)]" /> No-shame rollover</div>
            </div>

            <div className="mt-8 flex gap-2 rounded-full border border-white/20 p-1">
              <button
                type="button"
                onClick={() => setIsAnnual(false)}
                className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${!isAnnual ? "bg-white text-[var(--color-ink)]" : "text-white/60 hover:text-white"}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setIsAnnual(true)}
                className={`flex-1 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${isAnnual ? "bg-white text-[var(--color-ink)]" : "text-white/60 hover:text-white"}`}
              >
                Annual
              </button>
            </div>

            <button
              onClick={onStartTrial}
              disabled={isSaving}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-honey)] py-4 text-sm font-bold text-[var(--color-ink)] transition hover:bg-[var(--color-honey-deep)] disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Start my 14 days free"} <ArrowRight size={18} />
            </button>

            <button
              onClick={onContinueFree}
              disabled={isSaving}
              className="mt-4 block w-full text-center text-xs text-white/50 underline transition hover:text-white"
            >
              Or continue with the Free Plan
            </button>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
