"use client";

import { motion } from "framer-motion";
import { ArrowRight, CalendarBlank, Check } from "@phosphor-icons/react";

export function ConnectCalendarStep({
  onConnect,
  onSkip,
  isConnecting,
}: {
  onConnect: () => void;
  onSkip: () => void;
  isConnecting: boolean;
}) {
  const stagger = {
    hidden: { opacity: 0, y: 10 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.1 },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-2xl text-center lg:text-left"
    >
      <motion.div variants={item} className="mb-10">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[28px] border border-[var(--color-line)] bg-[var(--color-blue-soft)] text-[var(--color-blue)] lg:mx-0">
          <CalendarBlank size={48} weight="fill" />
        </div>
        <h1 className="font-serif text-[44px] leading-tight sm:text-[52px]">
          Let&apos;s find your <span className="italic text-[var(--color-honey-deep)]">focus</span> time.
        </h1>
        <p className="mt-3 text-lg text-[var(--color-ink-soft)]">
          Connect your Google Calendar so Bruno knows when you are busy. We only read event titles and times.
        </p>
      </motion.div>

      <motion.div variants={item} className="mb-10 rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)] p-6 text-left">
        <h3 className="font-serif text-2xl">What we sync</h3>
        <ul className="mt-4 space-y-3 text-sm text-[var(--color-ink-soft)]">
          <li className="flex items-center gap-3">
            <Check size={18} weight="bold" className="text-[var(--color-sage)]" />
            Class schedules and meetings
          </li>
          <li className="flex items-center gap-3">
            <Check size={18} weight="bold" className="text-[var(--color-sage)]" />
            Personal busy blocks
          </li>
          <li className="flex items-center gap-3">
            <Check size={18} weight="bold" className="text-[var(--color-sage)]" />
            Event start and end times
          </li>
        </ul>
      </motion.div>

      <motion.div variants={item} className="flex flex-col gap-4 sm:flex-row lg:justify-start">
        <button
          onClick={onConnect}
          disabled={isConnecting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-honey)] px-8 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[0_1px_0_var(--color-honey-deep)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          {isConnecting ? "Connecting..." : "Connect Google Calendar"} <ArrowRight size={18} />
        </button>
        <button
          onClick={onSkip}
          disabled={isConnecting}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-transparent px-8 py-3 text-sm font-semibold text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
        >
          I will connect later
        </button>
      </motion.div>
    </motion.div>
  );
}
