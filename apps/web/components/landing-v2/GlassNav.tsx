'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';
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
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--color-ink)] lg:justify-self-start"
        >
          <PlanevoLogo size={24} />
          <PlanevoWordmark />
        </Link>

        <nav className="hidden items-center justify-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={activeId === link.href.slice(1) ? 'true' : undefined}
              className={cn(
                'font-sans text-[14px] font-medium transition-colors',
                activeId === link.href.slice(1)
                  ? 'text-[var(--color-ink)] underline decoration-[var(--color-honey-deep)] decoration-2 underline-offset-8'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
              )}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4 lg:ml-0 lg:justify-self-end">
          <Link
            href="/login"
            className="hidden font-sans text-[14px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] md:inline"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="hidden rounded-full bg-[var(--color-ink)] px-5 py-2 font-sans text-[14px] font-semibold text-white transition-colors hover:bg-[var(--color-ink-2)] md:inline-flex"
          >
            Start free <span aria-hidden>→</span>
          </Link>

          <button
            type="button"
            className="p-1.5 text-[var(--color-ink)] lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={24} weight="bold" /> : <List size={24} weight="bold" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="overflow-hidden border-t border-[var(--glass-border)] bg-[color-mix(in_srgb,var(--color-paper)_78%,transparent)] backdrop-blur-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-5 sm:px-6">
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
              <hr className="border-[var(--glass-border)]" />
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="font-sans text-[15px] font-medium text-[var(--color-ink-soft)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-full bg-[var(--color-ink)] px-5 py-3 text-center font-sans text-[15px] font-semibold text-white"
                >
                  Start free →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
