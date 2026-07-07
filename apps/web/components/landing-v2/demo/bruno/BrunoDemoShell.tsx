'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowCounterClockwise } from '@phosphor-icons/react';
import { BrunoDemoCookingIndicator } from './BrunoDemoCookingIndicator';
import { BrunoChatBubble } from './BrunoChatBubble';
import { useTypewriter } from './useTypewriter';
import { useBrunoSkillLaunch } from './BrunoSkillLaunchContext';
import { cn } from '@/lib/utils';

interface BrunoDemoShellProps {
  userMessage: string;
  step: number;
  thinkingStep: number;
  children: React.ReactNode;
  minHeight?: string;
  className?: string;
  footer?: React.ReactNode;
  onReplay?: () => void;
  showReplay?: boolean;
}

export function BrunoDemoShell({
  userMessage,
  step,
  thinkingStep,
  children,
  minHeight = '188px',
  className,
  footer,
  onReplay,
  showReplay = false,
}: BrunoDemoShellProps) {
  const { userBubbleLayoutId, showLayoutMorph } = useBrunoSkillLaunch();
  const typed = useTypewriter(userMessage, step === 0);
  const showUser = step >= 1;
  const thinking = step === thinkingStep;
  const showBruno = step >= thinkingStep;
  const morphLanding = showLayoutMorph && userBubbleLayoutId;

  return (
    <div
      className={cn(
        'relative mx-auto grid w-full max-w-md gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl',
        className,
      )}
    >
      {showReplay && onReplay && (
        <button
          type="button"
          onClick={onReplay}
          className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)] transition-colors hover:border-[var(--color-honey)] hover:text-[var(--color-ink)]"
        >
          <ArrowCounterClockwise size={10} weight="bold" />
          Replay
        </button>
      )}

      <div className="flex flex-col gap-3" style={{ minHeight }}>
        <div data-skill-landing className="ml-auto max-w-[85%]">
          {!showUser ? (
            morphLanding ? (
              <motion.div
                layoutId={userBubbleLayoutId}
                className="rounded-2xl rounded-br-md bg-[var(--color-ink)] px-3.5 py-2.5 text-left text-[13px] leading-snug text-white"
                transition={{ type: 'spring', stiffness: 380, damping: 22, mass: 0.9 }}
              >
                {typed}
                <span className="typing-cursor" />
              </motion.div>
            ) : (
              <div className="rounded-2xl rounded-br-md bg-[var(--color-ink)] px-3.5 py-2.5 text-left text-[13px] leading-snug text-white">
                {typed}
                <span className="typing-cursor" />
              </div>
            )
          ) : (
            <BrunoChatBubble variant="user" layoutId={morphLanding ? userBubbleLayoutId : undefined}>
              {userMessage}
            </BrunoChatBubble>
          )}
        </div>

        {showBruno && (
          <div className="flex items-start gap-2">
            <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--color-belly)]">
              <Image src="/landing/bruno-face-160.png" alt="" width={28} height={28} />
            </span>
            <div className="min-w-0 flex-1">
              <AnimatePresence mode="wait">
                {thinking ? (
                  <BrunoDemoCookingIndicator key="cooking" />
                ) : (
                  children
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {footer}
    </div>
  );
}
