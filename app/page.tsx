'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { Hero } from '@/components/ui/animated-hero';
import Pricing from '@/components/ui/pricing-base';
import CardNav from '@/components/ui/CardNav';
import { Button } from '@/components/ui/button';
import { CheckCircle, CalendarBlank, Target, ChatCircleDots, ArrowRight, Sparkle } from '@phosphor-icons/react';
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

const cardHover = {
  whileHover: { 
    scale: 1.03, 
    y: -5,
    transition: { type: "spring", stiffness: 300 }
  },
  whileTap: { scale: 0.98 }
};

export default function LandingPage() {
  const navItems = [
    {
      label: "Product",
      bgColor: "var(--brand-500)",
      textColor: "#fff",
      links: [
        { label: "Features", href: "#features", ariaLabel: "View Features" },
        { label: "How it Works", href: "#how-it-works", ariaLabel: "How it Works" }
      ]
    },
    {
      label: "Pricing",
      bgColor: "var(--accent-500)",
      textColor: "var(--surface-900)",
      links: [
        { label: "Plans & Tiers", href: "/pricing", ariaLabel: "View Pricing Plans" },
        { label: "Free Trial", href: "/signup", ariaLabel: "Start Free Trial" }
      ]
    },
    {
      label: "Account",
      bgColor: "var(--surface-900)",
      textColor: "#fff",
      links: [
        { label: "Sign In", href: "/login", ariaLabel: "Sign In to Account" },
        { label: "Get Started", href: "/signup", ariaLabel: "Create New Account" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-surface-900 selection:text-surface-100 overflow-x-hidden">
      <CardNav 
        logo={<div className="flex items-center gap-2"><span className="text-xl">🦉</span><span className="font-black text-surface-900 uppercase tracking-widest text-sm hidden sm:block">Plan Pilot</span></div>}
        items={navItems}
        baseColor="var(--surface-50)"
        menuColor="var(--surface-900)"
        buttonBgColor="var(--surface-900)"
        buttonTextColor="var(--surface-50)"
        ctaText="Start Free"
        onCtaClick={() => window.location.href = '/signup'}
      />

      {/* Hero Section */}
      <Hero />

      {/* Problem Section: Focus on Student Anxiety */}
      <section className="py-24 relative border-b-2 border-surface-900 bg-surface-200 overflow-hidden">
        <motion.div 
          className="max-w-4xl mx-auto px-6 text-center"
          {...fadeInUp}
        >
          <div className="inline-flex items-center gap-2 bg-brand-300 text-surface-900 px-4 py-1.5 text-xs font-black uppercase tracking-widest mb-8 border-2 border-surface-900 shadow-[2px_2px_0_0_var(--surface-900)]">
            The Student Reality
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-surface-900 mb-6 uppercase tracking-tighter leading-none">
            Your brain wasn't built to store deadlines.
          </h2>
          <p className="text-xl text-surface-600 mb-16 font-bold max-w-2xl mx-auto leading-relaxed">
            The weight of 5 classes, 12 projects, and 30 deadlines is what causes burnout. You don't need a passive database — you need an active cockpit that clears your mind.
          </p>
          <motion.div 
            className="grid md:grid-cols-3 gap-8 text-left"
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            {[
              { title: "Cognitive Load", desc: "Constant mental tracking of 'what's next' drains your energy before you even start the work." },
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
            <div className="text-surface-900 font-black tracking-widest text-sm uppercase border-b-4 border-accent-500 inline-block pb-1">The Pilot Protocol</div>
            <h2 className="text-4xl md:text-7xl font-black text-surface-900 leading-[0.9] uppercase tracking-tighter">
              Stop organizing.<br /><span className="text-accent-500">Start flying.</span>
            </h2>
            <p className="text-xl text-surface-600 leading-relaxed font-bold">
              Plan Pilot doesn't just store your tasks. It reads your Canvas assignments, Google Calendar, and deadlines — then Ollie builds your entire day for you.
            </p>
            <ul className="space-y-6 pt-4">
              {[
                { text: 'Auto-Sync: Canvas & Google link in seconds', color: 'bg-brand-300' },
                { text: 'Dynamic Briefing: AI builds your Flight Plan daily', color: 'bg-accent-300' },
                { text: 'No-Shame Rollover: Chaos is handled automatically', color: 'bg-success' }
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
              <h3 className="text-2xl font-black text-surface-900 mb-4 uppercase tracking-tighter">Systems Check: Green.</h3>
              <p className="text-surface-600 font-bold leading-relaxed text-lg">
                "I've analyzed your 3 new Canvas assignments. Your Flight Plan for today has been adjusted to ensure you finish early."
              </p>
              <div className="mt-8 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-success animate-ping" />
                <span className="text-xs font-black uppercase tracking-widest text-surface-400">Live Optimization Active</span>
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
            <h2 className="text-4xl md:text-6xl font-black text-surface-900 mb-6 uppercase tracking-tighter leading-none">The Engine of Clarity.</h2>
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
              { icon: CalendarBlank, color: 'bg-brand-300', title: "Unified Briefing", desc: "Connect your academic world in one click. Ollie understands your deadlines and meetings automatically." },
              { icon: Target, color: 'bg-accent-300', title: "Smart Rollover", desc: "Life happens. Ollie finds the next open slot for missed tasks so you never feel behind." },
              { icon: ChatCircleDots, color: 'bg-success', title: "Deep Work Pilot", desc: "Ollie monitors your progress during focus sessions, keeping you anchored to the task at hand." }
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
          <h2 className="text-4xl md:text-5xl font-black text-surface-900 mb-10 uppercase tracking-tighter">Complexity, Deconstructed.</h2>
          
          <div className="bg-surface-100 p-2 border-2 border-surface-900 flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto shadow-[8px_8px_0_0_var(--surface-900)] rounded-xl">
            <div className="flex-1 w-full px-6 py-3 text-left">
              <span className="text-surface-900 font-bold truncate block font-mono">"Write my final history paper by Friday"</span>
            </div>
            <Button size="lg" className="w-full md:w-auto uppercase font-black tracking-widest">
              Ollie, Deconstruct
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
            <h2 className="text-4xl md:text-6xl font-black text-surface-900 uppercase tracking-tighter">Your Flight Path</h2>
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
              { step: "01", title: "Connect", desc: "Link Canvas and Google in one click. Ollie understands your world instantly." },
              { step: "02", title: "Briefing", desc: "Ollie builds your daily Flight Plan every morning based on your energy and deadlines." },
              { step: "03", title: "Execution", desc: "Follow the plan. If life changes, Ollie handles the reorganization so you don't have to." }
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

      {/* Social Proof */}
      <section className="py-24 relative bg-background border-b-2 border-surface-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <motion.h2 
            className="text-3xl text-surface-900 font-black mb-16 uppercase tracking-tight"
            {...fadeInUp}
          >
            Validated by Students.
          </motion.h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div 
              className="bg-surface-100 p-10 text-left border-2 border-surface-900 shadow-[10px_10px_0_0_var(--surface-900)] rounded-3xl"
              whileHover={{ rotate: -1, scale: 1.02 }}
            >
              <div className="flex gap-1 text-accent-500 mb-6">
                {[1,2,3,4,5].map(s => <Sparkle key={s} weight="fill" className="w-5 h-5" />)}
              </div>
              <p className="text-surface-600 font-bold text-xl mb-8 leading-relaxed italic">
                "I have ADHD and usually abandon planners after a week. Plan Pilot is different because when I mess up, it doesn't judge. It just reorganizes tomorrow."
              </p>
              <p className="text-surface-900 font-black uppercase tracking-widest">— Sarah T., CS Major</p>
            </motion.div>
            <motion.div 
              className="bg-surface-100 p-10 text-left border-2 border-surface-900 shadow-[10px_10px_0_0_var(--surface-900)] rounded-3xl"
              whileHover={{ rotate: 1, scale: 1.02 }}
            >
              <div className="flex gap-1 text-accent-500 mb-6">
                {[1,2,3,4,5].map(s => <Sparkle key={s} weight="fill" className="w-5 h-5" />)}
              </div>
              <p className="text-surface-600 font-bold text-xl mb-8 leading-relaxed italic">
                "The smart deconstruction feature is a game-changer. I used to stare at 'Write Thesis' for weeks. Now I just follow the 15-minute steps Ollie gives me."
              </p>
              <p className="text-surface-900 font-black uppercase tracking-widest">— Mark R., Grad Student</p>
            </motion.div>
          </div>
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
            Stop fighting your calendar. Let Ollie do the planning so you can do the doing.
          </p>
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
                href="/signup"
                className="inline-flex items-center justify-center px-12 py-6 text-xl font-black text-surface-100 bg-surface-900 hover:bg-surface-800 transition-all border-2 border-surface-900 shadow-[10px_10px_0_0_var(--accent-500)] uppercase rounded-2xl"
            >
                Start Free Flight
            </Link>
          </motion.div>
          <p className="mt-8 text-xs text-surface-900 font-black uppercase tracking-widest">No credit card required. Clear for takeoff in 60 seconds.</p>
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
          </div>
          <div className="text-surface-400 font-black text-xs uppercase tracking-widest">
            © {new Date().getFullYear()} Plan Pilot. All rights reserved.
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
