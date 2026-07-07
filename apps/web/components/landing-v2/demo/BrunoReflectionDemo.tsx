'use client';

import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { BrunoChatBubble } from './bruno/BrunoChatBubble';
import { BrunoDemoCookingIndicator } from './bruno/BrunoDemoCookingIndicator';
import { useBrunoDemoScript } from './bruno/useBrunoDemoScript';
import { useTypewriter } from './bruno/useTypewriter';
import { useBrunoPersona } from './bruno/BrunoPersonaContext';

const BRUNO_RESPONSE =
  'That\u2019s a common loop \u2014 falling behind creates pressure, and pressure makes starting harder. You\u2019re not lazy; your brain is protecting you from more overwhelm.';

const BRUNO_STEP =
  'Pick the smallest thing on your list. Give it 15 minutes. That\u2019s it \u2014 no catching up, just one tiny win.';

/**
 * Reflection chat demo — Bruno names the pattern and offers one grounded next step.
 */
export function BrunoReflectionDemo() {
  const { scenario } = useBrunoPersona();
  const { ref, step, finished, replay } = useBrunoDemoScript({ steps: 6, intervalMs: 1800 });

  const typed = useTypewriter(scenario.reflectionMessage, step === 0);
  const showUser = step >= 1;
  const thinking = step === 2;
  const showReflection = step >= 3;
  const showStep = step >= 4;
  const showChip = step >= 5;

  return (
    <div ref={ref} aria-hidden className="relative">
      {finished && (
        <button
          type="button"
          onClick={replay}
          className="absolute right-3 top-3 z-10 rounded-full border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-2 py-1 font-mono text-[8px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]"
        >
          Replay
        </button>
      )}
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-2xl border border-[var(--color-line-strong)] bg-[var(--color-paper)] p-4 shadow-xl">
        <div className="flex min-h-[240px] flex-col gap-3">
          {!showUser ? (
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-[var(--color-ink)] px-3.5 py-2.5 text-left text-[13px] leading-snug text-white">
              {typed}
              <span className="typing-cursor" />
            </div>
          ) : (
            <BrunoChatBubble variant="user">{scenario.reflectionMessage}</BrunoChatBubble>
          )}

          {step >= 2 && (
            <div className="flex items-start gap-2">
              <span className="flex h-7 w-7 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--color-belly)]">
                <Image src="/landing/bruno-face-160.png" alt="" width={28} height={28} />
              </span>
              <div className="min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  {thinking ? (
                    <BrunoDemoCookingIndicator key="cooking" />
                  ) : showReflection ? (
                    <motion.div
                      key="reflection"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-2.5"
                    >
                      <BrunoChatBubble variant="assistant" animate={false}>
                        {BRUNO_RESPONSE}
                      </BrunoChatBubble>
                      {showStep && (
                        <motion.div
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl rounded-tl-md border border-[var(--color-line)] bg-[var(--color-paper)] px-3.5 py-2.5 text-[13px] leading-relaxed text-[var(--color-ink)]"
                        >
                          {BRUNO_STEP}
                        </motion.div>
                      )}
                      {showChip && (
                        <motion.span
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="inline-flex w-fit items-center rounded-full border border-[var(--color-honey)] bg-[var(--color-honey-soft)] px-3 py-1 font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--color-honey-deep)]"
                        >
                          Try this
                        </motion.span>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
