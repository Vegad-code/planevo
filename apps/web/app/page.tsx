'use client';

import Link from 'next/link';

import OllieAvatar from '@/components/ollie/OllieAvatar';
import { Hero } from '@/components/ui/animated-hero';
import Pricing from '@/components/ui/pricing-base';
import LandingHeader from '@/components/landing/LandingHeader';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarBlank, Target, ChatCircleDots, ArrowRight } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-surface-900 selection:text-surface-100 overflow-x-hidden pt-20">
      <LandingHeader />

      {/* Hero Section */}
      <Hero />

      {/* Problem Section: Focus on Student Anxiety */}
      <section className="py-24 relative border-b-2 border-surface-900 bg-surface-200 overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto px-6 text-center"
          {...fadeInUp}
        >
          <div className="inline-flex items-center gap-2 bg-brand-300 text-surface-900 px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-8 border-2 border-surface-900 shadow-[2px_2px_0_0_var(--surface-900)]">
            One Next Action
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-surface-900 mb-6 uppercase tracking-tighter leading-none">
            Your brain wasn&apos;t built to store deadlines.
          </h2>
          <p className="text-xl text-surface-600 mb-16 font-bold max-w-2xl mx-auto leading-relaxed">
            The constant mental load of projects, deadlines, and daily tasks is what causes burnout. You don&apos;t need a passive database — you need a system that clarifies your next move.
          </p>
          <motion.div 
            className="grid md:grid-cols-3 gap-8 text-left"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              { title: "Cognitive Load", desc: "Constant mental tracking of &apos;what&apos;s next&apos; drains your energy before you even start the work." },
              { title: "Decision Fatigue", desc: "Spending 30 minutes deciding what to study is 30 minutes of lost progress." },
              { title: "The Anxiety Loop", desc: "Missed tasks turn into red badges that make you want to avoid your planner entirely." }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                className="bg-surface-100 p-8 border-2 border-surface-900 shadow-[6px_6px_0_0_var(--surface-900)] rounded-2xl group"
                variants={fadeInUp}
                whileHover={{ y: -10, shadow: "10px 10px 0 0 var(--surface-900)" }}
              >
                <div className="w-12 h-12 bg-surface-900 text-surface-100 flex items-center justify-center rounded-lg mb-6 group-hover:bg-accent-500 transition-colors">
                  <span className="font-black text-lg">{i + 1}</span>
                </div>
                <h3 className="text-surface-900 font-black mb-3 uppercase tracking-tight">{item.title}</h3>
                <p className="text-surface-600 text-sm leading-relaxed font-bold">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* Solution Section: The Pilot Difference */}
      <section className="py-24 relative bg-background border-b-2 border-surface-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <motion.div 
            className="flex-1 space-y-8"
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-surface-900 font-black tracking-widest text-sm uppercase border-b-4 border-accent-500 inline-block pb-1">The Daily Plan</div>
            <h2 className="text-4xl md:text-7xl font-black text-surface-900 leading-[0.9] uppercase tracking-tighter">
              Less setup.<br /><span className="text-accent-500">More clarity.</span>
            </h2>
            <p className="text-xl text-surface-600 leading-relaxed font-bold">
              Plan Pilot brings Canvas, calendar, tasks, and projects into one Daily Plan. Stop staring at a list of 50 things and start focusing on the one that matters.
            </p>
            <ul className="space-y-6 pt-4">
              {[
                { text: 'Unified View: Canvas, Calendar, and Tasks in one place', color: 'bg-brand-300' },
                { text: 'Daily Plan: Generate a schedule around your energy and availability', color: 'bg-accent-300' },
                { text: 'No-Shame Rollover: When plans slip, roll work forward without guilt', color: 'bg-success' }
              ].map((feature, i) => (
                <motion.li 
                  key={i} 
                  className="flex items-center gap-4 text-surface-900 font-black uppercase tracking-tight group"
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + (i * 0.1) }}
                >
                  <div className={`w-8 h-8 ${feature.color} border-2 border-surface-900 rounded-full flex items-center justify-center group-hover:scale-125 transition-transform`}>
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
            <div className="relative bg-surface-100 p-12 border-4 border-surface-900 shadow-[12px_12px_0_0_var(--surface-900)] flex flex-col items-center text-center rounded-[3rem] overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 via-accent-500 to-success" />
              <OllieAvatar mood="celebrating" size="xl" className="mb-8 scale-125" />
              <h3 className="text-2xl font-black text-surface-900 mb-4 uppercase tracking-tighter">Status: Optimized.</h3>
              <p className="text-surface-600 font-bold leading-relaxed text-lg">
                &quot;I&apos;ve brought in your new deadlines and meetings. Your Daily Plan is ready for today — organized to help you stay focused.&quot;
              </p>
              <div className="mt-8 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-black uppercase tracking-widest text-surface-400">System Ready</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 relative bg-surface-200 border-b-2 border-surface-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center max-w-2xl mx-auto mb-20"
            {...fadeInUp}
          >
            <h2 className="text-4xl md:text-6xl font-black text-surface-900 mb-6 uppercase tracking-tighter leading-none">The Heart of Your Day.</h2>
            <p className="text-xl text-surface-600 font-bold">Features built to remove friction, not add to it.</p>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-10"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              { icon: CalendarBlank, color: 'bg-brand-300', title: "All Your Inputs", desc: "Connect Canvas, Google Calendar, and your task lists. See everything in one unified timeline." },
              { icon: Target, color: 'bg-accent-300', title: "Guilt-Free Rollover", desc: "Missed a task? No problem. Roll it forward with one click and let Ollie find the next best time." },
              { icon: ChatCircleDots, color: 'bg-success', title: "Focus Mode", desc: "Dedicated space for your deep work sessions. No distractions, just you and the next action." }
            ].map((feature, i) => (
              <motion.div 
                key={i} 
                className="bg-surface-100 p-10 border-2 border-surface-900 shadow-[8px_8px_0_0_var(--surface-900)] rounded-3xl group relative overflow-hidden"
                variants={fadeInUp}
                whileHover={{ scale: 1.02, rotate: 1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-16 h-16 border-2 border-surface-900 ${feature.color} flex items-center justify-center text-surface-900 mb-8 rounded-2xl group-hover:rotate-12 transition-transform`}>
                  <feature.icon weight="bold" className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-surface-900 mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-surface-600 font-bold leading-relaxed">
                  {feature.desc}
                </p>
                <div className="mt-8 flex items-center gap-2 text-surface-900 font-black text-sm uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                  Learn More <ArrowRight weight="bold" className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Interactive Demo Concept */}
      <section className="py-24 relative overflow-hidden bg-background border-b-2 border-surface-900">
        <motion.div 
          className="max-w-4xl mx-auto px-6 text-center"
          {...fadeInUp}
        >
          <h2 className="text-4xl md:text-5xl font-black text-surface-900 mb-10 uppercase tracking-tighter">One Task at a Time.</h2>
          
          <div className="bg-surface-100 p-2 border-2 border-surface-900 flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto shadow-[8px_8px_0_0_var(--surface-900)] rounded-xl">
            <div className="flex-1 w-full px-6 py-3 text-left">
              <span className="text-surface-900 font-bold truncate block font-mono">&quot;Launch my portfolio website by Friday&quot;</span>
            </div>
            <Button size="lg" className="w-full md:w-auto uppercase font-black tracking-widest">
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
                className="bg-surface-200 p-4 border-2 border-surface-900 shadow-[4px_4px_0_0_var(--surface-900)] flex items-center gap-4 rounded-xl"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="w-6 h-6 border-2 border-surface-900 bg-surface-100 rounded-md" />
                <span className="text-surface-900 font-black uppercase text-sm">{step}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative bg-surface-200 border-b-2 border-surface-900">
        <div className="max-w-6xl mx-auto px-6">
          <motion.div 
            className="text-center mb-20"
            {...fadeInUp}
          >
            <h2 className="text-4xl md:text-6xl font-black text-surface-900 uppercase tracking-tighter">How it Works</h2>
          </motion.div>
          
          <motion.div 
            className="grid md:grid-cols-3 gap-12 relative"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {/* Brutalist Connector Line */}
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-1 bg-surface-900 opacity-20" />
            
            {[
              { step: "01", title: "Connect", desc: "Bring in your Canvas assignments, Google Calendar events, and personal tasks." },
              { step: "02", title: "Plan", desc: "Generate your Daily Plan based on your current energy and available time." },
              { step: "03", title: "Execute", desc: "Follow the plan. If things change, roll work forward without the guilt of a 'failed' list." }
            ].map((item, i) => (
              <motion.div 
                key={i} 
                className="relative z-10 text-center bg-surface-100 p-10 border-2 border-surface-900 shadow-[8px_8px_0_0_var(--surface-900)] rounded-[2.5rem]"
                variants={fadeInUp}
                whileHover={{ y: -10, rotate: i % 2 === 0 ? 1 : -1 }}
              >
                <div className="w-20 h-20 bg-surface-900 text-surface-100 flex items-center justify-center text-3xl font-black mx-auto mb-8 rounded-2xl group-hover:bg-accent-500 transition-colors">
                  {item.step}
                </div>
                <h3 className="text-2xl font-black text-surface-900 mb-3 uppercase tracking-tight">{item.title}</h3>
                <p className="text-surface-600 font-bold leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />

      {/* Final CTA */}
      <section className="py-32 relative text-center bg-brand-300 border-b-2 border-surface-900 overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 left-0 w-64 h-64 border-4 border-surface-900 rounded-full animate-ping" />
            <div className="absolute bottom-0 right-0 w-96 h-96 border-4 border-surface-900 rounded-full animate-ping delay-1000" />
        </div>
        <motion.div 
            className="max-w-3xl mx-auto px-6 relative z-10"
            {...fadeInUp}
        >
          <h2 className="text-4xl md:text-7xl font-black text-surface-900 mb-8 uppercase tracking-tighter leading-none">
            Take Back Your Brain.
          </h2>
          <p className="text-2xl text-surface-900 font-bold mb-12 max-w-xl mx-auto">
            Less setup than Notion. Less guilt than a to-do list. More guidance than a calendar.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
                href="/signup"
                className="inline-flex items-center justify-center px-12 py-6 text-xl font-black text-surface-100 bg-surface-900 hover:bg-surface-800 transition-all border-2 border-surface-900 shadow-[10px_10px_0_0_var(--accent-500)] uppercase rounded-2xl"
            >
                Get Started Free
            </Link>
          </motion.div>
          <p className="mt-8 text-xs text-surface-900 font-black uppercase tracking-widest">No credit card required. Ready to start in 60 seconds.</p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-16 border-t-2 border-surface-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🦉</span>
            <span className="font-black text-2xl text-foreground uppercase tracking-widest">Plan Pilot</span>
          </div>
          <div className="flex gap-8 text-sm font-black uppercase tracking-widest text-surface-500">
            <Link href="#features" className="hover:text-surface-900 transition-colors">Features</Link>
            <Link href="/pricing" className="hover:text-surface-900 transition-colors">Pricing</Link>
            <Link href="/privacy" className="hover:text-surface-900 transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-surface-900 transition-colors">Terms</Link>
            <Link href="/cookies" className="hover:text-surface-900 transition-colors">Cookies</Link>
          </div>
          <div className="text-surface-400 font-black text-xs uppercase tracking-widest">
            (c) {new Date().getFullYear()} Plan Pilot. All rights reserved.
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
