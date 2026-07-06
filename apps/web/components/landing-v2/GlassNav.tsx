'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';

const NAV_LINKS = [
  { name: 'Capture', href: '#capture' },
  { name: 'Command', href: '#board' },
  { name: 'Plan', href: '#plan' },
  { name: 'Tasks', href: '#tasks' },
  { name: 'Calendar', href: '#calendar' },
  { name: 'Notes', href: '#notes' },
  { name: 'Bruno', href: '#bruno' },
  { name: 'Pricing', href: '#pricing' },
];

/**
 * Littlebird-style top bar: full-bleed clear liquid glass (not a floating pill).
 * Logo left, links centered, actions right — content scrolls beneath the frosted strip.
 */
export function GlassNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="glass-nav fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-[60px] max-w-6xl items-center px-5 sm:px-6 lg:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-6">
        {/* Brand */}
        <Link
          href="/"
          className="flex items-center gap-2 text-[var(--color-ink)] lg:justify-self-start"
        >
          <PlanevoLogo size={24} />
          <PlanevoWordmark />
        </Link>

        {/* Center links — pipe separators like Littlebird */}
        <nav className="hidden items-center justify-center gap-4 lg:flex">
          {NAV_LINKS.map((link, index) => (
            <div key={link.name} className="flex items-center gap-4">
              <Link
                href={link.href}
                className="font-sans text-[14px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)]"
              >
                {link.name}
              </Link>
              {index < NAV_LINKS.length - 1 && (
                <span aria-hidden className="h-3 w-px bg-[var(--color-ink)]/15" />
              )}
            </div>
          ))}
        </nav>

        {/* Actions */}
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

      {/* Mobile sheet — full-bleed glass, not a floating pill */}
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
