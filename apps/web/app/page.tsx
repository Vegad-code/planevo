'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import LandingHeader from '@/components/landing/LandingHeader';
import { Check, ArrowRight } from '@phosphor-icons/react';

// Custom animation configs
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" as const }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1, transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

const heroLeftContainer = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const heroLeftItem = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } }
};

const timetableVariant = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.8, type: "spring" as const, damping: 15 } }
};

const brunoBubbleVariant = {
  initial: { opacity: 0, scale: 0.85, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { delay: 0.5, duration: 0.8, type: "spring" as const, stiffness: 180, damping: 12 } }
};

const conflictCardVariant = {
  initial: { opacity: 0, x: -60 },
  whileInView: { opacity: 1, x: 0, transition: { duration: 0.8, type: "spring" as const, damping: 15 } },
  viewport: { once: true, margin: "-100px" }
};

const brunoCardVariant = {
  initial: { opacity: 0, x: 60 },
  whileInView: { opacity: 1, x: 0, transition: { duration: 0.8, type: "spring" as const, damping: 15, delay: 0.1 } },
  viewport: { once: true, margin: "-100px" }
};

const featureCardVariant = (index: number) => ({
  initial: { opacity: 0, y: 40 },
  whileInView: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      duration: 0.7, 
      ease: "easeOut" as const, 
      delay: index * 0.15 
    } 
  },
  viewport: { once: true, margin: "-80px" }
});

const letterCardVariant = {
  initial: { opacity: 0, scale: 0.96, y: 30 },
  whileInView: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" as const } },
  viewport: { once: true, margin: "-100px" }
};

const pricingCardVariant = {
  initial: { opacity: 0, scale: 0.95 },
  whileInView: { opacity: 1, scale: 1, transition: { duration: 0.6, type: "spring" as const, damping: 15 } },
  viewport: { once: true, margin: "-100px" }
};

const adjectives = ["bend.", "breathe.", "flow.", "adapt.", "shift."];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<'life' | 'bruno'>('life');
  const [adjIndex, setAdjIndex] = useState(0);

  // Autoplay sequence for the demo tabs
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev === 'life' ? 'bruno' : 'life'));
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  // Adjective shuffler cycle
  useEffect(() => {
    const timer = setInterval(() => {
      setAdjIndex((prev) => (prev + 1) % adjectives.length);
    }, 2000);
    return () => clearInterval(timer);
  }, [adjectives.length]);

  return (
    <div className="min-h-screen bg-[var(--color-cream)] text-[var(--color-ink)] font-sans overflow-x-hidden pt-20 selection:bg-[var(--color-honey-soft)]">
      {/* Sticky Header Nav */}
      <LandingHeader />

      {/* ============================ HERO SECTION ============================ */}
      <section className="px-6 py-12 md:py-20 max-w-7xl mx-auto">
        <div className="bg-[var(--color-ink)] text-[var(--color-paper)] rounded-[40px] p-8 md:p-16 lg:p-20 relative overflow-hidden shadow-xl border border-[var(--color-line)]">
          {/* Subtle background glow spots */}
          <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-[var(--color-honey)]/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-20%] left-[-20%] w-[500px] h-[500px] bg-[var(--color-sage)]/10 blur-[120px] rounded-full pointer-events-none" />

          <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center relative z-10">
            {/* Hero Left Column */}
            <motion.div 
              variants={heroLeftContainer}
              initial="initial"
              animate="animate"
              className="lg:col-span-7 flex flex-col items-start text-left"
            >
              {/* Eyebrow */}
              <motion.div variants={heroLeftItem} className="flex items-center gap-2 mb-6 text-xs font-mono font-bold uppercase tracking-widest text-[var(--color-paper)]/50">
                <span>Introducing Planevo · A shame-free daily planner</span>
              </motion.div>

              {/* Title */}
              <motion.h1 variants={heroLeftItem} className="font-serif text-5xl md:text-7xl lg:text-[84px] font-normal leading-[0.95] tracking-tight mb-8">
                Plans that{" "}
                <span className="inline-block min-w-[200px] md:min-w-[280px] text-[var(--color-honey)] relative overflow-hidden" style={{ verticalAlign: 'bottom' }}>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={adjectives[adjIndex]}
                      initial={{ y: 40, opacity: 0, filter: 'blur(8px)' }}
                      animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                      exit={{ y: -40, opacity: 0, filter: 'blur(8px)' }}
                      transition={{ duration: 0.5, type: "spring", bounce: 0.4 }}
                      className="italic font-serif inline-block text-[var(--color-honey)]"
                    >
                      {adjectives[adjIndex]}
                    </motion.span>
                  </AnimatePresence>
                </span>
                <br />
                Never break.
              </motion.h1>

              {/* Subtitle */}
              <motion.p variants={heroLeftItem} className="text-base md:text-lg lg:text-xl font-sans leading-relaxed text-[var(--color-paper)]/85 max-w-lg mb-10">
                Planevo brings your Canvas, calendar, and to-dos into one Daily Plan — then Bruno quietly reshuffles your day the moment life gets in the way.
              </motion.p>

              {/* CTAs */}
              <motion.div variants={heroLeftItem} className="flex flex-col sm:flex-row gap-4 items-center mb-10 w-full sm:w-auto">
                <Link
                  href="/signup"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-sm font-mono font-bold text-[var(--color-ink)] bg-[var(--color-honey)] hover:bg-[var(--color-honey-soft)] active:scale-[0.98] transition-all uppercase rounded-xl shadow-lg tracking-widest text-center"
                >
                  Start your 14 days free <span className="ml-2 font-sans">→</span>
                </Link>
                <a
                  href="#magic"
                  className="w-full sm:w-auto inline-flex items-center justify-center text-sm font-mono font-bold text-[var(--color-paper)] hover:text-[var(--color-honey)] transition-colors uppercase tracking-widest text-center underline underline-offset-4 decoration-[var(--color-paper)]/40 hover:decoration-current py-2"
                >
                  Watch the 60-second tour
                </a>
              </motion.div>

              {/* Trust badges */}
              <motion.div variants={heroLeftItem} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-mono font-medium tracking-wider text-[var(--color-paper)]/50 border-t border-[var(--color-paper)]/10 pt-8 w-full">
                <span>$4.99 with .edu</span>
                <span className="h-1 w-1 bg-[var(--color-paper)]/30 rounded-full" />
                <span>No surprise charges</span>
                <span className="h-1 w-1 bg-[var(--color-paper)]/30 rounded-full" />
                <span>Cancel any time</span>
              </motion.div>
            </motion.div>

            {/* Hero Right Column */}
            <div className="lg:col-span-5 w-full relative mt-8 lg:mt-0 flex flex-col gap-6">
              {/* Daily Plan Simulation Widget */}
              <motion.div 
                variants={timetableVariant}
                initial="initial"
                animate="animate"
                className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[32px] p-6 md:p-8 text-[var(--color-ink)] shadow-xl relative z-10"
              >
                <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-4 mb-5">
                  <div className="font-serif text-xl md:text-2xl font-normal text-[var(--color-ink)]">
                    Friday <span className="text-[var(--color-ink-faint)] font-sans font-light">·</span> <span className="text-[var(--color-honey)] italic font-serif">May 22</span>
                  </div>
                  <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-sage)] font-bold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-sage)] shrink-0" /> PLAN UPDATED 2M AGO
                  </div>
                </div>

                <div className="flex flex-col gap-4 font-sans">
                  {/* Row 1 */}
                  <div className="flex items-start justify-between border-b border-[var(--color-line)] pb-4 text-left">
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-1 w-12 shrink-0">09:00</div>
                    <div className="flex-1 px-4">
                      <div className="text-sm md:text-base font-semibold text-[var(--color-ink)]">Calculus II — problem set 8</div>
                      <div className="text-[9px] font-mono text-[var(--color-ink-soft)]/50 mt-1 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-rose)] shrink-0" /> CANVAS <span className="text-[var(--color-ink-faint)] font-sans font-normal">·</span> DUE MON
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-1 text-right shrink-0">90m</div>
                  </div>

                  {/* Row 2 */}
                  <div className="flex items-start justify-between border-b border-[var(--color-line)] pb-4 text-left">
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-1 w-12 shrink-0">11:00</div>
                    <div className="flex-1 px-4">
                      <div className="text-sm md:text-base font-semibold text-[var(--color-ink)]">Bio lab meeting w/ Dr. Marin</div>
                      <div className="text-[9px] font-mono text-[var(--color-ink-soft)]/50 mt-1 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue)] shrink-0" /> CALENDAR <span className="text-[var(--color-ink-faint)] font-sans font-normal">·</span> RUNNING OVER
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-1 text-right shrink-0">60m</div>
                  </div>

                  {/* Row 3 (Moved) */}
                  <div className="flex items-start justify-between border-b border-[var(--color-line)] pb-4 text-left relative">
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/40 pt-1 w-12 shrink-0">14:00</div>
                    <div className="flex-1 px-4 relative">
                      {/* Red/rust strikeout line spanning the text exactly like in the mockup image */}
                      <div className="absolute top-[35%] left-4 right-0 h-[1.5px] bg-[#C56B5E] opacity-75 z-10" />
                      <div className="text-sm md:text-base font-semibold text-[var(--color-ink)]/55">History essay — first draft</div>
                      <div className="text-[9px] font-mono text-[var(--color-honey)] mt-1 uppercase tracking-widest font-bold">MOVED TO TOMORROW</div>
                    </div>
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/40 pt-1 text-right shrink-0 relative">
                      <div className="absolute top-[50%] left-0 right-0 h-[1.5px] bg-[#C56B5E] opacity-75 z-10" />
                      2h
                    </div>
                  </div>

                  {/* Row 4 (Added by Bruno) */}
                  <div className="flex items-start justify-between bg-[#FCF8EE] border border-[var(--color-honey)]/35 p-4 rounded-2xl relative text-left">
                    {/* NEW badge */}
                    <div className="absolute left-3 top-3.5 bg-[#D48D47] text-[var(--color-paper)] font-mono text-[8.5px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      NEW
                    </div>
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-5 w-12 shrink-0">14:00</div>
                    <div className="flex-1 px-4 pt-5 md:pt-0">
                      <div className="text-sm md:text-base font-semibold text-[var(--color-ink)]">Walk &amp; coffee with Sam</div>
                      <div className="text-[9px] font-mono text-[var(--color-ink-soft)]/50 mt-1 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-honey)] shrink-0" /> RECOVERY <span className="text-[var(--color-ink-faint)] font-sans font-normal">·</span> ADDED BY BRUNO
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/70 pt-5 text-right shrink-0">45m</div>
                  </div>

                  {/* Row 5 */}
                  <div className="flex items-start justify-between pb-1 text-left">
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-1 w-12 shrink-0">16:30</div>
                    <div className="flex-1 px-4">
                      <div className="text-sm md:text-base font-semibold text-[var(--color-ink)]">Gym — pull day</div>
                      <div className="text-[9px] font-mono text-[var(--color-ink-soft)]/50 mt-1 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-blue)] shrink-0" /> CALENDAR
                      </div>
                    </div>
                    <div className="text-xs font-mono text-[var(--color-ink-soft)]/60 pt-1 text-right shrink-0">60m</div>
                  </div>
                </div>
              </motion.div>

              {/* Bruno Speech Bubble - absolutely positioned to overlap bottom-right of the card on desktop */}
              <motion.div 
                variants={brunoBubbleVariant}
                initial="initial"
                animate="animate"
                className="w-full relative md:absolute md:-right-[30px] md:bottom-12 md:w-[240px] bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[16px] p-3 text-[10px] leading-relaxed text-[var(--color-ink)] flex items-start gap-2 shadow-2xl z-20"
              >
                {/* Bear head SVG in beautifully matching light background circle */}
                <div className="w-6 h-6 shrink-0 rounded-full bg-[#F5ECDB] p-0.5 flex items-center justify-center border border-[var(--color-line)] shadow-sm">
                  <svg className="w-full h-full" viewBox="0 0 48 48" aria-hidden="true">
                    <circle cx="14" cy="14" r="7" fill="#6B4423"/>
                    <circle cx="34" cy="14" r="7" fill="#6B4423"/>
                    <circle cx="14" cy="14" r="3.2" fill="#E8C896"/>
                    <circle cx="34" cy="14" r="3.2" fill="#E8C896"/>
                    <circle cx="24" cy="26" r="16" fill="#8B5A2B"/>
                    <ellipse cx="24" cy="30" rx="9" ry="7" fill="#E8C896"/>
                    <circle cx="19" cy="23" r="1.7" fill="#1A140D"/>
                    <circle cx="29" cy="23" r="1.7" fill="#1A140D"/>
                    <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="#1A140D"/>
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-mono text-[8px] uppercase tracking-widest text-[#B96E2A] mb-1 font-bold">
                    BRUNO <span className="text-[var(--color-ink-faint)] font-sans font-normal">·</span> JUST NOW
                  </div>
                  <p className="font-sans text-[var(--color-ink)]/90 leading-relaxed font-medium text-[11px]">
                    Lab ran long, so I parked your essay on tomorrow morning.
                  </p>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>



      {/* ============================ NO-SHAME ROLLOVER SECTION ============================ */}
      <section className="py-24 max-w-7xl mx-auto px-6" id="magic">
        <motion.div 
          className="text-center max-w-3xl mx-auto mb-16"
          {...fadeInUp}
        >
          <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-sage)] font-bold mb-4">
            No-Shame Rollover · The Bruno Difference
          </div>
          <h2 className="font-serif text-4xl md:text-6xl font-normal tracking-tight text-[var(--color-ink)] leading-tight">
            When plans slip, <span className="text-[var(--color-sage)] italic font-serif">we keep going.</span>
          </h2>
          <p className="text-base md:text-lg font-sans text-[var(--color-ink-soft)] mt-6 leading-relaxed max-w-xl mx-auto">
            No red overdue badges. No guilt screen. Bruno just looks at your week, finds the next best window, and quietly moves things forward.
          </p>
        </motion.div>

        {/* Dynamic Comparison Card */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-12 relative items-stretch max-w-5xl mx-auto overflow-hidden px-4 md:px-0">
          {/* Divider */}
          <div className="hidden md:block absolute left-1/2 top-10 bottom-10 w-px bg-[var(--color-line-strong)] -translate-x-1/2 z-0" />

          {/* Left Column: Life Happens */}
          <motion.div 
            variants={conflictCardVariant}
            initial="initial"
            whileInView="whileInView"
            viewport={conflictCardVariant.viewport}
            className={`bg-[var(--color-paper)] border border-[var(--color-line)] p-8 md:p-10 rounded-[32px] flex flex-col z-10 transition-all duration-300 relative cursor-pointer ${activeTab === 'life' ? 'shadow-lg border-[var(--color-rose)]/40 ring-1 ring-[var(--color-rose)]/20' : 'opacity-65'}`}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => setActiveTab('life')}
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-rose)]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">Life happens</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)] mb-3">11:34 AM · Friday</div>
            <h3 className="font-serif text-2xl md:text-3xl font-medium tracking-tight leading-tight mb-4">
              Lab meeting overran by 90 minutes.
            </h3>
            <p className="text-sm font-sans text-[var(--color-ink-soft)] mb-8 leading-relaxed">
              Your 2pm essay block is now impossible. In a normal planner, this turns red and stares at you. In Planevo, it&apos;s already handled.
            </p>

            <div className="bg-[var(--color-cream-2)]/30 border border-[var(--color-line)] rounded-2xl p-4 flex flex-col gap-3 font-sans mt-auto">
              <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-2">
                <span className="font-mono text-xs text-[var(--color-ink-soft)]">9:00</span>
                <span className="text-xs font-semibold flex-1 px-4">Calculus problem set</span>
                <span className="w-4" />
              </div>
              <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-2 text-[var(--color-rose)] font-semibold">
                <span className="font-mono text-xs text-[var(--color-rose)]/70">11:00</span>
                <span className="text-xs flex-1 px-4">Bio lab — still going</span>
                <span className="font-mono text-[9px] uppercase tracking-wider bg-[var(--color-rose-soft)] border border-[var(--color-rose)]/20 px-2 py-0.5 rounded-md font-bold">CONFLICT</span>
              </div>
              <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-2 opacity-50">
                <span className="font-mono text-xs">14:00</span>
                <span className="text-xs flex-1 px-4 line-through">History essay draft</span>
                <span className="font-mono text-[9px] uppercase tracking-wider bg-[var(--color-ink)]/5 border border-[var(--color-line)] px-2 py-0.5 rounded-md font-bold">BLOCKED</span>
              </div>
              <div className="flex items-center justify-between pb-1 opacity-70">
                <span className="font-mono text-xs">16:30</span>
                <span className="text-xs flex-1 px-4">Gym</span>
                <span className="w-4" />
              </div>
            </div>
          </motion.div>

          {/* Right Column: Bruno Reshuffled */}
          <motion.div 
            variants={brunoCardVariant}
            initial="initial"
            whileInView="whileInView"
            viewport={brunoCardVariant.viewport}
            className={`bg-[var(--color-paper)] border border-[var(--color-line)] p-8 md:p-10 rounded-[32px] flex flex-col z-10 transition-all duration-300 relative cursor-pointer ${activeTab === 'bruno' ? 'shadow-lg border-[var(--color-sage)]/40 ring-1 ring-[var(--color-sage)]/20' : 'opacity-65'}`}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => setActiveTab('bruno')}
          >
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-sage)]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">Bruno reshuffled</span>
            </div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)] mb-3">11:35 AM · 38 seconds later</div>
            <h3 className="font-serif text-2xl md:text-3xl font-medium tracking-tight leading-tight mb-4">
              Essay parked on tomorrow at 9:30am.
            </h3>
            <p className="text-sm font-sans text-[var(--color-ink-soft)] mb-8 leading-relaxed">
              Tomorrow is lighter and you write better in the morning. Bruno also slipped in a 45-min recovery walk — because the day was getting heavy.
            </p>

            <div className="bg-[var(--color-cream-2)]/30 border border-[var(--color-line)] rounded-2xl p-4 flex flex-col gap-3 font-sans mt-auto">
              <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-2">
                <span className="font-mono text-xs text-[var(--color-ink-soft)]">9:00</span>
                <span className="text-xs font-semibold flex-1 px-4">Calculus problem set</span>
                <span className="w-4" />
              </div>
              <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-2">
                <span className="font-mono text-xs text-[var(--color-ink-soft)]">11:00</span>
                <span className="text-xs font-semibold flex-1 px-4">Bio lab (extended)</span>
                <span className="w-4" />
              </div>
              <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-2 text-[var(--color-sage)] font-semibold">
                <span className="font-mono text-xs text-[var(--color-sage)]/70">14:00</span>
                <span className="text-xs flex-1 px-4">Walk &amp; coffee w/ Sam</span>
                <span className="font-mono text-[9px] uppercase tracking-wider bg-[var(--color-sage-soft)] border border-[var(--color-sage)]/20 px-2 py-0.5 rounded-md font-bold">+ ADDED</span>
              </div>
              <div className="flex items-center justify-between pb-1 text-[var(--color-honey-deep)] font-semibold">
                <span className="font-mono text-xs text-[var(--color-honey)]">tomorrow</span>
                <span className="text-xs flex-1 px-4">History essay draft</span>
                <span className="font-mono text-[9px] uppercase tracking-wider bg-[var(--color-honey-soft)] border border-[var(--color-honey)]/20 px-2 py-0.5 rounded-md font-bold">MOVED</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ============================ THE THREE MOVES SECTION ============================ */}
      <section className="py-24 border-t border-[var(--color-line)] bg-[var(--color-paper)]" id="pillars">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div 
            className="text-center max-w-3xl mx-auto mb-20"
            {...fadeInUp}
          >
            <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-honey-deep)] font-bold mb-4">
              Three Surfaces · One Quiet Workflow
            </div>
            <h2 className="font-serif text-4xl md:text-6xl font-normal tracking-tight text-[var(--color-ink)] leading-tight">
              The whole product, <span className="text-[var(--color-honey-deep)] italic font-serif">in three moves.</span>
            </h2>
            <p className="text-base md:text-lg font-sans text-[var(--color-ink-soft)] mt-6 leading-relaxed max-w-xl mx-auto">
              Connect once. Read your plan in the morning. Ask Bruno when something changes. That&apos;s it — no second-brain to maintain.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-10 md:gap-12 items-stretch">
            {/* Move 1: Connect Once */}
            <motion.div 
              variants={featureCardVariant(0)}
              initial="initial"
              whileInView="whileInView"
              viewport={featureCardVariant(0).viewport}
              whileHover={{ y: -8, scale: 1.02, borderColor: "var(--color-honey)", transition: { duration: 0.2, type: "spring" } }}
              className="bg-[var(--color-cream-2)]/20 border border-[var(--color-line)] p-8 md:p-10 rounded-[32px] flex flex-col transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[var(--color-honey)]/10 cursor-pointer"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-faint)] mb-8 font-semibold">
                — 01
              </div>
              <h3 className="font-serif text-3xl font-medium tracking-tight leading-tight mb-4">
                Connect <span className="text-[var(--color-honey-deep)] italic font-serif">once.</span>
              </h3>
              <p className="text-sm font-sans text-[var(--color-ink-soft)] mb-8 leading-relaxed">
                Canvas, Google Calendar, your task lists. Two clicks each. We pull deadlines and events — never your private docs.
              </p>

              {/* Sync Mockup Container */}
              <div className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-2xl p-6 mt-auto">
                <div className="flex flex-col gap-4 font-sans text-sm">
                  <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[var(--color-rose-soft)] text-[var(--color-rose)] flex items-center justify-center font-bold text-xs">C</span>
                      <span className="font-semibold">Canvas LMS</span>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-[var(--color-sage)] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[var(--color-blue-soft)] text-[var(--color-blue)] flex items-center justify-center font-bold text-xs">G</span>
                      <span className="font-semibold">Google Calendar</span>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-[var(--color-sage)] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-[var(--color-line)]/50 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)] flex items-center justify-center font-bold text-xs">T</span>
                      <span className="font-semibold">Tasks &amp; reminders</span>
                    </div>
                    <span className="w-5 h-5 rounded-full bg-[var(--color-sage)] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  </div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-ink-faint)] text-center mt-1">
                    3 of 3 synced · 24 items today
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Move 2: Plan Morning */}
            <motion.div 
              variants={featureCardVariant(1)}
              initial="initial"
              whileInView="whileInView"
              viewport={featureCardVariant(1).viewport}
              whileHover={{ y: -8, scale: 1.02, borderColor: "var(--color-honey)", transition: { duration: 0.2, type: "spring" } }}
              className="bg-[var(--color-cream-2)]/20 border border-[var(--color-line)] p-8 md:p-10 rounded-[32px] flex flex-col transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[var(--color-honey)]/10 cursor-pointer"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-faint)] mb-8 font-semibold">
                — 02
              </div>
              <h3 className="font-serif text-3xl font-medium tracking-tight leading-tight mb-4">
                One plan, <span className="text-[var(--color-honey-deep)] italic font-serif">every morning.</span>
              </h3>
              <p className="text-sm font-sans text-[var(--color-ink-soft)] mb-8 leading-relaxed">
                Bruno reads your week, asks when your brain is sharpest, then writes a focused plan you actually want to follow.
              </p>

              {/* Timetable Mockup Container */}
              <div className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-2xl p-6 mt-auto">
                <div className="flex flex-col gap-4 font-sans text-xs">
                  <div className="flex items-start gap-3 border-b border-[var(--color-line)]/40 pb-2">
                    <span className="font-mono text-[var(--color-ink-soft)]">09:00</span>
                    <div>
                      <div className="font-semibold text-sm">Deep work · Calc PS8</div>
                      <div className="text-[10px] font-mono text-[var(--color-ink-faint)] mt-0.5">90 minutes · phone away</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-b border-[var(--color-line)]/40 pb-2 bg-[var(--color-honey)]/5 p-2 rounded-lg border border-[var(--color-honey)]/10">
                    <span className="font-mono text-[var(--color-honey-deep)]">10:30</span>
                    <div>
                      <div className="font-bold text-[var(--color-honey-deep)] text-sm">Quick stretch · 10m</div>
                      <div className="text-[10px] font-mono text-[var(--color-honey-deep)]/75 mt-0.5">Bruno: don&apos;t skip this one</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 border-b border-[var(--color-line)]/40 pb-2">
                    <span className="font-mono text-[var(--color-ink-soft)]">11:00</span>
                    <div>
                      <div className="font-semibold text-sm">Lab meeting</div>
                      <div className="text-[10px] font-mono text-[var(--color-ink-faint)] mt-0.5">+ 60m on calendar</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 pb-1">
                    <span className="font-mono text-[var(--color-ink-soft)]">14:00</span>
                    <div>
                      <div className="font-semibold text-sm">Read &amp; outline · History</div>
                      <div className="text-[10px] font-mono text-[var(--color-ink-faint)] mt-0.5">Soft start · 45 min</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Move 3: Ask Bruno */}
            <motion.div 
              variants={featureCardVariant(2)}
              initial="initial"
              whileInView="whileInView"
              viewport={featureCardVariant(2).viewport}
              whileHover={{ y: -8, scale: 1.02, borderColor: "var(--color-honey)", transition: { duration: 0.2, type: "spring" } }}
              className="bg-[var(--color-cream-2)]/20 border border-[var(--color-line)] p-8 md:p-10 rounded-[32px] flex flex-col transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-[var(--color-honey)]/10 cursor-pointer"
            >
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-faint)] mb-8 font-semibold">
                — 03
              </div>
              <h3 className="font-serif text-3xl font-medium tracking-tight leading-tight mb-4">
                Ask Bruno, <span className="text-[var(--color-honey-deep)] italic font-serif">he handles it.</span>
              </h3>
              <p className="text-sm font-sans text-[var(--color-ink-soft)] mb-8 leading-relaxed">
                Move a task, break it down, reschedule the week. One conversation does what twelve calendar drags used to.
              </p>

              {/* Chat Container Mockup */}
              <div className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-2xl p-4 mt-auto">
                <div className="flex flex-col gap-3 font-sans text-[11px]">
                  <div className="bg-[var(--color-cream-2)]/30 border border-[var(--color-line)] self-end px-3.5 py-2.5 rounded-2xl rounded-tr-sm max-w-[85%] font-medium">
                    i&apos;m wrecked, push everything 2 hours
                  </div>
                  <div className="bg-[var(--color-honey)]/10 border border-[var(--color-honey)]/20 self-start px-3.5 py-2.5 rounded-2xl rounded-tl-sm max-w-[85%] font-medium text-[var(--color-honey-deep)] flex flex-col gap-1.5">
                    <span>Done — bumped your afternoon by 2 hours and pushed the essay to tomorrow morning.</span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--color-sage)] font-bold">moved 3 tasks · updated calendar</span>
                  </div>
                  <div className="border border-[var(--color-line-strong)] rounded-full px-4 py-2.5 flex items-center justify-between text-[var(--color-ink-faint)] mt-2">
                    <span>Tell Bruno what changed…</span>
                    <span className="w-5 h-5 rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] flex items-center justify-center text-xs font-bold font-sans pointer-events-none">↑</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============================ LETTER FROM BRUNO ============================ */}
      <section className="px-6 py-20 max-w-7xl mx-auto">
        <motion.div 
          variants={letterCardVariant}
          initial="initial"
          whileInView="whileInView"
          viewport={letterCardVariant.viewport}
          className="bg-[var(--color-bruno-deep)] text-[var(--color-paper)] rounded-[40px] p-8 md:p-16 lg:p-20 relative overflow-hidden border border-[var(--color-line)]"
        >
          <div className="grid md:grid-cols-12 gap-10 md:gap-16 items-center">
            {/* Bear Portrait Left */}
            <div className="md:col-span-4 flex justify-center">
              <svg viewBox="0 0 200 220" className="w-[180px] h-[200px] drop-shadow-xl" aria-hidden="true">
                <ellipse cx="100" cy="210" rx="58" ry="6" fill="rgba(0,0,0,0.18)"/>
                <circle cx="48" cy="42" r="22" fill="#4A2F18"/>
                <circle cx="152" cy="42" r="22" fill="#4A2F18"/>
                <circle cx="48" cy="44" r="10" fill="#C99A5F"/>
                <circle cx="152" cy="44" r="10" fill="#C99A5F"/>
                <ellipse cx="100" cy="160" rx="68" ry="58" fill="#5C3B1E"/>
                <ellipse cx="100" cy="170" rx="42" ry="40" fill="#E8C896"/>
                <circle cx="100" cy="80" r="56" fill="#5C3B1E"/>
                <ellipse cx="100" cy="92" rx="30" ry="22" fill="#E8C896"/>
                <circle cx="80" cy="72" r="4.5" fill="#1A140D"/>
                <circle cx="120" cy="72" r="4.5" fill="#1A140D"/>
                <circle cx="81.5" cy="70.5" r="1.5" fill="#FBF6EA"/>
                <circle cx="121.5" cy="70.5" r="1.5" fill="#FBF6EA"/>
                <ellipse cx="100" cy="86" rx="5" ry="3.5" fill="#1A140D"/>
                <path d="M 90 98 Q 100 104 110 98" stroke="#1A140D" strokeWidth="2.4" fill="none" strokeLinecap="round"/>
              </svg>
            </div>

            {/* Letter Text Right */}
            <div className="md:col-span-8 flex flex-col items-start text-left">
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-honey)] font-bold mb-4">
                A note from Bruno
              </div>
              <h2 className="font-serif text-3xl md:text-5xl font-normal leading-tight tracking-tight mb-8">
                I&apos;ll never <span className="text-[var(--color-honey)] italic font-serif">shame you</span><br />
                for a hard week.
              </h2>
              <div className="font-sans text-[var(--color-paper)]/85 text-base md:text-lg space-y-6 leading-relaxed max-w-xl">
                <p>
                  I&apos;m not here to make you feel behind. I&apos;m here to look at your calendar, your courses, and your energy — and quietly arrange tomorrow so the next right thing is obvious.
                </p>
                <p>
                  If a task slips, it doesn&apos;t turn red. It just moves. If a week falls apart, I rebuild it. Your job is to do the work. My job is to keep the plan honest.
                </p>
              </div>
              <div className="mt-8 font-serif text-2xl text-[var(--color-honey)] italic">
                — Bruno
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-paper)]/40 mt-2 font-medium">
                Your Planevo co-pilot · built with care for busy brains
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================ PRICING SECTION ============================ */}
      <section className="py-24 max-w-7xl mx-auto px-6" id="pricing">
        <motion.div 
          variants={pricingCardVariant}
          initial="initial"
          whileInView="whileInView"
          viewport={pricingCardVariant.viewport}
          className="bg-[var(--color-paper)] border border-[var(--color-line-strong)] rounded-[40px] p-8 md:p-12 lg:p-16 relative overflow-hidden shadow-xl max-w-5xl mx-auto"
        >
          <div className="grid md:grid-cols-12 gap-10 md:gap-12 lg:gap-16 items-center">
            {/* Pricing Left Column */}
            <div className="md:col-span-7 flex flex-col items-start text-left">
              <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-honey-deep)] font-bold mb-4">
                One price · No tiers · No upsells
              </div>
              <h2 className="font-serif text-3xl md:text-5xl font-normal tracking-tight text-[var(--color-ink)] leading-tight mb-6">
                Everything Bruno does.<br /><span className="text-[var(--color-honey-deep)] italic font-serif">$9.99 a month.</span>
              </h2>
              <p className="text-sm md:text-base font-sans text-[var(--color-ink-soft)] mb-8 leading-relaxed max-w-md">
                One product. One price. We don&apos;t believe in confusing tiers or &quot;premium AI&quot; upsells — the painkiller shouldn&apos;t have asterisks.
              </p>

              {/* Perks List */}
              <ul className="space-y-4 font-sans text-sm text-[var(--color-ink-soft)] font-medium">
                {[
                  'Daily Plan, generated each morning',
                  'Canvas + Google Calendar sync',
                  'Unlimited Bruno chat & rollovers',
                  'Weekly review email on Sundays',
                  'Mobile app · iOS & Android',
                  '14-day free trial · cancel any time'
                ].map((perk, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-[var(--color-sage-soft)] text-[var(--color-sage)] flex items-center justify-center shrink-0">
                      <Check weight="bold" className="w-3 h-3" />
                    </span>
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing Right Column (Price Tag) */}
            <div className="md:col-span-5 w-full flex flex-col items-center">
              <div className="w-full bg-[var(--color-ink)] text-[var(--color-paper)] rounded-3xl p-8 text-center relative border border-[var(--color-line-strong)] shadow-lg flex flex-col items-center justify-center min-h-[320px]">
                {/* Top Badge */}
                <div className="absolute top-0 -translate-y-1/2 bg-[var(--color-honey)] text-[var(--color-ink)] font-mono text-[9px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border border-[var(--color-ink)] shadow-md">
                  .EDU Saves 50%
                </div>

                <div className="font-serif text-6xl md:text-7xl font-normal text-[var(--color-paper)] mb-2">
                  $9.99
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-paper)]/50 mb-8 font-bold">
                  PER MONTH · BILLED MONTHLY
                </div>

                <Link
                  href="/signup"
                  className="w-full inline-flex items-center justify-center px-6 py-4 text-sm font-mono font-bold text-[var(--color-ink)] bg-[var(--color-honey)] hover:bg-[var(--color-honey-soft)] active:scale-[0.98] transition-all uppercase rounded-xl tracking-widest text-center"
                >
                  Start your 14 days
                </Link>

                <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-paper)]/40 mt-6 font-medium">
                  $4.99/mo with verified .edu email
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ============================ FINAL CTA ============================ */}
      <section className="py-24 text-center max-w-7xl mx-auto px-6">
        <div className="font-mono text-xs uppercase tracking-widest text-[var(--color-ink-soft)]/60 mb-4 font-bold">
          Less setup than Notion · Less guilt than a to-do list
        </div>
        <h2 className="font-serif text-5xl md:text-8xl font-normal tracking-tight text-[var(--color-ink)] mb-8">
          Let Bruno<br />
          <em className="text-[var(--color-honey-deep)] italic font-serif">plan it.</em>
        </h2>
        <p className="text-base md:text-lg font-sans text-[var(--color-ink-soft)] max-w-md mx-auto mb-10 leading-relaxed">
          Hand over the logistics. Get your brain back. Start your 14 days — no card required on the way in.
        </p>

        <Link
          href="/signup"
          className="inline-flex items-center justify-center px-10 py-5 text-sm font-mono font-bold text-[var(--color-paper)] bg-[var(--color-ink)] hover:bg-[var(--color-ink-2)] active:scale-[0.98] transition-all uppercase rounded-xl tracking-widest text-center shadow-lg"
        >
          Start free for 14 days <span className="ml-2 font-sans">→</span>
        </Link>

        <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-ink-faint)] mt-6 font-bold">
          $9.99/mo after · $4.99 with .edu · cancel any time
        </div>
      </section>

      {/* ============================ FOOTER ============================ */}
      <footer className="border-t border-[var(--color-line-strong)] py-16 bg-[var(--color-cream-2)]/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-12 gap-10 md:gap-16">
            {/* Left brand col */}
            <div className="md:col-span-5 flex flex-col items-start">
              <Link href="#" className="flex items-center gap-2 mb-4">
                <svg className="w-7 h-7" viewBox="0 0 48 48" aria-hidden="true">
                  <circle cx="14" cy="14" r="7" fill="#6B4423"/>
                  <circle cx="34" cy="14" r="7" fill="#6B4423"/>
                  <circle cx="14" cy="14" r="3.2" fill="#E8C896"/>
                  <circle cx="34" cy="14" r="3.2" fill="#E8C896"/>
                  <circle cx="24" cy="26" r="16" fill="#8B5A2B"/>
                  <ellipse cx="24" cy="30" rx="9" ry="7" fill="#E8C896"/>
                  <circle cx="19" cy="23" r="1.7" fill="#1A140D"/>
                  <circle cx="29" cy="23" r="1.7" fill="#1A140D"/>
                  <ellipse cx="24" cy="28" rx="1.8" ry="1.3" fill="#1A140D"/>
                </svg>
                <span className="font-serif font-bold text-2xl tracking-tight text-[var(--color-ink)]">
                  Plan<span className="font-normal font-serif">evo</span>
                </span>
              </Link>
              <p className="text-xs md:text-sm font-serif italic text-[var(--color-ink-soft)]/75 max-w-[280px] leading-relaxed">
                The planner that bends. Built for students &amp; builders who&apos;d rather do the work than plan it.
              </p>
            </div>

            {/* Right link cols */}
            <div className="md:col-span-7 grid grid-cols-3 gap-6 w-full">
              {/* Col 1 */}
              <div className="flex flex-col items-start gap-4">
                <h5 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)] font-bold">
                  Product
                </h5>
                <a href="#magic" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Daily Plan</a>
                <a href="#magic" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">No-Shame Rollover</a>
                <a href="#pillars" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Bruno Chat</a>
                <a href="#pricing" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Pricing</a>
              </div>

              {/* Col 2 */}
              <div className="flex flex-col items-start gap-4">
                <h5 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)] font-bold">
                  For you
                </h5>
                <a href="#students" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Students</a>
                <a href="#" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Builders</a>
                <a href="#" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Coaches</a>
                <a href="#" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Schools</a>
              </div>

              {/* Col 3 */}
              <div className="flex flex-col items-start gap-4">
                <h5 className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-ink-faint)] font-bold">
                  Company
                </h5>
                <a href="#" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">About</a>
                <Link href="/privacy" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Privacy</Link>
                <Link href="/terms" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Terms</Link>
                <Link href="/cookies" className="text-xs font-sans text-[var(--color-ink-soft)] hover:text-[var(--color-ink)] font-medium">Cookies</Link>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="border-t border-[var(--color-line)] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[10px] text-[var(--color-ink-faint)] font-bold uppercase tracking-widest">
            <span>© {new Date().getFullYear()} Planevo. Made for busy brains.</span>
            <span>v1.0 · status: calm</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
