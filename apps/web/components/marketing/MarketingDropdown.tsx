'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { CaretDown } from '@phosphor-icons/react';
import { NAV_ICONS, type NavIconKey } from '@/lib/marketing/nav-icons';
import type { NavDropdown } from '@/lib/marketing/nav';
import { cn } from '@/lib/utils';

function DropdownMenuItem({
  href,
  label,
  description,
  icon,
  onSelect,
}: {
  href: string;
  label: string;
  description?: string;
  icon?: NavIconKey;
  onSelect: () => void;
}) {
  const Icon = icon ? NAV_ICONS[icon] : null;

  return (
    <motion.div
      whileHover={{ x: 2 }}
      transition={{ type: 'spring', stiffness: 500, damping: 32 }}
    >
      <Link
        href={href}
        role="menuitem"
        onClick={onSelect}
        className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-muted)]/80"
      >
        {Icon ? (
          <span className="mt-px flex h-5 w-5 flex-none items-center justify-center text-[var(--color-ink)]">
            <Icon size={18} weight="regular" aria-hidden />
          </span>
        ) : null}
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-tight text-[var(--color-ink)]">
            {label}
          </span>
          {description ? (
            <span className="mt-0.5 block text-[11px] leading-snug text-[var(--color-ink-soft)]">
              {description}
            </span>
          ) : null}
        </span>
      </Link>
    </motion.div>
  );
}

export function MarketingDropdown({
  dropdown,
  isActive,
}: {
  dropdown: NavDropdown;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (openTimerRef.current) clearTimeout(openTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  };

  const scheduleOpen = () => {
    clearTimers();
    openTimerRef.current = setTimeout(() => setOpen(true), 60);
  };

  const scheduleClose = () => {
    clearTimers();
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  useEffect(() => () => clearTimers(), []);

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerEnter={() => {
        if (window.matchMedia('(hover: hover)').matches) scheduleOpen();
      }}
      onPointerLeave={() => {
        if (window.matchMedia('(hover: hover)').matches) scheduleClose();
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'relative z-10 inline-flex items-center gap-1 px-1.5 py-0.5 text-[14px] font-medium transition-colors',
          open
            ? 'rounded-t-xl border border-b-0 border-[var(--color-line)] bg-[var(--color-paper)]/98 px-4 py-1 text-[var(--color-ink)]'
            : isActive
              ? 'text-[var(--color-ink)]'
              : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]',
        )}
      >
        {dropdown.label}
        <CaretDown
          size={12}
          weight="bold"
          className={cn('transition-transform duration-200', open && 'rotate-180')}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
            className="absolute left-1/2 top-full z-50 w-[min(100vw-2rem,20rem)] -translate-x-1/2 rounded-b-2xl border border-t-0 border-[var(--color-line)] bg-[var(--color-paper)]/98 px-3 pb-3 pt-2.5 shadow-[0_20px_56px_rgba(20,20,20,0.1)] backdrop-blur-xl sm:w-[22rem] sm:px-3.5 sm:pb-3.5"
          >
            <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-soft)]">
              {dropdown.eyebrow}
            </p>
            <ul className="flex flex-col gap-0.5">
              {dropdown.items.map((item) => (
                <li key={item.href}>
                  <DropdownMenuItem
                    href={item.href}
                    label={item.label}
                    description={item.description}
                    icon={item.icon}
                    onSelect={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
