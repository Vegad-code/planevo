'use client';

import { ArrowUp } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const SCROLL_THRESHOLD_PX = 400;

export function LegalBackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SCROLL_THRESHOLD_PX);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-6',
        visible && 'pointer-events-auto',
      )}
      aria-hidden={!visible}
    >
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Back to the top"
        data-testid="legal-back-to-top"
        className={cn(
          'glass-panel pointer-events-auto inline-flex items-center gap-2 rounded-full px-5 py-2.5',
          'text-sm font-black uppercase tracking-widest text-surface-700',
          'shadow-[0_8px_32px_rgba(20,20,20,0.12),inset_0_1px_0_rgba(255,255,255,0.55)]',
          'transition-[opacity,transform,box-shadow] duration-300 ease-out',
          'hover:scale-[1.02] hover:text-surface-900 hover:shadow-[0_12px_40px_rgba(20,20,20,0.16),inset_0_1px_0_rgba(255,255,255,0.65)]',
          'active:scale-[0.98]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
        )}
      >
        <ArrowUp size={16} weight="bold" aria-hidden />
        Back to the top
      </button>
    </div>
  );
}
