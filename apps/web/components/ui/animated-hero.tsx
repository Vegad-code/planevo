'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Sparkle } from '@phosphor-icons/react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { OllieMascot } from '@/components/OllieMascot';

export function Hero() {
  return (
    <div className="relative w-full min-h-[90vh] flex flex-col items-center justify-center pt-32 pb-20 overflow-hidden bg-surface-900">
      {/* Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-accent-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 flex flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-brand-400 text-xs font-black uppercase tracking-widest mb-8">
            <Sparkle weight="fill" className="w-3 h-3" />
            Built for ADHD brains
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-5xl md:text-8xl font-black text-white tracking-tighter leading-[0.9] max-w-5xl mb-8 uppercase"
        >
          Stop missing <span className="text-brand-500">deadlines</span>.<br />
          Start <span className="text-accent-500">flying</span>.
        </motion.h1>

        {/* Sub-headline (The Strategy Pitch) */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg md:text-xl text-surface-400 font-medium max-w-2xl mb-12 leading-relaxed"
        >
          Plan Pilot is the calm AI co-pilot that automatically reschedules your week without guilt every time life slips. Unlike rigid planners, we&apos;re built for brains that don&apos;t run on willpower.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-20"
        >
          <Button size="lg" className="h-14 px-8 text-lg font-black bg-white text-surface-900 hover:bg-brand-500 hover:text-white transition-all group" asChild>
            <Link href="/signup">
              Start Your Free Trial
              <ArrowRight weight="bold" className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Button size="lg" variant="ghost" className="h-14 px-8 text-lg font-bold text-surface-400 hover:text-white hover:bg-white/5" asChild>
            <a href="#how-it-works">See how it works</a>
          </Button>
        </motion.div>

        {/* Visual: Ollie Mascot + App Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.4 }}
          className="relative w-full max-w-5xl"
        >
          {/* Mockup Container */}
          <div className="relative aspect-video bg-surface-800 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Minimal Dashboard Mockup UI */}
            <div className="absolute inset-0 bg-gradient-to-br from-surface-800 to-surface-900 flex items-center justify-center">
              <div className="w-[80%] h-[70%] bg-white/5 rounded-2xl border border-white/5 p-8 flex flex-col gap-6">
                <div className="h-8 w-48 bg-white/10 rounded-lg" />
                <div className="flex-1 grid grid-cols-2 gap-6">
                  <div className="bg-white/5 rounded-xl border border-white/5" />
                  <div className="space-y-4">
                    <div className="h-20 bg-brand-500/10 rounded-xl border border-brand-500/20" />
                    <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                    <div className="h-20 bg-white/5 rounded-xl border border-white/5" />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Ollie Floating over the UI */}
            <div className="absolute -right-20 -bottom-20 scale-75 md:scale-100">
               <OllieMascot pose="thinking" className="w-96 h-96" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
