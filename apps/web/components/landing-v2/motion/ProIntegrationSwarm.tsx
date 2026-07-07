'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { LinearIcon, NotionIcon, SlackIcon } from '@/components/icons/BrandIcons';
import { cn } from '@/lib/utils';

const APPS = [
  { key: 'notion', Icon: NotionIcon, className: 'text-[var(--color-ink)]' },
  { key: 'slack', Icon: SlackIcon },
  { key: 'linear', Icon: LinearIcon },
] as const;

interface ProIntegrationSwarmProps {
  fromRect: DOMRect;
  toRect: DOMRect;
  variant?: 'spotlight' | 'launch';
}

export function ProIntegrationSwarm({
  fromRect,
  toRect,
  variant = 'launch',
}: ProIntegrationSwarmProps) {
  const reduce = useReducedMotion();

  if (reduce) return null;

  const fromX = fromRect.left + fromRect.width / 2;
  const fromY = fromRect.top + fromRect.height / 2;
  const toX = toRect.left + toRect.width / 2;
  const toY = toRect.top + toRect.height / 2;
  const orbitRadius = variant === 'spotlight' ? 64 : 44;
  const arcLift = variant === 'spotlight' ? -36 : -52;
  const totalDuration = variant === 'spotlight' ? 2.1 : 1.1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[210]" aria-hidden>
      {APPS.map((app, index) => {
        const angle = (index / APPS.length) * Math.PI * 2 - Math.PI / 2;
        const orbitX = fromX + Math.cos(angle) * orbitRadius;
        const orbitY = fromY + Math.sin(angle) * orbitRadius;
        const midX = (orbitX + toX) / 2;
        const midY = (orbitY + toY) / 2 + arcLift;
        const delay = index * 0.1;

        return (
          <motion.div
            key={app.key}
            className="absolute left-0 top-0"
            initial={{
              x: fromX - 16,
              y: fromY - 16,
              scale: 0,
              opacity: 0,
              rotate: -20,
            }}
            animate={{
              x: [fromX - 16, orbitX - 16, midX - 16, toX - 16],
              y: [fromY - 16, orbitY - 16, midY - 16, toY - 16],
              scale: [0, 1.15, 0.92, 0.2],
              opacity: [0, 1, 1, 0],
              rotate: [0, 120 + index * 40, 240, 360 + index * 30],
            }}
            transition={{
              duration: totalDuration,
              delay,
              times: [0, 0.32, 0.68, 1],
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-line)]/60 bg-[var(--color-paper)]/95 shadow-[0_8px_24px_rgba(0,0,0,0.18)] backdrop-blur-sm">
              <app.Icon className={cn('h-4 w-4', 'className' in app ? app.className : undefined)} aria-hidden />
            </span>
          </motion.div>
        );
      })}

      <motion.span
        className="absolute left-0 top-0 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-honey)]/25 blur-2xl"
        initial={{ x: toX, y: toY, scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.8, 0], opacity: [0, 0.55, 0] }}
        transition={{ duration: totalDuration * 0.85, delay: 0.45, ease: 'easeOut' }}
      />
    </div>
  );
}
