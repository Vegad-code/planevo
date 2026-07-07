'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';
import { OceanPillButton } from '@/components/landing-v2/editorial/OceanPillButton';
import { MarketingDropdown } from '@/components/marketing/MarketingDropdown';
import {
  COMPANY_DROPDOWN,
  PRODUCT_DROPDOWN,
  ROUTE_NAV_LINKS,
} from '@/lib/marketing/nav';
import { cn } from '@/lib/utils';

export function MarketingMegaNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const routeActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-3 pt-2 sm:px-5">
      <div className="pointer-events-auto mx-auto flex h-10 w-full max-w-5xl items-center justify-between gap-3 rounded-full border border-[var(--color-line)]/80 bg-[var(--color-paper)]/92 px-3 shadow-[0_2px_16px_rgba(20,20,20,0.05)] backdrop-blur-xl sm:h-11 sm:px-4">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-1.5 text-[var(--color-ink)]"
        >
          <PlanevoLogo size={16} />
          <PlanevoWordmark variant="full" size="sm" className="text-[16px]" />
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-3 lg:flex lg:gap-4">
          <MarketingDropdown
            dropdown={PRODUCT_DROPDOWN}
            isActive={pathname === '/features' || pathname === '/pricing'}
          />
          {ROUTE_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={routeActive(link.href) ? 'page' : undefined}
              className={cn(
                'px-0.5 text-[12px] font-medium transition-colors',
                routeActive(link.href)
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
              )}
            >
              {link.label}
            </Link>
          ))}
          <MarketingDropdown dropdown={COMPANY_DROPDOWN} isActive={pathname === '/about'} />
        </nav>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <span
            aria-hidden
            className="hidden h-4 w-px bg-[var(--color-line-strong)] sm:block"
          />
          <Link
            href="/login"
            className="hidden text-[12px] font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] sm:inline"
          >
            Sign in
          </Link>
          <OceanPillButton
            href="/signup"
            showArrow={false}
            className="hidden px-3 py-1 text-[11px] font-semibold sm:inline-flex"
          >
            Start free
          </OceanPillButton>

          <button
            type="button"
            className="p-1 text-[var(--color-ink)] lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} weight="bold" /> : <List size={20} weight="bold" />}
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
            className="pointer-events-auto mx-auto mt-1.5 max-h-[min(80vh,640px)] w-full max-w-5xl overflow-y-auto rounded-2xl border border-[var(--color-line)] bg-[var(--color-paper)]/98 p-4 shadow-xl backdrop-blur-xl lg:hidden"
          >
            <div className="flex flex-col gap-4">
              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                  {PRODUCT_DROPDOWN.eyebrow}
                </p>
                {PRODUCT_DROPDOWN.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-1.5 text-[15px] font-medium text-[var(--color-ink)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              {ROUTE_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="text-[15px] font-medium text-[var(--color-ink)]"
                >
                  {link.label}
                </Link>
              ))}
              <div>
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
                  {COMPANY_DROPDOWN.eyebrow}
                </p>
                {COMPANY_DROPDOWN.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="block py-1.5 text-[14px] font-medium text-[var(--color-ink-soft)]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
              <hr className="border-[var(--color-line)]" />
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="text-[14px] font-medium text-[var(--color-ink-soft)]"
              >
                Sign in
              </Link>
              <OceanPillButton
                href="/signup"
                showArrow={false}
                className="w-full justify-center py-2 text-[13px]"
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
