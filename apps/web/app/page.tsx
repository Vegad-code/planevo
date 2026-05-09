'use client';

import Link from 'next/link';

import LandingHeader from '@/components/LandingHeader';
import { Hero } from '@/components/ui/animated-hero';
import Pricing from '@/components/ui/pricing-base';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarBlank, Target, ChatCircleDots, ArrowRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';
import { OllieMascot } from '@/components/OllieMascot';

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.6, ease: "easeOut" }
};

const staggerContainer = {
  initial: { opacity: 0 },
  whileInView: { opacity: 1, transition: { staggerChildren: 0.1 } },
  viewport: { once: true }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-900 text-foreground font-sans selection:bg-brand-500 selection:text-white overflow-x-hidden">
      <LandingHeader />

      {/* Hero Section */}
      <Hero />

      {/* Problem Section: Focus on Student Anxiety */}
      <section className="py-24 relative border-b border-white/5 bg-surface-900 overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto px-6 text-center"
          {...fadeInUp}
        >
          <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-8 border border-brand-500/20 rounded-full">
            The Reality Check
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter leading-none">
            Your brain wasn&apos;t built to store deadlines.
          </h2>
          <p className="text-xl text-surface-400 mb-16 font-medium max-w-2xl mx-auto leading-relaxed">
            The constant mental load of &quot;what next?&quot; is what causes burnout. You don&apos;t need another passive database — you need a system that clarifies your next move.
          </p>
          <motion.div 
            className="grid md:grid-cols-3 gap-8 text-left"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              { title: "Cognitive Load", desc: "Constant mental tracking of deadlines drains your energy before you even start the work." },
              { title: "Decision Fatigue", desc: "Spending 30 minutes deciding what to study is 30 minutes of lost progress." },
              { title: "The Anxiety Loop", desc: "Missed tasks turn into red badges that make you want to avoid your planner entirely." }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                className="bg-white/5 p-8 border border-white/10 rounded-2xl group hover:bg-white/[0.08] transition-colors"
                variants={fadeInUp}
              >
                <div className="w-12 h-12 bg-white/10 text-white flex items-center justify-center rounded-lg mb-6 group-hover:bg-brand-500 transition-colors">
                  <span className="font-black text-lg">{i + 1}</span>
                </div>
                <h3 className="text-white font-black mb-3 uppercase tracking-tight">{item.title}</h3>
                <p className="text-surface-500 text-sm leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Solution Section: The Pilot Difference */}
      <section className="py-24 relative bg-surface-900 border-b border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            className="flex-1 space-y-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-brand-400 font-black tracking-widest text-sm uppercase border-b-2 border-brand-500/50 inline-block pb-1">The Daily Plan</div>
            <h2 className="text-4xl md:text-7xl font-black text-white leading-[0.9] uppercase tracking-tighter">
              Less setup.<br /><span className="text-accent-500">More clarity.</span>
            </h2>
            <p className="text-xl text-surface-400 leading-relaxed font-medium">
              Plan Pilot brings Canvas, calendar, and tasks into one Daily Plan. Stop staring at a list of 50 things and start focusing on the one that matters.
            </p>
            <ul className="space-y-6 pt-4">
              {[
                { text: 'Unified View: Canvas, Calendar, and Tasks in one place', color: 'bg-brand-500/20 text-brand-400' },
                { text: 'Daily Plan: Generate a schedule around your energy', color: 'bg-accent-500/20 text-accent-400' },
                { text: 'No-Shame Rollover: Roll work forward without guilt', color: 'bg-success/20 text-success' }
              ].map((feature, i) => (
                <motion.li 
                  key={i} 
                  className="flex items-center gap-4 text-white font-black uppercase tracking-tight group"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                >
                  <div className={`w-8 h-8 ${feature.color} border border-white/10 rounded-full flex items-center justify-center group-hover:scale-125 transition-transform`}>
                    <CheckCircle weight="bold" className="w-5 h-5" />
                  </div>
                  {feature.text}
                </motion.li>
              ))}
            </ul>
          </motion.div>
          <motion.div 
            className="flex-1 w-full relative"
            initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            viewport={{ once: true }}
            transition={{ type: "spring", duration: 1 }}
          >
            <div className="relative bg-white/5 p-12 border border-white/10 shadow-2xl flex flex-col items-center text-center rounded-[3rem] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-500 to-accent-500" />
              <OllieMascot pose="syncing" className="mb-4 scale-75" />
              <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tighter">Status: Optimized.</h3>
              <p className="text-surface-400 font-medium leading-relaxed text-lg">
                &quot;I&quot;ve brought in your new deadlines. Your Daily Plan is ready for today — organized to help you stay focused.&quot;
              </p>
              <div className="mt-8 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-surface-500">System Ready</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 relative bg-surface-900 border-b border-white/5 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center max-w-2xl mx-auto mb-20"
            {...fadeInUp}
          >
            <h2 className="text-4xl md:text-6xl font-black text-white mb-6 uppercase tracking-tighter leading-none">The Heart of Your Day.</h2>
            <p className="text-xl text-surface-400 font-medium">Features built to remove friction, not add to it.</p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-10"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              { icon: CalendarBlank, color: 'bg-brand-500/10 text-brand-400', title: "All Your Inputs", desc: "Connect Canvas, Google Calendar, and your task lists. See everything in one unified timeline." },
              { icon: Target, color: 'bg-accent-500/10 text-accent-400', title: "Guilt-Free Rollover", desc: "Missed a task? No problem. Roll it forward with one click and let Ollie find the next best time." },
              { icon: ChatCircleDots, color: 'bg-success/10 text-success', title: "Focus Mode", desc: "Dedicated space for your deep work sessions. No distractions, just you and the next action." }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                className="bg-white/5 p-10 border border-white/10 rounded-3xl group relative overflow-hidden hover:bg-white/[0.08] transition-colors"
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                <div className={`w-16 h-16 border border-white/10 ${feature.color} flex items-center justify-center mb-8 rounded-2xl group-hover:rotate-12 transition-transform`}>
                  <feature.icon weight="bold" className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-surface-500 font-medium leading-relaxed">
                  {feature.desc}
                </p>
                <div className="mt-8 flex items-center gap-2 text-white font-black text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <ArrowRight weight="bold" className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Concept */}
      <section className="py-24 relative overflow-hidden bg-surface-900 border-b border-white/5">
        <motion.div 
          className="max-w-4xl mx-auto px-6 text-center"
          {...fadeInUp}
        >
          <h2 className="text-4xl md:text-5xl font-black text-white mb-10 uppercase tracking-tighter">One Task at a Time.</h2>
          
          <div className="bg-white/5 p-2 border border-white/10 flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto shadow-2xl rounded-xl">
            <div className="flex-1 w-full px-6 py-3 text-left">
              <span className="text-white font-medium truncate block font-mono">&quot;Launch my portfolio website by Friday&quot;</span>
            </div>
            <Button size="lg" className="w-full md:w-auto uppercase font-black tracking-widest bg-white text-surface-900 hover:bg-brand-500 hover:text-white transition-all">
              Ollie, Breakdown
            </Button>
          </div>

          <div className="mt-12 text-left max-w-md mx-auto space-y-3">
            {[
              "Outline thesis statement (30m)",
              "Gather 5 primary sources (45m)",
              "Write introduction draft (40m)",
              "..."
            ].map((step, i) => (
              <motion.div 
                key={i} 
                className="bg-white/5 p-4 border border-white/10 shadow-lg flex items-center gap-4 rounded-xl"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-6 h-6 border border-white/20 bg-white/5 rounded-md" />
                <span className="text-white font-black uppercase text-sm">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative bg-surface-900 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-20"
            {...fadeInUp}
          >
            <h2 className="text-4xl md:text-6xl font-black text-white uppercase tracking-tighter">How it Works</h2>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-12 relative"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {/* Minimal Connector Line */}
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-px bg-white/10" />
            
            {[
              { step: "01", title: "Connect", desc: "Bring in your Canvas assignments, Google Calendar events, and personal tasks." },
              { step: "02", title: "Plan", desc: "Generate your Daily Plan based on your current energy and available time." },
              { step: "03", title: "Execute", desc: "Follow the plan. If things change, roll work forward without the guilt." }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                className="relative z-10 text-center bg-white/5 p-10 border border-white/10 shadow-xl rounded-[2.5rem] hover:bg-white/[0.08] transition-colors"
                variants={fadeInUp}
              >
                <div className="w-16 h-16 bg-white/10 text-white flex items-center justify-center text-2xl font-black mx-auto mb-8 rounded-2xl group-hover:bg-brand-500 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-2xl font-black text-white mb-3 uppercase tracking-tight">{item.title}</h3>
                <p className="text-surface-500 font-medium leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />      {/* Final CTA */}
      <section className="py-32 relative text-center bg-surface-900 border-b border-white/5 overflow-hidden">
        {/* Animated Orbs */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[100px] animate-pulse" />
        
        <motion.div 
            className="max-w-3xl mx-auto px-6 relative z-10"
            {...fadeInUp}
        >
          <h2 className="text-4xl md:text-7xl font-black text-white mb-8 uppercase tracking-tighter leading-none">
            Take Back Your Brain.
          </h2>
          <p className="text-2xl text-surface-400 font-medium mb-12 max-w-xl mx-auto leading-relaxed">
            Less setup than Notion. Less guilt than a to-do list. More guidance than a calendar.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
                href="/signup"
                className="inline-flex items-center justify-center px-12 py-6 text-xl font-black text-surface-900 bg-white hover:bg-brand-500 hover:text-white transition-all rounded-2xl shadow-2xl"
            >
                Get Started Free
            </Link>
          </motion.div>
          <p className="mt-8 text-xs text-surface-600 font-black uppercase tracking-widest">No credit card required. Ready in 60 seconds.</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-900 py-16 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦉</span>
            <span className="font-black text-2xl text-white uppercase tracking-widest">Plan Pilot</span>
          </div>
          <div className="flex gap-8 text-sm font-bold uppercase tracking-widest text-surface-500">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          </div>
          <div className="text-surface-600 font-black text-xs uppercase tracking-widest">
            (c) {new Date().getFullYear()} Plan Pilot.
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        <motion.div 
            className="md:hidden fixed bottom-8 inset-x-8 z-50"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
        >
            <Link
            href="/signup"
            className="flex items-center justify-center w-full px-6 py-5 text-lg font-black text-surface-100 bg-surface-900 border-2 border-surface-900 shadow-[6px_6px_0_0_var(--accent-500)] uppercase rounded-xl active:translate-y-1 active:shadow-none transition-all"
            >
            Start Free
            </Link>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
