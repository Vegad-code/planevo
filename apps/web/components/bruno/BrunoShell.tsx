'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useBruno } from '@/components/bruno/BrunoProvider';
import BrunoChatSidebar from '@/components/dashboard/BrunoChatSidebar';

export function BrunoShell() {
  const { closeBruno, isOpen } = useBruno();

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[80] pointer-events-none">
          <button
            type="button"
            aria-label="Close Bruno overlay"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px] pointer-events-auto"
            onClick={closeBruno}
          />
          <motion.aside
            initial={{ x: 460, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 460, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="absolute right-0 top-0 h-full w-full max-w-[460px] overflow-hidden border-l border-[var(--color-settings-border)] bg-[var(--color-settings-bg)] shadow-2xl pointer-events-auto flex flex-col"
            aria-label="Bruno copilot"
          >
            <BrunoChatSidebar />
          </motion.aside>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
