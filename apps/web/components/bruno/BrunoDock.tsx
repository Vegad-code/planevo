'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { PaperPlaneTilt } from '@phosphor-icons/react';
import { useBruno } from '@/components/bruno/BrunoProvider';
import BrunoChatSidebar from '@/components/dashboard/BrunoChatSidebar';
import { BrunoFaceMark } from '@/components/bruno/BrunoFaceMark';
import { cn } from '@/lib/utils';

type BrunoDockMode = 'modal' | 'fullscreen';

export function BrunoDock() {
  const { isOpen, openBruno, closeBruno, currentContext } = useBruno();
  const [mode, setMode] = useState<BrunoDockMode>('modal');
  const isFullScreen = mode === 'fullscreen';

  useEffect(() => {
    if (!isOpen) {
      setMode('modal');
    }
  }, [isOpen]);

  const handleClose = () => {
    closeBruno();
    setMode('modal');
  };

  const handleOpen = () =>
    openBruno(
      currentContext ?? {
        source: 'dock',
        page: typeof window !== 'undefined' ? window.location.pathname : '/dashboard',
        label: 'Current page',
      },
    );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.button
            type="button"
            aria-label="Close Bruno"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] cursor-default bg-black/45 backdrop-blur-sm"
            onClick={handleClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isOpen && (
          <div
            className={cn(
              'fixed inset-0 z-[80] flex pointer-events-none',
              isFullScreen
                ? 'items-stretch justify-stretch p-0'
                : 'items-center justify-center px-3 py-4 sm:px-6 lg:pl-[272px] lg:pr-8',
            )}
          >
            <motion.div
              layout
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className={cn(
                'pointer-events-auto flex min-h-0 flex-col overflow-hidden border border-[var(--glass-border)] bg-[var(--color-settings-bg)] shadow-2xl',
                isFullScreen
                  ? 'h-full w-full rounded-none'
                  : 'h-[min(78vh,760px)] w-full max-w-[980px] rounded-[28px]',
              )}
            >
              <BrunoChatSidebar
                variant="dock"
                onMinimize={handleClose}
                isFullScreen={isFullScreen}
                onToggleFullScreen={() =>
                  setMode((current) => (current === 'fullscreen' ? 'modal' : 'fullscreen'))
                }
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[80] pointer-events-none',
          'flex justify-center px-4 pb-4',
          'lg:pl-[248px] transition-[padding] duration-300',
        )}
      >
        <div className="pointer-events-auto w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {!isOpen ? (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <button
                  type="button"
                  className="glass-panel flex w-full cursor-pointer items-center gap-3 rounded-3xl px-4 py-3 text-left transition-colors duration-200 hover:border-[var(--color-accent-warm)]/30"
                  onClick={handleOpen}
                  aria-label="Open Bruno chat"
                >
                  <BrunoFaceMark size={32} />
                  <span className="flex-1 text-sm text-[var(--color-ink-faint)] truncate">
                    Ask Bruno anything…
                  </span>
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-warm)] text-[var(--color-accent-cream)] hover:opacity-90 transition-opacity"
                  >
                    <PaperPlaneTilt size={18} />
                  </span>
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
