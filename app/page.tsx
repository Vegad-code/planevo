'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import OllieAvatar from '@/components/ollie/OllieAvatar';
import { Hero } from '@/components/ui/animated-hero';
import Pricing from '@/components/ui/pricing-base';
import PillNav from '@/components/ui/PillNav';
import { CheckCircle, CalendarBlank, Target, ChatCircleDots } from '@phosphor-icons/react';

export default function LandingPage() {


  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-surface-900 selection:text-surface-100">
      <PillNav 
        items={[
          { label: 'Features', href: '#features' },
          { label: 'How it Works', href: '#how-it-works' },
          { label: 'Sign in', href: '/login' },
          { label: 'Start Free', href: '/signup' }
        ]}
        baseColor="var(--surface-900)"
        pillColor="var(--card)"
        pillTextColor="var(--foreground)"
        hoveredPillTextColor="var(--card)"
      />

      {/* Hero Section */}
      <Hero />

      {/* Problem Section */}
      <section className="py-24 relative border-b-2 border-surface-900 bg-surface-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-surface-900 mb-6 uppercase tracking-tight">
            Your to-do list is a graveyard of good intentions.
          </h2>
          <p className="text-xl text-surface-600 mb-12 font-medium">
            Most apps just store your tasks and silently judge you when they turn red and overdue. 
            They don&apos;t help you start. They don&apos;t help you focus.
          </p>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            {[
              { title: "The Overwhelm", desc: "Seeing 40 tasks at once paralyzes you into doing nothing." },
              { title: "The Guilt Trip", desc: "Past-due badges pile up, making you want to avoid the app entirely." },
              { title: "The Decision Fatigue", desc: "Spending 20 minutes deciding what to do instead of actually doing it." }
            ].map((item, i) => (
              <div key={i} className="bg-surface-100 p-6 border-2 border-surface-900 shadow-[var(--shadow-color)] hover:shadow-lg hover:-translate-y-1 transition-all rounded-2xl">
                <h3 className="text-surface-900 font-bold mb-2 uppercase">{item.title}</h3>
                <p className="text-surface-600 text-sm leading-relaxed font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-24 relative bg-background border-b-2 border-surface-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <div className="text-surface-900 font-bold tracking-widest text-sm uppercase border-b-2 border-surface-900 inline-block pb-1">The Command Center</div>
            <h2 className="text-4xl md:text-5xl font-bold text-surface-900 leading-tight uppercase tracking-tight">
              One view to rule your entire academic life.
            </h2>
            <p className="text-lg text-surface-600 leading-relaxed font-medium">
              Plan Pilot merges your Canvas assignments, Google Calendar, and local tasks into a single, high-visibility cockpit. 
              No more tab-switching. No more missed deadlines. Just total clarity.
            </p>
            <ul className="space-y-4 pt-4">
              {['Live sync with Canvas and Google', 'The "No-Shame" Rollover system', 'Intelligent flight planning'].map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-surface-900 font-bold">
                  <CheckCircle weight="thin" className="w-6 h-6 text-accent-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full relative">
            <div className="relative bg-surface-100 p-8 border-2 border-surface-900 shadow-xl flex flex-col items-center text-center rounded-3xl">
              <OllieAvatar mood="celebrating" size="xl" className="mb-6" />
              <h3 className="text-xl font-bold text-surface-900 mb-2 uppercase">Sync Complete.</h3>
              <p className="text-surface-600 font-medium">I&apos;ve mapped out your week based on your Canvas deadlines and upcoming meetings. You&apos;re clear for takeoff.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features */}
      <section id="features" className="py-24 relative bg-surface-200 border-b-2 border-surface-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-surface-900 mb-6 uppercase tracking-tight">Designed for how your brain actually works.</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-surface-100 p-8 border-2 border-surface-900 shadow-[6px_6px_0_0_var(--shadow-color)] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--shadow-color)] transition-all group">
              <div className="w-16 h-16 border-2 border-surface-900 bg-brand-300 flex items-center justify-center text-surface-900 mb-6 group-hover:-translate-y-2 group-hover:shadow-[4px_4px_0_0_var(--shadow-color)] transition-all">
                <CalendarBlank weight="thin" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-surface-900 mb-3 uppercase">Unified Briefing</h3>
              <p className="text-surface-600 font-medium leading-relaxed">
                Connect Canvas and Google in seconds. Ollie builds a realistic daily plan that respects your actual availability.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-surface-100 p-8 border-2 border-surface-900 shadow-[6px_6px_0_0_var(--shadow-color)] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--shadow-color)] transition-all group">
              <div className="w-16 h-16 border-2 border-surface-900 bg-accent-300 flex items-center justify-center text-surface-900 mb-6 group-hover:-translate-y-2 group-hover:shadow-[4px_4px_0_0_var(--shadow-color)] transition-all">
                <Target weight="thin" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-surface-900 mb-3 uppercase">Smart Rollover</h3>
              <p className="text-surface-600 font-medium leading-relaxed">
                Missed a task? The system automatically finds the next open slot for it. No red badges, no guilt, just progress.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-surface-100 p-8 border-2 border-surface-900 shadow-[6px_6px_0_0_var(--shadow-color)] hover:-translate-y-1 hover:shadow-[8px_8px_0_0_var(--shadow-color)] transition-all group">
              <div className="w-16 h-16 border-2 border-surface-900 bg-success flex items-center justify-center text-surface-100 mb-6 group-hover:-translate-y-2 group-hover:shadow-[4px_4px_0_0_var(--shadow-color)] transition-all">
                <ChatCircleDots weight="thin" className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-surface-900 mb-3 uppercase">Deep Work Pilot</h3>
              <p className="text-surface-600 font-medium leading-relaxed">
                Enter focus mode with a dedicated assistant. Ollie monitors your progress and keeps you anchored to your goal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Concept */}
      <section className="py-24 relative overflow-hidden bg-background border-b-2 border-surface-900">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-surface-900 mb-10 uppercase">From massive goal to actionable steps in seconds.</h2>
          
          <div className="bg-surface-100 p-2 border-2 border-surface-900 flex flex-col md:flex-row items-center gap-2 max-w-2xl mx-auto shadow-[8px_8px_0_0_var(--shadow-color)]">
            <div className="flex-1 w-full px-6 py-3 text-left">
              <span className="text-surface-900 font-bold truncate block font-mono">"Write my final history paper by Friday"</span>
            </div>
            <button className="w-full md:w-auto px-6 py-3 bg-surface-900 text-surface-100 font-bold uppercase hover:bg-surface-800 transition-colors border-2 border-transparent active:border-surface-900">
              Deconstruct
            </button>
          </div>

          <div className="mt-12 text-left max-w-md mx-auto space-y-3">
            {[
              "Outline thesis statement (30m)",
              "Gather 5 primary sources (45m)",
              "Write introduction draft (40m)",
              "..."
            ].map((step, i) => (
              <div key={i} className="bg-surface-200 p-4 border-2 border-surface-900 shadow-[2px_2px_0_0_var(--shadow-color)] flex items-center gap-4">
                <div className="w-5 h-5 border-2 border-surface-900 bg-surface-100" />
                <span className="text-surface-900 font-bold">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 relative bg-surface-200 border-b-2 border-surface-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-surface-900 uppercase">How it works</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Brutalist Connector Line */}
            <div className="hidden md:block absolute top-10 left-[15%] right-[15%] h-1 bg-surface-900" />
            
            {[
              { step: "01", title: "Brain Dump", desc: "Throw all your tasks, goals, and vague ideas into the app." },
              { step: "02", title: "Ollie Organizes", desc: "AI breaks down large tasks and schedules them around your meetings." },
              { step: "03", title: "Follow the Nudge", desc: "Just do what Ollie suggests next. If you fall behind, he quietly adjusts." }
            ].map((item, i) => (
              <div key={i} className="relative z-10 text-center bg-surface-100 p-8 border-2 border-surface-900 shadow-[4px_4px_0_0_#22201e]">
                <div className="w-20 h-20 bg-surface-900 text-surface-100 flex items-center justify-center text-2xl font-bold mx-auto mb-6">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-surface-900 mb-2 uppercase">{item.title}</h3>
                <p className="text-surface-600 font-medium">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 relative bg-background border-b-2 border-surface-900">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h2 className="text-2xl text-surface-900 font-bold mb-12 uppercase underline underline-offset-8">The only app that finally clicked.</h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-surface-100 p-8 text-left border-2 border-surface-900 shadow-[6px_6px_0_0_var(--shadow-color)]">
              <div className="text-surface-900 text-xl mb-4 font-bold tracking-widest">★★★★★</div>
              <p className="text-surface-600 font-bold text-lg mb-6 leading-relaxed">"I have ADHD and usually abandon planners after a week. Plant Pilot is different because when I mess up and do nothing all day, it doesn't make me feel guilty. It just reorganizes tomorrow."</p>
              <p className="text-surface-900 font-bold uppercase">— Sarah T., Student</p>
            </div>
            <div className="bg-surface-100 p-8 text-left border-2 border-surface-900 shadow-[6px_6px_0_0_var(--shadow-color)]">
              <div className="text-surface-900 text-xl mb-4 font-bold tracking-widest">★★★★★</div>
              <p className="text-surface-600 font-bold text-lg mb-6 leading-relaxed">"The smart breakdown feature is a game-changer. I used to stare at 'Write Thesis' for weeks. Now I just follow the 15-minute steps Ollie gives me."</p>
              <p className="text-surface-900 font-bold uppercase">— Mark R., Developer</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Assistant Teaser */}
      <section className="py-24 bg-surface-900 text-surface-100 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 border-2 border-surface-100 rounded-full animate-pulse" />
          <div className="absolute bottom-10 right-10 w-96 h-96 border-2 border-surface-100 rounded-full animate-pulse delay-700" />
        </div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <span className="bg-accent-500 text-surface-900 px-3 py-1 text-xs font-black uppercase tracking-widest mb-6 inline-block">Elite Feature</span>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 uppercase tracking-tighter leading-none">
                Ollie Command: Total Database Autonomy.
              </h2>
              <p className="text-xl text-surface-300 font-medium mb-8 leading-relaxed">
                Elite members don&apos;t just get suggestions—they have a system that executes. Ollie Command can reschedule entire weeks, modify assignments, and manage your load via natural language.
              </p>
              <div className="space-y-4">
                {[
                  "Move my low-priority tasks to next week.",
                  "Break down this 3-month goal into a 20-step plan.",
                  "What's draining my energy most this month?",
                  "Block off 2 hours for deep work every Wednesday."
                ].map((command, i) => (
                  <div key={i} className="flex items-center gap-4 bg-[#1a1a1a] p-4 border-l-4 border-accent-500 font-mono text-sm shadow-lg">
                    <span className="text-accent-500 font-bold">$</span>
                    <span className="text-gray-300 italic">"{command}"</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 relative">
              <div className="bg-surface-100 p-8 border-4 border-surface-100 shadow-[20px_20px_0_0_#ff6b00] rounded-3xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <OllieAvatar mood="celebrating" size="xl" className="mb-6 mx-auto" />
                <div className="space-y-3">
                  <div className="h-4 w-3/4 bg-surface-300 rounded animate-pulse" />
                  <div className="h-4 w-full bg-surface-200 rounded animate-pulse delay-75" />
                  <div className="h-4 w-1/2 bg-surface-300 rounded animate-pulse delay-150" />
                </div>
                <div className="mt-8 pt-6 border-t-2 border-surface-200 text-surface-900 font-black uppercase text-center tracking-widest">
                  Ollie is thinking...
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <Pricing />

      {/* Final CTA */}
      <section className="py-32 relative text-center bg-brand-300 border-b-2 border-surface-900">
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-4xl md:text-6xl font-bold text-surface-900 mb-6 uppercase tracking-tight">
            Ready to get things done?
          </h2>
          <p className="text-xl text-surface-900 font-medium mb-10">
            Stop fighting your brain. Let Ollie do the planning so you can do the doing.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-surface-100 bg-surface-900 hover:bg-surface-800 transition-all border-2 border-surface-900 shadow-[8px_8px_0_0_var(--shadow-color)] hover:-translate-y-1 hover:shadow-[10px_10px_0_0_var(--shadow-color)] active:translate-y-1 active:translate-x-1 active:shadow-none uppercase"
          >
            Start Free
          </Link>
          <p className="mt-6 text-sm text-surface-900 font-bold uppercase">No credit card required. Free forever plan available.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-background py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6 border-t-2 border-border pt-8">
          <div className="flex items-center gap-2">
            <span className="text-xl">🦉</span>
            <span className="font-black text-foreground uppercase tracking-widest">Plan Pilot</span>
          </div>
          <div className="text-muted font-bold text-sm uppercase">
            © {new Date().getFullYear()} Plan Pilot. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Mobile Sticky CTA */}
      <div className="md:hidden fixed bottom-6 inset-x-6 z-50">
        <Link
          href="/signup"
          className="flex items-center justify-center w-full px-6 py-4 text-base font-bold text-surface-100 bg-surface-900 border-2 border-surface-900 shadow-[4px_4px_0_0_var(--shadow-color)] uppercase active:translate-y-1 active:translate-x-1 active:shadow-none transition-all"
        >
          Start Free
        </Link>
      </div>
    </div>
  );
}
