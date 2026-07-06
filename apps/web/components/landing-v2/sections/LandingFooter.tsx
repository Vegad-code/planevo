import Link from 'next/link';
import { PlanevoLogo } from '@/components/PlanevoLogo';

const FOOTER_COLUMNS: Array<{
  title: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    title: 'Product',
    links: [
      { label: 'Capture', href: '#capture' },
      { label: 'Command board', href: '#board' },
      { label: 'Plan my day', href: '#plan' },
      { label: 'Bruno', href: '#bruno' },
      { label: 'Pricing', href: '#pricing' },
    ],
  },
  {
    title: 'Integrations',
    links: [
      { label: 'Canvas LMS', href: '/signup' },
      { label: 'Google Calendar', href: '/signup' },
      { label: 'Tasks & notes', href: '/signup' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Start free', href: '/signup' },
      { label: 'Sign in', href: '/login' },
      { label: 'For students', href: '/signup' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
    ],
  },
];

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
];

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full bg-[var(--color-paper)]">
      <div className="px-4 pt-10 sm:px-8 sm:pt-14 lg:px-12 lg:pt-16 xl:px-16">
        <div className="w-full">
          <div className="grid grid-cols-2 gap-x-10 gap-y-12 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-16 xl:gap-x-20">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title} className="flex flex-col gap-3">
                <h3 className="text-[12px] font-semibold text-[var(--color-ink)]">
                  {column.title}
                </h3>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-[12px] leading-snug text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] hover:underline"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-5 border-t border-[var(--color-line)] pt-8 sm:mt-16 sm:pt-10 lg:mt-20">
            <p className="max-w-3xl text-[12px] leading-relaxed text-[var(--color-ink-soft)]">
              Built for days that change. Planevo helps students and anyone whose
              week never quite stays put — free to start, no card required.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <p className="text-[12px] text-[var(--color-ink-soft)]">
                Copyright © {year} Planevo. All rights reserved.
              </p>
              <nav
                aria-label="Legal"
                className="flex flex-wrap items-center gap-x-6 gap-y-2"
              >
                {LEGAL_LINKS.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-[12px] text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-ink)] hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-16 lg:px-12 xl:px-16">
        <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
          <PlanevoLogo
            size={48}
            className="shrink-0 text-[var(--color-ink)] sm:!h-[56px] sm:!w-[67px]"
          />
          <span
            aria-hidden
            className="font-serif text-[clamp(4rem,18vw,11rem)] font-semibold leading-none tracking-tight text-[var(--color-ink)]"
          >
            Planevo
          </span>
        </div>
      </div>
    </footer>
  );
}
