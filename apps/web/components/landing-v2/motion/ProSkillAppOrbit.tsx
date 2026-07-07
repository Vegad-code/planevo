'use client';

import { motion, useReducedMotion } from 'framer-motion';

const APPS = [
  { label: 'N', tone: 'bg-[#1a1a1a]' },
  { label: 'S', tone: 'bg-[#4A154B]' },
  { label: 'L', tone: 'bg-[#5E6AD2]' },
] as const;

interface ProSkillAppOrbitProps {
  active: boolean;
}

export function ProSkillAppOrbit({ active }: ProSkillAppOrbitProps) {
  const reduce = useReducedMotion();

  if (!active || reduce) return null;

  const radius = 52;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 z-20 h-0 w-0"
      initial={{ rotate: 0, opacity: 0 }}
      animate={{ rotate: 360, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ rotate: { duration: 2.2, ease: 'easeInOut' }, opacity: { duration: 0.3 } }}
    >
      {APPS.map((app, index) => {
        const angle = (index / APPS.length) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        return (
          <motion.span
            key={app.label}
            className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-lg ${app.tone}`}
            style={{ left: x, top: y }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: index * 0.08, type: 'spring', stiffness: 420, damping: 22 }}
          >
            {app.label}
          </motion.span>
        );
      })}
    </motion.div>
  );
}
