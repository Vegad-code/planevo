'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { List, X } from '@phosphor-icons/react';
import { PlanevoLogo } from '@/components/PlanevoLogo';
import { PlanevoWordmark } from '@/components/PlanevoWordmark';
import { GlassSignInButton } from '@/components/landing-v2/editorial/GlassSignInButton';
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
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 px-4 pt-3 sm:px-6">
      <div className="pointer-events-auto glass-panel mx-auto w-full max-w-6xl rounded-xl">
        <div className="flex h-12 items-center justify-between gap-4 px-4 sm:h-14 sm:px-5 lg:px-6">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 text-[var(--color-ink)]"
          >
            <PlanevoLogo size={20} />
            <PlanevoWordmark variant="full" size="sm" className="text-[17px]" />
          </Link>

          <nav className="hidden flex-1 items-center justify-center gap-5 lg:flex lg:gap-6">
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
                  'text-[14px] font-medium transition-colors',
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

          <div className="flex items-center gap-2.5 sm:gap-3">
            <span
              aria-hidden
              className="hidden h-5 w-px bg-[var(--color-line-strong)] sm:block"
            />
            <GlassSignInButton href="/login" className="hidden sm:inline-flex" />
            <OceanPillButton
              href="/signup"
              showArrow={false}
              className="hidden px-4 py-1.5 text-[13px] font-semibold sm:inline-flex"
            >
              Start free
            </OceanPillButton>

            <button
              type="button"
              className="p-1.5 text-[var(--color-ink)] lg:hidden"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={22} weight="bold" /> : <List size={22} weight="bold" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="pointer-events-auto glass-panel mx-auto mt-2 w-full max-w-6xl overflow-hidden rounded-xl lg:hidden"
          >
            <div className="flex max-h-[min(80vh,640px)] flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5">
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
              <GlassSignInButton
                href="/login"
                className="w-full justify-center py-2"
                onClick={() => setMobileOpen(false)}
              />
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
