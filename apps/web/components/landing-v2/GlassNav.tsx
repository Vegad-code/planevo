'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';
import { OceanPillButton } from '@/components/landing-v2/editorial/OceanPillButton';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { name: 'How it works', href: '#capture' },
  { name: 'Bruno', href: '#bruno' },
  { name: 'Pricing', href: '#pricing' },
  { name: 'FAQ', href: '#faq' },
];

export function GlassNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileOpen]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 pt-4">
      <div className="pointer-events-auto mx-auto flex w-[min(100%,calc(100%-2rem))] max-w-4xl items-center justify-between gap-4 rounded-full border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 shadow-[0_8px_32px_rgba(20,20,20,0.06)] sm:px-5">
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--color-ink)]"
        >
          <PlanevoLogo size={22} />
          <PlanevoWordmark />
        </Link>

        <nav className="hidden items-center justify-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={activeId === link.href.slice(1) ? 'true' : undefined}
              className={cn(
                'text-[13px] font-medium uppercase tracking-[0.12em] transition-colors',
                activeId === link.href.slice(1)
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-[13px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] sm:inline"
          >
            Sign in
          </Link>
          <OceanPillButton href="/signup" className="hidden px-4 py-2 text-[13px] sm:inline-flex">
            Start free
          </OceanPillButton>

          <button
            type="button"
            className="p-1.5 text-[var(--color-ink)] md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto mx-auto mt-2 w-[min(100%,calc(100%-2rem))] max-w-md overflow-hidden rounded-3xl border border-[var(--color-line)] bg-[var(--color-paper)] p-5 shadow-xl md:hidden"
          >
            <div className="flex flex-col gap-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="font-serif text-xl tracking-tight text-[var(--color-ink)]"
                >
                  {link.name}
                </Link>
              ))}
              <hr className="border-[var(--color-line)]" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-[15px] font-medium text-[var(--color-ink-soft)]"
              >
                Sign in
              </Link>
              <OceanPillButton
                href="/signup"
                className="w-full justify-center"
                onClick={() => setMobileOpen(false)}
              >
                Start free
              </OceanPillButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
