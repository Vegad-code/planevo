'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassPanel } from '@/components/ui/glass-panel';

export interface GlassSheetProps {
  open: boolean;
  onClose: () => void;
  position?: 'bottom' | 'center';
  children: React.ReactNode;
  className?: string;
  panelClassName?: string;
}

export function GlassSheet({
  open,
  onClose,
  position = 'bottom',
  children,
  className,
  panelClassName,
}: GlassSheetProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const isCenter = position === 'center';

  return (
    <AnimatePresence>
      {open && (
        <div className={cn('fixed inset-0 z-50', className)}>
          <motion.button
            type="button"
            aria-label="Close"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-xl"
            onClick={onClose}
          />
          <div
            className={cn(
              'fixed inset-x-0 pointer-events-none px-4',
              isCenter
                ? 'inset-0 flex items-center justify-center'
                : 'bottom-0 mb-4 sm:mb-0 sm:inset-0 sm:flex sm:items-center sm:justify-center'
            )}
          >
            <motion.div
              initial={
                isCenter
                  ? { opacity: 0, scale: 0.95, y: -12 }
                  : { y: '100%', opacity: 0, scale: 0.95 }
              }
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={
                isCenter
                  ? { opacity: 0, scale: 0.95, y: -12 }
                  : { y: '100%', opacity: 0, scale: 0.95 }
              }
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="pointer-events-auto w-full max-w-lg"
            >
              <GlassPanel
                variant="card"
                className={cn(
                  'p-5 sm:p-6 shadow-2xl',
                  isCenter ? 'rounded-[28px]' : 'rounded-t-[28px] sm:rounded-[28px]',
                  panelClassName
                )}
              >
                {children}
              </GlassPanel>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
