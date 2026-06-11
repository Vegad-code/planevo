"use client";

import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Sparkle } from "@phosphor-icons/react";

export function WelcomeIntentStep({
  userName,
  setUserName,
  profileType,
  setProfileType,
  energyPreference,
  setEnergyPreference,
  onNext,
}: {
  userName: string;
  setUserName: (val: string) => void;
  profileType: string;
  setProfileType: (val: string) => void;
  energyPreference: string;
  setEnergyPreference: (val: string) => void;
  onNext: () => void;
}) {
  const profileOptions = [
    {
      id: "student",
      label: "Student",
      body: "Classes, exams, readings, labs.",
      icon: <GraduationCap size={22} />,
    },
    {
      id: "builder",
      label: "Builder",
      body: "Work blocks, projects, meetings.",
      icon: <Sparkle size={22} />,
    },
    {
      id: "both",
      label: "A little of both",
      body: "School, work, and life in the same calendar.",
      icon: <Sparkle size={22} />,
    },
  ];

  const energyOptions = [
    { id: "morning", label: "Morning" },
    { id: "afternoon", label: "Afternoon" },
    { id: "night", label: "Night" },
    { id: "chaos", label: "Varies" },
  ];

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
      className="mx-auto w-full max-w-2xl"
    >
      <motion.div variants={item} className="mb-8 text-center lg:text-left">
        <h1 className="font-serif text-[44px] leading-tight sm:text-[52px]">
          Let&apos;s tailor <span className="italic text-[var(--color-honey-deep)]">Bruno</span> to you.
        </h1>
        <p className="mt-3 text-lg text-[var(--color-ink-soft)]">
          We need just a few details to structure your perfect week.
        </p>
      </motion.div>

      <motion.div variants={item} className="mb-10">
        <label className="mb-3 block text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
          What should I call you?
        </label>
        <input
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-2xl border-2 border-[var(--color-line-strong)] bg-[var(--color-paper)] px-5 py-4 font-serif text-3xl outline-none transition focus:border-[var(--color-honey)] focus:ring-4 focus:ring-[var(--color-honey-soft)]"
        />
      </motion.div>

      <motion.div variants={item} className="mb-10">
        <label className="mb-3 block text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
          What kind of week am I planning?
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          {profileOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setProfileType(opt.id)}
              className={`flex flex-col items-start gap-3 rounded-2xl border p-5 transition ${
                profileType === opt.id
                  ? "border-[var(--color-honey)] bg-[var(--color-honey-soft)]/20 ring-2 ring-[var(--color-honey-soft)]"
                  : "border-[var(--color-line)] bg-[var(--color-paper)] hover:border-[var(--color-line-strong)]"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-honey-soft)] text-[var(--color-honey-deep)]">
                {opt.icon}
              </span>
              <div className="text-left">
                <div className="font-serif text-xl">{opt.label}</div>
                <div className="mt-1 text-xs text-[var(--color-ink-soft)]">{opt.body}</div>
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="mb-10">
         <label className="mb-3 block text-sm font-semibold uppercase tracking-widest text-[var(--color-ink-soft)]">
          When do you focus best?
        </label>
        <div className="flex flex-wrap gap-3">
          {energyOptions.map((opt) => (
             <button
             key={opt.id}
             onClick={() => setEnergyPreference(opt.id)}
             className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
               energyPreference === opt.id
                 ? "border-[var(--color-honey)] bg-[var(--color-honey)] text-[var(--color-ink)]"
                 : "border-[var(--color-line-strong)] bg-[var(--color-paper)] text-[var(--color-ink-soft)] hover:bg-[var(--color-cream-2)]"
             }`}
           >
             {opt.label}
           </button>
          ))}
        </div>
      </motion.div>

      <motion.div variants={item} className="mt-12 flex justify-end">
        <button
          onClick={onNext}
          disabled={!userName.trim()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-honey)] px-8 py-3 text-sm font-semibold text-[var(--color-ink)] shadow-[0_1px_0_var(--color-honey-deep)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-50"
        >
          Continue to Calendar <ArrowRight size={18} />
        </button>
      </motion.div>
    </motion.div>
  );
}
